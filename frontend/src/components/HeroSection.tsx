import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import heroBg from "@/assets/hero-bg.jpg";
import categoryImmobilier from "@/assets/category-immobilier.jpg";
import categoryServices from "@/assets/category-services.jpg";
import categoryAvendre from "@/assets/category-avendre.jpg";
import { useSite } from "@/contexts/SiteContext";
import { listingsAPI } from "@/services/api";

const INTERVAL_MS = 5500;

/** Slides de démo tant qu'aucune photo n'est configurée dans Admin */
const FALLBACK_SLIDES = [heroBg, categoryImmobilier, categoryServices, categoryAvendre];

type CatNode = {
  id: number;
  name: string;
  name_fr?: string | null;
  children?: CatNode[];
};

const HeroSection = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [subCategory, setSubCategory] = useState("all");
  const [tree, setTree] = useState<CatNode[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const { settings } = useSite();

  // Photos mises en avant (Admin) — sinon carrousel de démo
  const slides =
    settings.heroImages?.length > 0
      ? settings.heroImages
      : settings.heroImage
        ? [settings.heroImage]
        : FALLBACK_SLIDES;

  const slidesKey = slides.join("|");
  const hasMultiple = slides.length > 1;

  useEffect(() => {
    setActiveIndex(0);
  }, [slidesKey]);

  useEffect(() => {
    if (!hasMultiple) return;
    const id = window.setInterval(() => {
      setActiveIndex((i) => (i + 1) % slides.length);
    }, INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [slidesKey, slides.length, hasMultiple]);

  useEffect(() => {
    listingsAPI
      .getCategoriesTree()
      .then((res) => {
        if (Array.isArray(res.data)) setTree(res.data);
      })
      .catch(() => {});
  }, []);

  const selectedParent = tree.find((c) => String(c.id) === category);
  const subcats = selectedParent?.children ?? [];

  useEffect(() => {
    setSubCategory("all");
  }, [category]);

  const goTo = (index: number) => {
    setActiveIndex(((index % slides.length) + slides.length) % slides.length);
  };

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set("search", searchQuery.trim());
    const catId = subCategory !== "all" ? subCategory : category !== "all" ? category : "";
    if (catId) params.set("category", catId);
    navigate(`/annonces${params.toString() ? `?${params}` : ""}`);
  };

  return (
    <section className="relative min-h-[520px] flex items-center justify-center overflow-hidden">
      {/* Carrousel — photos mises en avant (réseaux sociaux / promo) */}
      <div className="absolute inset-0 z-0" aria-hidden="true">
        {slides.map((src, i) => (
          <div
            key={`${src}-${i}`}
            className="absolute inset-0 transition-opacity duration-[1200ms] ease-in-out"
            style={{ opacity: i === activeIndex ? 1 : 0 }}
          >
            <img
              src={src}
              alt=""
              className="h-full w-full object-cover object-center"
              draggable={false}
            />
          </div>
        ))}
      </div>

      {/* Overlay dégradé : photos visibles, texte lisible */}
      <div
        className="absolute inset-0 z-[1] pointer-events-none"
        style={{
          background:
            "linear-gradient(180deg, hsl(var(--primary) / 0.55) 0%, hsl(var(--primary) / 0.35) 45%, hsl(var(--primary) / 0.65) 100%)",
        }}
      />

      <div className="relative z-10 container mx-auto px-4 text-center">
        <h1 className="text-3xl md:text-5xl font-display font-bold text-primary-foreground mb-4 animate-fade-in-up drop-shadow-sm">
          {settings.heroTitle}
        </h1>
        <p
          className="text-primary-foreground/90 text-base md:text-lg mb-8 max-w-xl mx-auto drop-shadow-sm"
          style={{
            animationDelay: "0.15s",
            animationFillMode: "forwards",
            opacity: 0,
            animation: "fade-in-up 0.6s ease-out 0.15s forwards",
          }}
        >
          {settings.heroSubtitle}
        </p>

        {/* Search bar */}
        <div
          className="max-w-3xl mx-auto bg-card rounded-xl shadow-2xl flex flex-col sm:flex-row sm:items-center overflow-hidden"
          style={{
            animationDelay: "0.3s",
            animationFillMode: "forwards",
            opacity: 0,
            animation: "fade-in-up 0.6s ease-out 0.3s forwards",
          }}
        >
          <select
            id="hero-category"
            name="hero-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="h-12 sm:h-14 px-4 bg-card text-foreground border-b sm:border-b-0 sm:border-r border-border text-sm focus:outline-none shrink-0"
          >
            <option value="all">Toutes les catégories</option>
            {tree.length > 0 ? (
              tree.map((cat) => (
                <option key={cat.id} value={String(cat.id)}>
                  {cat.name_fr || cat.name}
                </option>
              ))
            ) : (
              <>
                <option value="immobilier">Immobilier</option>
                <option value="services">Services</option>
                <option value="avendre">À vendre</option>
              </>
            )}
          </select>
          {subcats.length > 0 ? (
            <select
              id="hero-subcategory"
              name="hero-subcategory"
              value={subCategory}
              onChange={(e) => setSubCategory(e.target.value)}
              className="h-12 sm:h-14 px-4 bg-card text-foreground border-b sm:border-b-0 sm:border-r border-border text-sm focus:outline-none shrink-0"
            >
              <option value="all">Toutes les sous-catégories</option>
              {subcats.map((sub) => (
                <option key={sub.id} value={String(sub.id)}>
                  {sub.name_fr || sub.name}
                </option>
              ))}
            </select>
          ) : (
            <select
              id="hero-subcategory"
              name="hero-subcategory"
              value="all"
              disabled
              className="h-12 sm:h-14 px-4 bg-card text-muted-foreground border-b sm:border-b-0 sm:border-r border-border text-sm focus:outline-none shrink-0 opacity-70"
            >
              <option value="all">
                {category === "all" ? "Sous-catégorie" : "Aucune sous-catégorie"}
              </option>
            </select>
          )}
          <input
            id="hero-search"
            name="search"
            type="text"
            autoComplete="off"
            placeholder="Mots-clés..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="flex-1 h-12 sm:h-14 px-4 bg-transparent text-foreground placeholder:text-muted-foreground text-sm focus:outline-none min-w-0"
          />
          <button
            type="button"
            onClick={handleSearch}
            className="h-12 sm:h-14 px-6 bg-accent text-accent-foreground font-semibold text-sm hover:bg-accent/90 transition-colors flex items-center justify-center gap-2 shrink-0"
          >
            <Search className="w-4 h-4" />
            Rechercher
          </button>
        </div>
      </div>

      {/* Flèches carrousel */}
      {hasMultiple && (
        <>
          <button
            type="button"
            aria-label="Image précédente"
            onClick={() => goTo(activeIndex - 1)}
            className="absolute left-3 md:left-6 top-1/2 z-10 -translate-y-1/2 h-10 w-10 rounded-full bg-primary-foreground/15 hover:bg-primary-foreground/30 text-primary-foreground backdrop-blur-sm flex items-center justify-center transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            aria-label="Image suivante"
            onClick={() => goTo(activeIndex + 1)}
            className="absolute right-3 md:right-6 top-1/2 z-10 -translate-y-1/2 h-10 w-10 rounded-full bg-primary-foreground/15 hover:bg-primary-foreground/30 text-primary-foreground backdrop-blur-sm flex items-center justify-center transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      {/* Points carrousel */}
      {hasMultiple && (
        <div className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Image ${i + 1}`}
              onClick={() => goTo(i)}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === activeIndex
                  ? "w-6 bg-accent"
                  : "w-2 bg-primary-foreground/40 hover:bg-primary-foreground/70"
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
};

export default HeroSection;
