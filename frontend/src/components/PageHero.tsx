import { ChevronLeft, ChevronRight, Search, ExternalLink, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
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
const FALLBACK_SLIDES = [
  { id: "f1", image: heroBg, title: null, subtitle: null, link: null, badge: null },
  { id: "f2", image: categoryImmobilier, title: null, subtitle: null, link: null, badge: null },
  { id: "f3", image: categoryServices, title: null, subtitle: null, link: null, badge: null },
  { id: "f4", image: categoryAvendre, title: null, subtitle: null, link: null, badge: null }
];

interface SlideItem {
  id: string;
  image: string;
  title?: string | null;
  subtitle?: string | null;
  link?: string | null;
  badge?: string | null;
}

interface PageHeroProps {
  title?: string;
  subtitle?: string;
  showSearch?: boolean;
  compact?: boolean;
}

export default function PageHero({
  title,
  subtitle,
  showSearch = true,
  compact = false,
}: PageHeroProps) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [subCategory, setSubCategory] = useState("all");
  const [tree, setTree] = useState<CatNode[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [dynamicSlides, setDynamicSlides] = useState<SlideItem[]>([]);
  const { settings } = useSite();

  // Charger dynamiquement les annonces/boutiques sponsorisées payantes pour le carrousel
  useEffect(() => {
    listingsAPI
      .getFeaturedSlides()
      .then((res) => {
        if (Array.isArray(res.data) && res.data.length > 0) {
          setDynamicSlides(res.data);
        }
      })
      .catch(() => {});
  }, []);

  const baseSlides: SlideItem[] =
    settings.heroImages?.length > 0
      ? settings.heroImages.map((src: string, idx: number) => ({ id: `site-${idx}`, image: src }))
      : settings.heroImage
        ? [{ id: "site-0", image: settings.heroImage }]
        : FALLBACK_SLIDES;

  const slides: SlideItem[] = dynamicSlides.length > 0 ? [...dynamicSlides, ...baseSlides] : baseSlides;
  const currentSlide = slides[activeIndex] || slides[0];

  const slidesKey = slides.map(s => s.image).join("|");
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
    if (showSearch) {
      listingsAPI
        .getCategoriesTree()
        .then((res) => {
          if (Array.isArray(res.data)) setTree(res.data);
        })
        .catch(() => {});
    }
  }, [showSearch]);

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
    if (category !== "all") params.set("category", category);
    if (subCategory !== "all") params.set("subcategory", subCategory);
    navigate(`/annonces${params.toString() ? `?${params}` : ""}`);
  };

  const displayTitle = currentSlide?.title || title || settings.heroTitle || "Trouvez tout ce dont vous avez besoin.";
  const displaySubtitle = currentSlide?.subtitle || subtitle || settings.heroSubtitle || "Recherchez des propriétés, des services et des articles à vendre sur un seul site.";

  return (
    <section className={`relative ${compact ? "min-h-[340px] sm:min-h-[400px]" : "min-h-[520px] sm:min-h-[580px]"} flex items-center justify-center overflow-hidden pb-8 sm:pb-0`}>
      {/* ── Carrousel d'arrière-plan haute définition ── */}
      <div className="absolute inset-0 z-0" aria-hidden="true">
        {slides.map((item, i) => (
          <div
            key={`${item.image}-${i}`}
            className="absolute inset-0 transition-opacity duration-[1200ms] ease-in-out"
            style={{ opacity: i === activeIndex ? 1 : 0 }}
          >
            <img src={item.image} alt="" className="h-full w-full object-cover object-center" draggable={false} />
          </div>
        ))}
      </div>

      {/* ── Gradient Overlay professionnel ── */}
      <div
        className="absolute inset-0 z-[1] pointer-events-none"
        style={{
          background:
            "linear-gradient(180deg, rgba(26, 34, 54, 0.78) 0%, rgba(26, 34, 54, 0.58) 50%, rgba(26, 34, 54, 0.88) 100%)",
        }}
      />

      {/* ── Flèches de navigation carrousel ── */}
      {hasMultiple && (
        <>
          <button
            onClick={() => goTo(activeIndex - 1)}
            aria-label="Slide précédente"
            className="hidden sm:flex absolute left-4 z-20 w-10 h-10 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-md items-center justify-center transition-all shadow-lg"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={() => goTo(activeIndex + 1)}
            aria-label="Slide suivante"
            className="hidden sm:flex absolute right-4 z-20 w-10 h-10 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-md items-center justify-center transition-all shadow-lg"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          {/* Indicateurs / Puces */}
          <div className="absolute bottom-4 left-0 right-0 z-20 flex justify-center items-center gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                aria-label={`Aller au slide ${i + 1}`}
                className={`transition-all duration-300 rounded-full ${
                  i === activeIndex
                    ? "w-8 h-2.5 bg-yellow-400"
                    : "w-2.5 h-2.5 bg-white/50 hover:bg-white/90"
                }`}
              />
            ))}
          </div>
        </>
      )}

      {/* ── Contenu Central ── */}
      <div className="relative z-10 container mx-auto px-4 text-center w-full max-w-3xl">
        {/* Badge Sponsorisé pour les annonces/boutiques payantes */}
        {currentSlide?.badge && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-400/20 text-yellow-300 border border-yellow-400/40 text-xs font-semibold uppercase tracking-wider mb-3 animate-fade-in">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{currentSlide.badge}</span>
          </div>
        )}

        <h1 className={`${compact ? "text-2xl sm:text-3xl md:text-4xl" : "text-2xl sm:text-3xl md:text-5xl"} font-display font-bold text-white mb-3 sm:mb-4 animate-fade-in-up drop-shadow-md leading-tight px-1`}>
          {displayTitle}
        </h1>

        <p
          className="text-white/90 text-sm sm:text-base md:text-lg mb-6 sm:mb-8 max-w-xl mx-auto drop-shadow-sm px-2"
          style={{
            animationDelay: "0.15s",
            animationFillMode: "forwards",
            opacity: 0,
            animation: "fade-in-up 0.6s ease-out 0.15s forwards",
          }}
        >
          {displaySubtitle}
        </p>

        {/* Bouton d'action si le slide sponsorisé possède un lien */}
        {currentSlide?.link && (
          <div className="mb-6">
            <Link
              to={currentSlide.link}
              className="inline-flex items-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-bold px-5 py-2.5 rounded-full text-sm shadow-lg transition-transform hover:scale-105"
            >
              <span>Découvrir l'offre</span>
              <ExternalLink className="w-4 h-4" />
            </Link>
          </div>
        )}

        {/* Barre de recherche (si activée) */}
        {showSearch && (
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

              <div className="flex-1 flex items-center px-3 py-2 sm:py-0">
                <Search className="w-5 h-5 text-muted-foreground mr-2 shrink-0" />
                <input
                  id="hero-search"
                  name="hero-search"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="Mots-clés..."
                  autoComplete="off"
                  className="w-full bg-transparent border-none text-foreground placeholder:text-muted-foreground focus:outline-none text-sm"
                />
              </div>

              <button
                onClick={handleSearch}
                className="w-full sm:w-auto bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-bold px-6 py-3 sm:py-4 transition-colors flex items-center justify-center gap-2 text-sm shrink-0"
              >
                <Search className="w-4 h-4" />
                <span>Rechercher</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
