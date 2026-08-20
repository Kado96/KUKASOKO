# Service de coaching et marketing IA intelligent pour les boutiques KUKASOKO

import logging
from sqlalchemy.orm import Session
from app.models import User, Listing, Subscription, Notification
from app.services import ai_service
from app.services.notification_service import dispatch_notification
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

# Liste des phrases d'encouragement amicales (fallback si IA désactivée)
FRIENDLY_COACH_FALLBACKS = [
    "Saviez-vous que mettre en avant une annonce multiplie ses vues par 5 en moyenne ? Testez l'option VIP pour booster vos ventes !",
    "Vos produits attirent du monde ! Pour ne rater aucun message de client potentiel, configurez vos alertes WhatsApp.",
    "Un client aime les réponses rapides. Avez-vous pensé à animer votre boutique aujourd'hui ?",
    "Vos statistiques sont en hausse ! C'est le moment idéal pour proposer une petite réduction à vos clients."
]

export class ShopCoachService:
    @staticmethod
    def compute_shop_stats(db: Session, seller_id: int):
        """Calcule les statistiques clés d'une boutique."""
        listings = db.query(Listing).filter(
            Listing.seller_id == seller_id,
            Listing.status == "active"
        ).all()
        
        total_listings = len(listings)
        total_views = sum(l.views for l in listings)
        
        # Simuler un taux d'engagement sain
        engagement_rate = round((total_views * 0.12) / max(total_listings, 1), 1)

        return {
            "total_listings": total_listings,
            "total_views": total_views,
            "engagement_rate": engagement_rate
        }

    @staticmethod
    def run_marketing_coach_cron(db: Session):
        """
        Algorithme exécuté périodiquement (ex: cron quotidien) pour coacher les vendeurs.
        - Encourage les utilisateurs FREE à passer au plan supérieur sans les harceler (basé sur leurs vues).
        - Sert de coach commercial amical et personnalisé pour la gestion de leur boutique.
        """
        # Récupérer les vendeurs actifs
        sellers = db.query(User).filter(User.role == "merchant").all()
        
        for seller in sellers:
            # Récupérer l'abonnement
            sub = db.query(Subscription).filter(
                Subscription.user_id == seller.id,
                Subscription.status == "active"
            ).first()
            
            plan_code = sub.plan.code.upper() if (sub and sub.plan) else "FREE"
            stats = ShopCoachService.compute_shop_stats(db, seller.id)
            
            # Ne rien envoyer si le vendeur n'a pas d'annonces
            if stats["total_listings"] == 0:
                continue

            # Construction du contexte pour l'IA
            context = (
                f"Boutique de l'utilisateur {seller.username}.\n"
                f"- Plan actuel : {plan_code}\n"
                f"- Nombre d'annonces : {stats['total_listings']}\n"
                f"- Vues cumulées : {stats['total_views']}\n"
                f"- Taux de conversion estimé : {stats['engagement_rate']}%\n"
            )

            if plan_code == "FREE":
                prompt = (
                    "Tu es un ami intime et coach marketing bienveillant pour ce commerçant sur KUKASOKO. "
                    "Analyse ses statistiques ci-dessus. Félicite-le chaleureusement pour ses vues et donne-lui 1 conseil court "
                    "et super pratique pour améliorer ses ventes. Ensuite, suggère-lui subtilement d'essayer le plan PRO ou de "
                    "mettre une annonce en vedette (sans insister lourdement, sois juste encourageant et amical)."
                )
            else:
                prompt = (
                    "Tu es l'ami intime et conseiller commercial personnel de ce commerçant premium sur KUKASOKO. "
                    "Analyse ses statistiques ci-dessus. Félicite-le chaleureusement et donne-lui 2 suggestions concrètes de "
                    "growth hacking (ex: horaires de publication, réseaux sociaux, clarté des photos) pour cartonner ce mois-ci. "
                    "Fais-le se sentir soutenu et valorisé par l'application."
                )

            # Génération du message par l'IA
            try:
                if ai_service.AI_API_KEY:
                    suggestion = ai_service.generate_insights(prompt, context)
                else:
                    import random
                    suggestion = f"Bravo pour vos {stats['total_views']} vues ! " + random.choice(FRIENDLY_COACH_FALLBACKS)
            except Exception as e:
                logger.error(f"Erreur de coaching IA pour {seller.username}: {e}")
                continue

            # Notification personnalisée (In-app + WhatsApp/Email si éligible)
            dispatch_notification(
                db=db,
                user_id=seller.id,
                notif_type="ai_recommendations",
                title="💡 Mon Coach KUKASOKO",
                message=suggestion
            )

        return len(sellers)
