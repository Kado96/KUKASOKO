/**
 * KukasokoBrainService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Cerveau du chatbot Kukasoko.
 * Charge et indexe tout le contenu du site (annonces, boutiques, blog, catégories)
 * puis répond aux questions des utilisateurs avec un algorithme BM25 + détection
 * d'intention (intent detection).
 */

import { API_BASE } from "./api";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface KnowledgeItem {
  type: "listing" | "shop" | "blog" | "category" | "faq";
  id: string | number;
  title: string;
  body: string; // texte indexé (description, excerpt, tags…)
  price?: string;
  image?: string;
  city?: string;
  category?: string;
  url: string;
  meta?: Record<string, unknown>;
}

export interface ChatbotResult {
  intent: Intent;
  answer: string;
  items: KnowledgeItem[];
  suggestions: string[];
}

type Intent =
  | "SEARCH_PRODUCT"
  | "FIND_SHOP"
  | "READ_BLOG"
  | "MAP_SEARCH"
  | "PRICE_QUERY"
  | "HOW_TO"
  | "GREETING"
  | "CATEGORY_BROWSE"
  | "FAQ"
  | "UNKNOWN";

// ─── Constantes ───────────────────────────────────────────────────────────────

const CACHE_KEY = "kukasoko_brain_cache";
const CACHE_VERSION = "v2"; // Incrémentez ici pour invalider le cache
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// ─── Stopwords FR ─────────────────────────────────────────────────────────────

const STOPWORDS = new Set([
  "le","la","les","un","une","des","de","du","en","et","ou","mais","donc",
  "or","ni","car","ce","cet","cette","ces","mon","ma","mes","ton","ta","tes",
  "son","sa","ses","notre","votre","leur","leurs","je","tu","il","elle","nous",
  "vous","ils","elles","me","te","se","y","par","sur","sous","dans","avec",
  "pour","que","qui","quoi","dont","où","comment","est","sont","a","au","aux",
  "être","avoir","faire","quel","quelle","quels","quelles","tout","tous","toute",
  "toutes","plus","très","bien","aussi","pas","ne","se","si","même","puis",
]);

// ─── Normalisation ────────────────────────────────────────────────────────────

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(text: string): string[] {
  return normalize(text)
    .split(" ")
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));
}

// ─── Algorithme BM25 ─────────────────────────────────────────────────────────
// BM25 = meilleure variante de TF-IDF, standard dans la recherche documentaire

const BM25_K1 = 1.5;
const BM25_B = 0.75;

function bm25Score(
  queryTokens: string[],
  docTokens: string[],
  avgDocLen: number,
  docCount: number,
  df: Map<string, number>
): number {
  const docLen = docTokens.length;
  const freq = new Map<string, number>();
  for (const t of docTokens) freq.set(t, (freq.get(t) ?? 0) + 1);

  let score = 0;
  for (const qt of queryTokens) {
    const tf = freq.get(qt) ?? 0;
    if (tf === 0) continue;
    const idf = Math.log(
      (docCount - (df.get(qt) ?? 0) + 0.5) / ((df.get(qt) ?? 0) + 0.5) + 1
    );
    const numerator = tf * (BM25_K1 + 1);
    const denominator = tf + BM25_K1 * (1 - BM25_B + BM25_B * (docLen / avgDocLen));
    score += idf * (numerator / denominator);
  }
  return score;
}

// ─── Classe principale ────────────────────────────────────────────────────────

class KukasokoBrainService {
  private knowledge: KnowledgeItem[] = [];
  private tokenizedDocs: string[][] = [];
  private df: Map<string, number> = new Map();
  private avgDocLen = 0;
  private lastLoad = 0;
  private loading = false;
  private adminFaqs: { keywords: string[]; answer: string }[] = [];

  // ─── Chargement de la base de connaissance ──────────────────────────────────

