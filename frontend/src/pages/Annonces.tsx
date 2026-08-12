import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Star, Calendar, Search, SlidersHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { allListings } from "@/data/listings";
import ShareModal from "@/components/ShareModal";

import { listingsAPI, API_BASE } from "@/services/api";
import { CategorySearchFilters, type CatNode } from "@/components/CategorySearchFilters";

type CatNodeLocal = CatNode;

const Annonces = () => {
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [filterSubCat, setFilterSubCat] = useState("all");
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tree, setTree] = useState<CatNodeLocal[]>([]);

  useEffect(() => {
    listingsAPI
      .getCategoriesTree()
      .then((res) => {
        if (Array.isArray(res.data)) setTree(res.data);
      })
      .catch(() => {});

    // Charger les annonces réelles du backend
    listingsAPI.getAll()
      .then((res) => {
        if (Array.isArray(res.data)) {
          // Transformer le format backend en format d'affichage du frontend
          const apiListings = res.data.map((l: any) => ({
            id: l.id,
            uniqueKey: `api-${l.id}`,
            title: l.title,
            description: l.description,
            price: l.price > 0 ? `${l.price.toLocaleString("fr-BI")} ${l.currency || "BIF"}` : "Sur devis",
            image: (() => {
              const rawImg = l.image || (l.image_urls ? l.image_urls.split(",")[0] : null);
              if (!rawImg) {
                // Tenter d'utiliser l'avatar / logo du vendeur
                if (l.seller?.avatar_url) {
                  const avatar = l.seller.avatar_url;
                  if (avatar.startsWith("http://") || avatar.startsWith("https://")) return avatar;
                  return `${API_BASE}/${avatar}`;
                }
                // Fallback sur image par défaut de catégorie
                const cat = (l.category?.name_fr || l.category?.name || "").toLowerCase();
                if (cat.includes("immobilier")) return `${API_BASE}/media/listing/category-immobilier.jpg`;
                if (cat.includes("service")) return `${API_BASE}/media/listing/category-services.jpg`;
                return `${API_BASE}/media/listing/category-avendre.jpg`;
              }
              if (rawImg.startsWith("http://") || rawImg.startsWith("https://")) return rawImg;
              return `${API_BASE}/${rawImg}`;
            })(),
            category: l.category?.name_fr || l.category?.name || "À vendre",
            categoryId: String(l.category_id),
            parentCategoryId: l.category?.parent_id ? String(l.category.parent_id) : null,
            rating: 5.0,
            reviews: 0,
            date: new Date(l.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }),
            details: [
              { label: "Localisation", value: l.address || l.city || "Bujumbura" }
            ]
          }));
          
          // Fusionner les annonces API au début, puis les mocks pour garnir le site
          const formattedMocks = allListings.map((m: any) => ({
            ...m,
            uniqueKey: `mock-${m.id}`,
            categoryId: m.category === "Immobilier" ? "1" : m.category === "Véhicules" ? "2" : m.category === "Services" ? "3" : "4",
            parentCategoryId: null,
          }));
          setListings([...apiListings, ...formattedMocks]);
        }
      })
      .catch((err) => {
        console.error("Erreur chargement annonces:", err);
        // Fallback complet sur les mocks
        const formattedMocks = allListings.map((m: any) => ({
          ...m,
          uniqueKey: `mock-${m.id}`,
          categoryId: m.category === "Immobilier" ? "1" : m.category === "Véhicules" ? "2" : m.category === "Services" ? "3" : "4",
          parentCategoryId: null,
        }));
        setListings(formattedMocks);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    const cat = searchParams.get("category");
    if (!cat || tree.length === 0) {
      if (cat) setFilterCat(cat);
      return;
    }
    const asParent = tree.find((c) => String(c.id) === cat);
    if (asParent) {
      setFilterCat(cat);
      setFilterSubCat("all");
      return;
    }
    for (const parent of tree) {
      const child = parent.children?.find((c) => String(c.id) === cat);
      if (child) {
        setFilterCat(String(parent.id));
        setFilterSubCat(cat);
        return;
      }
    }
    setFilterCat(cat);
  }, [searchParams, tree]);

  const selectedParent = tree.find((c) => String(c.id) === filterCat);

  // IDs effectifs de la catégorie active (parent + ses enfants si pas de sous-cat sélectionnée)
  const activeCatId = filterSubCat !== "all" ? filterSubCat : filterCat;
  const childIds: Set<string> | null =
    filterSubCat === "all" && selectedParent
      ? new Set([
          String(selectedParent.id),
          ...(selectedParent.children || []).map((c) => String(c.id)),
        ])
      : null;

  // Noms canoniques de la catégorie choisie (fr + en) pour matcher les annonces mock
  const selectedParentNames = selectedParent
    ? new Set([
        selectedParent.name?.toLowerCase(),
        (selectedParent as any).name_fr?.toLowerCase(),
        (selectedParent as any).name_en?.toLowerCase(),
      ].filter(Boolean))
    : null;

  // Recherche BM25-like : tri par pertinence (titre > catégorie > description)
  const q = search.trim().toLowerCase();
  const scoreOf = (l: any): number => {
    if (!q) return 1;
    let score = 0;
    if (l.title?.toLowerCase().includes(q)) score += 3;
    if (l.category?.toLowerCase().includes(q)) score += 2;
    if (l.description?.toLowerCase().includes(q)) score += 1;
    return score;
  };

  const filtered = listings
    .filter((l) => {
      // Filtre texte
      if (q) {
        const inTitle = l.title?.toLowerCase().includes(q);
        const inDesc = l.description?.toLowerCase().includes(q);
        const inCat = l.category?.toLowerCase().includes(q);
        if (!inTitle && !inDesc && !inCat) return false;
      }

      // Filtre catégorie
      if (activeCatId !== "all") {
        if (childIds) {
          // Vérifier par ID OU par nom (pour les annonces mock qui n'ont pas d'ID)
          const matchById = childIds.has(String(l.categoryId || "")) ||
                            childIds.has(String(l.parentCategoryId || ""));
          const matchByName = selectedParentNames
            ? selectedParentNames.has(l.category?.toLowerCase())
            : false;
          if (!matchById && !matchByName) return false;
        } else {
          const matchById = String(l.categoryId || "") === activeCatId ||
                            String(l.parentCategoryId || "") === activeCatId;
          const matchByName = l.category?.toLowerCase() === activeCatId?.toLowerCase();
          if (!matchById && !matchByName) return false;
        }
      }
      return true;
    })
    .sort((a, b) => scoreOf(b) - scoreOf(a));

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-16">
        {/* Header */}
        <div className="bg-primary py-12">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-3xl font-display font-bold text-primary-foreground mb-2">Toutes les annonces</h1>
            <p className="text-primary-foreground/70">Parcourez toutes les annonces disponibles</p>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          {/* Filters — mobile ergonomique */}
          <div className="mb-8 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                id="annonces-search"
                name="search"
                type="search"
                autoComplete="off"
                placeholder="Rechercher une annonce..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-12 pl-10 pr-4 rounded-xl border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent shadow-sm"
              />
            </div>
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

          {/* Results */}
          <p className="text-sm text-muted-foreground mb-4">{filtered.length} annonce(s) trouvée(s)</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((listing) => (
              <div key={listing.uniqueKey} className="bg-card rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300 group flex flex-col justify-between">
                <div>
                  <Link to={`/annonces/${listing.id}`} className="block relative aspect-[16/10] overflow-hidden">
                    <img src={listing.image} alt={listing.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                    <Badge className="absolute top-3 left-3 bg-accent text-accent-foreground border-0 font-semibold text-xs">{listing.category}</Badge>
                  </Link>
                  <div className="p-5 pb-0">
                    <Link to={`/annonces/${listing.id}`}>
                      <h3 className="font-sans font-semibold text-foreground text-lg mb-2 group-hover:text-accent transition-colors">{listing.title}</h3>
                    </Link>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={`w-3.5 h-3.5 ${i < Math.floor(listing.rating) ? "text-accent fill-accent" : "text-muted-foreground/30"}`} />
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground">{listing.rating.toFixed(1)} ({listing.reviews})</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
                      <Calendar className="w-3.5 h-3.5" />
                      Ajouté le {listing.date}
                    </div>
                    <div className="border-t border-border pt-3 space-y-1.5">
                      {listing.details.map((d) => (
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

          {filtered.length === 0 && (
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
