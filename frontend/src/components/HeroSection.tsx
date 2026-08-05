import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import heroBg from "@/assets/hero-bg.jpg";
import categoryImmobilier from "@/assets/category-immobilier.jpg";
import categoryServices from "@/assets/category-services.jpg";
import categoryAvendre from "@/assets/category-avendre.jpg";
import { useSite } from "@/contexts/SiteContext";
import { listingsAPI } from "@/services/api";
import {
  CategoryFilterSummary,
  CategorySearchFilters,
  type CatNode,
} from "@/components/CategorySearchFilters";

const INTERVAL_MS = 5500;
const FALLBACK_SLIDES = [heroBg, categoryImmobilier, categoryServices, categoryAvendre];

const HeroSection = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [subCategory, setSubCategory] = useState("all");
  const [tree, setTree] = useState<CatNode[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const { settings } = useSite();

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

  const handleCategoryChange = (value: string) => {
    setCategory(value);
    setSubCategory("all");
  };

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
    <section className="relative min-h-[560px] sm:min-h-[520px] flex items-center justify-center overflow-hidden pb-8 sm:pb-0">
      {/* Carrousel */}
      <div className="absolute inset-0 z-0" aria-hidden="true">
        {slides.map((src, i) => (
          <div
            key={`${src}-${i}`}
            className="absolute inset-0 transition-opacity duration-[1200ms] ease-in-out"
            style={{ opacity: i === activeIndex ? 1 : 0 }}
          >
            <img src={src} alt="" className="h-full w-full object-cover object-center" draggable={false} />
          </div>
        ))}
      </div>

      <div
        className="absolute inset-0 z-[1] pointer-events-none"
        style={{
          background:
            "linear-gradient(180deg, hsl(var(--primary) / 0.58) 0%, hsl(var(--primary) / 0.38) 50%, hsl(var(--primary) / 0.72) 100%)",
        }}
      />

      <div className="relative z-10 container mx-auto px-4 text-center w-full max-w-3xl">
        <h1 className="text-2xl sm:text-3xl md:text-5xl font-display font-bold text-primary-foreground mb-3 sm:mb-4 animate-fade-in-up drop-shadow-md leading-tight px-1">
          {settings.heroTitle}
        </h1>
        <p
          className="text-primary-foreground/90 text-sm sm:text-base md:text-lg mb-6 sm:mb-8 max-w-xl mx-auto drop-shadow-sm px-2"
          style={{
            animationDelay: "0.15s",
            animationFillMode: "forwards",
            opacity: 0,
            animation: "fade-in-up 0.6s ease-out 0.15s forwards",
          }}
        >
          {settings.heroSubtitle}
        </p>

        {/* Barre de recherche — mobile ergonomique */}
        <div
          className="mx-auto bg-card/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 overflow-hidden text-left"
          style={{
            animationDelay: "0.3s",
            animationFillMode: "forwards",
            opacity: 0,
            animation: "fade-in-up 0.6s ease-out 0.3s forwards",
          }}
        >
          <div className="p-3 sm:p-0 sm:flex sm:items-stretch">
            {/* Mobile + tablette : bloc catégories */}
            <div className="sm:hidden space-y-3 pb-3 border-b border-border/60">
              <CategorySearchFilters
                tree={tree}
                category={category}
                subCategory={subCategory}
                onCategoryChange={handleCategoryChange}
                onSubCategoryChange={setSubCategory}
                variant="hero"
              />
              <CategoryFilterSummary tree={tree} category={category} subCategory={subCategory} />
            </div>

            {/* Desktop : catégories en ligne */}
            <div className="hidden sm:flex sm:items-stretch sm:shrink-0 border-r border-border">
              <CategorySearchFilters
                tree={tree}
                category={category}
                subCategory={subCategory}
                onCategoryChange={handleCategoryChange}
                onSubCategoryChange={setSubCategory}
                variant="hero"
                layout="inline"
              />
            </div>

            {/* Mots-clés */}
            <div className="relative flex-1 flex items-center min-w-0 border-b sm:border-b-0 border-border/60 sm:border-r sm:border-border">
              <Search className="absolute left-3 sm:left-4 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                id="hero-search"
                name="search"
                type="search"
                autoComplete="off"
                placeholder="Mots-clés..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="w-full h-12 sm:h-14 pl-10 sm:pl-11 pr-4 bg-transparent text-foreground placeholder:text-muted-foreground text-sm focus:outline-none"
              />
            </div>

            {/* Bouton recherche */}
            <button
              type="button"
              onClick={handleSearch}
              className="w-full sm:w-auto h-12 sm:h-14 px-6 bg-accent text-accent-foreground font-semibold text-sm hover:bg-accent/90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shrink-0 rounded-b-2xl sm:rounded-none"
            >
              <Search className="w-4 h-4" />
              Rechercher
            </button>
          </div>
        </div>
      </div>

      {/* Flèches — au-dessus du contenu sur mobile */}
      {hasMultiple && (
        <>
          <button
            type="button"
            aria-label="Image précédente"
            onClick={() => goTo(activeIndex - 1)}
            className="absolute left-2 sm:left-6 top-[28%] sm:top-1/2 z-10 sm:-translate-y-1/2 h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-black/25 hover:bg-black/40 text-white backdrop-blur-sm flex items-center justify-center transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            aria-label="Image suivante"
            onClick={() => goTo(activeIndex + 1)}
            className="absolute right-2 sm:right-6 top-[28%] sm:top-1/2 z-10 sm:-translate-y-1/2 h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-black/25 hover:bg-black/40 text-white backdrop-blur-sm flex items-center justify-center transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      {hasMultiple && (
        <div className="absolute bottom-4 sm:bottom-6 left-1/2 z-10 flex -translate-x-1/2 gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Image ${i + 1}`}
              onClick={() => goTo(i)}
              className={`h-1.5 sm:h-2 rounded-full transition-all duration-300 ${
                i === activeIndex
                  ? "w-6 sm:w-8 bg-accent"
                  : "w-1.5 sm:w-2 bg-primary-foreground/40 hover:bg-primary-foreground/70"
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
};

export default HeroSection;
