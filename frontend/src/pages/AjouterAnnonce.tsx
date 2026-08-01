import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { Loader2, ImagePlus, X, MapPin, Navigation, Store, CheckCircle2, Clock } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { mediaAPI, listingsAPI } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

// ─── Catégories par défaut ────────────────────────────────────────────────────
const defaultCategories = [
  { value: "1", label: "Immobilier" },
  { value: "2", label: "Véhicules" },
  { value: "3", label: "Services" },
  { value: "4", label: "À vendre" },
];

// ─── Utilitaire : guest_token UUID v4 persisté dans localStorage ─────────────
function getOrCreateGuestToken(): string {
  const key = "kukasoko_guest_token";
  let token = localStorage.getItem(key);
  if (!token) {
    // Génération d'un UUID v4
    token = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
    localStorage.setItem(key, token);
  }
  return token;
}

// ─── Composant succès ─────────────────────────────────────────────────────────
const SuccessScreen = ({
  isGuest,
  onNewAnnonce,
}: {
  isGuest: boolean;
  onNewAnnonce: () => void;
}) => {
  const navigate = useNavigate();
  return (
    <div className="bg-card rounded-2xl shadow-xl p-8 text-center space-y-6 border border-border animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-center">
        <div className="w-16 h-16 rounded-full bg-green-500/15 flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-green-500" />
        </div>
      </div>
      <div>
        <h2 className="text-xl font-display font-bold text-foreground mb-2">
          Annonce publiée ! 🎉
        </h2>
        <p className="text-muted-foreground text-sm">
          {isGuest
            ? "Votre annonce est en ligne pour les prochaines 24 heures. Les acheteurs peuvent vous contacter directement."
            : "Votre annonce est maintenant visible sur KUKASOKO."}
        </p>
      </div>

      {/* Bannière promotion boutique pour les invités */}
      {isGuest && (
        <div className="rounded-xl bg-gradient-to-br from-[#febb2d]/10 to-[#f59e0b]/5 border border-[#febb2d]/30 p-5 text-left space-y-3">
          <div className="flex items-center gap-2">
            <Store className="w-5 h-5 text-[#febb2d]" />
            <span className="font-semibold text-foreground text-sm">
              Envie de plus d'annonces ?
            </span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Créez votre boutique gratuite sur KUKASOKO et publiez{" "}
            <strong className="text-foreground">des annonces illimitées et permanentes</strong>,
            gérez votre catalogue et atteignez plus d'acheteurs.
          </p>
          <Button
            onClick={() => navigate("/register")}
            className="w-full bg-[#febb2d] hover:bg-[#e2a828] text-zinc-950 font-semibold rounded-full h-10 text-sm"
          >
            Créer mon compte et ma boutique →
          </Button>
        </div>
      )}

      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={() => navigate("/annonces")}
          className="flex-1 rounded-full h-10 text-sm"
        >
          Voir les annonces
        </Button>
        {isGuest ? (
          <Button
            variant="ghost"
            onClick={onNewAnnonce}
            className="flex-1 rounded-full h-10 text-sm text-muted-foreground"
            disabled
            title="Votre annonce gratuite est déjà active (24h)"
          >
            <Clock className="w-4 h-4 mr-1.5" />
            24h actif
          </Button>
        ) : (
          <Button
            onClick={onNewAnnonce}
            className="flex-1 bg-[#febb2d] hover:bg-[#e2a828] text-zinc-950 font-semibold rounded-full h-10 text-sm"
          >
            Nouvelle annonce
          </Button>
        )}
      </div>
    </div>
  );
};

