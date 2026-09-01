from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List, Dict, Any

from app.database import get_db
from app.auth import get_current_user
from app.models import User, Payment, SubscriptionPlan, Subscription
from app.schemas import PaymentCreate, PaymentOut, AfriPayWebhookPayload
from app.services import payment_service, subscription_service
from app.services.afripay_service import afripay_service

router = APIRouter()


@router.post("", response_model=PaymentOut, status_code=status.HTTP_201_CREATED)
def create_payment(
    body: PaymentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Crée une intention de paiement pour un abonnement donné.
    Si la méthode est afri_pay, génère les données de checkout AfriPay.
    """
    plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.code == body.plan_code.upper()).first()
    if not plan:
        raise HTTPException(status_code=404, detail=f"Plan '{body.plan_code}' introuvable.")

    # 1. Plan GRATUIT (FREE) -> Activation directe sans paiement
    if plan.price == 0 or plan.code == "FREE":
        sub = subscription_service.create_free_subscription(db, current_user.id)
        payment = payment_service.create_payment(
            db=db,
            user_id=current_user.id,
            subscription_id=sub.id,
            amount=0,
            currency=plan.currency,
            method="free"
        )
        payment_service.confirm_payment(db, payment.id, transaction_id=f"FREE-{sub.id}")
        return payment

    # 2. Plan payant (PRO / BUSINESS) -> Abonnement pending + création du paiement
    try:
        sub = subscription_service.create_pending_subscription(db, current_user.id, body.plan_code)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    payment = payment_service.create_payment(
        db=db,
        user_id=current_user.id,
        subscription_id=sub.id,
        amount=plan.price,
        currency=plan.currency,
        method=body.payment_method
    )

    # 3. Traitement spécifique AfriPay
    if body.payment_method == "afri_pay":
        payment.provider = "afri_pay"
        payment.transaction_id = f"KUKA-PAY-{payment.id}"
        db.commit()

        checkout_info = afripay_service.generate_checkout_data(
            payment_id=payment.id,
            amount=float(plan.price),
            currency=plan.currency,
            user_email=current_user.email,
            return_url=body.return_url,
            cancel_url=body.cancel_url
        )

        res = PaymentOut.model_validate(payment)
        res.checkout_url = checkout_info["checkout_url"]
        res.checkout_data = checkout_info["checkout_data"]
        return res

    return payment


@router.post("/webhook/afripay")
async def afripay_webhook(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Webhook / Notification IPN reçu d'AfriPay après validation d'un paiement.
    """
    try:
        data = await request.json()
    except Exception:
        data = dict(await request.form())

    client_token = data.get("client_token") or data.get("token") or data.get("id")
    status_raw = str(data.get("status") or "").lower()
    response_code = str(data.get("response_code") or "")

    if not client_token:
        raise HTTPException(status_code=400, detail="Missing client_token in webhook")

    # Extraire l'ID paiement (format: KUKA-PAY-{payment_id})
    payment_id = None
    if client_token.startswith("KUKA-PAY-"):
        try:
            payment_id = int(client_token.replace("KUKA-PAY-", ""))
        except ValueError:
            pass

    payment = None
    if payment_id:
        payment = payment_service.get_payment(db, payment_id)
    else:
        payment = db.query(Payment).filter(Payment.transaction_id == client_token).first()

    if not payment:
        raise HTTPException(status_code=404, detail="Payment transaction not found")

    is_success = status_raw in ["success", "completed", "paid", "approved"] or response_code == "00"

    if is_success:
        txn_ref = data.get("transaction_id") or data.get("reference") or client_token
        payment_service.confirm_payment(db, payment.id, transaction_id=txn_ref)
        return {"status": "success", "message": "Payment confirmed and subscription activated"}
    else:
        payment.status = "failed"
        db.commit()
        return {"status": "failed", "message": "Payment marked as failed"}


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
