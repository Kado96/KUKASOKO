import { useEffect, useRef, useState, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useTranslation } from "react-i18next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useUserLocation } from "@/hooks/useUserLocation";
import { listingsAPI, mapAPI, API_BASE } from "@/services/api";
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
  const [categoryTree, setCategoryTree] = useState<
    { id: number; name: string; name_fr?: string; icon?: string; children?: { id: number; name: string; name_fr?: string }[] }[]
  >([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState<number | null>(null);
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
    { id: 1, name: "Immobilier", icon: "🏢", children: [] },
    { id: 2, name: "À vendre", icon: "🛍️", children: [] },
    { id: 3, name: "Services", icon: "🛠️", children: [] },
  ];

  const selectedParent = categoryTree.find((c) => c.id === selectedCategory);
  const subcats = selectedParent?.children ?? [];
  const activeCategoryId = selectedSubCategory ?? selectedCategory;

  // Fetch categories once (with mock fallback)
  useEffect(() => {
    listingsAPI.getCategoriesTree()
      .then((res) => {
        if (res.data && res.data.length > 0) {
          setCategoryTree(
            res.data.map((c: any) => ({
              id: c.id,
              name: c.name_fr || c.name,
              name_fr: c.name_fr,
              icon: c.icon,
              children: (c.children || []).map((s: any) => ({
                id: s.id,
                name: s.name_fr || s.name,
                name_fr: s.name_fr,
              })),
            }))
          );
        } else {
          setCategoryTree(defaultCategories);
        }
      })
      .catch(() => {
        setCategoryTree(defaultCategories);
      });
  }, []);

  // Fetch map listings whenever category / subcategory changes (with mock fallback if empty)
  useEffect(() => {
    setListingsLoading(true);
    listingsAPI
      .getForMap(activeCategoryId ?? undefined)
      .then((res) => {
        if (res.data && res.data.length > 0) {
          setListings(res.data);
        } else {
          // Fallback to mock data with coordinates mapped
          const activeCategoryName =
            subcats.find((c) => c.id === selectedSubCategory)?.name ||
            categoryTree.find((c) => c.id === selectedCategory)?.name ||
            "";
          const mock = allListings
            .filter((l) => activeCategoryId === null || l.category.toLowerCase() === activeCategoryName.toLowerCase())
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
  }, [activeCategoryId]);

  // Init map once with popup autoplay cycle
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;
    const center: [number, number] = [-3.3822, 29.3644];
    const map = L.map(mapRef.current).setView(center, 12);
    mapInstanceRef.current = map;
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a>",
    }).addTo(map);

    let autoplayTimer: any = null;

    // Quand un popup s'ouvre
    map.on("popupopen", (e: any) => {
      // Nettoyage de sécurité
      if (autoplayTimer) clearInterval(autoplayTimer);

      const popup = e.popup;
      // On cherche les propriétés du marqueur pour retrouver la clé de groupe
      const marker = e.target._layers ? Object.values(e.target._layers).find((l: any) => l.getPopup?.() === popup) : null;
      
      // Alternative : parcourir window.__popupMarkers pour identifier la key
      let markerKey = "";
      const markers = (window as any).__popupMarkers || {};
      for (const [key, m] of Object.entries(markers)) {
        if (m === e.target || (e.target.getPopup && e.target.getPopup() === popup)) {
          markerKey = key;
          break;
        }
      }

      if (!markerKey) {
        // Fallback par recherche d'ID dans le DOM du popup si non trouvé directement
        const content = popup.getContent();
        if (typeof content === "string") {
          const match = content.match(/window\.__changePhotoIndex\('([^']+)'/);
          if (match) markerKey = match[1];
        }
      }

      if (markerKey) {
        autoplayTimer = setInterval(() => {
          const group = (window as any).__popupGroups?.[markerKey];
          if (!group) return;
          const listingIndex = (window as any).__popupStates?.[markerKey] || 0;
          const listing = group[listingIndex];
          if (!listing) return;

          // Extraire les photos
          const API_BASE_URL = API_BASE;
          const norm = (url: string) => {
            if (!url || !url.trim()) return "";
            if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) return url;
            return `${API_BASE_URL}/${url.replace(/^\//, "")}`;
          };
          const photos: string[] = [];
          if (listing.image?.trim()) photos.push(norm(listing.image.trim()));
          if (listing.image_urls) {
            listing.image_urls.split(",").forEach((u: string) => {
              const n = norm(u.trim());
              if (n && !photos.includes(n)) photos.push(n);
            });
          }

          if (photos.length > 1) {
            const currentPhotoIdx = (window as any).__photoStates?.[markerKey] || 0;
            const nextPhotoIdx = (currentPhotoIdx + 1) % photos.length;
            
            // Appeler la fonction globale de changement de photo
            if (typeof (window as any).__changePhotoIndex === "function") {
              (window as any).__changePhotoIndex(markerKey, listingIndex, nextPhotoIdx);
            }
          }
        }, 3000);
      }
    });

    // Quand le popup se ferme
    map.on("popupclose", () => {
      if (autoplayTimer) {
        clearInterval(autoplayTimer);
        autoplayTimer = null;
      }
    });

    return () => {
      if (autoplayTimer) clearInterval(autoplayTimer);
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

    // Palette de couleurs pour les catégories
    const getCategoryColor = (category: any): string => {
      // Sécurité : la catégorie peut être un objet, null, undefined ou string
      const rawName = (typeof category === "object" && category !== null)
        ? (category?.name ?? "")
        : (category ?? "");
      const cat = String(rawName).toLowerCase();
      if (cat.includes("immo") || cat.includes("chambre") || cat.includes("maison") || cat.includes("location")) return "#ef4444";
      if (cat.includes("vente") || cat.includes("vendre") || cat.includes("boutique") || cat.includes("electronique") || cat.includes("ordinateur")) return "#f59e0b";
      if (cat.includes("service") || cat.includes("emploi") || cat.includes("travail")) return "#10b981";
      if (cat.includes("vehicule") || cat.includes("voiture") || cat.includes("moto")) return "#8b5cf6";
      return "#3b82f6"; // Bleu (par défaut)
    };

    // Extrait le nom lisible de la catégorie (string OU objet Category de l'API)
    const getCategoryName = (category: any): string => {
      if (!category) return "Annonce";
      if (typeof category === "string") return category;
      if (typeof category === "object") return category?.name || category?.label || "Annonce";
      return String(category);
    };

    const API_BASE_URL = API_BASE;

    // Normalise une URL d'image : ajoute le préfixe API si nécessaire
    const normalizeImageUrl = (url: string): string => {
      if (!url || url.trim() === "") return "";
      if (url.startsWith("http://") || url.startsWith("https://")) return url;
      if (url.startsWith("data:")) return url; // base64
      
      // Si c'est un asset local statique (ex: /category-services.jpg ou images mock locales)
      // et que ça ne fait pas référence au dossier media/ du backend, on laisse relatif.
      if (url.startsWith("/") && !url.startsWith("/media") && !url.startsWith("/uploads")) {
        return url;
      }
      
      // Chemin relatif vers le backend -> on ajoute le préfixe backend
      const cleanUrl = url.replace(/^\//, "");
      return `${API_BASE_URL}/${cleanUrl}`;
      
      // Fallback
      return url;
    };

    // Extrait toutes les photos d'une annonce (tableau d'URLs normalisées)
    const getListingPhotos = (listing: any): string[] => {
      const photos: string[] = [];
      if (listing.image && listing.image.trim()) {
        photos.push(normalizeImageUrl(listing.image.trim()));
      }
      if (listing.image_urls) {
        listing.image_urls.split(",").forEach((u: string) => {
          const norm = normalizeImageUrl(u.trim());
          if (norm && !photos.includes(norm)) photos.push(norm);
        });
      }
      return photos;
    };

    // HTML Generator function for popup carousel
    const buildPopupHtml = (key: string, listingIndex: number, photoIndex: number = 0) => {
      const group = grouped[key];
      const listing = group[listingIndex];
      const categoryName = getCategoryName(listing.category);
      const categoryColor = getCategoryColor(listing.category);
      const priceStr = typeof listing.price === "number" || !isNaN(Number(listing.price))
        ? `${Number(listing.price).toLocaleString()} ${listing.currency || "FBU"}`
        : listing.price;

      // Photos de l'annonce
      const photos = getListingPhotos(listing);
      const hasPhotos = photos.length > 0;
      const safePhotoIdx = Math.max(0, Math.min(photoIndex, photos.length - 1));
      const currentPhoto = photos[safePhotoIdx] || "";

      // Navigation entre annonces (même coordonnée)
      const hasPrevListing = listingIndex > 0;
      const hasNextListing = listingIndex < group.length - 1;

      // Build listing details HTML
      let resolvedDetails = listing.details;
      if (!resolvedDetails || !Array.isArray(resolvedDetails)) {
        resolvedDetails = [];
        if (listing.city) resolvedDetails.push({ label: "Ville", value: listing.city });
        if (listing.address) resolvedDetails.push({ label: "Adresse", value: listing.address });
        if (listing.views !== undefined) resolvedDetails.push({ label: "Vues", value: `${listing.views}` });
        if (listing.description) {
          const desc = listing.description.toLowerCase();
          const chambreMatch = desc.match(/(\d+)\s*chambre/);
          if (chambreMatch) resolvedDetails.push({ label: "Chambres", value: chambreMatch[1] });
          const sdbMatch = desc.match(/(\d+)\s*salle[s]?\s*de\s*bain/);
          if (sdbMatch) resolvedDetails.push({ label: "Salles de bain", value: sdbMatch[1] });
        }
      }

      const detailsHtml = resolvedDetails.length > 0
        ? `<div style="border-top:1px dashed #e5e7eb;padding-top:6px;margin-top:4px;margin-bottom:6px;font-size:11px;">
            ${resolvedDetails.map((d: any) => `
              <div style="display:flex;justify-content:space-between;margin-bottom:2px;">
                <span style="color:#6b7280;">${d.label}</span>
                <span style="font-weight:600;color:#374151;">${d.value}</span>
              </div>
            `).join("")}
          </div>`
        : "";

      // Carrousel photos HTML (si plusieurs images)
      const photosCarouselHtml = hasPhotos ? `
        <div style="position:relative;width:100%;height:130px;background:#f3f4f6;border-radius:8px;overflow:hidden;margin-bottom:8px;">
          <!-- Photo actuelle -->
          <img
            id="popup-photo-${key}"
            src="${currentPhoto}"
            alt="${listing.title}"
            style="width:100%;height:100%;object-fit:cover;display:block;"
            onerror="this.style.display='none';this.nextSibling.style.display='flex';"
          />
          <!-- Fallback si image cassée -->
          <div style="display:none;width:100%;height:100%;align-items:center;justify-content:center;flex-direction:column;color:#9ca3af;">
            <span style="font-size:28px;">📷</span>
            <span style="font-size:10px;margin-top:4px;">Image indisponible</span>
          </div>

          ${photos.length > 1 ? `
            <!-- Flèche gauche -->
            <button
              onclick="window.__changePhotoIndex('${key}', ${listingIndex}, ${safePhotoIdx - 1})"
              ${safePhotoIdx === 0 ? "disabled" : ""}
              style="position:absolute;left:4px;top:50%;transform:translateY(-50%);
                     background:rgba(0,0,0,0.45);color:white;border:none;border-radius:50%;
                     width:26px;height:26px;cursor:${safePhotoIdx === 0 ? "default" : "pointer"};
                     opacity:${safePhotoIdx === 0 ? "0.3" : "1"};
                     font-size:12px;display:flex;align-items:center;justify-content:center;
                     line-height:1;padding:0;">‹</button>
            <!-- Flèche droite -->
            <button
              onclick="window.__changePhotoIndex('${key}', ${listingIndex}, ${safePhotoIdx + 1})"
              ${safePhotoIdx === photos.length - 1 ? "disabled" : ""}
              style="position:absolute;right:4px;top:50%;transform:translateY(-50%);
                     background:rgba(0,0,0,0.45);color:white;border:none;border-radius:50%;
                     width:26px;height:26px;cursor:${safePhotoIdx === photos.length - 1 ? "default" : "pointer"};
                     opacity:${safePhotoIdx === photos.length - 1 ? "0.3" : "1"};
                     font-size:12px;display:flex;align-items:center;justify-content:center;
                     line-height:1;padding:0;">›</button>
            <!-- Dots indicateurs -->
            <div style="position:absolute;bottom:5px;left:0;right:0;display:flex;justify-content:center;gap:4px;">
              ${photos.map((_, i) => `
                <button onclick="window.__changePhotoIndex('${key}', ${listingIndex}, ${i})"
                  style="width:${i === safePhotoIdx ? "16px" : "6px"};height:6px;
                         border-radius:3px;border:none;cursor:pointer;padding:0;
                         background:${i === safePhotoIdx ? "white" : "rgba(255,255,255,0.5)"};
                         transition:all 0.2s;">
                </button>
              `).join("")}
            </div>
            <!-- Compteur photos -->
            <div style="position:absolute;top:6px;right:6px;background:rgba(0,0,0,0.55);color:white;
                        font-size:9px;font-weight:600;padding:2px 6px;border-radius:10px;">
              ${safePhotoIdx + 1} / ${photos.length}
            </div>
          ` : ""}
        </div>
      ` : "";

      // Navigation entre plusieurs annonces au même point
      const listingNavHtml = group.length > 1 ? `
        <div style="display:flex;justify-content:space-between;align-items:center;
                    background:#f3f4f6;padding:4px 8px;border-radius:6px;margin-bottom:6px;
                    font-size:11px;font-weight:600;color:#4b5563;">
          <button onclick="window.__changePopupListing('${key}', ${listingIndex - 1})"
            ${!hasPrevListing ? "disabled" : ""}
            style="cursor:${hasPrevListing ? "pointer" : "default"};border:none;background:none;
                   color:${hasPrevListing ? categoryColor : "#d1d5db"};font-weight:bold;font-size:13px;">
            ‹
          </button>
          <span style="font-size:10px;">Annonce ${listingIndex + 1} / ${group.length}</span>
          <button onclick="window.__changePopupListing('${key}', ${listingIndex + 1})"
            ${!hasNextListing ? "disabled" : ""}
            style="cursor:${hasNextListing ? "pointer" : "default"};border:none;background:none;
                   color:${hasNextListing ? categoryColor : "#d1d5db"};font-weight:bold;font-size:13px;">
            ›
          </button>
        </div>
      ` : "";

      return `
        <div style="min-width:240px;max-width:260px;font-family:'DM Sans',sans-serif;overflow:hidden;border-radius:12px;background:white;">
          <!-- Bandeau catégorie coloré -->
          <div style="background:${categoryColor};color:white;padding:6px 10px;font-size:10px;font-weight:bold;text-transform:uppercase;letter-spacing:0.5px;display:flex;justify-content:space-between;align-items:center;">
            <span>${categoryName}</span>
            <span style="background:rgba(255,255,255,0.25);padding:1px 6px;border-radius:10px;font-size:9px;">★ ${listing.rating || "4.0"}</span>
          </div>

          <div style="padding:10px;">
            ${photosCarouselHtml}
            ${listingNavHtml}

            <strong style="font-size:13px;color:#1f2937;display:block;margin-bottom:3px;line-height:1.3;font-weight:700;">${listing.title}</strong>
            <span style="color:${categoryColor};font-weight:bold;font-size:13px;display:block;margin-bottom:4px;">${priceStr}</span>

            ${detailsHtml}

            <div style="display:flex;justify-content:space-between;align-items:center;border-top:1px solid #e5e7eb;padding-top:8px;margin-top:6px;">
              <a href="/annonces/${listing.id}"
                style="color:${categoryColor};font-size:11px;font-weight:bold;text-decoration:none;
                       background:${categoryColor}18;padding:4px 8px;border-radius:6px;">
                Voir l'annonce →
              </a>
              <button onclick="window.__routeTo(${listing.latitude},${listing.longitude},'${listing.title.replace(/'/g, "\\'")}')"
                style="font-size:11px;color:#059669;cursor:pointer;border:none;background:#05966915;
                       padding:4px 8px;border-radius:6px;font-weight:600;display:flex;align-items:center;gap:3px;">
                🗺️ Itinéraire
              </button>
            </div>
          </div>
        </div>
      `;
    };
    (window as any).__buildPopupHtml = buildPopupHtml;


    // Create markers
    Object.keys(grouped).forEach((key) => {
      const group = grouped[key];
      const first = group[0];
      const color = getCategoryColor(first.category || "Autre");
      (window as any).__popupStates[key] = 0;

      // Premium 3D Compass / Punaise Pin Marker
      const icon = L.divIcon({
        className: "",
        iconSize: [34, 42],
        iconAnchor: [17, 42],
        popupAnchor: [0, -40],
        html: `
          <div style="position:relative; width:34px; height:42px; display:flex; flex-direction:column; align-items:center;">
            <!-- Ovale d'ombre au sol -->
            <div style="position:absolute; bottom:0; left:9px; width:16px; height:5px; background:rgba(0,0,0,0.3); border-radius:50%; filter:blur(1px);"></div>
            
            <!-- Aiguille en métal de la boussole/punaise -->
            <div style="position:absolute; bottom:4px; width:2px; height:20px; background:#b8b8b8; border-right:1px solid #949494; z-index:1;"></div>
            
            <!-- Boule brillante en 3D avec dégradé radial pour le relief sphérique -->
            <div style="
              position:absolute;
              top:0;
              width:24px;
              height:24px;
              border-radius:50%;
              background: radial-gradient(circle at 7px 7px, #ffffff 0%, ${color} 50%, #000000 100%);
              box-shadow: 0 4px 6px rgba(0,0,0,0.2), inset 0 -2px 5px rgba(0,0,0,0.4);
              z-index:2;
            ">
              <!-- Point de brillance spéculaire blanc additionnel pour effet de verre/plastique brillant -->
              <div style="position:absolute; top:3px; left:4px; width:5px; height:5px; background:rgba(255,255,255,0.7); border-radius:50%; filter:blur(0.5px);"></div>
            </div>
          </div>
        `,
      });

      const marker = L.marker([first.latitude, first.longitude], { icon })
        .addTo(map)
        .bindPopup(buildPopupHtml(key, 0), {
          className: "custom-premium-popup",
          maxWidth: 260,
        });

      (window as any).__popupMarkers[key] = marker;
      markersRef.current.push(marker);
    });

  }, [filteredListings]);

  // Expose callbacks globally
  useEffect(() => {
    (window as any).__routeTo = (lat: number, lng: number, title: string) => {
      setRouteTarget({ lat, lng, title });
    };

    // État double : annonce active + photo active par marker-key
    (window as any).__popupStates = {};   // { [key]: listingIndex }
    (window as any).__photoStates  = {};  // { [key]: photoIndex }

    // Changer d'annonce (plusieurs annonces au même point)
    (window as any).__changePopupListing = (key: string, index: number) => {
      const group = (window as any).__popupGroups?.[key];
      if (!group || index < 0 || index >= group.length) return;
      (window as any).__popupStates[key] = index;
      (window as any).__photoStates[key] = 0; // réinitialise les photos
      const marker = (window as any).__popupMarkers?.[key];
      if (marker) {
        const html = (window as any).__buildPopupHtml(key, index, 0);
        marker.setPopupContent(html);
      }
    };

    // Changer de photo dans le carrousel
    (window as any).__changePhotoIndex = (key: string, listingIndex: number, photoIndex: number) => {
      const group = (window as any).__popupGroups?.[key];
      if (!group) return;
      const listing = group[listingIndex];
      if (!listing) return;
      // Extraire les photos côté callback (même logique que getListingPhotos)
      const API_BASE_URL = API_BASE;
      const norm = (url: string) => {
        if (!url || !url.trim()) return "";
        if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) return url;
        return `${API_BASE_URL}/${url.replace(/^\//, "")}`;
      };
      const photos: string[] = [];
      if (listing.image?.trim()) photos.push(norm(listing.image.trim()));
      if (listing.image_urls) {
        listing.image_urls.split(",").forEach((u: string) => {
          const n = norm(u.trim());
          if (n && !photos.includes(n)) photos.push(n);
        });
      }
      const safeIdx = Math.max(0, Math.min(photoIndex, photos.length - 1));
      (window as any).__photoStates[key] = safeIdx;
      (window as any).__popupStates[key] = listingIndex;
      const marker = (window as any).__popupMarkers?.[key];
      if (marker) {
        const html = (window as any).__buildPopupHtml(key, listingIndex, safeIdx);
        marker.setPopupContent(html);
      }
    };

    return () => {
      delete (window as any).__routeTo;
      delete (window as any).__popupStates;
      delete (window as any).__photoStates;
      delete (window as any).__changePopupListing;
      delete (window as any).__changePhotoIndex;
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
              id="carte-category"
              name="carte-category"
              value={selectedCategory ?? "all"}
              onChange={(e) => {
                setSelectedCategory(e.target.value === "all" ? null : Number(e.target.value));
                setSelectedSubCategory(null);
              }}
              className="h-11 px-4 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent cursor-pointer transition-all shadow-sm min-w-[180px]"
            >
              <option value="all">Toutes les catégories</option>
              {categoryTree.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            <select
              id="carte-subcategory"
              name="carte-subcategory"
              value={selectedSubCategory ?? "all"}
              onChange={(e) =>
                setSelectedSubCategory(e.target.value === "all" ? null : Number(e.target.value))
              }
              disabled={subcats.length === 0}
              className="h-11 px-4 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent cursor-pointer transition-all shadow-sm min-w-[180px] disabled:opacity-70 disabled:text-muted-foreground"
            >
              <option value="all">
                {!selectedCategory
                  ? "Sous-catégorie"
                  : subcats.length === 0
                    ? "Aucune sous-catégorie"
                    : "Toutes les sous-catégories"}
              </option>
              {subcats.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name}
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
