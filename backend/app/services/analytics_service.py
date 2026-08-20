from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models import User, Listing, Subscription, SubscriptionPlan, Payment, Notification
from datetime import datetime, timedelta

def compute_health_score(db: Session) -> dict:
    """
    Calcule le score de santé de la plateforme de 0 à 100
    basé sur l'activité des utilisateurs, le taux d'annonces actives et les paiements.
    """
    total_users = db.query(User).count()
    active_users_30d = db.query(User).filter(User.is_active == True).count()  # Placeholder pour simplifier
    total_listings = db.query(Listing).count()
    active_listings = db.query(Listing).filter(Listing.status == "active").count()
    
    payments_success = db.query(Payment).filter(Payment.status == "success").count()
    payments_total = db.query(Payment).count()

    # Calculs
    user_activity_ratio = active_users_30d / max(total_users, 1)
    listing_activity_ratio = active_listings / max(total_listings, 1)
    payment_success_ratio = payments_success / max(payments_total, 1) if payments_total > 0 else 1.0

    score = int((user_activity_ratio * 40) + (listing_activity_ratio * 40) + (payment_success_ratio * 20))
    score = min(max(score, 10), 100)  # Min 10, Max 100

    status = "Excellent" if score >= 85 else "Bon" if score >= 65 else "Moyen" if score >= 40 else "Critique"

    return {
        "score": score,
        "status": status,
        "metrics": {
            "user_activity_ratio": round(user_activity_ratio * 100, 1),
            "listing_activity_ratio": round(listing_activity_ratio * 100, 1),
            "payment_success_ratio": round(payment_success_ratio * 100, 1)
        }
    }

def compute_churn_risk(db: Session) -> list:
    """
    Identifie les utilisateurs / marchands à risque de churn (inactivité ou départ de la plateforme).
    Utilise un algorithme local basé sur la date de dernière annonce et l'absence d'abonnements actifs.
    """
    users = db.query(User).all()
    churn_list = []
    
    for user in users:
        # Nombre d'annonces
        listings_count = db.query(Listing).filter(Listing.seller_id == user.id).count()
        # Dernier listing
        last_listing = db.query(Listing).filter(Listing.seller_id == user.id).order_name = Listing.created_at.desc()
        last_listing = db.query(Listing).filter(Listing.seller_id == user.id).order_by(Listing.created_at.desc()).first()
        
        # Abonnement actif
        active_sub = db.query(Subscription).filter(
            Subscription.user_id == user.id,
            Subscription.status == "active"
        ).first()

        risk_score = 0
        reasons = []

        if listings_count == 0:
            risk_score += 30
            reasons.append("Aucune annonce créée")
        elif last_listing:
            days_inactive = (datetime.utcnow() - last_listing.created_at).days
            if days_inactive > 30:
                risk_score += min(days_inactive, 50)
                reasons.append(f"Inactif depuis {days_inactive} jours")

        if not active_sub:
            risk_score += 20
            reasons.append("Pas d'abonnement actif")
        elif active_sub.ends_at:
            days_left = (active_sub.ends_at - datetime.utcnow()).days
            if days_left < 7 and not active_sub.auto_renew:
                risk_score += 15
                reasons.append("Abonnement expire bientôt sans auto-renouvellement")

        risk_score = min(risk_score, 100)

        if risk_score >= 40:
            churn_list.append({
                "user_id": user.id,
                "username": user.username,
                "email": user.email,
                "phone": user.phone,
                "risk_score": risk_score,
                "reasons": reasons
            })

    return sorted(churn_list, key=lambda x: x["risk_score"], reverse=True)

def detect_anomalies(db: Session) -> list:
    """
    Détecte les anomalies statistiques de la plateforme (ex: pic de paiements échoués,
    spam d'annonces ou baisse brutale de visites/inscriptions).
    """
    anomalies = []
    now = datetime.utcnow()

    # 1. Pic de paiements échoués sur les dernières 24h
    last_24h = now - timedelta(days=1)
    failed_payments_24h = db.query(Payment).filter(
        Payment.status == "failed",
        Payment.created_at >= last_24h
    ).count()
    total_payments_24h = db.query(Payment).filter(
        Payment.created_at >= last_24h
    ).count()

    if total_payments_24h > 3 and (failed_payments_24h / total_payments_24h) > 0.4:
        anomalies.append({
            "type": "payment_failure_spike",
            "severity": "high",
            "message": f"Taux d'échec des paiements anormalement élevé : {round((failed_payments_24h/total_payments_24h)*100, 1)}% ({failed_payments_24h} échecs sur {total_payments_24h} tentatives)"
        })

    # 2. Détection de spam d'annonces (un même utilisateur qui crée plus de 10 annonces par 24h)
    users_with_spam = db.query(
        Listing.seller_id, func.count(Listing.id).label("count")
    ).filter(
        Listing.created_at >= last_24h,
        Listing.seller_id.isnot(None)
    ).group_by(Listing.seller_id).having(func.count(Listing.id) > 10).all()

    for spammer in users_with_spam:
        user = db.query(User).filter(User.id == spammer.seller_id).first()
        if user:
            anomalies.append({
                "type": "listing_creation_spam",
                "severity": "medium",
                "message": f"L'utilisateur @{user.username} (ID: {user.id}) a créé {spammer.count} annonces au cours des dernières 24 heures."
            })

    return anomalies

def get_trending_categories(db: Session) -> list:
    """
    Identifie les catégories et les villes les plus populaires de ces derniers jours.
    """
    # Catégories populaires basées sur les vues d'annonces
    categories_stats = db.query(
        Listing.category_id, func.sum(Listing.views).label("total_views")
    ).filter(Listing.category_id.isnot(None)).group_by(Listing.category_id).order_by(func.sum(Listing.views).desc()).limit(5).all()

    trending = []
    for cat_stat in categories_stats:
        from app.models import Category
        cat = db.query(Category).filter(Category.id == cat_stat.category_id).first()
        if cat:
            trending.append({
                "category_id": cat.id,
                "name": cat.name,
                "views": cat_stat.total_views
            })

    return trending
