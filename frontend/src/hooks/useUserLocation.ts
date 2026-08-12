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
function checkSecureContext(): boolean {
  return (
    window.isSecureContext ||
    location.hostname === "localhost" ||
    location.hostname === "127.0.0.1"
  );
}

/** Localisation approximative par adresse IP (fonctionne sur HTTP, niveau ville) */
async function locateByIP(): Promise<UserLocation | null> {
  try {
    const res = await fetch("https://ipapi.co/json/", { signal: AbortSignal.timeout(5000) });
    const data = await res.json();
    if (data?.latitude && data?.longitude) {
      return {
        lat: data.latitude,
        lng: data.longitude,
        city: data.city || data.region || undefined,
      };
    }
  } catch {
    /* ignore */
  }
  return null;
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
    // Contexte non-sécurisé (HTTP) → fallback par IP automatique
    if (!checkSecureContext()) {
      setLoading(true);
      setError(null);
      locateByIP().then((ipLoc) => {
        if (ipLoc) {
          setLocation(ipLoc);
          setError(null);
        } else {
          setError(
            "Localisation impossible. Pour une position précise, accédez au site en HTTPS."
          );
        }
        setLoading(false);
      });
      return;
    }

    if (!navigator.geolocation) {
      setLoading(true);
      // Fallback IP si geolocation API absente
      locateByIP().then((ipLoc) => {
        if (ipLoc) setLocation(ipLoc);
        else setError("Géolocalisation non supportée par votre navigateur.");
        setLoading(false);
      });
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
      async (err) => {
        // En cas d'erreur GPS, essayer le fallback IP
        if (err.code === 1) {
          // Permission refusée : essayer IP silencieusement
          const ipLoc = await locateByIP();
          if (ipLoc) {
            setLocation(ipLoc);
            setError("Position approximative (GPS refusé — localisation par réseau).");
          } else {
            setError(
              "Permission refusée. Sur Android : Paramètres navigateur → Autorisations du site → Position → Autoriser kukasoko.wuaze.com."
            );
          }
        } else if (err.code === 2) {
          const ipLoc = await locateByIP();
          if (ipLoc) setLocation(ipLoc);
          else setError("Position GPS indisponible. Vérifiez que le GPS est activé.");
        } else {
          setError("Délai dépassé. Veuillez réessayer en extérieur ou activer le Wi-Fi.");
        }
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
