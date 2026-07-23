export interface ListingTemplateData {
  id: number;
  title: string;
  category: string;
  price: string;
  currency?: string;
  image: string;
  date: string;
  rating: number;
  reviewCount: number;
  isVerified?: boolean;
  availability?: string;
  guarantee?: string;
  location?: string;
  sellerName?: string;
  sellerPhone?: string;
  url: string;
}

export interface SocialChannelConfig {
  id: string;
  name: string;
  icon: string;
  width: number;
  height: number;
  aspectRatio: string;
  description: string;
}

export const SOCIAL_CHANNELS: Record<string, SocialChannelConfig> = {
  instagram_post: {
    id: "instagram_post",
    name: "Instagram Feed",
    icon: "📷",
    width: 1080,
    height: 1080,
    aspectRatio: "1:1",
    description: "Format carré HD pour post Instagram",
  },
  instagram_story: {
    id: "instagram_story",
    name: "Story IG / FB / WA",
    icon: "📲",
    width: 1080,
    height: 1920,
    aspectRatio: "9:16",
    description: "Format vertical plein écran pour Story",
  },
  facebook_post: {
    id: "facebook_post",
    name: "Facebook Feed",
    icon: "📘",
    width: 1200,
    height: 630,
    aspectRatio: "1.91:1",
    description: "Format bannière paysage optimisé Facebook",
  },
  linkedin_post: {
    id: "linkedin_post",
    name: "LinkedIn",
    icon: "💼",
    width: 1200,
    height: 627,
    aspectRatio: "1.91:1",
    description: "Format professionnel pour réseau d'affaires",
  },
  twitter_post: {
    id: "twitter_post",
    name: "Twitter / X",
    icon: "🐦",
    width: 1200,
    height: 675,
    aspectRatio: "16:9",
    description: "Format carte optimisé pour Twitter / X",
  },
  whatsapp_thumb: {
    id: "whatsapp_thumb",
    name: "WhatsApp Mini",
    icon: "💬",
    width: 800,
    height: 800,
    aspectRatio: "1:1",
    description: "Vignette compacte pour aperçu de messagerie",
  },
};

/**
 * Génère le flux XML universel d'une annonce (Android + Web + Catalogs)
 */
export function generateListingXML(data: ListingTemplateData): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<kukasoko_listing id="${data.id}" generated_at="${new Date().toISOString()}">
  <meta>
    <platform>KUKASOKO Omnichannel</platform>
    <version>1.0</version>
    <url>${data.url}</url>
  </meta>
  <product>
    <title><![CDATA[${data.title}]]></title>
    <category>${data.category}</category>
    <price currency="${data.currency || 'BIF'}">${data.price}</price>
    <image_url>${data.image}</image_url>
    <date_added>${data.date}</date_added>
    <verification status="${data.isVerified ? 'verified' : 'standard'}" />
    <rating score="${data.rating}" count="${data.reviewCount}" />
    <specifications>
      <disponibilite>${data.availability || 'Immédiate'}</disponibilite>
      <garantie>${data.guarantee || 'Non spécifiée'}</garantie>
      <location>${data.location || 'Bujumbura'}</location>
    </specifications>
  </product>
  <seller>
    <name><![CDATA[${data.sellerName || 'Vendeur KUKASOKO'}]]></name>
    <phone>${data.sellerPhone || ''}</phone>
  </seller>
  <social_exports>
    <instagram_post_aspect>1:1 (1080x1080)</instagram_post_aspect>
    <story_aspect>9:16 (1080x1920)</story_aspect>
    <facebook_aspect>1.91:1 (1200x630)</facebook_aspect>
  </social_exports>
</kukasoko_listing>`;
}

/**
 * Génère les textes d'accompagnement optimisés par réseau social
 */
export function generateSocialCaptions(data: ListingTemplateData): Record<string, string> {
  const hashtags = `#KUKASOKO #${data.category.replace(/\s+/g, '')} #AchatVenteBurundi #Bujumbura #Marketplace`;
  
  return {
    whatsapp: `🛍️ *${data.title}*\n\n💰 *Prix:* ${data.price}\n⭐ *Note:* ${data.rating}/5 (${data.reviewCount} avis)\n📍 *Lieu:* ${data.location || 'Bujumbura'}\n\n👉 *Découvrez l'annonce complète ici :*\n${data.url}`,
    
    instagram: `✨ ${data.title} ✨\n\n📌 Catégorie : ${data.category}\n💵 Prix : ${data.price}\n⭐ Note clients : ${data.rating}/5\n${data.availability ? `⏱ Disponibilité : ${data.availability}\n` : ''}${data.guarantee ? `🛡 Garantie : ${data.guarantee}\n` : ''}\n🔗 Lien direct disponible en bio ou sur KUKASOKO !\n\n${hashtags}`,
    
    facebook: `📢 NOUVEAUTÉ SUR KUKASOKO !\n\n${data.title}\n\n🏷 Catégorie : ${data.category}\n💰 Prix : ${data.price}\n⭐ Évalué ${data.rating}/5 (${data.reviewCount} avis)\n\n📍 Disponible dès maintenant sur KUKASOKO :\n👉 ${data.url}\n\n${hashtags}`,
    
    linkedin: `[KUKASOKO Marketplace] Offre de service / Produit disponible\n\n${data.title}\nCatégorie : ${data.category}\nModalités : ${data.price}\nCertification vendeur : ${data.isVerified ? 'Vérifié ✅' : 'Standard'}\n\nPour en savoir plus ou contacter le prestataire :\n👉 ${data.url}`,
    
    twitter: `🔥 Découvrez sur KUKASOKO : ${data.title} (${data.price})\n⭐ ${data.rating}/5\n\n👉 Voir l'annonce : ${data.url}\n\n${hashtags}`,
  };
}
