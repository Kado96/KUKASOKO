import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface LocationMapProps {
  lat: number;
  lng: number;
  label?: string;
  className?: string;
}

const LocationMap = ({ lat, lng, label, className = "" }: LocationMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current).setView([lat, lng], 14);
    mapInstanceRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    const icon = L.divIcon({
      html: `<div style="background:hsl(var(--accent));width:28px;height:28px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);"></div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
      className: "",
    });

    L.marker([lat, lng], { icon }).addTo(map).bindPopup(label || "Position");

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [lat, lng, label]);

  return <div ref={mapRef} className={`w-full h-[250px] rounded-xl z-0 ${className}`} />;
};

export default LocationMap;
