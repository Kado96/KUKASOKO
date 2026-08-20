/**
 * BoostListingButton.tsx
 * Bouton permettant à un vendeur de mettre son annonce en avant (5 000 BIF).
 * Affiche un badge "SPONSORISÉ" si l'annonce est déjà en avant.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Star, Loader2, Zap } from "lucide-react";
import { listingsAPI } from "@/services/api";
import { toast } from "@/hooks/use-toast";

interface Props {
  listingId: number;
  isFeatured: boolean;
  onSuccess?: (newFeaturedState: boolean) => void;
  compact?: boolean;
}

export default function BoostListingButton({ listingId, isFeatured, onSuccess, compact = false }: Props) {
  const [loading, setLoading] = useState(false);

  const handleBoost = async () => {
    if (isFeatured) return;
    setLoading(true);
    try {
      await listingsAPI.boostListing(listingId, "afripay");
      toast({
        title: "⭐ Annonce mise en avant !",
        description: "Votre annonce apparaît maintenant en tête de liste. Un admin confirmera le paiement sous 24h.",
      });
      onSuccess?.(true);
    } catch (err: any) {
      const msg = err?.response?.data?.detail;
      if (msg?.includes("abonnement") || msg?.includes("plan")) {
        toast({
          title: "Plan requis",
          description: "La mise en avant est disponible avec un plan PRO ou BUSINESS.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erreur",
          description: msg || "Impossible d'activer la mise en avant.",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  if (isFeatured) {
    return (
      <span className={`inline-flex items-center gap-1 ${compact ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2.5 py-1"} rounded-full bg-amber-500/15 text-amber-600 font-bold border border-amber-500/30`}>
        <Star className={`${compact ? "w-2.5 h-2.5" : "w-3 h-3"} fill-current`} />
        {!compact && "SPONSORISÉ"}
      </span>
    );
  }

  return (
    <Button
      size={compact ? "sm" : "default"}
      variant="outline"
      onClick={handleBoost}
      disabled={loading}
      className={`${compact ? "h-7 text-xs px-2" : "h-9 text-sm"} border-amber-500/40 text-amber-600 hover:bg-amber-500/10 hover:border-amber-500 font-semibold transition-all`}
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <>
          <Zap className={`${compact ? "w-3 h-3" : "w-4 h-4"} mr-1`} />
          {compact ? "Booster" : "Mettre en avant — 5 000 BIF"}
        </>
      )}
    </Button>
  );
}
