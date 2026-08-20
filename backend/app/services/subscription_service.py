from sqlalchemy.orm import Session
from app.models import Subscription, SubscriptionPlan, User, Payment
from datetime import datetime, timedelta

def get_active_subscription(db: Session, user_id: int) -> Subscription | None:
    """Retourne l'abonnement actif d'un utilisateur"""
    return db.query(Subscription).filter(
        Subscription.user_id == user_id,
        Subscription.status == "active"
    ).first()

def get_user_plan(db: Session, user_id: int) -> SubscriptionPlan:
    """Retourne le plan actif d'un utilisateur, ou le plan FREE par défaut"""
    sub = get_active_subscription(db, user_id)
    if sub and sub.plan:
        return sub.plan
    
    # Récupération du plan FREE par défaut
    free_plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.code == "FREE").first()
    if not free_plan:
        # Fallback de secours si non inséré en DB
        free_plan = SubscriptionPlan(
            code="FREE",
            name="Free",
            max_listings=5,
            featured_listings=False,
            advanced_analytics=False,
            marketing_tools=False
        )
    return free_plan

def get_listing_limit(db: Session, user_id: int) -> int:
    """Retourne la limite d'annonces autorisée pour l'utilisateur"""
    plan = get_user_plan(db, user_id)
    return plan.max_listings

def create_free_subscription(db: Session, user_id: int) -> Subscription:
    """Crée et active un abonnement gratuit pour un nouvel inscrit"""
    free_plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.code == "FREE").first()
    if not free_plan:
        raise ValueError("Plan d'abonnement FREE introuvable")

    # On désactive les abonnements actifs précédents de sécurité
    db.query(Subscription).filter(
        Subscription.user_id == user_id,
        Subscription.status == "active"
    ).update({"status": "expired"})

    sub = Subscription(
        user_id=user_id,
        plan_id=free_plan.id,
        status="active",
        starts_at=datetime.utcnow(),
        ends_at=datetime.utcnow() + timedelta(days=free_plan.duration_days),
        auto_renew=True
    )
    db.add(sub)
    db.commit()
    db.refresh(sub)
    return sub

def create_pending_subscription(db: Session, user_id: int, plan_code: str, whatsapp_number: str = None) -> Subscription:
    """Crée un abonnement en attente de paiement (statut pending)"""
    plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.code == plan_code).first()
    if not plan:
        raise ValueError(f"Plan d'abonnement '{plan_code}' introuvable")

    # Pour le plan gratuit, on l'active immédiatement
    if plan.code == "FREE":
        sub = create_free_subscription(db, user_id)
        if whatsapp_number:
            sub.whatsapp_number = whatsapp_number
            db.commit()
        return sub

    # Pour PRO/BUSINESS, on crée un abonnement en statut 'pending'
    sub = Subscription(
        user_id=user_id,
        plan_id=plan.id,
        status="pending",
        starts_at=datetime.utcnow(),
        ends_at=datetime.utcnow() + timedelta(days=plan.duration_days),
        auto_renew=False,
        whatsapp_number=whatsapp_number
    )
    db.add(sub)
    db.commit()
    db.refresh(sub)
    return sub

def activate_subscription(db: Session, subscription_id: int) -> Subscription | None:
    """Active un abonnement (suite à un paiement validé)"""
    sub = db.query(Subscription).filter(Subscription.id == subscription_id).first()
    if not sub:
        return None

    # On expire tous les autres abonnements actifs de l'utilisateur
    db.query(Subscription).filter(
        Subscription.user_id == sub.user_id,
        Subscription.status == "active",
        Subscription.id != sub.id
    ).update({"status": "expired"})

    sub.status = "active"
    sub.starts_at = datetime.utcnow()
    sub.ends_at = datetime.utcnow() + timedelta(days=sub.plan.duration_days)
    db.commit()
    db.refresh(sub)
    return sub

def cancel_subscription(db: Session, user_id: int) -> bool:
    """Annule l'abonnement actuel (désactive le renouvellement ou suspend l'abonnement)"""
    sub = get_active_subscription(db, user_id)
    if not sub:
        return False
    sub.status = "cancelled"
    db.commit()
    return True
