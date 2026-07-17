import { Search } from "lucide-react";
import { useState } from "react";
import heroBg from "@/assets/hero-bg.jpg";
import { useSite } from "@/contexts/SiteContext";

const HeroSection = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState("all");
  const { settings } = useSite();

  const bgImage = settings.heroImage || heroBg;

  return (
    <section className="relative min-h-[520px] flex items-center justify-center overflow-hidden">
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${bgImage})` }}
      />
      {/* Overlay */}
      <div className="absolute inset-0 bg-primary/70" />

      <div className="relative z-10 container mx-auto px-4 text-center">
        <h1 className="text-3xl md:text-5xl font-display font-bold text-primary-foreground mb-4 animate-fade-in-up">
          {settings.heroTitle}
        </h1>
        <p className="text-primary-foreground/80 text-base md:text-lg mb-8 max-w-xl mx-auto" style={{ animationDelay: "0.15s", animationFillMode: "forwards", opacity: 0, animation: "fade-in-up 0.6s ease-out 0.15s forwards" }}>
          {settings.heroSubtitle}
        </p>

        {/* Search bar */}
        <div className="max-w-2xl mx-auto bg-card rounded-xl shadow-2xl flex items-center overflow-hidden" style={{ animationDelay: "0.3s", animationFillMode: "forwards", opacity: 0, animation: "fade-in-up 0.6s ease-out 0.3s forwards" }}>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="hidden sm:block h-14 px-4 bg-card text-foreground border-r border-border text-sm focus:outline-none"
          >
            <option value="all">Toutes les catégories</option>
            <option value="immobilier">Immobilier</option>
            <option value="services">Services</option>
            <option value="avendre">À vendre</option>
          </select>
          <input
            id="hero-search"
            name="search"
            type="text"
            autoComplete="off"
            placeholder="Mots-clés..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 h-14 px-4 bg-transparent text-foreground placeholder:text-muted-foreground text-sm focus:outline-none"
          />
          <button className="h-14 px-6 bg-accent text-accent-foreground font-semibold text-sm hover:bg-accent/90 transition-colors flex items-center gap-2">
            <Search className="w-4 h-4" />
            Rechercher
          </button>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
