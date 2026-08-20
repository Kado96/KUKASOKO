from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime, timedelta

from app.database import get_db
from app.auth import get_current_user
from app.models import User, Listing, Subscription, SubscriptionPlan, Payment, Notification
from app.services import analytics_service, ai_service
from app.services.notification_service import dispatch_notification

router = APIRouter()


def require_admin(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs.")
    return current_user


@router.get("/overview")
def get_overview(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    """Vue d'ensemble : utilisateurs, annonces, abonnements, revenus."""
    total_users = db.query(User).count()
    total_listings = db.query(Listing).count()
    active_listings = db.query(Listing).filter(Listing.status == "active").count()

    # Distribution des plans
    plan_distribution = {}
    plans = db.query(SubscriptionPlan).all()
    for plan in plans:
        count = db.query(Subscription).filter(
            Subscription.plan_id == plan.id,
            Subscription.status == "active"
        ).count()
        plan_distribution[plan.code] = count

    # Revenus totaux (paiements success)
    total_revenue = db.query(func.sum(Payment.amount)).filter(Payment.status == "success").scalar() or 0

    # Revenus du mois en cours
    first_of_month = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0)
    monthly_revenue = db.query(func.sum(Payment.amount)).filter(
        Payment.status == "success",
        Payment.confirmed_at >= first_of_month
    ).scalar() or 0

    health = analytics_service.compute_health_score(db)

    return {
        "total_users": total_users,
        "total_listings": total_listings,
        "active_listings": active_listings,
        "plan_distribution": plan_distribution,
        "total_revenue": float(total_revenue),
        "monthly_revenue": float(monthly_revenue),
        "health_score": health
    }


@router.get("/churn")
def get_churn_analysis(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    """Analyse du risque de churn par utilisateur."""
    return {"churn_risks": analytics_service.compute_churn_risk(db)}


@router.get("/anomalies")
def get_anomalies(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    """Détecte les anomalies récentes sur la plateforme."""
    return {"anomalies": analytics_service.detect_anomalies(db)}


@router.get("/trends")
def get_trends(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    """Identifie les tendances (catégories populaires)."""
    return {"trending_categories": analytics_service.get_trending_categories(db)}


@router.get("/health-score")
def get_health_score(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    """Retourne le score de santé de la plateforme."""
    return analytics_service.compute_health_score(db)


@router.get("/ai-report")
def get_ai_report(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    """Génère un rapport analytique IA (utilise Gemini/OpenAI/local selon config)."""
    # Collecte des données contextuelles
    total_users = db.query(User).count()
    total_listings = db.query(Listing).count()
    total_revenue = db.query(func.sum(Payment.amount)).filter(Payment.status == "success").scalar() or 0
    churn_risks = analytics_service.compute_churn_risk(db)
    anomalies = analytics_service.detect_anomalies(db)
    health = analytics_service.compute_health_score(db)

    context = (
        f"Plateforme KUKASOKO — Rapport du {datetime.utcnow().strftime('%d/%m/%Y')}\n"
        f"- Utilisateurs total : {total_users}\n"
        f"- Annonces total : {total_listings}\n"
        f"- Revenus total : {float(total_revenue)} BIF\n"
        f"- Score de santé : {health['score']}/100 ({health['status']})\n"
        f"- Utilisateurs à risque de churn : {len(churn_risks)}\n"
        f"- Anomalies détectées : {len(anomalies)}\n"
    )

    prompt = (
        "Tu es un expert en analyse de marketplace africaine. "
        "Sur base des données ci-dessus, génère un rapport structuré avec:\n"
        "1. Résumé exécutif\n"
        "2. Points positifs\n"
        "3. Points d'attention\n"
        "4. Recommandations concrètes (tarifs, rétention, croissance)"
    )

    report_content = ai_service.generate_insights(prompt, context)

    return {
        "generated_at": datetime.utcnow().isoformat(),
        "report": report_content,
        "provider": ai_service.AI_PROVIDER,
        "ai_enabled": bool(ai_service.AI_API_KEY)
    }


@router.post("/notify/{user_id}")
def notify_user(
    user_id: int,
    notif_type: str = Body(...),
    title: str = Body(...),
    message: str = Body(...),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin)
):
    """[Admin] Envoie une notification personnalisée à un utilisateur."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable.")

    sent = dispatch_notification(db, user_id, notif_type, title, message)
    return {"sent": sent, "message": "Notification envoyée." if sent else "Notification bloquée (plan insuffisant)."}


@router.post("/broadcast")
def broadcast_notification(
    notif_type: str = Body(...),
    title: str = Body(...),
    message: str = Body(...),
    plan_filter: Optional[str] = Body(None),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin)
):
    """[Admin] Diffuse une notification à tous les utilisateurs (ou filtrée par plan)."""
    query = db.query(User)
    if plan_filter:
        # Filtrer les utilisateurs par plan actif
        plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.code == plan_filter.upper()).first()
        if plan:
            user_ids = db.query(Subscription.user_id).filter(
                Subscription.plan_id == plan.id,
                Subscription.status == "active"
            ).all()
            user_ids = [uid[0] for uid in user_ids]
            query = query.filter(User.id.in_(user_ids))

    users = query.all()
    sent_count = 0
    for user in users:
        success = dispatch_notification(db, user.id, notif_type, title, message)
        if success:
            sent_count += 1

    return {
        "total_targeted": len(users),
        "sent_count": sent_count,
        "plan_filter": plan_filter
    }


@router.get("/subscriptions")
def list_subscriptions_admin(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    """[Admin] Liste tous les abonnements avec les informations utilisateur."""
    subs = db.query(Subscription).order_by(Subscription.created_at.desc()).all()
    result = []
    for sub in subs:
        result.append({
            "id": sub.id,
            "user_id": sub.user_id,
            "username": sub.user.username if sub.user else "N/A",
            "email": sub.user.email if sub.user else "N/A",
            "plan": sub.plan.code if sub.plan else "N/A",
            "status": sub.status,
            "starts_at": sub.starts_at.isoformat() if sub.starts_at else None,
            "ends_at": sub.ends_at.isoformat() if sub.ends_at else None,
            "whatsapp_number": sub.whatsapp_number
        })
    return result


@router.get("/expiring-soon")
def get_expiring_subscriptions(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    """[Admin] Liste les abonnements qui expirent dans les 7 prochains jours."""
    in_7_days = datetime.utcnow() + timedelta(days=7)
    expiring = db.query(Subscription).filter(
        Subscription.status == "active",
        Subscription.ends_at <= in_7_days,
        Subscription.auto_renew == False
    ).all()

    return [
        {
            "id": sub.id,
            "user_id": sub.user_id,
            "username": sub.user.username if sub.user else "N/A",
            "email": sub.user.email if sub.user else "N/A",
            "plan": sub.plan.code if sub.plan else "N/A",
            "ends_at": sub.ends_at.isoformat() if sub.ends_at else None,
            "whatsapp_number": sub.whatsapp_number
        }
        for sub in expiring
    ]


@router.get("/coach/tips")
def get_coach_tips(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Exclusif boutique : Retourne le rapport de conseils du Coach IA personnalisé."""
    from app.services.shop_coach_service import ShopCoachService
    stats = ShopCoachService.compute_shop_stats(db, current_user.id)
    
    # Génération à la demande d'un conseil chaleureux
    from app.services.subscription_service import get_user_plan
    plan = get_user_plan(db, current_user.id)
    
    context = (
        f"Commerçant {current_user.username}. Plan: {plan.code}. "
        f"Annonces: {stats['total_listings']}, Vues: {stats['total_views']}, Engagement: {stats['engagement_rate']}%."
    )
    prompt = (
        "Tu es le meilleur ami et coach commercial de ce commerçant. Parle-lui avec affection (tutoiement chaleureux) "
        "en lui disant ce qu'il fait de bien et en lui donnant un conseil commercial ciblé pour maximiser ses ventes ce mois-ci. "
        "Si son plan est FREE, suggère-lui délicatement de s'abonner pour profiter d'outils magiques sans le harceler."
    )
    
    try:
        if ai_service.AI_API_KEY:
            advice = ai_service.generate_insights(prompt, context)
        else:
            import random
            from app.services.shop_coach_service import FRIENDLY_COACH_FALLBACKS
            advice = f"Salut {current_user.username} ! " + random.choice(FRIENDLY_COACH_FALLBACKS)
    except Exception:
        advice = "Continue comme ça ! Tes efforts finiront par payer sur KUKASOKO."

    return {
        "stats": stats,
        "coach_advice": advice,
        "coach_name": "L'Ami KUKASOKO IA"
    }


@router.post("/coach/trigger")
def trigger_coach_campaign(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin)
):
    """[Admin] Lance la campagne de conseils et conversion amicale automatique pour toutes les boutiques."""
    from app.services.shop_coach_service import ShopCoachService
    count = ShopCoachService.run_marketing_coach_cron(db)
    return {"message": f"Campagne de coaching IA lancée pour {count} boutique(s)."}

