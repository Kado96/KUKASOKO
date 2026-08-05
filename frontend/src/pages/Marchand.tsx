import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { merchantsAPI } from "@/services/api";
import { MapPin, Phone, MessageSquare, Star, Clock, CheckCircle, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface Merchant {
  id: number;
  shop_name: string;
  shop_description?: string;
  logo_url?: string;
  banner_url?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  whatsapp?: string;
  opening_hours?: string;
  rating: number;
  review_count: number;
  is_verified: boolean;
  user: { id: number; username: string; avatar_url?: string };
}

interface Listing {
  id: number;
  title: string;
  price: number;
  currency: string;
  image_urls?: string;
  city: string;
  created_at: string;
}

export default function MarchandPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const mid = Number(id);
    Promise.all([merchantsAPI.getOne(mid), merchantsAPI.getListings(mid)])
      .then(([mRes, lRes]) => {
        setMerchant(mRes.data);
        setListings(lRes.data);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-4">
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    );
  }

  if (!merchant) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <ShoppingBag className="h-16 w-16 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Marchand introuvable</p>
        <Link to="/boutique">
          <Button variant="outline" className="mt-4">{t("common.back")}</Button>
        </Link>
      </div>
    );
  }

  const firstImage = (l: Listing) =>
    l.image_urls ? l.image_urls.split(",")[0] : null;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Banner */}
      <div className="relative h-44 sm:h-52 md:h-64 lg:h-72 rounded-2xl overflow-hidden bg-gradient-to-r from-green-600 to-emerald-500 mb-6">
        {merchant.banner_url && (
          <img
            src={merchant.banner_url}
            alt="Bannière"
            className="w-full h-full object-cover object-center"
          />
        )}
        {/* Logo */}
        <div className="absolute -bottom-8 left-6">
          <div className="w-20 h-20 rounded-2xl border-4 border-white bg-white shadow-lg overflow-hidden">
            {merchant.logo_url ? (
              <img src={merchant.logo_url} alt={merchant.shop_name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-green-100 flex items-center justify-center text-2xl font-bold text-green-700">
                {merchant.shop_name[0]}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="mt-12 flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{merchant.shop_name}</h1>
            {merchant.is_verified && (
              <CheckCircle className="h-5 w-5 text-green-500" />
            )}
          </div>
          {merchant.shop_description && (
            <p className="text-muted-foreground mt-1 max-w-xl">{merchant.shop_description}</p>
          )}

          {/* Rating */}
          <div className="flex items-center gap-2 mt-2">
            <div className="flex">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`h-4 w-4 ${i < Math.round(merchant.rating) ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground"}`}
                />
              ))}
            </div>
            <span className="text-sm text-muted-foreground">
              {merchant.rating.toFixed(1)} ({merchant.review_count} {t("merchant.reviews")})
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 flex-shrink-0">
          {merchant.phone && (
            <a href={`tel:${merchant.phone}`}>
              <Button variant="outline" size="sm" className="gap-2">
                <Phone className="h-4 w-4" />
                {t("merchant.contact")}
              </Button>
            </a>
          )}
          {merchant.whatsapp && (
            <a href={`https://wa.me/${merchant.whatsapp.replace(/\D/g, "")}`} target="_blank">
              <Button className="gap-2 bg-green-600 hover:bg-green-700" size="sm">
                <MessageSquare className="h-4 w-4" />
                WhatsApp
              </Button>
            </a>
          )}
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
        {merchant.address && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/50">
            <MapPin className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Adresse</p>
              <p className="text-sm font-medium">{merchant.address}</p>
              {merchant.latitude && merchant.longitude && (
                <Link
                  to={`/carte?lat=${merchant.latitude}&lng=${merchant.longitude}`}
                  className="text-xs text-green-600 hover:underline mt-1 block"
                >
                  Voir sur la carte →
                </Link>
              )}
            </div>
          </div>
        )}
        {merchant.opening_hours && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/50">
            <Clock className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">{t("merchant.hours")}</p>
              <p className="text-sm font-medium">{merchant.opening_hours}</p>
            </div>
          </div>
        )}
        <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/50">
          <ShoppingBag className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Annonces actives</p>
            <p className="text-sm font-bold text-green-600">{listings.length}</p>
          </div>
        </div>
      </div>

      {/* Listings */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-4">{t("merchant.listings")}</h2>
        {listings.length === 0 ? (
          <p className="text-muted-foreground text-center py-12">{t("merchant.noListings")}</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {listings.map((listing) => (
              <Link key={listing.id} to={`/annonces/${listing.id}`}>
                <div className="group rounded-xl border bg-card overflow-hidden hover:shadow-md transition-shadow">
                  <div className="aspect-square bg-muted overflow-hidden">
                    {firstImage(listing) ? (
                      <img
                        src={`${import.meta.env.VITE_API_URL || "http://localhost:8000"}${firstImage(listing)}`}
                        alt={listing.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <ShoppingBag className="h-8 w-8" />
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-medium truncate">{listing.title}</p>
                    <p className="text-sm text-green-600 font-bold mt-1">
                      {listing.price.toLocaleString()} {listing.currency}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
