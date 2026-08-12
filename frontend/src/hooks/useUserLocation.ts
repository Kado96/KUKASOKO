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

/** Vérifie si la géolocalisation est disponible dans ce contexte (HTTPS requis sur Android) */
function isSecureContext(): boolean {
  return (
    window.isSecureContext ||
    location.hostname === "localhost" ||
    location.hostname === "127.0.0.1"
  );
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
    // Vérifier si le contexte est sécurisé (HTTPS requis sur Android Chrome)
    if (!isSecureContext()) {
      setError(
        "La géolocalisation nécessite HTTPS. Accédez au site via https:// pour activer cette fonctionnalité."
      );
      return;
    }

    if (!navigator.geolocation) {
      setError("Géolocalisation non supportée par votre navigateur.");
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
          /* ignore — le nom de ville est optionnel */
        }
        setLocation({ lat: latitude, lng: longitude, city });
        setLoading(false);
      },
      (err) => {
        let msg = "Erreur inconnue.";
        switch (err.code) {
          case 1: // PERMISSION_DENIED
            msg =
              "Permission refusée. Sur Android : ouvrez les paramètres du navigateur → Autorisations du site → Position → Autorisez kukasoko.wuaze.com.";
            break;
          case 2: // POSITION_UNAVAILABLE
            msg = "Position indisponible. Vérifiez que le GPS est activé sur votre appareil.";
            break;
          case 3: // TIMEOUT
            msg = "Délai dépassé. Veuillez réessayer en extérieur ou activer le Wi-Fi.";
            break;
        }
        setError(msg);
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,     // 15s pour Android (GPS plus lent)
        maximumAge: 60000,  // Accepte une position vieille de max 1 min
      }
    );
  }, []);

  const clearLocation = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setLocation(null);
    setError(null);
  }, []);

  return { location, loading, error, requestLocation, clearLocation };
}
