/**
 * SellerCoachService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Algorithme intelligent de coaching des vendeurs.
 * Il analyse les statistiques d'un vendeur et génère des recommandations
 * personnalisées pour l'encourager à passer à un plan payant,
 * améliorer sa boutique et augmenter ses ventes.
 */

import { API_BASE } from "./api";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SellerStats {
  totalListings: number;
  activeListings: number;
  totalViews: number;
  totalMessages: number;
  plan: "FREE" | "PRO" | "BUSINESS";
  hasShop: boolean;
  shopName?: string;
  featuredCount: number;
  daysActive: number;
}

export interface CoachMessage {
  type: "upgrade" | "tip" | "stats" | "encourage" | "warning";
  title: string;
  body: string;
  cta?: { label: string; link: string };
  icon: string;
}

// ─── Templates de messages selon le contexte ─────────────────────────────────

const PLAN_UPGRADE_TIPS: Record<string, CoachMessage[]> = {
  FREE: [
    {
      type: "upgrade",
      title: "🚀 Boostez votre visibilité !",
      icon: "⭐",
      body: "Vos annonces sont noyées dans la masse. Avec le plan **PRO** (10 000 BIF/mois), vous bénéficiez de l'option \"mise en avant\" qui place vos annonces **en tête de liste** et triple vos contacts !",
      cta: { label: "Passer au plan PRO →", link: "/pricing" },
    },
    {
      type: "stats",
      title: "📊 Votre boutique a du potentiel !",
      icon: "📈",
      body: "Vous avez **{totalViews}** vues sur vos annonces. Imaginez si vous étiez en tête de page ! Les vendeurs PRO obtiennent **3× plus de contacts** en moyenne.",
      cta: { label: "Voir les plans →", link: "/pricing" },
    },
    {
      type: "tip",
      title: "💡 Conseil de votre coach Kukasoko",
      icon: "💡",
      body: "Ajoutez des **photos de qualité** à vos annonces, un **prix précis** et une **description détaillée**. Les annonces complètes reçoivent 5× plus de messages !",
    },
    {
      type: "encourage",
      title: "🎉 Vous commencez bien !",
      icon: "🏅",
      body: "Avec **{totalListings}** annonce(s) publiée(s), vous faites partie des vendeurs actifs de Kukasoko. Continuez comme ça et envisagez le plan PRO pour aller encore plus loin !",
    },
  ],
  PRO: [
    {
      type: "tip",
      title: "🔥 Vous êtes PRO — Profitez-en !",
      icon: "⭐",
      body: "N'oubliez pas d'activer la **mise en avant** sur vos meilleures annonces. C'est gratuit avec votre plan PRO ! Allez dans \"Mes Annonces\" et cliquez sur l'étoile.",
    },
    {
      type: "stats",
      title: "📊 Vos performances cette semaine",
      icon: "📊",
      body: "Vos annonces cumulent **{totalViews}** vues et **{totalMessages}** messages reçus. C'est votre activité récente — continuez à publier régulièrement !",
    },
    {
      type: "upgrade",
      title: "👑 Le plan BUSINESS vous attend !",
      icon: "👑",
      body: "Avec le plan **BUSINESS** (25 000 BIF/mois), vous accédez aux rapports IA quotidiens, aux recommandations personnalisées et à 500 annonces actives. Idéal pour les commerces en pleine croissance !",
      cta: { label: "Découvrir BUSINESS →", link: "/pricing" },
    },
  ],
  BUSINESS: [
    {
      type: "encourage",
      title: "👑 Vous êtes au sommet !",
      icon: "🏆",
      body: "Plan BUSINESS actif — vous avez accès à toutes les fonctionnalités. Vos annonces sont priorisées et vous recevez des rapports IA chaque jour. Continuez à publier et à mettre vos produits en avant !",
    },
    {
      type: "stats",
      title: "📊 Rapport hebdomadaire IA",
      icon: "🤖",
      body: "**{totalListings}** annonces actives · **{totalViews}** vues · **{totalMessages}** messages. Conseil : répondez rapidement aux messages pour maximiser vos conversions.",
    },
  ],
};

const WARNING_TIPS: CoachMessage[] = [
  {
    type: "warning",
    title: "⚠️ Vos annonces manquent d'images !",
    icon: "📸",
    body: "Les acheteurs cliquent **6× plus** sur les annonces avec photos. Ajoutez au moins 3 photos de qualité à chaque annonce.",
  },
  {
    type: "warning",
    title: "⏰ Mettez à jour vos annonces !",
    icon: "🔄",
    body: "Les annonces récentes sont mieux référencées. Actualisez ou republiez vos annonces toutes les semaines pour rester visible.",
  },
];

// ─── Classe principale ────────────────────────────────────────────────────────

class SellerCoachServiceClass {

