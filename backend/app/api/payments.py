from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.auth import get_current_user
from app.models import User, Payment, SubscriptionPlan, Subscription
from app.schemas import PaymentCreate, PaymentOut
from app.services import payment_service, subscription_service

router = APIRouter()


@router.post("", response_model=PaymentOut, status_code=status.HTTP_201_CREATED)
def create_payment(
    body: PaymentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Crée une intention de paiement pour un abonnement donné.
    L'abonnement est d'abord créé en statut 'pending', puis le paiement est enregistré.
    Une fois confirmé, l'abonnement devient actif.
    """
    plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.code == body.plan_code.upper()).first()
    if not plan:
        raise HTTPException(status_code=404, detail=f"Plan '{body.plan_code}' introuvable.")

    # On crée l'abonnement pending
    try:
        sub = subscription_service.create_pending_subscription(db, current_user.id, body.plan_code)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # On crée l'intention de paiement
    payment = payment_service.create_payment(
        db=db,
        user_id=current_user.id,
        subscription_id=sub.id,
        amount=plan.price,
        currency=plan.currency,
        method=body.payment_method
    )
    return payment


@router.get("/{payment_id}", response_model=PaymentOut)
def get_payment(
    payment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Récupère le statut d'un paiement."""
    payment = payment_service.get_payment(db, payment_id)
    if not payment:
        raise HTTPException(status_code=404, detail="Paiement introuvable.")
    # Un user ne peut voir que ses propres paiements (sauf admin)
    if payment.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Accès non autorisé.")
    return payment


@router.post("/{payment_id}/confirm", response_model=PaymentOut)
def confirm_payment(
    payment_id: int,
    transaction_id: str = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """[Admin] Confirme manuellement un paiement et active l'abonnement associé."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs.")

    payment = payment_service.confirm_payment(db, payment_id, transaction_id)
    if not payment:
        raise HTTPException(status_code=404, detail="Paiement introuvable.")
    return payment


@router.get("", response_model=List[PaymentOut])
def list_payments(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """[Admin] Liste tous les paiements."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs.")
    return db.query(Payment).order_by(Payment.created_at.desc()).all()
