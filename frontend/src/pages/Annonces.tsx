import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PageHero from "@/components/PageHero";
import { Star, Calendar, Search, SlidersHorizontal, Loader2, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { allListings } from "@/data/listings";
import ShareModal from "@/components/ShareModal";

import { listingsAPI, API_BASE } from "@/services/api";
import { CategorySearchFilters, type CatNode } from "@/components/CategorySearchFilters";
import { KukasokoBrain as kukasokoBrain, type KnowledgeItem } from "@/services/KukasokoBrainService";

type CatNodeLocal = CatNode;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Normalise et formate un listing API en objet d'affichage */
function apiToDisplay(l: any) {
  const rawImg = l.image || (l.image_urls ? l.image_urls.split(",")[0] : null);
  let image: string;
  if (!rawImg) {
    if (l.seller?.avatar_url) {
      const a = l.seller.avatar_url;
      image = a.startsWith("http") ? a : `${API_BASE}/${a}`;
    } else {
      const cat = (l.category?.name_fr || l.category?.name || "").toLowerCase();
      if (cat.includes("immobilier")) image = `${API_BASE}/media/listing/category-immobilier.jpg`;
      else if (cat.includes("service")) image = `${API_BASE}/media/listing/category-services.jpg`;
      else image = `${API_BASE}/media/listing/category-avendre.jpg`;
    }
  } else {
    image = rawImg.startsWith("http") ? rawImg : `${API_BASE}/${rawImg}`;
  }

  return {
    id: l.id,
    uniqueKey: `api-${l.id}`,
    title: l.title,
    description: l.description || "",
    price: l.price > 0 ? `${l.price.toLocaleString("fr-BI")} ${l.currency || "BIF"}` : "Sur devis",
    image,
    category: l.category?.name_fr || l.category?.name || "À vendre",
    // categoryId numérique (string) pour matcher les filtres
    categoryId: l.category_id != null ? String(l.category_id) : null,
    // parent_id si la catégorie est une sous-catégorie
    parentCategoryId: l.category?.parent_id != null ? String(l.category.parent_id) : null,
    rating: 5.0,
    reviews: 0,
    date: new Date(l.created_at).toLocaleDateString("fr-FR", {
      day: "numeric", month: "long", year: "numeric",
    }),
    details: [
      { label: "Localisation", value: l.address || l.city || "Bujumbura" },
    ],
    is_featured: l.is_featured || false,
  };
}

/** Convertit un KnowledgeItem BM25 (listing) en objet d'affichage */
function brainItemToDisplay(item: KnowledgeItem, index: number) {
  return {
    id: item.id,
    uniqueKey: `bm25-${item.id}-${index}`,
    title: item.title,
    description: item.body || "",
    price: item.price || "Sur devis",
    image: item.image || `${API_BASE}/media/listing/category-avendre.jpg`,
    category: item.category || "Annonce",
    categoryId: null,
    parentCategoryId: null,
    rating: 5.0,
    reviews: 0,
    date: "",
    details: [
      { label: "Localisation", value: item.city || "Bujumbura" },
    ],
  };
}

// ─── Composant ────────────────────────────────────────────────────────────────

const Annonces = () => {
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [filterSubCat, setFilterSubCat] = useState("all");
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tree, setTree] = useState<CatNodeLocal[]>([]);

  // BM25 search state
  const [brainResults, setBrainResults] = useState<any[] | null>(null);
  const [brainLoading, setBrainLoading] = useState(false);
  const brainTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [brainReady, setBrainReady] = useState(false);

  // Précharger l'index BM25 en background
  useEffect(() => {
    kukasokoBrain.load().then(() => setBrainReady(true)).catch(() => {});
  }, []);

  // Charger catégories + annonces au montage
  useEffect(() => {
    listingsAPI
      .getCategoriesTree()
      .then((res) => {
        if (Array.isArray(res.data)) setTree(res.data);
      })
      .catch(() => {});

    listingsAPI.getAll()
      .then((res) => {
        if (Array.isArray(res.data)) {
          const apiListings = res.data.map(apiToDisplay);
          setListings(apiListings);
        }
      })
      .catch(() => {
        const formattedMocks = allListings.map((m: any) => ({
          ...m,
          uniqueKey: `mock-${m.id}`,
          description: m.description || "",
          categoryId: m.category === "Immobilier" ? "1"
            : m.category === "Services" ? "3"
            : "2",
          parentCategoryId: null,
        }));
        setListings(formattedMocks);
      })
      .finally(() => setLoading(false));
  }, []);

  // Synchronise les filtres avec les paramètres d'URL
  useEffect(() => {
    const cat = searchParams.get("category") || searchParams.get("category_id");
    if (!cat || tree.length === 0) {
      if (cat) setFilterCat(cat);
      return;
    }
    const normalizedCat = cat.toLowerCase();
    const asParent = tree.find(
      (c) =>
        String(c.id) === cat ||
        (c.name_fr || c.name || "").toLowerCase() === normalizedCat
    );
    if (asParent) {
      setFilterCat(String(asParent.id));
      setFilterSubCat("all");
      return;
    }
    for (const parent of tree) {
      const child = parent.children?.find(
        (c) =>
          String(c.id) === cat ||
          (c.name_fr || c.name || "").toLowerCase() === normalizedCat
      );
      if (child) {
        setFilterCat(String(parent.id));
        setFilterSubCat(String(child.id));
        return;
      }
    }
    setFilterCat(cat);
  }, [searchParams, tree]);

  // BM25 search — déclenche après 400ms d'inactivité
  const runBrainSearch = useCallback((q: string) => {
    if (brainTimer.current) clearTimeout(brainTimer.current);
    if (!q.trim() || q.trim().length < 2) {
      setBrainResults(null);
      return;
    }
    brainTimer.current = setTimeout(async () => {
      setBrainLoading(true);
      try {
        if (!brainReady) await kukasokoBrain.load();
        const items = kukasokoBrain.search(q.trim(), ["listing"], 30);
        if (items.length > 0) {
          setBrainResults(items.map((item, i) => brainItemToDisplay(item, i)));
        } else {
          setBrainResults(null); // pas de résultat BM25 → fallback filtre texte
        }
      } catch {
        setBrainResults(null);
      } finally {
        setBrainLoading(false);
      }
    }, 400);
  }, [brainReady]);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    runBrainSearch(value);
  };

  // ─── Filtrage ───────────────────────────────────────────────────────────────

  const selectedParent = tree.find((c) => String(c.id) === filterCat);

  // IDs à inclure quand une catégorie parente est sélectionnée (parent + tous ses enfants)
  const allowedIds: Set<string> | null =
    filterCat !== "all" && filterSubCat === "all" && selectedParent
      ? new Set([
          String(selectedParent.id),
          ...(selectedParent.children || []).map((c) => String(c.id)),
        ])
      : null;

  // ID exact quand une sous-catégorie est sélectionnée
  const exactCatId = filterSubCat !== "all" ? filterSubCat : filterCat !== "all" ? filterCat : null;

  /**
   * Vérifie si un listing appartient à la catégorie filtrée.
   * Gère : categoryId direct, parentCategoryId, et matching par nom (fallback mocks).
   */
  function matchesCategoryFilter(l: any): boolean {
    if (filterCat === "all") return true;

    if (allowedIds) {
      // Cas : catégorie parente sélectionnée → inclure parent et sous-catégories
      if (l.categoryId && allowedIds.has(String(l.categoryId))) return true;
      if (l.parentCategoryId && allowedIds.has(String(l.parentCategoryId))) return true;
      // Fallback par nom (mocks)
      if (selectedParent) {
        const parentName = (selectedParent.name_fr || selectedParent.name || "").toLowerCase();
        const listingCat = (l.category || "").toLowerCase();
        if (listingCat.includes(parentName) || parentName.includes(listingCat)) return true;
        // Vérifier les sous-catégories par nom
        for (const child of selectedParent.children || []) {
          const childName = (child.name_fr || child.name || "").toLowerCase();
          if (listingCat.includes(childName) || childName.includes(listingCat)) return true;
        }
      }
      return false;
    }

    if (exactCatId) {
      // Cas : sous-catégorie sélectionnée → match exact
      if (String(l.categoryId) === exactCatId) return true;
      if (String(l.parentCategoryId) === exactCatId) return true;
      // Chercher dans l'arbre la sous-cat sélectionnée pour matcher par nom
      for (const parent of tree) {
        const child = parent.children?.find((c) => String(c.id) === exactCatId);
        if (child) {
          const childName = (child.name_fr || child.name || "").toLowerCase();
          const listingCat = (l.category || "").toLowerCase();
          return listingCat.includes(childName) || childName.includes(listingCat);
        }
      }
    }

    return false;
  }

  // Si BM25 a des résultats : les utiliser + appliquer le filtre catégorie
  // Sinon : recherche texte classique sur les listings locaux
  const displaySource = brainResults && search.trim().length >= 2
    ? brainResults
    : listings;

  const filtered = displaySource.filter((l) => {
    // Si on utilise les résultats BM25, pas de filtre texte supplémentaire
    const matchSearch = brainResults && search.trim().length >= 2
      ? true
      : (
          (l.title || "").toLowerCase().includes(search.toLowerCase()) ||
          (l.description || "").toLowerCase().includes(search.toLowerCase())
        );

    return matchSearch && matchesCategoryFilter(l);
  });

  const isBrainMode = !!(brainResults && search.trim().length >= 2);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-grow pt-16">
        {/* Hero Banner avec Carrousel HD & Recherche */}
        <PageHero
          title="Toutes les Annonces au Burundi"
          subtitle="Découvrez des milliers de biens, services et affaires vérifiés à Bujumbura et dans tout le pays."
          showSearch={true}
          compact={true}
        />
        <div className="container mx-auto px-4 py-8">
          {/* Filters */}
          <div className="mb-8 space-y-3">
            {/* Barre de recherche */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                id="annonces-search"
                name="search"
                type="search"
                autoComplete="off"
                placeholder="Rechercher une annonce... (recherche intelligente)"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full h-12 pl-10 pr-10 rounded-xl border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent shadow-sm"
              />
              {brainLoading && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-accent animate-spin" />
              )}
              {isBrainMode && !brainLoading && (
                <Sparkles className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-accent" title="Recherche intelligente active" />
              )}
            </div>

            {/* Filtres de catégorie */}
            <div className="bg-card rounded-xl border border-border p-3 shadow-sm">
              <CategorySearchFilters
                tree={tree}
                category={filterCat}
                subCategory={filterSubCat}
                onCategoryChange={(v) => {
                  setFilterCat(v);
                  setFilterSubCat("all");
                }}
                onSubCategoryChange={setFilterSubCat}
                variant="page"
              />
            </div>
          </div>

          {/* Indicateur mode BM25 */}
          {isBrainMode && (
            <div className="flex items-center gap-2 mb-3 text-xs text-accent">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Recherche intelligente activée — résultats classés par pertinence</span>
            </div>
          )}

          {/* Nombre de résultats */}
          <p className="text-sm text-muted-foreground mb-4">
            {loading ? "Chargement..." : `${filtered.length} annonce(s) trouvée(s)`}
          </p>

          {/* Grille des annonces */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-accent animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((listing) => (
                <div
                  key={listing.uniqueKey}
                  className={`bg-card rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-all duration-300 group flex flex-col justify-between ${
                    listing.is_featured ? 'ring-2 ring-amber-500 shadow-amber-500/15 scale-[1.01]' : ''
                  }`}
                >
                  <div>
                    <Link to={`/annonces/${listing.id}`} className="block relative aspect-[16/10] overflow-hidden">
                      <img
                        src={listing.image}
                        alt={listing.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                      <Badge className="absolute top-3 left-3 bg-accent text-accent-foreground border-0 font-semibold text-xs">
                        {listing.category}
                      </Badge>
                      {listing.is_featured && (
                        <Badge className="absolute top-3 right-3 bg-gradient-to-tr from-amber-500 to-yellow-400 text-black border-0 font-extrabold text-[10px] uppercase tracking-wider py-1 px-2 shadow-md">
                          ⭐ Urgent / VIP
                        </Badge>
                      )}
                    </Link>
                    <div className="p-5 pb-0">
                      <Link to={`/annonces/${listing.id}`}>
                        <h3 className="font-sans font-semibold text-foreground text-lg mb-2 group-hover:text-accent transition-colors">
                          {listing.title}
                        </h3>
                      </Link>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="flex items-center gap-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3.5 h-3.5 ${i < Math.floor(listing.rating ?? 5) ? "text-accent fill-accent" : "text-muted-foreground/30"}`}
                            />
                          ))}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {(listing.rating ?? 5).toFixed(1)} ({listing.reviews ?? 0})
                        </span>
                      </div>
                      {listing.date && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
                          <Calendar className="w-3.5 h-3.5" />
                          Ajouté le {listing.date}
                        </div>
                      )}
                      <div className="border-t border-border pt-3 space-y-1.5">
                        {(listing.details || []).map((d: any) => (
                          <div key={d.label} className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{d.label}</span>
                            <span className="font-medium text-foreground">{d.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="p-5 pt-3 border-t border-border mt-3 flex items-center justify-between">
                    <span className="font-bold text-foreground">{listing.price}</span>
                    <ShareModal
                      title={listing.title}
                      description={listing.description}
                      image={listing.image}
                      price={listing.price}
                      url={`/annonces/${listing.id}`}
                      variant="ghost"
                      size="sm"
                      className="hover:bg-secondary text-muted-foreground hover:text-accent"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <SlidersHorizontal className="w-12 h-12 mx-auto mb-4 opacity-40" />
              <p className="text-lg font-medium">Aucune annonce trouvée</p>
              <p className="text-sm mt-1">Essayez d'autres mots-clés ou catégories</p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Annonces;