  /**
   * Récupère les statistiques réelles du vendeur depuis l'API
   */
  async fetchStats(token: string): Promise<SellerStats> {
    const headers = { Authorization: `Bearer ${token}` };

    let totalListings = 0;
    let activeListings = 0;
    let totalViews = 0;
    let totalMessages = 0;
    let plan: "FREE" | "PRO" | "BUSINESS" = "FREE";
    let hasShop = false;
    let shopName: string | undefined;
    let featuredCount = 0;
    let daysActive = 0;

    try {
      // Annonces du vendeur
      const listRes = await fetch(`${API_BASE}/api/listings/?limit=100`, { headers });
      if (listRes.ok) {
        const data = await listRes.json();
        const listings = Array.isArray(data) ? data : data.items ?? [];
        totalListings = listings.length;
        activeListings = listings.filter((l: any) => l.is_active !== false).length;
        featuredCount = listings.filter((l: any) => l.is_featured).length;
        // Estimation vues (si disponible via le champ views ou reviews)
        totalViews = listings.reduce((acc: number, l: any) => acc + (l.views ?? l.review_count ?? 0), 0);
        // Jours actif depuis la 1ère annonce
        if (listings.length > 0) {
          const oldest = listings.reduce((a: any, b: any) =>
            new Date(a.created_at) < new Date(b.created_at) ? a : b
          );
          daysActive = Math.floor(
            (Date.now() - new Date(oldest.created_at).getTime()) / (1000 * 60 * 60 * 24)
          );
        }
      }
    } catch { /**/ }

    try {
      // Abonnement actuel
      const subRes = await fetch(`${API_BASE}/api/subscriptions/my`, { headers });
      if (subRes.ok) {
        const sub = await subRes.json();
        if (sub?.plan?.code) plan = sub.plan.code;
      }
    } catch { /**/ }

    try {
      // Boutique du vendeur
      const shopRes = await fetch(`${API_BASE}/api/merchants/me`, { headers });
      if (shopRes.ok) {
        const shop = await shopRes.json();
        hasShop = !!shop?.shop_name;
        shopName = shop?.shop_name;
      }
    } catch { /**/ }

    try {
      // Messages reçus
      const msgRes = await fetch(`${API_BASE}/api/messages/conversations`, { headers });
      if (msgRes.ok) {
        const convs = await msgRes.json();
        totalMessages = Array.isArray(convs)
          ? convs.reduce((acc: number, c: any) => acc + (c.unread_count ?? 1), 0)
          : 0;
      }
    } catch { /**/ }

    return { totalListings, activeListings, totalViews, totalMessages, plan, hasShop, shopName, featuredCount, daysActive };
  }

  /**
   * Génère des messages de coaching personnalisés selon les stats du vendeur
   */
  generateMessages(stats: SellerStats): CoachMessage[] {
    const messages: CoachMessage[] = [];
    const pool = [...(PLAN_UPGRADE_TIPS[stats.plan] ?? PLAN_UPGRADE_TIPS.FREE)];

    // Ajouter un message d'avertissement si peu d'annonces ou pas de boutique
    if (!stats.hasShop && stats.plan === "FREE") {
      messages.push({
        type: "tip",
        title: "🏪 Créez votre boutique !",
        icon: "🏪",
        body: "Vous n'avez pas encore de boutique sur Kukasoko. Créez-en une gratuitement pour fidéliser vos clients et afficher tous vos produits au même endroit.",
        cta: { label: "Créer ma boutique →", link: "/ma-boutique" },
      });
    }

    if (stats.totalListings === 0) {
      messages.push({
        type: "tip",
        title: "📝 Publiez votre première annonce !",
        icon: "✨",
        body: "Commencez par publier votre première annonce. C'est gratuit et rapide ! Ajoutez des photos, un prix et une description claire pour attirer vos premiers acheteurs.",
        cta: { label: "Publier maintenant →", link: "/ajouter-annonce" },
      });
    }

    // Avertissements contextuels
    if (stats.totalViews < 10 && stats.totalListings > 0) {
      messages.push(WARNING_TIPS[0]);
    }

    // 3 messages du pool principal, en substituant les variables
    const selected = pool.slice(0, 3);
    for (const msg of selected) {
      messages.push({
        ...msg,
        body: msg.body
          .replace("{totalListings}", String(stats.totalListings))
          .replace("{totalViews}", String(stats.totalViews))
          .replace("{totalMessages}", String(stats.totalMessages))
          .replace("{plan}", stats.plan)
          .replace("{shopName}", stats.shopName ?? "votre boutique"),
      });
    }

    return messages.slice(0, 4); // Maximum 4 messages
  }

  /**
   * Retourne l'heure de salutation selon l'heure locale
   */
  getGreeting(name: string): string {
    const h = new Date().getHours();
    const salut = h < 12 ? "Bonjour" : h < 18 ? "Bon après-midi" : "Bonsoir";
    return `${salut} ${name} ! 👋`;
  }
}

export const SellerCoachService = new SellerCoachServiceClass();
