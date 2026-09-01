import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PageHero from "@/components/PageHero";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { merchantsAPI } from "@/services/api";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Check, X, CreditCard, ShoppingBag, Zap, Star, Rocket, TrendingUp, Clock, Shield
} from "lucide-react";

// ─── Définition des packs ────────────────────────────────────────────────────
// Pour monétiser : changez `price` et `priceValue` par des vraies valeurs
const packs = [
  {
    id: 1,
    key: "standard",
    name: "Pack Standard",
    tagline: "Idéal pour commencer",
    duration: "15 jours",
    price: "Gratuit",          // ← à remplacer par ex. "5 000 BIF"
    priceValue: 0,             // ← valeur numérique pour l'API
    badge: null,
    badgeColor: "",
    icon: ShoppingBag,
    color: "border-border",
    headerBg: "bg-secondary/40",
    features: [
      { label: "Jusqu'à 5 annonces actives", ok: true },
      { label: "Apparition sur la carte", ok: true },
      { label: "Contact par messagerie", ok: true },
      { label: "Mise en avant (boost)", ok: false },
      { label: "Publication réseaux sociaux", ok: false },
      { label: "Statistiques de vues", ok: false },
    ],
  },
  {
    id: 2,
    key: "premium",
    name: "Pack Premium",
    tagline: "Le plus populaire",
    duration: "30 jours",
    price: "Gratuit",          // ← à remplacer par ex. "15 000 BIF"
    priceValue: 0,
    badge: "⭐ Populaire",
    badgeColor: "bg-[#febb2d] text-zinc-900",
    icon: Star,
    color: "border-[#febb2d] ring-2 ring-[#febb2d]/30",
    headerBg: "bg-[#febb2d]/10",
    features: [
      { label: "Jusqu'à 20 annonces actives", ok: true },
      { label: "Apparition sur la carte", ok: true },
      { label: "Contact par messagerie", ok: true },
      { label: "Mise en avant (boost) — 1 annonce", ok: true },
      { label: "Publication réseaux sociaux", ok: false },
      { label: "Statistiques de vues", ok: false },
    ],
  },
  {
    id: 3,
    key: "pro",
    name: "Pack Pro",
    tagline: "Pour les pros & marchands",
    duration: "60 jours",
    price: "Gratuit",          // ← à remplacer par ex. "30 000 BIF"
    priceValue: 0,
    badge: "🚀 Meilleure offre",
    badgeColor: "bg-primary text-primary-foreground",
    icon: Rocket,
    color: "border-primary/40 ring-1 ring-primary/20",
    headerBg: "bg-primary/5",
    features: [
      { label: "Annonces illimitées", ok: true },
      { label: "Apparition sur la carte", ok: true },
      { label: "Contact par messagerie", ok: true },
      { label: "Mise en avant illimitée (boost)", ok: true },
      { label: "Publication réseaux sociaux", ok: true },
      { label: "Statistiques de vues détaillées", ok: true },
    ],
  },
];

// ─── Section Mise en avant (Boost) ────────────────────────────────────────────
const boostOptions = [
  {
    icon: TrendingUp,
    name: "Boost 3 jours",
    description: "Votre annonce en tête des résultats pendant 3 jours",
    price: "Bientôt disponible",
    tag: "Prochainement",
  },
  {
    icon: Zap,
    name: "Boost 7 jours",
    description: "Position premium + mise en avant sur la carte",
    price: "Bientôt disponible",
    tag: "Prochainement",
  },
  {
    icon: Star,
    name: "Boost Réseaux Sociaux",
    description: "Publication automatique sur nos pages Facebook & Instagram",
    price: "Bientôt disponible",
    tag: "Prochainement",
  },
];

