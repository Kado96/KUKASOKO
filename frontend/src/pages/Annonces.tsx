import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Star, Calendar, Search, SlidersHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { allListings } from "@/data/listings";

const Annonces = () => {
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState(searchParams.get("category") || "all");

  useEffect(() => {
    const cat = searchParams.get("category");
    if (cat) setFilterCat(cat);
  }, [searchParams]);

  const filtered = allListings.filter((l) => {
    const matchSearch = l.title.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCat === "all" || l.category === filterCat;
    return matchSearch && matchCat;
  });

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
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                id="annonces-search"
                name="search"
                type="text"
                autoComplete="off"
                placeholder="Rechercher une annonce..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-11 pl-10 pr-4 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <select
              value={filterCat}
              onChange={(e) => setFilterCat(e.target.value)}
              className="h-11 px-4 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="all">Toutes les catégories</option>
              <option value="Immobilier">Immobilier</option>
              <option value="Services">Services</option>
              <option value="À vendre">À vendre</option>
            </select>
          </div>

          {/* Results */}
          <p className="text-sm text-muted-foreground mb-4">{filtered.length} annonce(s) trouvée(s)</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((listing) => (
              <Link to={`/annonces/${listing.id}`} key={listing.id} className="bg-card rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300 cursor-pointer group">
                <div className="relative aspect-[16/10] overflow-hidden">
                  <img src={listing.image} alt={listing.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                  <Badge className="absolute top-3 left-3 bg-accent text-accent-foreground border-0 font-semibold text-xs">{listing.category}</Badge>
                </div>
                <div className="p-5">
                  <h3 className="font-sans font-semibold text-foreground text-lg mb-2 group-hover:text-accent transition-colors">{listing.title}</h3>
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
              </Link>
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
