import os
import logging

logger = logging.getLogger(__name__)

# Providers
# mock | twilio | meta
WHATSAPP_PROVIDER = os.getenv("WHATSAPP_PROVIDER", "mock").lower()

def send_whatsapp_message(to_number: str, message: str) -> bool:
    """
    Envoie un message WhatsApp à un numéro via le provider configuré.
    Le numéro de téléphone de l'utilisateur est filtré et standardisé.
    """
    if not to_number:
        logger.warning("Aucun numéro de téléphone fourni pour l'envoi WhatsApp.")
        return False

    # Nettoyage du numéro
    clean_number = "".join(filter(lambda x: x.isdigit() or x == '+', to_number))
    if not clean_number.startswith('+'):
        if len(clean_number) == 8:
            clean_number = "+257" + clean_number
        else:
            clean_number = "+" + clean_number

    if WHATSAPP_PROVIDER == "twilio":
        account_sid = os.getenv("TWILIO_ACCOUNT_SID")
        auth_token = os.getenv("TWILIO_AUTH_TOKEN")
        from_number = os.getenv("TWILIO_PHONE_NUMBER")

        if not account_sid or not auth_token or not from_number:
            logger.error("Configuration Twilio manquante dans les variables d'environnement.")
            return False

        try:
            from twilio.rest import Client
            client = Client(account_sid, auth_token)
            message_sent = client.messages.create(
                body=message,
                from_=f"whatsapp:{from_number}",
                to=f"whatsapp:{clean_number}"
            )
            logger.info(f"Message WhatsApp Twilio envoyé. SID: {message_sent.sid}")
            return True
        except Exception as e:
            logger.error(f"Erreur lors de l'envoi WhatsApp Twilio: {e}")
            return False

    elif WHATSAPP_PROVIDER == "meta":
        token = os.getenv("META_WA_TOKEN")
        phone_id = os.getenv("META_WA_PHONE_ID")

        if not token or not phone_id:
            logger.error("Configuration Meta Cloud API manquante.")
            return False

        try:
            import requests
            url = f"https://graph.facebook.com/v18.0/{phone_id}/messages"
            headers = {
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            }
            data = {
                "messaging_product": "whatsapp",
                "recipient_type": "individual",
                "to": clean_number.replace("+", ""),
                "type": "text",
                "text": {"preview_url": False, "body": message}
            }
            response = requests.post(url, headers=headers, json=data)
            if response.status_code in [200, 201]:
                logger.info(f"Message WhatsApp Meta Cloud envoyé à {clean_number}.")
                return True
            else:
                logger.error(f"Erreur d'envoi WhatsApp Meta: {response.text}")
                return False
        except Exception as e:
            logger.error(f"Erreur réseau lors de l'envoi WhatsApp Meta: {e}")
            return False

    else:
        logger.info(f"[WHATSAPP MOCK SEND] A: {clean_number} | Message: {message}")
        return True