// ─── Composant principal ───────────────────────────────────────────────────────
const Boutique = () => {
  const navigate = useNavigate();
  const { isAuthenticated, playNotificationSound } = useAuth();
  const [selectedPack, setSelectedPack] = useState<typeof packs[0] | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSelectPack = (pack: typeof packs[0]) => {
    if (!isAuthenticated) {
      toast({
        title: "Connexion requise",
        description: "Veuillez vous connecter pour activer un pack.",
        variant: "destructive",
      });
      navigate("/login");
      return;
    }
    setSelectedPack(pack);
  };

  const handleConfirmPack = async () => {
    if (!selectedPack) return;
    setLoading(true);
    try {
      await merchantsAPI.updateSubscription(`${selectedPack.name} - ${selectedPack.duration}`);
      playNotificationSound();
      toast({
        title: "Pack activé ! 🎉",
        description: `Votre pack "${selectedPack.name}" (${selectedPack.duration}) est maintenant actif.`,
      });
      setSelectedPack(null);
      navigate("/ma-boutique");
    } catch (err: any) {
      if (err.response?.status === 404) {
        toast({
          title: "Boutique requise",
          description: "Créez d'abord votre boutique dans 'Ma Boutique' avant d'activer un pack.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erreur",
          description: "Une erreur est survenue. Veuillez réessayer.",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-grow pt-16">
        <PageHero
          title="Boutique & Packs Vendeurs"
          subtitle="Choisissez le pack adapté pour vendre plus vite, augmenter votre visibilité et gérer vos annonces au Burundi."
          showSearch={false}
          compact={true}
        />

        {/* ── Grille des packs ── */}
        <div className="container mx-auto px-4 py-14">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {packs.map((pack) => {
              const Icon = pack.icon;
              return (
                <div
                  key={pack.id}
                  className={`relative bg-card rounded-2xl border-2 overflow-hidden flex flex-col shadow-md hover:shadow-xl transition-all duration-300 ${pack.color}`}
                >
                  {/* Badge */}
                  {pack.badge && (
                    <span className={`absolute top-4 right-4 text-xs font-bold px-3 py-1 rounded-full z-10 ${pack.badgeColor}`}>
                      {pack.badge}
                    </span>
                  )}

                  {/* Header */}
                  <div className={`p-6 pb-4 ${pack.headerBg}`}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-[#febb2d]/20 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-[#c8911f]" />
                      </div>
                      <div>
                        <h3 className="font-display font-bold text-foreground text-lg leading-tight">{pack.name}</h3>
                        <p className="text-xs text-muted-foreground">{pack.tagline}</p>
                      </div>
                    </div>

                    {/* Prix */}
                    <div className="flex items-baseline gap-2 mt-3">
                      <span className="text-3xl font-black text-[#c8911f]">{pack.price}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground font-medium">{pack.duration} de visibilité</span>
                    </div>
                  </div>

                  {/* Features */}
                  <div className="p-6 pt-4 flex-1 space-y-2.5">
                    {pack.features.map((f, i) => (
                      <div key={i} className="flex items-start gap-2.5">
                        {f.ok ? (
                          <Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                        ) : (
                          <X className="w-4 h-4 text-muted-foreground/40 mt-0.5 shrink-0" />
                        )}
                        <span className={`text-sm ${f.ok ? "text-foreground" : "text-muted-foreground/50"}`}>
                          {f.label}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* CTA */}
                  <div className="p-6 pt-2">
                    <Button
                      onClick={() => handleSelectPack(pack)}
                      className={`w-full font-semibold h-11 rounded-xl transition-all ${
                        pack.badge
                          ? "bg-[#febb2d] hover:bg-[#e2a828] text-zinc-900 shadow-md"
                          : "bg-secondary hover:bg-secondary/80 text-foreground"
                      }`}
                    >
                      <ShoppingBag className="w-4 h-4 mr-2" />
                      Activer ce pack
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Mention sécurité ── */}
          <div className="flex items-center justify-center gap-2 mt-8 text-sm text-muted-foreground">
            <Shield className="w-4 h-4 text-emerald-500" />
            <span>Paiement sécurisé via AfriPay (EcoCash / Lumicash) — intégration en cours</span>
          </div>
        </div>

        {/* ── Section Mise en avant (Boost) ── */}
        <div className="bg-secondary/30 border-t border-border py-14">
          <div className="container mx-auto px-4 max-w-4xl">
            <div className="text-center mb-10">
              <span className="inline-block bg-primary/10 text-primary text-xs font-bold px-3 py-1 rounded-full mb-3 uppercase tracking-wider">
                Prochainement
              </span>
              <h2 className="text-2xl font-display font-bold text-foreground mb-2">
                ⚡ Mise en avant de vos annonces
              </h2>
              <p className="text-muted-foreground text-sm max-w-md mx-auto">
                Boostez la visibilité de votre annonce pour la placer en tête des résultats et toucher plus d'acheteurs.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {boostOptions.map((boost, i) => {
                const BoostIcon = boost.icon;
                return (
                  <div key={i} className="bg-card rounded-xl border border-border p-5 flex flex-col items-start gap-3 opacity-75 relative overflow-hidden">
                    {/* Watermark "Bientôt" */}
                    <span className="absolute top-3 right-3 text-[10px] font-bold bg-secondary text-muted-foreground px-2 py-0.5 rounded-full">
                      {boost.tag}
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-[#febb2d]/15 flex items-center justify-center">
                      <BoostIcon className="w-5 h-5 text-[#c8911f]" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground text-sm">{boost.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">{boost.description}</p>
                    </div>
                    <p className="text-xs font-bold text-[#c8911f] mt-auto">{boost.price}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Modal de confirmation ── */}
        {selectedPack && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-2xl max-w-md w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              {/* Header modal */}
              <div className="p-5 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-accent animate-pulse" />
                  <h3 className="font-display font-bold text-foreground text-base">Passerelle AfriPay Burundi</h3>
                </div>
                <button
                  onClick={() => setSelectedPack(null)}
                  className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-secondary"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Corps modal */}
              <div className="p-6 space-y-4">
                <div className="bg-secondary/40 border border-border p-4 rounded-xl">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Pack sélectionné</p>
                  <p className="text-foreground font-bold text-base mt-1">{selectedPack.name}</p>
                  <p className="text-xs text-muted-foreground">{selectedPack.duration} de visibilité · {selectedPack.tagline}</p>
                  <div className="flex justify-between items-center border-t border-border mt-3 pt-3">
                    <span className="text-sm font-semibold text-foreground">Montant à régler :</span>
                    <span className="text-lg font-bold text-[#c8911f]">{selectedPack.price}</span>
                  </div>
                </div>

                <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl text-emerald-600 dark:text-emerald-400 text-xs space-y-1.5">
                  <p className="font-semibold flex items-center gap-1">
                    <Check className="w-4 h-4" /> Mode simulation AfriPay activé
                  </p>
                  <p className="opacity-90">
                    L'intégration réelle d'AfriPay (EcoCash / Lumicash) sera déployée prochainement.
                    Pour le moment, l'activation est <strong>immédiate et 100% gratuite</strong>.
                  </p>
                </div>
              </div>

              {/* Footer modal */}
              <div className="p-4 bg-secondary/20 border-t border-border flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setSelectedPack(null)}
                  className="flex-1"
                  disabled={loading}
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleConfirmPack}
                  className="flex-1 bg-[#febb2d] hover:bg-[#e2a828] text-zinc-900 font-semibold"
                  disabled={loading}
                >
                  {loading ? "Activation..." : "✅ Confirmer (Gratuit)"}
                </Button>
              </div>
            </div>
          </div>
        )}

      </main>
      <Footer />
    </div>
  );
};

export default Boutique;
