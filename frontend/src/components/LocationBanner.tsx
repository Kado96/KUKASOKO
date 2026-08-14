import { MapPin, Loader2, Navigation, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUserLocation } from "@/hooks/useUserLocation";

const LocationBanner = () => {
  const { location, loading, error, requestLocation, clearLocation } = useUserLocation();

  if (location) {
    return (
      <div className="bg-accent/10 border-b border-accent/20">
        <div className="container mx-auto px-4 py-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-foreground min-w-0">
            <MapPin className="w-4 h-4 text-accent shrink-0" />
            <span className="truncate">
              📍 Vous êtes à <span className="font-semibold">{location.city || "votre position"}</span>
            </span>
          </div>
          <button
            onClick={clearLocation}
            className="text-muted-foreground hover:text-foreground shrink-0"
            title="Effacer ma position"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-primary/5 border-b border-border">
      <div className="container mx-auto px-4 py-2 flex items-center justify-between gap-3 flex-wrap">
        <p className="text-xs sm:text-sm text-muted-foreground">
          🌍 Activez votre position pour découvrir les annonces autour de vous
        </p>
        <Button
          onClick={requestLocation}
          disabled={loading}
          size="sm"
          variant="outline"
          className="border-accent text-accent hover:bg-accent hover:text-accent-foreground text-xs h-8 flex items-center gap-1.5"
        >
          <span className="flex items-center justify-center shrink-0 w-3.5 h-3.5">
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Navigation className="w-3.5 h-3.5" />}
          </span>
          <span>Me localiser</span>
        </Button>
        {error && <span className="text-xs text-destructive w-full sm:w-auto">{error}</span>}
      </div>
    </div>
  );
};

export default LocationBanner;
