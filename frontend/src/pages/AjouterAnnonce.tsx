import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { Loader2, ImagePlus, X, MapPin, Navigation } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { mediaAPI, listingsAPI } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

// Fallback des catégories avec leurs vrais IDs de la base de données (seed_db.py)
const defaultCategories = [
  { value: "1", label: "Immobilier" },
  { value: "2", label: "Véhicules" },
  { value: "3", label: "Services" },
  { value: "4", label: "À vendre" },
];

const AjouterAnnonce = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const isMerchant = user?.role === "merchant" || user?.role === "admin";
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [location, setLocation] = useState("");
  const [phone, setPhone] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [categoriesList, setCategoriesList] = useState(defaultCategories);

  // Charger les catégories réelles de la DB au démarrage
  useEffect(() => {
    listingsAPI.getCategories()
      .then((res) => {
        if (Array.isArray(res.data)) {
          const apiCats = res.data.map((c: any) => ({
            value: String(c.id),
            label: c.name_fr || c.name || "Catégorie"
          }));
          setCategoriesList(apiCats);
        }
      })
      .catch(() => {
        // Fallback silencieux sur defaultCategories si l'API échoue
      });
  }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setUploading(true);
    try {
      const fileList = Array.from(files);
      for (const file of fileList) {
        const res = await mediaAPI.upload([file], "listing");
        const newUrl = res.data.url;
        if (newUrl) {
          setImages((prev) => [...prev, newUrl]);
        }
      }
      toast({ title: "Photo(s) ajoutée(s)", description: "Les images ont été chargées avec succès." });
    } catch (err: any) {
      toast({
        title: "Erreur d'upload",
        description: err?.response?.data?.detail || "Impossible de charger la photo sur le serveur.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  // Déclencher le GPS manuellement (bouton dans le formulaire)
  const handleGPS = () => {
    if (!navigator.geolocation) {
      toast({ title: "GPS non supporté", description: "Votre navigateur ne supporte pas la géolocalisation.", variant: "destructive" });
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = { lat: position.coords.latitude, lng: position.coords.longitude };
        setGpsCoords(coords);
        setLocation(`${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`);
        toast({ title: "📍 Position GPS capturée !", description: `Lat: ${coords.lat.toFixed(5)}, Lng: ${coords.lng.toFixed(5)}` });
        setGpsLoading(false);
      },
      () => {
        toast({ title: "GPS refusé", description: "Autorisez l'accès à la localisation dans votre navigateur.", variant: "destructive" });
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Helper interne pour obtenir les coordonnées lors de la soumission
  const getCoordinates = (): Promise<{ lat: number; lng: number }> => {
    // Si le GPS a déjà été capturé manuellement, on l'utilise directement
    if (gpsCoords) return Promise.resolve(gpsCoords);

    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve({ lat: -3.3822, lng: 29.3644 });
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
        () => resolve({ lat: -3.3822, lng: 29.3644 }),
        { enableHighAccuracy: true, timeout: 5000 }
      );
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 🔒 Vérification connexion AVANT TOUT
    if (!isAuthenticated) {
      toast({
        title: "Connexion requise",
        description: "Vous devez être connecté pour publier une annonce.",
        variant: "destructive",
      });
      navigate("/login");
      return;
    }

    if (!title || !categoryId || !description) {
      toast({ title: "Erreur", description: "Veuillez remplir tous les champs obligatoires (Titre, Catégorie, Description).", variant: "destructive" });
      return;
    }

    if (images.length === 0) {
      toast({ title: "Photo obligatoire 📸", description: "Veuillez ajouter au moins une photo pour publier votre annonce.", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      // 1. Récupération des coordonnées GPS réelles de l'utilisateur
      const coords = await getCoordinates();

      // Préparation du payload conforme au schéma du backend (schemas.ListingCreate)
      const payload = {
        title,
        description,
        price: price ? parseFloat(price) : 0.0,
        currency: "BIF",
        latitude: coords.lat,
        longitude: coords.lng,
        address: location || "Position GPS de l'annonceur",
        city: "Bujumbura",
        category_id: Number(categoryId),
        image_urls: images.join(","),
      };

      console.log("[AjouterAnnonce] Payload envoyé:", payload);
      const response = await listingsAPI.create(payload);
      console.log("[AjouterAnnonce] Réponse backend:", response.data);
      
      // Reset formulaire
      setTitle("");
      setCategoryId("");
      setDescription("");
      setPrice("");
      setLocation("");
      setPhone("");
      setImages([]);

      // Redirection selon le rôle
      if (isMerchant) {
        toast({ 
          title: "Annonce publiée ! 🎉", 
          description: "Votre annonce est maintenant visible sur le marketplace."
        });
        navigate("/ma-boutique");
      } else {
        toast({ 
          title: "Annonce publiée ! 🎉", 
          description: "Votre annonce est en ligne. Créez une boutique pour publier plusieurs annonces."
        });
        navigate("/annonces");
      }
    } catch (err: any) {
      // Log complet pour déboguer
      console.error("[AjouterAnnonce] Erreur complète:", err);
      console.error("[AjouterAnnonce] Status:", err?.response?.status);
      console.error("[AjouterAnnonce] Data:", err?.response?.data);

      // Si 401 : l'intercepteur redirige déjà, on ne fait rien
      if (err?.response?.status === 401) return;

      // 403 = limite d'annonces atteinte pour un client simple
      if (err?.response?.status === 403) {
        toast({
          title: "Limite atteinte",
          description: "Vous avez déjà une annonce active. Créez une boutique pour publier plusieurs annonces.",
          variant: "destructive"
        });
        navigate("/boutique");
        return;
      }

      const errorMsg = Array.isArray(err?.response?.data?.detail)
        ? err.response.data.detail.map((d: any) => `${d.loc?.join(" -> ")}: ${d.msg}`).join(", ")
        : err?.response?.data?.detail || err?.message || "Impossible de publier l'annonce sur le serveur.";
      
      toast({
        title: `Erreur ${err?.response?.status || "réseau"}`,
        description: errorMsg,
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-16">
        <div className="bg-primary py-12">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-3xl font-display font-bold text-primary-foreground mb-2">Ajouter une annonce</h1>
            <p className="text-primary-foreground/70">Publiez votre annonce en quelques minutes</p>
          </div>
        </div>

        <div className="container mx-auto px-4 py-10 max-w-2xl">

          {/* 🔒 Guard : non connecté */}
          {!isAuthenticated ? (
            <div className="bg-card rounded-xl shadow-lg p-8 text-center space-y-4 border border-border">
              <div className="text-5xl mb-2">🔒</div>
              <h2 className="text-xl font-display font-bold text-foreground">Connexion requise</h2>
              <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                Vous devez être connecté à votre compte pour publier une annonce sur KUKASOKO.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                <Button
                  onClick={() => navigate("/login")}
                  className="bg-[#febb2d] hover:bg-[#e2a828] text-zinc-950 font-semibold rounded-full px-8 h-11"
                >
                  Se connecter
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate("/register")}
                  className="rounded-full px-8 h-11"
                >
                  Créer un compte
                </Button>
              </div>
            </div>
          ) : (

          <form onSubmit={handleSubmit} className="bg-card rounded-xl shadow-lg p-6 md:p-8 space-y-6">
            {/* Titre */}
            <div className="space-y-2">
              <Label htmlFor="title" className="text-foreground font-medium">Titre de l'annonce *</Label>
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
              <Label htmlFor="category" className="text-foreground font-medium">Catégorie *</Label>
              <select
                id="category"
                name="category"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Sélectionnez une catégorie</option>
                {categoriesList.map((cat) => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-foreground font-medium">Description *</Label>
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

            {/* Prix de vente de l'annonce */}
            <div className="space-y-2">
              <Label htmlFor="price" className="text-foreground font-medium">
                Prix de vente <span className="text-muted-foreground font-normal text-xs">(optionnel)</span>
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
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">BIF</span>
              </div>
              <p className="text-xs text-muted-foreground">
                💡 Il s'agit du prix de <strong>votre produit ou service</strong>, pas du coût de publication.
              </p>
            </div>

            {/* Localisation + GPS */}
            <div className="space-y-2">
              <Label htmlFor="location" className="text-foreground font-medium">Localisation</Label>
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
                {/* Bouton GPS manuel */}
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

            {/* Téléphone */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-foreground font-medium">Numéro de téléphone</Label>
              <Input
                id="phone"
                name="phone"
                autoComplete="tel"
                placeholder="Ex: +243 000 000 000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="bg-background"
              />
            </div>

            {/* Images */}
            <div className="space-y-2">
              <Label className="text-foreground font-medium">Photos * <span className="text-xs text-muted-foreground font-normal">(Au moins une photo est requise)</span></Label>
              <div className="flex flex-wrap gap-3">
                {images.map((img, i) => (
                  <div key={i} className="relative w-24 h-24 rounded-lg overflow-hidden border border-border group">
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
                <label htmlFor="image-upload" className="w-24 h-24 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-accent transition-colors text-muted-foreground hover:text-accent">
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
                  <input id="image-upload" type="file" accept="image/*" autoComplete="off" disabled={uploading || submitting} multiple onChange={handleImageUpload} className="hidden" />
                </label>
              </div>
            </div>

            {/* Bannière : info selon le rôle */}
            {isMerchant ? (
              <div className="rounded-xl border border-[#febb2d]/40 bg-[#febb2d]/8 p-4 flex items-start gap-3">
                <span className="text-2xl leading-none mt-0.5">🏪</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">Publication Boutique</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    En tant que marchand, vous pouvez publier autant d'annonces que vous souhaitez.
                    Votre annonce sera visible sur le marketplace et dans votre boutique.
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-blue-400/40 bg-blue-500/5 p-4 flex items-start gap-3">
                <span className="text-2xl leading-none mt-0.5">💡</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">Annonce gratuite</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Vous pouvez publier <strong>1 annonce gratuitement</strong> sans boutique. Pour publier plusieurs annonces,{" "}
                    <button
                      type="button"
                      onClick={() => navigate("/boutique")}
                      className="text-blue-500 font-semibold underline underline-offset-2 hover:text-blue-400"
                    >
                      créez votre boutique
                    </button>.
                  </p>
                </div>
              </div>
            )}

            {/* Submit */}
            <Button 
              type="submit" 
              disabled={submitting || uploading} 
              className="w-full bg-[#febb2d] hover:bg-[#e2a828] text-zinc-950 font-sans font-semibold h-14 text-base rounded-full transition-all shadow-sm flex items-center justify-center gap-2 border-0"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Publication en cours...
                </>
              ) : (
                <>
                  <span className="text-xl font-light leading-none mb-0.5">+</span>
                  <span>Publier mon annonce</span>
                </>
              )}
            </Button>
          </form>

          )} {/* fin du guard isAuthenticated */}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AjouterAnnonce;
