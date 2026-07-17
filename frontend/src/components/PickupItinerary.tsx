import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Loader2, Navigation, ExternalLink, MapPin, Clock, Route } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUserLocation, formatDistance } from "@/hooks/useUserLocation";

interface PickupItineraryProps {
  destination: { lat: number; lng: number; address: string };
}

const PickupItinerary = ({ destination }: PickupItineraryProps) => {
  const { location, loading, requestLocation } = useUserLocation();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const routeLayerRef = useRef<L.Polyline | null>(null);
  const [routeInfo, setRouteInfo] = useState<{ distance: number; duration: number } | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current || !location) return;
    const map = L.map(mapRef.current).setView([destination.lat, destination.lng], 13);
    mapInstanceRef.current = map;
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap",
    }).addTo(map);

    // User marker
    const userIcon = L.divIcon({
      html: `<div style="background:#2563eb;width:20px;height:20px;border-radius:50%;border:3px solid white;box-shadow:0 0 0 4px rgba(37,99,235,0.3);"></div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
      className: "",
    });
    L.marker([location.lat, location.lng], { icon: userIcon }).addTo(map).bindPopup("📍 Vous");

    // Destination marker
    const destIcon = L.divIcon({
      html: `<div style="background:hsl(var(--accent));width:28px;height:28px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);"></div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 28],
      className: "",
    });
    L.marker([destination.lat, destination.lng], { icon: destIcon })
      .addTo(map)
      .bindPopup("🎯 " + destination.address);

    // Fit bounds
    map.fitBounds(
      [
        [location.lat, location.lng],
        [destination.lat, destination.lng],
      ],
      { padding: [40, 40] }
    );

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [location, destination.lat, destination.lng, destination.address]);

  // Fetch route from OSRM
  useEffect(() => {
    if (!location || !mapInstanceRef.current) return;
    setRouteLoading(true);
    fetch(
      `https://router.project-osrm.org/route/v1/driving/${location.lng},${location.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson`
    )
      .then((r) => r.json())
      .then((data) => {
        if (data.routes?.[0]) {
          const route = data.routes[0];
          setRouteInfo({ distance: route.distance / 1000, duration: route.duration / 60 });
          const coords: [number, number][] = route.geometry.coordinates.map((c: number[]) => [c[1], c[0]]);
          if (routeLayerRef.current) {
            mapInstanceRef.current!.removeLayer(routeLayerRef.current);
          }
          routeLayerRef.current = L.polyline(coords, {
            color: "hsl(var(--accent))",
            weight: 5,
            opacity: 0.8,
          }).addTo(mapInstanceRef.current!);
        }
      })
      .catch(() => {
        /* silent */
      })
      .finally(() => setRouteLoading(false));
  }, [location, destination]);

  if (!location) {
    return (
      <div className="text-center py-4">
        <p className="text-xs text-muted-foreground mb-3">
          Activez votre position pour calculer l'itinéraire jusqu'au vendeur.
        </p>
        <Button
          onClick={requestLocation}
          disabled={loading}
          size="sm"
          className="w-full bg-accent hover:bg-accent/90 text-accent-foreground flex items-center gap-2"
        >
          <span className="flex items-center justify-center shrink-0 w-3.5 h-3.5">
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Navigation className="w-3.5 h-3.5" />}
          </span>
          <span>Me localiser</span>
        </Button>
      </div>
    );
  }

  const gmapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${location.lat},${location.lng}&destination=${destination.lat},${destination.lng}`;
  const wazeUrl = `https://waze.com/ul?ll=${destination.lat},${destination.lng}&navigate=yes`;
  const osmUrl = `https://www.openstreetmap.org/directions?from=${location.lat}%2C${location.lng}&to=${destination.lat}%2C${destination.lng}`;

  return (
    <div className="space-y-3">
      <div ref={mapRef} className="w-full h-[220px] rounded-xl overflow-hidden z-0" />

      {routeInfo && (
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-accent/10 rounded-lg p-2 text-center">
            <Route className="w-3.5 h-3.5 text-accent mx-auto mb-1" />
            <p className="text-xs font-bold text-foreground">{formatDistance(routeInfo.distance)}</p>
            <p className="text-[10px] text-muted-foreground">Distance</p>
          </div>
          <div className="bg-accent/10 rounded-lg p-2 text-center">
            <Clock className="w-3.5 h-3.5 text-accent mx-auto mb-1" />
            <p className="text-xs font-bold text-foreground">{Math.round(routeInfo.duration)} min</p>
            <p className="text-[10px] text-muted-foreground">En voiture</p>
          </div>
        </div>
      )}

      {routeLoading && !routeInfo && (
        <div className="text-center text-xs text-muted-foreground py-2">
          <Loader2 className="w-4 h-4 animate-spin inline mr-1" /> Calcul de l'itinéraire...
        </div>
      )}

      <div className="grid grid-cols-1 gap-1.5">
        <a href={gmapsUrl} target="_blank" rel="noreferrer">
          <Button variant="outline" size="sm" className="w-full text-xs gap-2 h-9">
            <ExternalLink className="w-3.5 h-3.5" /> Ouvrir dans Google Maps
          </Button>
        </a>
        <a href={wazeUrl} target="_blank" rel="noreferrer">
          <Button variant="outline" size="sm" className="w-full text-xs gap-2 h-9">
            <ExternalLink className="w-3.5 h-3.5" /> Ouvrir dans Waze
          </Button>
        </a>
        <a href={osmUrl} target="_blank" rel="noreferrer">
          <Button variant="outline" size="sm" className="w-full text-xs gap-2 h-9">
            <ExternalLink className="w-3.5 h-3.5" /> Ouvrir dans OpenStreetMap
          </Button>
        </a>
      </div>

      <div className="flex items-start gap-2 text-xs text-muted-foreground bg-secondary/50 rounded-lg p-2">
        <MapPin className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" />
        <p className="leading-relaxed">Destination : {destination.address}</p>
      </div>
    </div>
  );
};

export default PickupItinerary;
