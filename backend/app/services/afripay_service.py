import os
from typing import Dict, Any, Optional

class AfriPayService:
    """Service d'intégration directe avec le gateway de paiement AfriPay (Burundi / Afrique)."""

    def __init__(self):
        self.app_id = os.getenv("AFRIPAY_APP_ID", "5b47c080a61d5652c3696cbdf2f8a8cd")
        self.app_secret = os.getenv("AFRIPAY_APP_SECRET", "JDJ5JDEwJHNPRHp3")
        self.checkout_url = os.getenv("AFRIPAY_CHECKOUT_URL", "https://www.afripay.africa/checkout/index.php")
        self.frontend_url = os.getenv("FRONTEND_URL", "https://kukasoko.wuaze.com").rstrip("/")

    def generate_checkout_data(
        self,
        payment_id: int,
        amount: float,
        currency: str,
        user_email: str,
        user_phone: Optional[str] = None,
        return_url: Optional[str] = None,
        cancel_url: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Génère l'URL et les données de formulaire requises par AfriPay pour le Checkout.
        """
        client_token = f"KUKA-PAY-{payment_id}"
        normalized_amount = str(int(amount) if amount == int(amount) else amount)

        ret_url = return_url or f"{self.frontend_url}/pricing?status=success&payment_id={payment_id}"
        can_url = cancel_url or f"{self.frontend_url}/pricing?status=cancelled&payment_id={payment_id}"

        form_data = {
            "app_id": self.app_id,
            "app_secret": self.app_secret,
            "amount": normalized_amount,
            "currency": currency or "BIF",
            "comment": f"Abonnement Kukasoko #{payment_id}",
            "client_token": client_token,
            "return_url": ret_url,
            "cancel_url": can_url,
            "back_url": ret_url,
        }

        return {
            "checkout_url": self.checkout_url,
            "client_token": client_token,
            "checkout_data": form_data,
        }

afripay_service = AfriPayService()
