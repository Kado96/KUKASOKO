import { useState, useEffect, useCallback } from "react";

export interface UserLocation {
  lat: number;
  lng: number;
  city?: string;
}

const STORAGE_KEY = "geomarket_user_location";

/** Distance en km entre deux points GPS (formule de Haversine) */
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}

export function useUserLocation() {
  const [location, setLocation] = useState<UserLocation | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (location) localStorage.setItem(STORAGE_KEY, JSON.stringify(location));
  }, [location]);

  const requestLocation = useCallback(() => {
    // Sur Android, Chrome bloque la géolocalisation sur les sites HTTP (non-HTTPS).
    // Dans ce cas, l'erreur code 1 (PERMISSION_DENIED) est levée automatiquement.
    const isInsecure =
      typeof window !== "undefined" &&
      window.location.protocol === "http:" &&
      window.location.hostname !== "localhost" &&
      window.location.hostname !== "127.0.0.1";

    if (!navigator.geolocation) {
      setError("Géolocalisation non supportée par votre navigateur.");
      return;
    }

    if (isInsecure) {
      setError(
        "⚠️ La géolocalisation nécessite une connexion sécurisée (HTTPS). " +
        "Essayez d'ouvrir le site via https:// ou utilisez Chrome > Paramètres > Site > Autoriser la localisation."
      );
      return;
    }

    setLoading(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        let city: string | undefined;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10`
          );
          const data = await res.json();
          city =
            data?.address?.city ||
            data?.address?.town ||
            data?.address?.village ||
            data?.address?.county;
        } catch {
          /* ignore */
        }
        setLocation({ lat: latitude, lng: longitude, city });
        setLoading(false);
      },
      (err) => {
        let msg: string;
        if (err.code === 1) {
          // PERMISSION_DENIED : peut être causé par le refus de l'utilisateur
          // OU par le fait que le site est en HTTP (Android Chrome bloque auto)
          msg = isInsecure
            ? "⚠️ La géolocalisation est bloquée sur les sites non-sécurisés (HTTP). Accédez au site via HTTPS."
            : "Accès refusé. Autorisez la localisation dans les paramètres de votre navigateur.";
        } else if (err.code === 2) {
          msg = "Position indisponible. Vérifiez que le GPS est activé.";
        } else {
          msg = "Délai dépassé. Vérifiez votre connexion GPS.";
        }
        setError(msg);
        setLoading(false);
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
    );
  }, []);

  const clearLocation = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setLocation(null);
  }, []);

  return { location, loading, error, requestLocation, clearLocation };
}