// ─── Page principale ──────────────────────────────────────────────────────────
const AjouterAnnonce = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const isMerchant = user?.role === "merchant" || user?.role === "admin";
  const isGuest = !isAuthenticated; // Visiteur non connecté

  // ── State du formulaire ───────────────────────────────────────────────────
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [location, setLocation] = useState("");
  // Champs invité uniquement
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");

  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [categoriesList, setCategoriesList] = useState(defaultCategories);
  const [published, setPublished] = useState(false); // Écran succès

  // ── Chargement des catégories ─────────────────────────────────────────────
  useEffect(() => {
    listingsAPI
      .getCategories()
      .then((res) => {
        if (Array.isArray(res.data)) {
          const apiCats = res.data.map((c: any) => ({
            value: String(c.id),
            label: c.name_fr || c.name || "Catégorie",
          }));
          setCategoriesList(apiCats);
        }
      })
      .catch(() => {});
  }, []);

  // ── Upload d'images ───────────────────────────────────────────────────────
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const res = await mediaAPI.upload([file], "listing");
        const newUrl = res.data.url;
        if (newUrl) setImages((prev) => [...prev, newUrl]);
      }
      toast({ title: "Photo(s) ajoutée(s)", description: "Images chargées avec succès." });
    } catch (err: any) {
      toast({
        title: "Erreur d'upload",
        description: err?.response?.data?.detail || "Impossible de charger la photo.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index: number) =>
    setImages((prev) => prev.filter((_, i) => i !== index));

  // ── GPS ───────────────────────────────────────────────────────────────────
  const handleGPS = () => {
    if (!navigator.geolocation) {
      toast({ title: "GPS non supporté", variant: "destructive" });
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setGpsCoords(coords);
        setLocation(`${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`);
        toast({ title: "📍 GPS capturé !" });
        setGpsLoading(false);
      },
      () => {
        toast({ title: "GPS refusé", variant: "destructive" });
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const getCoordinates = (): Promise<{ lat: number; lng: number }> => {
    if (gpsCoords) return Promise.resolve(gpsCoords);
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve({ lat: -3.3822, lng: 29.3644 });
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve({ lat: -3.3822, lng: 29.3644 }),
        { enableHighAccuracy: true, timeout: 5000 }
      );
    });
  };

  // ── Soumission du formulaire ──────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation commune
    if (!title || !categoryId || !description) {
      toast({
        title: "Champs requis",
        description: "Veuillez remplir le titre, la catégorie et la description.",
        variant: "destructive",
      });
      return;
    }
    if (images.length === 0) {
      toast({
        title: "Photo obligatoire 📸",
        description: "Ajoutez au moins une photo pour publier votre annonce.",
        variant: "destructive",
      });
      return;
    }

    // Validation invité
    if (isGuest) {
      if (!guestName.trim()) {
        toast({ title: "Nom requis", description: "Indiquez votre nom pour que les acheteurs puissent vous identifier.", variant: "destructive" });
        return;
      }
      if (!guestPhone.trim()) {
        toast({ title: "Téléphone requis", description: "Votre numéro est nécessaire pour que les acheteurs vous contactent.", variant: "destructive" });
        return;
      }
    }

    setSubmitting(true);
    try {
      const coords = await getCoordinates();

      if (isGuest) {
        // ── Annonce invité (sans JWT) ───────────────────────────────────────
        const guestToken = getOrCreateGuestToken();
        const payload = {
          title,
          description,
          price: price ? parseFloat(price) : 0.0,
          currency: "BIF",
          latitude: coords.lat,
          longitude: coords.lng,
          address: location || "Bujumbura",
          city: "Bujumbura",
          category_id: Number(categoryId),
          image_urls: images.join(","),
          guest_token: guestToken,
          guest_name: guestName.trim(),
          guest_phone: guestPhone.trim(),
        };
        await listingsAPI.createGuest(payload);
        setPublished(true);

      } else {
        // ── Annonce utilisateur connecté ────────────────────────────────────
        const payload = {
          title,
          description,
          price: price ? parseFloat(price) : 0.0,
          currency: "BIF",
          latitude: coords.lat,
          longitude: coords.lng,
          address: location || "Bujumbura",
          city: "Bujumbura",
          category_id: Number(categoryId),
          image_urls: images.join(","),
        };
        await listingsAPI.create(payload);

        // Reset et redirection
        setTitle(""); setCategoryId(""); setDescription("");
        setPrice(""); setLocation(""); setImages([]);

        if (isMerchant) {
          toast({ title: "Annonce publiée ! 🎉", description: "Visible sur le marketplace et dans votre boutique." });
          navigate("/ma-boutique");
        } else {
          setPublished(true);
        }
      }
    } catch (err: any) {
      console.error("[AjouterAnnonce] Erreur:", err);

      if (err?.response?.status === 401) return; // Géré par l'intercepteur

      if (err?.response?.status === 403) {
        const detail = err?.response?.data?.detail || "";
        toast({
          title: "Annonce déjà active ⏱️",
          description: detail || "Votre annonce gratuite 24h est encore active.",
          variant: "destructive",
        });
        return;
      }

      const errorMsg = Array.isArray(err?.response?.data?.detail)
        ? err.response.data.detail.map((d: any) => `${d.loc?.join(" -> ")}: ${d.msg}`).join(", ")
        : err?.response?.data?.detail || err?.message || "Erreur lors de la publication.";

      toast({ title: `Erreur ${err?.response?.status || "réseau"}`, description: errorMsg, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  // ── Réinitialiser pour une nouvelle annonce ───────────────────────────────
  const resetForm = () => {
    setTitle(""); setCategoryId(""); setDescription("");
    setPrice(""); setLocation(""); setImages([]);
    setGuestName(""); setGuestPhone("");
    setGpsCoords(null); setPublished(false);
  };

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-16">
        {/* Hero */}
        <div className="bg-primary py-12">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-3xl font-display font-bold text-primary-foreground mb-2">
              Ajouter une annonce
            </h1>
            <p className="text-primary-foreground/70">
              {isGuest
                ? "Publiez gratuitement sans créer de compte — votre annonce est active 24h"
                : isMerchant
                ? "Publiez autant d'annonces que vous souhaitez"
                : "1 annonce gratuite valable 24 heures"}
            </p>
          </div>
        </div>

        <div className="container mx-auto px-4 py-10 max-w-2xl">

          {/* ── Écran de succès ────────────────────────────────────────────── */}
          {published ? (
            <SuccessScreen isGuest={isGuest} onNewAnnonce={resetForm} />
          ) : (

          /* ── Formulaire ──────────────────────────────────────────────────── */
          <form onSubmit={handleSubmit} className="bg-card rounded-xl shadow-lg p-6 md:p-8 space-y-6">

            {/* Bannière info invité */}
            {isGuest && (
              <div className="rounded-xl bg-gradient-to-r from-[#febb2d]/10 to-transparent border border-[#febb2d]/25 p-4 flex items-start gap-3">
                <span className="text-2xl leading-none mt-0.5">⚡</span>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Publication gratuite — sans compte
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    Votre annonce sera active pendant <strong>24 heures</strong>.
                    Pour des annonces illimitées et permanentes,{" "}
                    <button
                      type="button"
                      onClick={() => navigate("/register")}
                      className="text-[#c8911f] font-semibold underline underline-offset-2 hover:text-[#febb2d]"
                    >
                      créez votre boutique gratuitement
                    </button>
                    .
                  </p>
                </div>
              </div>
            )}

            {/* ── Champs invité (nom + téléphone) ─────────────────────────── */}
            {isGuest && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-2 border-b border-border">
                <div className="space-y-2">
                  <Label htmlFor="guest-name" className="text-foreground font-medium">
                    Votre nom *
                  </Label>
                  <Input
                    id="guest-name"
                    placeholder="Ex: Jean-Pierre"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    className="bg-background"
                    autoComplete="name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="guest-phone" className="text-foreground font-medium">
                    Téléphone de contact *
                  </Label>
                  <Input
                    id="guest-phone"
                    placeholder="Ex: +257 79 123 456"
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    className="bg-background"
                    type="tel"
                    autoComplete="tel"
                  />
                </div>
              </div>
            )}

            {/* Titre */}
            <div className="space-y-2">
              <Label htmlFor="title" className="text-foreground font-medium">
                Titre de l'annonce *
              </Label>
              <Input
                id="title"
                name="title"
                autoComplete="off"
                placeholder="Ex: Appartement 3 pièces centre-ville"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="bg-background"
              />
            </div>

            {/* Catégorie */}
            <div className="space-y-2">
              <Label htmlFor="category" className="text-foreground font-medium">
                Catégorie *
              </Label>
              <select
                id="category"
                name="category"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Sélectionnez une catégorie</option>
                {categoriesList.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-foreground font-medium">
                Description *
              </Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Décrivez votre annonce en détail..."
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="bg-background"
              />
            </div>

            {/* Prix */}
            <div className="space-y-2">
              <Label htmlFor="price" className="text-foreground font-medium">
                Prix de vente{" "}
                <span className="text-muted-foreground font-normal text-xs">(optionnel)</span>
              </Label>
              <div className="relative">
                <Input
                  id="price"
                  name="price"
                  type="number"
                  min="0"
                  step="any"
                  autoComplete="off"
                  placeholder="Ex: 150 000"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="bg-background pr-14"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                  BIF
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                💡 Il s'agit du prix de <strong>votre produit ou service</strong>, pas du coût de
                publication.
              </p>
            </div>

            {/* Localisation + GPS */}
            <div className="space-y-2">
              <Label htmlFor="location" className="text-foreground font-medium">
                Localisation
              </Label>
              <div className="flex gap-2">
                <Input
                  id="location"
                  name="location"
                  autoComplete="off"
                  placeholder="Ex: Bujumbura, Mukaza"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="bg-background flex-1"
                />
                <button
                  type="button"
                  onClick={handleGPS}
                  disabled={gpsLoading}
                  title="Utiliser ma position GPS actuelle"
                  className="h-10 px-3 rounded-md border border-input bg-background hover:bg-[#febb2d] hover:text-black hover:border-[#febb2d] transition-all flex items-center gap-1.5 text-sm text-muted-foreground disabled:opacity-50"
                >
                  {gpsLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : gpsCoords ? (
                    <Navigation className="w-4 h-4 text-green-500" />
                  ) : (
                    <MapPin className="w-4 h-4" />
                  )}
                  <span className="hidden sm:inline text-xs font-medium">
                    {gpsLoading ? "Localisation..." : gpsCoords ? "GPS actif" : "GPS"}
                  </span>
                </button>
              </div>
              {gpsCoords && (
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <Navigation className="w-3 h-3" />
                  Position GPS : {gpsCoords.lat.toFixed(4)}, {gpsCoords.lng.toFixed(4)}
                </p>
              )}
            </div>

            {/* Images */}
            <div className="space-y-2">
              <Label className="text-foreground font-medium">
                Photos *{" "}
                <span className="text-xs text-muted-foreground font-normal">
                  (Au moins une photo est requise)
                </span>
              </Label>
              <div className="flex flex-wrap gap-3">
                {images.map((img, i) => (
                  <div
                    key={i}
                    className="relative w-24 h-24 rounded-lg overflow-hidden border border-border group"
                  >
                    <img src={img} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      className="absolute top-1 right-1 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                <label
                  htmlFor="image-upload"
                  className="w-24 h-24 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-accent transition-colors text-muted-foreground hover:text-accent"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-6 h-6 mb-1 animate-spin text-accent" />
                      <span className="text-[10px]">Envoi...</span>
                    </>
                  ) : (
                    <>
                      <ImagePlus className="w-6 h-6 mb-1" />
                      <span className="text-[10px]">Ajouter</span>
                    </>
                  )}
                </label>
                <input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  autoComplete="off"
                  disabled={uploading || submitting}
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>
            </div>

            {/* Bannière info selon le rôle */}
            {!isGuest && (
              isMerchant ? (
                <div className="rounded-xl border border-[#febb2d]/40 bg-[#febb2d]/8 p-4 flex items-start gap-3">
                  <span className="text-2xl leading-none mt-0.5">🏪</span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Publication Boutique</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      En tant que marchand, vous pouvez publier autant d'annonces que vous souhaitez.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-[#febb2d]/40 bg-[#febb2d]/5 p-4 flex items-start gap-3">
                  <span className="text-2xl leading-none mt-0.5">⏱️</span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Annonce gratuite — 24 heures</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Sans boutique, vous bénéficiez d'<strong>1 annonce gratuite valable 24h</strong>.
                      Pour des annonces illimitées,{" "}
                      <button
                        type="button"
                        onClick={() => navigate("/ma-boutique")}
                        className="text-[#c8911f] font-semibold underline underline-offset-2 hover:text-[#febb2d]"
                      >
                        créez votre boutique
                      </button>
                      .
                    </p>
                  </div>
                </div>
              )
            )}

            {/* Bouton soumettre */}
            <Button
              type="submit"
              disabled={submitting || uploading}
              className="w-full bg-[#febb2d] hover:bg-[#e2a828] text-zinc-950 font-sans font-semibold h-14 text-base rounded-full transition-all shadow-sm flex items-center justify-center gap-2 border-0"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Publication en cours...</span>
                </>
              ) : (
                <>
                  <span className="text-xl font-light leading-none mb-0.5">+</span>
                  <span>Publier mon annonce</span>
                </>
              )}
            </Button>

            {/* Lien de connexion pour les invités */}
            {isGuest && (
              <p className="text-center text-xs text-muted-foreground">
                Vous avez déjà un compte ?{" "}
                <button
                  type="button"
                  onClick={() => navigate("/login")}
                  className="text-[#c8911f] font-semibold hover:underline"
                >
                  Se connecter
                </button>
              </p>
            )}
          </form>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AjouterAnnonce;
