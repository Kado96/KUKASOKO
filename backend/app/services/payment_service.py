from sqlalchemy.orm import Session
from app.models import Payment, Subscription
from decimal import Decimal
from datetime import datetime

def create_payment(db: Session, user_id: int, subscription_id: int, amount: Decimal, currency: str, method: str) -> Payment:
    """Crée une intention de paiement"""
    payment = Payment(
        user_id=user_id,
        subscription_id=subscription_id,
        amount=amount,
        currency=currency,
        provider="pending",
        status="pending",
        payment_method=method
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)
    return payment

def get_payment(db: Session, payment_id: int) -> Payment | None:
    return db.query(Payment).filter(Payment.id == payment_id).first()

def confirm_payment(db: Session, payment_id: int, transaction_id: str = None) -> Payment | None:
    """Confirme le paiement et active l'abonnement associé"""
    payment = get_payment(db, payment_id)
    if not payment:
        return None

    payment.status = "success"
    payment.confirmed_at = datetime.utcnow()
    if transaction_id:
        payment.transaction_id = transaction_id

    # Activation de l'abonnement lié
    if payment.subscription_id:
        from app.services.subscription_service import activate_subscription
        activate_subscription(db, payment.subscription_id)

    db.commit()
    db.refresh(payment)
    return payment
