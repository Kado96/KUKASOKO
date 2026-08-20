import logging
from sqlalchemy.orm import Session
from app.models import User, Subscription, SubscriptionPlan, Notification
from app.services.whatsapp_service import send_whatsapp_message
from datetime import datetime

logger = logging.getLogger(__name__)

# Matrice de notifications autorisées par plan (FREE/PRO/BUSINESS)
NOTIFICATION_PLAN_RULES = {
    "message_contact": ["FREE", "PRO", "BUSINESS"],
    "weekly_report": ["PRO", "BUSINESS"],
    "listing_views": ["PRO", "BUSINESS"],
    "new_review": ["PRO", "BUSINESS"],
    "daily_ai_report": ["BUSINESS"],
    "anomaly_alert": ["BUSINESS"],
    "ai_recommendations": ["BUSINESS"]
}

def get_user_plan_code(db: Session, user_id: int) -> str:
    active_sub = db.query(Subscription).filter(
        Subscription.user_id == user_id,
        Subscription.status == "active"
    ).first()
    if active_sub and active_sub.plan:
        return active_sub.plan.code.upper()
    return "FREE"

def can_receive_notification(db: Session, user_id: int, notif_type: str) -> tuple[bool, SubscriptionPlan | None, Subscription | None]:
    active_sub = db.query(Subscription).filter(
        Subscription.user_id == user_id,
        Subscription.status == "active"
    ).first()

    plan = active_sub.plan if active_sub else None
    plan_code = plan.code.upper() if plan else "FREE"

    allowed_plans = NOTIFICATION_PLAN_RULES.get(notif_type, ["FREE"])
    if plan_code not in allowed_plans:
        return False, plan, active_sub

    if plan:
        flag_map = {
            "message_contact": plan.notif_message_contact,
            "weekly_report": plan.notif_weekly_report,
            "listing_views": plan.notif_listing_views,
            "new_review": plan.notif_new_review,
            "daily_ai_report": plan.notif_daily_ai_report,
            "anomaly_alert": plan.notif_anomaly_alert,
            "ai_recommendations": plan.notif_ai_recommendations
        }
        is_enabled = flag_map.get(notif_type, True)
        return is_enabled, plan, active_sub

    return True, None, None

def dispatch_notification(db: Session, user_id: int, notif_type: str, title: str, message: str) -> bool:
    allowed, plan, subscription = can_receive_notification(db, user_id, notif_type)
    if not allowed:
        logger.info(f"Notification '{notif_type}' bloquée pour l'utilisateur {user_id}")
        return False

    try:
        db_notif = Notification(
            user_id=user_id,
            type=notif_type,
            title=title,
            message=message,
            is_read=False
        )
        db.add(db_notif)
        db.commit()
    except Exception as e:
        logger.error(f"Erreur d'enregistrement in-app pour {user_id}: {e}")
        db.rollback()

    if plan and plan.email_notifications:
        user = db.query(User).filter(User.id == user_id).first()
        if user and user.email:
            send_email_notification(user.email, title, message)

    if plan and plan.whatsapp_notifications and subscription and subscription.whatsapp_number:
        send_whatsapp_message(subscription.whatsapp_number, f"🔔 *{title}*\n\n{message}")

    return True

def send_email_notification(to_email: str, subject: str, body: str):
    import os
    smtp_host = os.getenv("SMTP_HOST")
    smtp_user = os.getenv("SMTP_USER")
    smtp_password = os.getenv("SMTP_PASSWORD")

    if not smtp_host or not smtp_user or not smtp_password:
        logger.info(f"[EMAIL MOCK SEND] Destinataire: {to_email} | Sujet: {subject}")
        return

    try:
        import smtplib
        from email.mime.text import MIMEText
        from email.mime.multipart import MIMEMultipart

        msg = MIMEMultipart()
        msg["From"] = os.getenv("FROM_EMAIL", "noreply@kukasoko.com")
        msg["To"] = to_email
        msg["Subject"] = subject
        msg.attach(MIMEText(body, "plain"))

        server = smtplib.SMTP(smtp_host, int(os.getenv("SMTP_PORT", 587)))
        server.starttls()
        server.login(smtp_user, smtp_password)
        server.sendmail(msg["From"], to_email, msg.as_string())
        server.quit()
        logger.info(f"E-mail envoyé avec succès à {to_email}")
    except Exception as e:
        logger.error(f"Erreur lors de l'envoi de l'e-mail SMTP: {e}")
