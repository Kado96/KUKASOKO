import { useEffect, useRef, useState, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useTranslation } from "react-i18next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useUserLocation } from "@/hooks/useUserLocation";
import { listingsAPI, mapAPI } from "@/services/api";
import { MapPin, Navigation, Loader2, Route, Car, Bike, PersonStanding, X, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { allListings } from "@/data/listings";

// Fix default Leaflet icon
import iconUrl from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";
L.Marker.prototype.options.icon = L.icon({
  iconUrl,
  shadowUrl: iconShadow,
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const ROUTE_MODES = [
  { key: "foot", label: "map.routeMode.foot", Icon: PersonStanding },
  { key: "cycling", label: "map.routeMode.cycling", Icon: Bike },
  { key: "driving", label: "map.routeMode.driving", Icon: Car },
] as const;

type RouteMode = "foot" | "cycling" | "driving";

export default function Carte() {
  const { t } = useTranslation();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Layer[]>([]);
  const routeLayerRef = useRef<L.Polyline | L.GeoJSON | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const destinationMarkerRef = useRef<L.Marker | null>(null);

  const { location, loading: locLoading, requestLocation } = useUserLocation();
  const [categories, setCategories] = useState<{ id: number; name: string; icon?: string }[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [listings, setListings] = useState<any[]>([]);
  const [listingsLoading, setListingsLoading] = useState(true);

  // Filtered listings (search + category already filtered server-side, search locally)
  const filteredListings = listings.filter((l) =>
    l.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Route state
  const [routeMode, setRouteMode] = useState<RouteMode>("foot");
  const [routeInfo, setRouteInfo] = useState<{ distance_m: number; duration_s: number } | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeTarget, setRouteTarget] = useState<{ lat: number; lng: number; title: string } | null>(null);

  const defaultCategories = [
    { id: 1, name: "Immobilier", icon: "🏢" },
    { id: 2, name: "À vendre", icon: "🛍️" },
    { id: 3, name: "Services", icon: "🛠️" }
  ];

  // Fetch categories once (with mock fallback)
  useEffect(() => {
    listingsAPI.getCategories()
      .then((res) => {
        if (res.data && res.data.length > 0) {
          setCategories(res.data);
        } else {
          setCategories(defaultCategories);
        }
      })
      .catch(() => {
        setCategories(defaultCategories);
      });
  }, []);

  // Fetch map listings whenever category changes (with mock fallback if empty)
  useEffect(() => {
    setListingsLoading(true);
    listingsAPI
      .getForMap(selectedCategory ?? undefined)
      .then((res) => {
        if (res.data && res.data.length > 0) {
          setListings(res.data);
        } else {
          // Fallback to mock data with coordinates mapped
          const activeCategoryName = categories.find(c => c.id === selectedCategory)?.name || "";
          const mock = allListings
            .filter((l) => selectedCategory === null || l.category.toLowerCase() === activeCategoryName.toLowerCase())
            .map((l) => ({
              ...l,
              latitude: l.location?.lat,
              longitude: l.location?.lng,
              currency: "FBU",
            }));
          setListings(mock);
        }
      })
      .catch(() => {
        const mock = allListings.map((l) => ({
          ...l,
          latitude: l.location?.lat,
          longitude: l.location?.lng,
          currency: "FBU",
        }));
        setListings(mock);
      })
      .finally(() => setListingsLoading(false));
  }, [selectedCategory]);

  // Init map once
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;
    const center: [number, number] = [-3.3822, 29.3644];
    const map = L.map(mapRef.current).setView(center, 12);
    mapInstanceRef.current = map;
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a>",
    }).addTo(map);
    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Show user position
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !location) return;
    userMarkerRef.current?.remove();
    const icon = L.divIcon({
      className: "",
      html: `<div style="width:16px;height:16px;border-radius:50%;background:#22c55e;border:3px solid white;box-shadow:0 0 8px rgba(34,197,94,0.8)"></div>`,
      iconAnchor: [8, 8],
    });
    userMarkerRef.current = L.marker([location.lat, location.lng], { icon })
      .addTo(map)
      .bindPopup(t("map.myPosition"));
    map.setView([location.lat, location.lng], 13);
  }, [location]);

  // Render listing markers from filteredListings (Grouped by coordinates with Carousel support)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    markersRef.current.forEach((m) => map.removeLayer(m));
    markersRef.current = [];

    // Group listings by coordinate key (4 decimals is ~11m precision, perfect for grouping overlapping listings)
    const grouped: { [key: string]: typeof filteredListings } = {};
    filteredListings.forEach((listing) => {
      if (!listing.latitude || !listing.longitude) return;
      const key = `${listing.latitude.toFixed(4)}_${listing.longitude.toFixed(4)}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(listing);
    });

    // Expose groups and markers to window for interactive popup actions
    (window as any).__popupGroups = grouped;
    (window as any).__popupMarkers = {};

    // HTML Generator function for popup carousel
    const buildPopupHtml = (key: string, index: number) => {
      const group = grouped[key];
      const listing = group[index];
      const priceStr = typeof listing.price === "number" || !isNaN(Number(listing.price))
        ? `${Number(listing.price).toLocaleString()} ${listing.currency || "FBU"}`
        : listing.price;

      // Extract first image from listing.image or listing.image_urls
      let imageUrl = listing.image || "";
      if (!imageUrl && listing.image_urls) {
        imageUrl = listing.image_urls.split(",")[0].trim();
      }

      const hasPrev = index > 0;
      const hasNext = index < group.length - 1;

      // Build listing details HTML (either from database columns or mock details)
      let resolvedDetails = listing.details;
      if (!resolvedDetails || !Array.isArray(resolvedDetails)) {
        resolvedDetails = [];
        if (listing.city) resolvedDetails.push({ label: "Ville", value: listing.city });
        if (listing.address) resolvedDetails.push({ label: "Adresse", value: listing.address });
        if (listing.views !== undefined) resolvedDetails.push({ label: "Vues", value: `${listing.views}` });
        
        // Dynamic extraction from description (e.g., "3 chambres" -> Chambres: 3)
        if (listing.description) {
          const desc = listing.description.toLowerCase();
          const chambreMatch = desc.match(/(\d+)\s*chambre/);
          if (chambreMatch) resolvedDetails.push({ label: "Chambres", value: chambreMatch[1] });
          
          const sdbMatch = desc.match(/(\d+)\s*salle[s]?\s*de\s*bain/);
          if (sdbMatch) resolvedDetails.push({ label: "Salles de bain", value: sdbMatch[1] });
        }
      }

      const detailsHtml = resolvedDetails.length > 0
        ? `
          <div style="border-top: 1px dashed #e5e7eb; padding-top:6px; margin-top:6px; margin-bottom:6px; font-size:11px;">
            ${resolvedDetails.map((d: any) => `
              <div style="display:flex; justify-content:space-between; margin-bottom:2px;">
                <span style="color:#6b7280;">${d.label}</span>
                <span style="font-weight:600; color:#374151;">${d.value}</span>
              </div>
            `).join("")}
          </div>
        `
        : "";

      return `
        <div style="min-width:220px; font-family: sans-serif; position: relative;">
          ${imageUrl ? `<img src="${imageUrl}" alt="${listing.title}" style="width:100%; height:110px; object-fit:cover; border-radius:8px; margin-bottom:8px;" />` : ""}
          
          ${group.length > 1 ? `
            <div style="display:flex; justify-content:space-between; align-items:center; background:#f3f4f6; padding:4px 8px; border-radius:6px; margin-bottom:6px; font-size:11px; font-weight:600; color:#4b5563;">
              <button onclick="window.__changePopupListing('${key}', ${index - 1})" ${!hasPrev ? "disabled style='opacity:0.3; cursor:default; border:none; background:none;'" : "style='cursor:pointer; border:none; background:none; color:#2563eb; font-weight:bold;'"}>◀ Précédent</button>
              <span>${index + 1} / ${group.length}</span>
              <button onclick="window.__changePopupListing('${key}', ${index + 1})" ${!hasNext ? "disabled style='opacity:0.3; cursor:default; border:none; background:none;'" : "style='cursor:pointer; border:none; background:none; color:#2563eb; font-weight:bold;'"}>Suivant ▶</button>
            </div>
          ` : ""}

          <strong style="font-size:13px; color:#1f2937; display:block; margin-bottom:3px; line-height:1.3;">${listing.title}</strong>
          <span style="color:#16a34a; font-weight:bold; font-size:13px; display:block; margin-bottom:4px;">${priceStr}</span>
          
          ${detailsHtml}

          <div style="display:flex; justify-content:space-between; align-items:center; border-top: 1px solid #e5e7eb; padding-top:8px; margin-top:6px;">
            <a href="/annonces/${listing.id}" style="color:#2563eb; font-size:11px; font-weight:600; text-decoration:none;">Voir →</a>
            <button onclick="window.__routeTo(${listing.latitude},${listing.longitude},'${listing.title.replace(/'/g, "\\'")}')" 
              style="font-size:11px; color:#059669; cursor:pointer; border:none; background:none; padding:0; font-weight:600; display:flex; align-items:center; gap:2px;">
              🗺️ Itinéraire
            </button>
          </div>
        </div>
      `;
    };
    (window as any).__buildPopupHtml = buildPopupHtml;

    // Create markers
    Object.keys(grouped).forEach((key) => {
      const group = grouped[key];
      const first = group[0];
      (window as any).__popupStates[key] = 0;

      const marker = L.marker([first.latitude, first.longitude])
        .addTo(map)
        .bindPopup(buildPopupHtml(key, 0));

      (window as any).__popupMarkers[key] = marker;
      markersRef.current.push(marker);
    });

  }, [filteredListings]);

  // Expose callbacks globally
  useEffect(() => {
    (window as any).__routeTo = (lat: number, lng: number, title: string) => {
      setRouteTarget({ lat, lng, title });
    };
    (window as any).__popupStates = {};
    (window as any).__changePopupListing = (key: string, index: number) => {
      const group = (window as any).__popupGroups?.[key];
      if (!group || index < 0 || index >= group.length) return;
      (window as any).__popupStates[key] = index;
      
      const marker = (window as any).__popupMarkers?.[key];
      if (marker) {
        const html = (window as any).__buildPopupHtml(key, index);
        marker.setPopupContent(html);
      }
    };

    return () => {
      delete (window as any).__routeTo;
      delete (window as any).__popupStates;
      delete (window as any).__changePopupListing;
      delete (window as any).__popupGroups;
      delete (window as any).__popupMarkers;
      delete (window as any).__buildPopupHtml;
    };
  }, []);

  // Calculate and draw route
  const calculateRoute = useCallback(async () => {
    if (!location || !routeTarget || !mapInstanceRef.current) return;
    setRouteLoading(true);
    try {
      const res = await mapAPI.getRoute({
        start_lat: location.lat,
        start_lng: location.lng,
        end_lat: routeTarget.lat,
        end_lng: routeTarget.lng,
        mode: routeMode,
      });
      const data = res.data;
      setRouteInfo({ distance_m: data.distance_m, duration_s: data.duration_s });

      // Remove previous route
      routeLayerRef.current?.remove();
      destinationMarkerRef.current?.remove();

      // Draw GeoJSON route
      const geoLayer = L.geoJSON(data.geometry, {
        style: { color: "#22c55e", weight: 5, opacity: 0.8 },
      }).addTo(mapInstanceRef.current!);
      routeLayerRef.current = geoLayer;

      // Destination marker
      const destIcon = L.divIcon({
        className: "",
        html: `<div style="width:20px;height:20px;border-radius:50%;background:#dc2626;border:3px solid white;box-shadow:0 0 6px rgba(220,38,38,0.7)"></div>`,
        iconAnchor: [10, 10],
      });
      destinationMarkerRef.current = L.marker([routeTarget.lat, routeTarget.lng], { icon: destIcon })
        .addTo(mapInstanceRef.current!)
        .bindPopup(routeTarget.title)
        .openPopup();

      // Fit bounds
      mapInstanceRef.current!.fitBounds(geoLayer.getBounds(), { padding: [40, 40] });
    } catch (e) {
      console.error(e);
    } finally {
      setRouteLoading(false);
    }
  }, [location, routeTarget, routeMode]);

  useEffect(() => {
    if (routeTarget) calculateRoute();
  }, [routeTarget, routeMode]);

  const clearRoute = () => {
    routeLayerRef.current?.remove();
    destinationMarkerRef.current?.remove();
    routeLayerRef.current = null;
    destinationMarkerRef.current = null;
    setRouteTarget(null);
    setRouteInfo(null);
  };

  const formatDuration = (seconds: number) => {
    const m = Math.round(seconds / 60);
    if (m < 60) return `${m} ${t("map.min")}`;
    return `${Math.floor(m / 60)}h${m % 60 > 0 ? `${m % 60}` : ""}`;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col pt-16">
      <Navbar />

      {/* ── Search + Filter bar — identical premium style to /annonces ── */}
      <div className="bg-background border-b border-border shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search input with icon */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                id="carte-search"
                name="carte-search"
                type="text"
                autoComplete="off"
                placeholder="Rechercher une annonce sur la carte..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-11 pl-10 pr-4 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent transition-all shadow-sm"
              />
            </div>
            {/* Category select dropdown */}
            <select
              value={selectedCategory ?? "all"}
              onChange={(e) => setSelectedCategory(e.target.value === "all" ? null : Number(e.target.value))}
              className="h-11 px-4 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent cursor-pointer transition-all shadow-sm min-w-[200px]"
            >
              <option value="all">Toutes les catégories</option>
              {Array.isArray(categories) && categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
          {/* Result count / status */}
          <p className="text-xs font-medium text-muted-foreground mt-2 flex items-center gap-1.5 h-4">
            {listingsLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-accent" />}
            <span>
              {listingsLoading ? "Recherche en cours..." : `${filteredListings.length} annonce(s) trouvée(s) sur la carte`}
            </span>
          </p>
        </div>
      </div>

      <div className="relative w-full h-[65vh] min-h-[400px]">
        {/* Map */}
        <div ref={mapRef} className="w-full h-full" />

        {/* Top-right controls */}
        <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-2">
          {/* Locate me */}
          <Button
            size="sm"
            variant="secondary"
            className="shadow-md flex items-center gap-1.5"
            onClick={requestLocation}
            disabled={locLoading}
          >
            <span className="flex items-center justify-center shrink-0 w-4 h-4">
              {locLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4" />}
            </span>
            <span>{t("map.myPosition")}</span>
          </Button>

          {/* Route mode selector */}
          {routeTarget && (
            <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-md p-2 flex gap-1">
              {ROUTE_MODES.map(({ key, label, Icon }) => (
                <button
                  key={key}
                  onClick={() => setRouteMode(key)}
                  title={t(label)}
                  className={`p-2 rounded-lg transition-colors ${
                    routeMode === key
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30"
                      : "hover:bg-muted text-muted-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Route info panel */}
        {(routeTarget || routeInfo) && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] bg-white dark:bg-zinc-900 rounded-2xl shadow-xl px-5 py-3 flex items-center gap-4 max-w-sm w-full mx-4">
            <Route className="h-5 w-5 text-green-600 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              {routeLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Calcul en cours...
                </div>
              ) : routeInfo ? (
                <>
                  <p className="text-sm font-semibold truncate">{routeTarget?.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {(routeInfo.distance_m / 1000).toFixed(1)} {t("map.km")} · {formatDuration(routeInfo.duration_s)}
                    {" "}· <span className="capitalize">{t(`map.routeMode.${routeMode}`)}</span>
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground truncate">{routeTarget?.title}</p>
              )}
            </div>
            <button
              onClick={clearRoute}
              className="p-1 rounded-full hover:bg-muted transition-colors flex-shrink-0"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        )}

        {/* Listings loading indicator */}
        {listingsLoading && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] bg-white dark:bg-zinc-800 rounded-full px-3 py-1.5 shadow text-sm flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-green-600" />
            Chargement...
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
