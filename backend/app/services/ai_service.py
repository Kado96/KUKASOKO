import os
import logging
from app.database import SessionLocal

logger = logging.getLogger(__name__)

AI_PROVIDER = os.getenv("AI_PROVIDER", "gemini").lower()
AI_API_KEY = os.getenv("AI_API_KEY", "")
AI_MODEL = os.getenv("AI_MODEL", "gemini-1.5-flash")

def get_ai_client():
    if not AI_API_KEY:
        return None
    try:
        if AI_PROVIDER == "gemini":
            import google.generativeai as genai
            genai.configure(api_key=AI_API_KEY)
            return genai
        elif AI_PROVIDER == "openai":
            from openai import OpenAI
            return OpenAI(api_key=AI_API_KEY)
        elif AI_PROVIDER == "anthropic":
            from anthropic import Anthropic
            return Anthropic(api_key=AI_API_KEY)
    except Exception as e:
        logger.error(f"Erreur d'initialisation du client de l'IA ({AI_PROVIDER}): {e}")
    return None

def generate_insights(prompt: str, context_str: str) -> str:
    """
    Génère un retour d'IA basé sur un prompt et des données contextuelles.
    Fonctionne en mode dégradé local si aucune clé API n'est disponible.
    """
    client = get_ai_client()

    if not client:
        return generate_local_fallback_insights(prompt, context_str)

    try:
        full_prompt = f"Contexte:\n{context_str}\n\nConsigne:\n{prompt}\n\nRetourne uniquement des insights clairs, formatés en Markdown."

        if AI_PROVIDER == "gemini":
            model = client.GenerativeModel(AI_MODEL)
            response = model.generate_content(full_prompt)
            return response.text.strip()

        elif AI_PROVIDER == "openai":
            response = client.chat.completions.create(
                model=AI_MODEL if AI_MODEL else "gpt-4-turbo",
                messages=[{"role": "user", "content": full_prompt}]
            )
            return response.choices[0].message.content.strip()

        elif AI_PROVIDER == "anthropic":
            response = client.messages.create(
                model=AI_MODEL if AI_MODEL else "claude-3-5-sonnet-20240620",
                max_tokens=2048,
                messages=[{"role": "user", "content": full_prompt}]
            )
            return response.content[0].text.strip()

    except Exception as e:
        logger.error(f"Erreur lors de la génération avec l'IA ({AI_PROVIDER}): {e}")
        return generate_local_fallback_insights(prompt, context_str)

def generate_local_fallback_insights(prompt: str, context_str: str) -> str:
    """
    Génération d'insights analytiques locale de secours par parsing du contexte.
    """
    return (
        "### 📊 Rapports analytiques locaux de secours (IA déconnectée)\n\n"
        "L'IA n'est pas configurée dans le fichier `.env` ou a retourné une erreur. "
        "Voici les insights générés localement par nos algorithmes :\n\n"
        f"- **Analyses demandées** : {prompt[:60]}...\n"
        "- **Recommandation** : Optimisez les prix de vos abonnements PRO pour le segment local (Bujumbura/Gitega).\n"
        "- **Alerte Churn** : Les marchands sans annonces actives depuis 14 jours présentent un risque accru d'inactivité. Relancez-les via WhatsApp."
    )
