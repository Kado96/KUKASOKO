import { Link } from "react-router-dom";
import { MapPin, Navigation, Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useUserLocation, haversineKm, formatDistance } from "@/hooks/useUserLocation";
import { allListings } from "@/data/listings";

const NearMeSection = () => {
  const { location, loading, requestLocation } = useUserLocation();

  const listingsWithDistance = location
    ? allListings
        .map((l) => ({
          ...l,
          distance: haversineKm(location.lat, location.lng, l.location.lat, l.location.lng),
        }))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 6)
    : [];

  return (
    <section className="py-16 bg-secondary/30">
      <div className="container mx-auto px-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 mb-8">
          <div>
            <div className="w-12 h-1 bg-accent mb-4 rounded-full" />
            <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground">
              📍 Autour de vous
            </h2>
            {location && (
              <p className="text-sm text-muted-foreground mt-1">
                Produits proches de {location.city || "votre position"}
              </p>
            )}
          </div>
          <Link to="/carte">
            <Button variant="outline" size="sm" className="border-accent text-accent hover:bg-accent hover:text-accent-foreground gap-2">
              Voir sur la carte <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>

        {!location ? (
          <div className="bg-card border border-border rounded-2xl p-10 text-center">
            <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-8 h-8 text-accent" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Découvrez les annonces autour de vous
            </h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
              Activez votre position pour voir les produits les plus proches de vous et calculer les distances.
            </p>
            <Button
              onClick={requestLocation}
              disabled={loading}
              className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold flex items-center gap-2 mx-auto"
            >
              <span className="flex items-center justify-center shrink-0 w-4 h-4">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
              </span>
              <span>Activer ma position</span>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {listingsWithDistance.map((l) => (
              <Link
                to={`/annonces/${l.id}`}
                key={l.id}
                className="group bg-card border border-border rounded-xl overflow-hidden hover:shadow-lg hover:border-accent/40 transition-all"
              >
                <div className="aspect-square overflow-hidden relative">
                  <img
                    src={l.image}
                    alt={l.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <Badge className="absolute top-2 left-2 bg-accent text-accent-foreground border-0 text-[10px] font-bold px-2 py-0.5">
                    {formatDistance(l.distance)}
                  </Badge>
                </div>
                <div className="p-3">
                  <p className="text-xs font-semibold text-foreground truncate group-hover:text-accent transition-colors">
                    {l.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{l.price}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default NearMeSection;
