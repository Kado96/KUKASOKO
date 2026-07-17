import { useState } from "react";
import { MapPin, Loader2, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import LocationMap from "./LocationMap";

interface DeliveryLocationProps {
  className?: string;
}

const DeliveryLocation = ({ className = "" }: DeliveryLocationProps) => {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [address, setAddress] = useState<string | null>(null);

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast({ title: "Erreur", description: "La géolocalisation n'est pas supportée par votre navigateur." });
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setLocation({ lat: latitude, lng: longitude });

        // Reverse geocode
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
          );
          const data = await res.json();
          setAddress(data.display_name || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
        } catch {
          setAddress(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
        }

        setLoading(false);
        toast({ title: "Position captée !", description: "Votre localisation a été enregistrée pour la livraison." });
      },
      (error) => {
        setLoading(false);
        const messages: Record<number, string> = {
          1: "Vous avez refusé l'accès à la localisation.",
          2: "Position indisponible.",
          3: "Délai d'attente dépassé.",
        };
        toast({ title: "Erreur", description: messages[error.code] || "Erreur inconnue." });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className={className}>
      {!location ? (
        <Button
          onClick={handleGetLocation}
          disabled={loading}
          className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold flex items-center justify-center gap-2"
        >
          <span className="flex items-center justify-center shrink-0 w-4 h-4">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
          </span>
          <span>{loading ? "Localisation en cours..." : "Me localiser pour la livraison"}</span>
        </Button>
      ) : (
        <div className="space-y-3">
          <div className="flex items-start gap-2 text-sm">
            <MapPin className="w-4 h-4 text-accent mt-0.5 shrink-0" />
            <p className="text-muted-foreground text-xs leading-relaxed">{address}</p>
          </div>
          <LocationMap lat={location.lat} lng={location.lng} label="Votre position" />
          <Button
            variant="outline"
            size="sm"
            onClick={handleGetLocation}
            className="w-full text-xs gap-2 border-accent text-accent hover:bg-accent hover:text-accent-foreground"
          >
            <Navigation className="w-3 h-3" /> Actualiser ma position
          </Button>
        </div>
      )}
    </div>
  );
};

export default DeliveryLocation;