  async load(force = false): Promise<void> {
    const now = Date.now();
    if (!force && this.knowledge.length > 0 && now - this.lastLoad < CACHE_TTL) return;
    if (this.loading) return;

    // Essaie d'abord le cache localStorage
    if (!force) {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed.version === CACHE_VERSION && now - parsed.ts < CACHE_TTL) {
            this.knowledge = parsed.items;
            this.buildIndex();
            this.lastLoad = parsed.ts;
            return;
          }
        } catch {
          // ignore
        }
      }
    }

    this.loading = true;
    const items: KnowledgeItem[] = [];

    // Charger FAQ admin depuis localStorage
    const adminFaqRaw = localStorage.getItem("chatbot_faqs");
    if (adminFaqRaw) {
      try { this.adminFaqs = JSON.parse(adminFaqRaw); } catch { /**/ }
    }

    try {
      // 1. Annonces
      const listingsRes = await fetch(`${API_BASE}/api/listings/?limit=200`, {
        headers: { "Content-Type": "application/json" },
      });
      if (listingsRes.ok) {
        const data = await listingsRes.json();
        const listings = Array.isArray(data) ? data : data.items ?? data.results ?? [];
        for (const l of listings) {
          const cat = l.category?.name_fr || l.category?.name || l.category || "";
          const price = l.price != null ? `${l.price} BIF` : "Sur devis";
          const imgRaw = l.image_urls ? l.image_urls.split(",")[0] : l.image ?? "";
          const imgFull = imgRaw
            ? imgRaw.startsWith("http")
              ? imgRaw
              : `${API_BASE}/${imgRaw}`
            : "";
          items.push({
            type: "listing",
            id: l.id,
            title: l.title || "Annonce",
            body: [l.title, l.description, cat, l.city, l.tags].filter(Boolean).join(" "),
            price,
            image: imgFull,
            city: l.city || "Bujumbura",
            category: cat,
            url: `/annonces/${l.id}`,
            meta: { rating: l.rating, availability: l.availability },
          });
        }
      }
    } catch {/***/}

    try {
      // 2. Boutiques / Marchands
      const shopsRes = await fetch(`${API_BASE}/api/merchants/`, {
        headers: { "Content-Type": "application/json" },
      });
      if (shopsRes.ok) {
        const shops = await shopsRes.json();
        const shopList = Array.isArray(shops) ? shops : shops.items ?? [];
        for (const s of shopList) {
          const imgFull = s.logo_url
            ? s.logo_url.startsWith("http") ? s.logo_url : `${API_BASE}/${s.logo_url}`
            : "";
          items.push({
            type: "shop",
            id: s.id,
            title: s.shop_name || s.name || "Boutique",
            body: [s.shop_name, s.description, s.category, s.city].filter(Boolean).join(" "),
            image: imgFull,
            city: s.city || "Bujumbura",
            category: s.category || "Commerce",
            url: `/marchand/${s.id}`,
            meta: { subscription: s.subscription_pack },
          });
        }
      }
    } catch {/***/}

    try {
      // 3. Articles de blog (localStorage + données statiques)
      const blogRaw = localStorage.getItem("kukasoko-blog-posts");
      const blogPosts = blogRaw ? JSON.parse(blogRaw) : [];
      for (const p of blogPosts) {
        items.push({
          type: "blog",
          id: p.id,
          title: p.title,
          body: [p.title, p.excerpt, p.content, ...(p.tags || [])].filter(Boolean).join(" "),
          image: p.image || "",
          category: p.category || "Blog",
          url: `/blog/${p.id}`,
          meta: { date: p.date, excerpt: p.excerpt },
        });
      }
    } catch {/***/}

    try {
      // 4. Catégories
      const catRes = await fetch(`${API_BASE}/api/listings/categories/all`, {
        headers: { "Content-Type": "application/json" },
      });
      if (catRes.ok) {
        const cats = await catRes.json();
        for (const c of Array.isArray(cats) ? cats : []) {
          items.push({
            type: "category",
            id: c.id,
            title: c.name_fr || c.name,
            body: [c.name_fr, c.name].filter(Boolean).join(" "),
            category: c.name_fr || c.name,
            url: `/annonces?category_id=${c.id}`,
          });
        }
      }
    } catch {/***/}

    this.knowledge = items;
    this.buildIndex();
    this.lastLoad = Date.now();
    this.loading = false;

    // Mise en cache
    try {
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({ ts: this.lastLoad, version: CACHE_VERSION, items })
      );
    } catch {/***/}
  }

  // ─── Construction de l'index BM25 ──────────────────────────────────────────

  private buildIndex(): void {
    this.tokenizedDocs = this.knowledge.map((k) => tokenize(k.body));
    this.df = new Map();
    let totalLen = 0;
    for (const doc of this.tokenizedDocs) {
      totalLen += doc.length;
      const seen = new Set<string>();
      for (const t of doc) {
        if (!seen.has(t)) {
          this.df.set(t, (this.df.get(t) ?? 0) + 1);
          seen.add(t);
        }
      }
    }
    this.avgDocLen = this.tokenizedDocs.length > 0
      ? totalLen / this.tokenizedDocs.length
      : 1;
  }

  // ─── Détection d'intention ─────────────────────────────────────────────────

  private detectIntent(input: string): Intent {
    const n = normalize(input);

    if (/\b(bonjour|salut|hello|bonsoir|hi|hey|coucou)\b/.test(n)) return "GREETING";

    if (/\b(carte|map|localise|geolocalisation|adresse|ou est|trouver sur|quartier|avenue|rue)\b/.test(n))
      return "MAP_SEARCH";

    if (/\b(blog|article|conseil|guide|actualite|lire|astuce|tuto)\b/.test(n))
      return "READ_BLOG";

    if (/\b(boutique|magasin|vendeur|marchand|shop|commerce|fournisseur)\b/.test(n))
      return "FIND_SHOP";

    if (/\b(combien|prix|cout|tarif|budget|franc|bif|fbu|gratuit|pas cher|cher)\b/.test(n))
      return "PRICE_QUERY";

    if (/\b(comment|aide|comment faire|comment publier|comment creer|pourquoi|explication)\b/.test(n))
      return "HOW_TO";

    if (
      /\b(cherche|trouv|achete|vend|loue|disponible|annonce|produit|service|appartement|chambre|voiture|telephone|moto|ordinateur|terrain|maison|vetement|meuble|electronique)\b/.test(n)
    )
      return "SEARCH_PRODUCT";

    if (/\b(categorie|type|domaine|secteur|immobilier|services|electronique)\b/.test(n))
      return "CATEGORY_BROWSE";

    // Si la requête contient des mots substantiels, on tente une recherche
    const tokens = tokenize(input);
    if (tokens.length >= 1) return "SEARCH_PRODUCT";

    return "UNKNOWN";
  }

  // ─── Recherche BM25 ────────────────────────────────────────────────────────

  /** Recherche BM25 publique – utilisable directement depuis les pages */
  search(
    query: string,
    typeFilter?: KnowledgeItem["type"][],
    topK = 20
  ): KnowledgeItem[] {
    const queryTokens = tokenize(query);
    if (queryTokens.length === 0) return [];

    const scores: { item: KnowledgeItem; score: number }[] = [];

    for (let i = 0; i < this.knowledge.length; i++) {
      const item = this.knowledge[i];
      if (typeFilter && !typeFilter.includes(item.type)) continue;

      const score = bm25Score(
        queryTokens,
        this.tokenizedDocs[i],
        this.avgDocLen,
        this.knowledge.length,
        this.df
      );

      if (score > 0) scores.push({ item, score });
    }

    return scores
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .map((s) => s.item);
  }

  // ─── Réponse FAQ Admin ─────────────────────────────────────────────────────

  private matchAdminFaq(input: string): string | null {
    const n = normalize(input);
    for (const faq of this.adminFaqs) {
      if (faq.keywords.some((kw: string) => n.includes(normalize(kw)))) {
        return faq.answer;
      }
    }
    return null;
  }

  // ─── Réponse principale ────────────────────────────────────────────────────

  async answer(userInput: string): Promise<ChatbotResult> {
    await this.load();

    const intent = this.detectIntent(userInput);
    let answer = "";
    let items: KnowledgeItem[] = [];
    let suggestions: string[] = [];

    // Vérifier les FAQ admin en premier
    const faqMatch = this.matchAdminFaq(userInput);

    switch (intent) {
      case "GREETING":
        answer =
          `Bonjour ! 👋 Je suis l'assistant intelligent de **Kukasoko**.\n\nJe connais toutes les annonces, boutiques et articles du site. Posez-moi n'importe quelle question !\n\n` +
          `📊 Ma base contient : ${this.knowledge.filter((k) => k.type === "listing").length} annonces · ` +
          `${this.knowledge.filter((k) => k.type === "shop").length} boutiques · ` +
          `${this.knowledge.filter((k) => k.type === "blog").length} articles`;
        suggestions = [
          "Chercher un appartement",
          "Trouver une boutique",
          "Lire le blog",
          "Comment publier une annonce ?",
        ];
        break;

      case "SEARCH_PRODUCT":
        items = this.search(userInput, ["listing"]);
        if (items.length > 0) {
          answer = `🔍 J'ai trouvé **${items.length} annonce(s)** pour votre recherche :`;
        } else {
          answer =
            "😕 Aucune annonce trouvée pour cette recherche.\n\n💡 Essayez des termes plus généraux ou consultez toutes les annonces.";
        }
        suggestions = ["Voir toutes les annonces", "Chercher par catégorie", "Trouver une boutique"];
        break;

      case "FIND_SHOP":
        items = this.search(userInput, ["shop"]);
        if (items.length > 0) {
          answer = `🏪 J'ai trouvé **${items.length} boutique(s)** correspondante(s) :`;
        } else {
          answer = "😕 Aucune boutique trouvée.\n\nConsultez la page Boutiques pour voir tous nos marchands.";
        }
        suggestions = ["Voir toutes les boutiques", "Créer ma boutique", "Chercher une annonce"];
        break;

      case "READ_BLOG":
        items = this.search(userInput, ["blog"]);
        if (items.length > 0) {
          answer = `📰 J'ai trouvé **${items.length} article(s)** sur ce sujet :`;
        } else {
          answer = "📰 Consultez notre blog pour des articles, conseils et actualités Kukasoko.";
        }
        suggestions = ["Voir tous les articles", "Conseils pour vendre", "Actualités Kukasoko"];
        break;

      case "MAP_SEARCH": {
        const place = userInput.replace(/\b(carte|map|localise|ou est|trouver)\b/gi, "").trim();
        answer = `🗺️ Je vous redirige vers la carte Kukasoko${place ? ` pour « ${place} »` : ""}.\n\nVous pouvez y voir toutes les annonces géolocalisées et les boutiques proches de vous.`;
        items = [{
          type: "listing",
          id: "map",
          title: "Ouvrir la carte Kukasoko",
          body: "carte interactive geolocalisation annonces boutiques",
          url: place ? `/carte?q=${encodeURIComponent(place)}` : "/carte",
          meta: { isMapLink: true },
        }];
        suggestions = ["Annonces près de moi", "Boutiques sur la carte", "Comment se faire livrer ?"];
        break;
      }

      case "PRICE_QUERY": {
        items = this.search(userInput, ["listing"]);
        if (items.length > 0) {
          const withPrice = items.filter((i) => i.price && i.price !== "Sur devis");
          answer = withPrice.length > 0
            ? `💰 Voici des annonces avec leurs prix pour votre recherche :`
            : `💰 Voici des annonces correspondantes (prix sur demande) :`;
        } else {
          answer =
            "💰 Les prix varient selon les annonces. Consultez nos annonces pour des devis précis.\n\nLes abonnements vendeurs sont aussi disponibles dans la section Abonnement.";
        }
        suggestions = ["Voir les annonces", "Filtrer par prix", "Abonnements vendeur"];
        break;
      }

      case "HOW_TO":
        // Répondre avec la FAQ admin si disponible, sinon réponses par défaut
        if (faqMatch) {
          answer = faqMatch;
        } else {
          answer =
            "💡 Voici ce que je peux vous expliquer :\n\n" +
            "📢 **Publier une annonce** : Connexion → « Ajouter une annonce » → Formulaire → Valider\n\n" +
            "🏪 **Créer une boutique** : Menu → « Ma Boutique » → Remplir le profil\n\n" +
            "🚚 **Se faire livrer** : Le vendeur voit votre position sur la carte pour organiser la livraison\n\n" +
            "⭐ **Laisser un avis** : Page annonce → « Rédiger un avis »\n\n" +
            "🚨 **Signaler** : Page annonce → « Signaler l'annonce »";
        }
        suggestions = [
          "Publier une annonce",
          "Créer ma boutique",
          "Comment se faire livrer ?",
          "Contact support",
        ];
        break;

      case "CATEGORY_BROWSE": {
        const cats = this.search(userInput, ["category"]);
        if (cats.length > 0) {
          answer = `📂 Voici les catégories qui correspondent :`;
          items = cats;
        } else {
          const allCats = this.knowledge.filter((k) => k.type === "category").slice(0, 5);
          answer = "📂 Voici nos principales catégories :";
          items = allCats;
        }
        suggestions = ["Annonces immobilier", "Services disponibles", "À vendre"];
        break;
      }

      default: {
        if (faqMatch) {
          answer = faqMatch;
          suggestions = ["Chercher une annonce", "Trouver une boutique", "Lire le blog"];
          break;
        }
        // Tentative de recherche universelle
        const universalResults = this.search(userInput);
        if (universalResults.length > 0) {
          answer = `🔎 Voici ce que j'ai trouvé sur **Kukasoko** :`;
          items = universalResults;
        } else {
          answer =
            "🤔 Je n'ai pas trouvé de résultat précis.\n\n" +
            "Essayez de me poser une question sur :\n" +
            "• 🛒 Une annonce (ex: « cherche une moto »)\n" +
            "• 🏪 Une boutique (ex: « boutique électronique »)\n" +
            "• 📰 Un article (ex: « conseils pour vendre »)\n" +
            "• 🗺️ La carte (ex: « localiser Bujumbura centre »)";
        }
        suggestions = ["Toutes les annonces", "Nos boutiques", "Lire le blog", "Aide"];
        break;
      }
    }

    // Priorité FAQ admin si détectée mais intent != HOW_TO
    if (faqMatch && intent !== "HOW_TO" && items.length === 0) {
      answer = faqMatch;
    }

    return { intent, answer, items, suggestions };
  }

  // ─── Statistiques ──────────────────────────────────────────────────────────

  getStats() {
    return {
      total: this.knowledge.length,
      listings: this.knowledge.filter((k) => k.type === "listing").length,
      shops: this.knowledge.filter((k) => k.type === "shop").length,
      blogs: this.knowledge.filter((k) => k.type === "blog").length,
      categories: this.knowledge.filter((k) => k.type === "category").length,
      lastLoad: this.lastLoad,
    };
  }

  async forceRefresh(): Promise<void> {
    localStorage.removeItem(CACHE_KEY);
    await this.load(true);
  }
}

// Singleton exporté
export const KukasokoBrain = new KukasokoBrainService();
