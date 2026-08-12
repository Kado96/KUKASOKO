import { MapPin, Loader2, Navigation, X, AlertTriangle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUserLocation } from "@/hooks/useUserLocation";

const isSecureContext = () =>
  window.isSecureContext ||
  location.hostname === "localhost" ||
  location.hostname === "127.0.0.1";

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

  // Contexte non-sécurisé (HTTP) — Android bloque la géolocalisation
  if (!isSecureContext()) {
    const httpsUrl = window.location.href.replace(/^http:\/\//, "https://");
    return (
      <div className="bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800">
        <div className="container mx-auto px-4 py-2 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-xs sm:text-sm text-amber-800 dark:text-amber-200 min-w-0">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
            <span>La géolocalisation requiert HTTPS sur Android.</span>
          </div>
          <a
            href={httpsUrl}
            className="flex items-center gap-1 text-xs font-semibold text-amber-700 dark:text-amber-300 underline underline-offset-2 hover:text-amber-900"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Accéder en HTTPS
          </a>
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
        {error && (
          <span className="text-xs text-destructive w-full sm:w-auto leading-snug">
            ⚠️ {error}
          </span>
        )}
      </div>
    </div>
  );
};

export default LocationBanner;
