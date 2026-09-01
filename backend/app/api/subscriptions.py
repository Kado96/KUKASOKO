from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.auth import get_current_user
from app.models import User, SubscriptionPlan, Subscription
from app.schemas import (
    SubscriptionPlanOut, SubscriptionOut, SubscriptionCreate,
    SubscriptionUpdatePreferences, SubscriptionPlanUpdateRules, SubscriptionPlanUpdate
)
from app.services import subscription_service

router = APIRouter()


@router.get("/plans", response_model=List[SubscriptionPlanOut])
def list_plans(db: Session = Depends(get_db)):
    """Liste tous les plans d'abonnement actifs (endpoint public)."""
    return db.query(SubscriptionPlan).filter(SubscriptionPlan.is_active == True).all()


@router.get("/plans/all", response_model=List[SubscriptionPlanOut])
def list_all_plans(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """[Admin] Liste TOUS les plans d'abonnement y compris inactifs."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs.")
    return db.query(SubscriptionPlan).all()


@router.patch("/plans/{plan_code}", response_model=SubscriptionPlanOut)
def update_plan_complete(
    plan_code: str,
    body: SubscriptionPlanUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """[Admin] Modifie tous les paramètres d'un plan tarifaire (nom, prix, limites, etc.)."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs.")

    plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.code == plan_code.upper()).first()
    if not plan:
        raise HTTPException(status_code=404, detail=f"Plan '{plan_code}' introuvable.")

    for key, value in body.dict(exclude_unset=True).items():
        setattr(plan, key, value)

    db.commit()
    db.refresh(plan)
    return plan


@router.get("/me", response_model=SubscriptionOut)
def get_my_subscription(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retourne l'abonnement actif de l'utilisateur connecté."""
    sub = subscription_service.get_active_subscription(db, current_user.id)
    if not sub:
        # Crée automatiquement un abonnement FREE si inexistant
        sub = subscription_service.create_free_subscription(db, current_user.id)
    return sub


@router.post("", response_model=SubscriptionOut, status_code=status.HTTP_201_CREATED)
def create_subscription(
    body: SubscriptionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Démarre un nouvel abonnement (active immédiatement si FREE, sinon pending)."""
    plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.code == body.plan_code).first()
    if not plan:
        raise HTTPException(status_code=404, detail=f"Plan '{body.plan_code}' introuvable.")
    if not plan.is_active:
        raise HTTPException(status_code=400, detail="Ce plan n'est pas disponible.")

    try:
        sub = subscription_service.create_pending_subscription(
            db, current_user.id, body.plan_code, body.whatsapp_number
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return sub


@router.patch("/me/preferences", response_model=SubscriptionOut)
def update_preferences(
    body: SubscriptionUpdatePreferences,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Met à jour les préférences de notification (ex: numéro WhatsApp) de l'abonné."""
    sub = subscription_service.get_active_subscription(db, current_user.id)
    if not sub:
        raise HTTPException(status_code=404, detail="Aucun abonnement actif trouvé.")

    if body.whatsapp_number is not None:
        sub.whatsapp_number = body.whatsapp_number
        db.commit()
        db.refresh(sub)

    return sub


@router.post("/me/cancel")
def cancel_subscription(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Annule l'abonnement actif de l'utilisateur connecté."""
    success = subscription_service.cancel_subscription(db, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Aucun abonnement actif à annuler.")
    return {"message": "Abonnement annulé avec succès."}


@router.patch("/plans/{plan_code}/rules", response_model=SubscriptionPlanOut)
def update_plan_notification_rules(
    plan_code: str,
    body: SubscriptionPlanUpdateRules,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """[Admin] Modifie les règles de notification d'un plan."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs.")

    plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.code == plan_code.upper()).first()
    if not plan:
        raise HTTPException(status_code=404, detail=f"Plan '{plan_code}' introuvable.")

    for key, value in body.dict().items():
        setattr(plan, key, value)

    db.commit()
    db.refresh(plan)
    return plan
