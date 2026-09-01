import { useState, useRef, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  BarChart3, Users, ShoppingBag, Flag, MessageSquare, Store, Settings,
  Eye, Trash2, CheckCircle, XCircle, Search, Pencil, Save, X, Plus,
  ShieldCheck, ShieldOff, ImagePlus, Image as ImageIcon, UploadCloud,
  Palette, RefreshCw, Loader2, Radio, DollarSign, ToggleLeft, ToggleRight,
  ChevronUp, ChevronDown, Tags
} from "lucide-react";
import { useNewsTicker } from "@/contexts/NewsTickerContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { allListings } from "@/data/listings";
import { toast } from "@/hooks/use-toast";
import { useSite, THEMES } from "@/contexts/SiteContext";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { usersAPI, mediaAPI, listingsAPI, subscriptionsAPI, API_BASE } from "@/services/api";
import { Copy, FolderOpen, HardDrive, Database } from "lucide-react";

type Tab = "dashboard" | "annonces" | "boutiques" | "utilisateurs" | "signalements" | "chatbot" | "medias" | "personnalisation" | "bandeau" | "categories" | "blog" | "tarifs";

type CategoryItem = {
  id: number;
  name: string;
  name_fr?: string | null;
  icon?: string | null;
  color?: string | null;
  parent_id?: number | null;
  children?: CategoryItem[];
};

type User = { id: number; name: string; email: string; role: string; status: string; date: string; avatar?: string };
type Boutique = { id: number; name: string; owner: string; annonces: number; status: string; date: string; logo?: string; cover?: string };
type Report = { id: number; type: string; annonce: string; reporter: string; reason: string; date: string; status: string; image?: string };
type ChatbotEntry = { keyword: string; response: string };
type Listing = typeof allListings[0] & { image: string };

const initUsers: User[] = [
  { id: 1, name: "Michelle Foster", email: "michelle@email.com", role: "Vendeur", status: "Actif", date: "17 Nov 2021" },
  { id: 2, name: "Thomas Hinton", email: "thomas@email.com", role: "Acheteur", status: "Actif", date: "16 Nov 2021" },
  { id: 3, name: "Jean Dupont", email: "jean@email.com", role: "Vendeur", status: "Suspendu", date: "15 Nov 2021" },
  { id: 4, name: "Alice Nkurunziza", email: "alice@email.com", role: "Administrateur", status: "Actif", date: "10 Nov 2021" },
];

const initReports: Report[] = [
  { id: 1, type: "Signalement", annonce: "Chambre rénovée", reporter: "Thomas Hinton", reason: "Contenu inapproprié", date: "17 Nov 2021", status: "En attente" },
  { id: 2, type: "Réclamation", annonce: "MacBook Pro", reporter: "Jean Dupont", reason: "Produit défectueux", date: "16 Nov 2021", status: "En attente" },
  { id: 3, type: "Signalement", annonce: "Services de nettoyage", reporter: "Alice Nkurunziza", reason: "Arnaque suspectée", date: "15 Nov 2021", status: "Résolu" },
];

const initBoutiques: Boutique[] = [
  { id: 1, name: "Boutique Michelle", owner: "Michelle Foster", annonces: 5, status: "Active", date: "17 Nov 2021" },
  { id: 2, name: "Tech Store", owner: "Jean Dupont", annonces: 3, status: "Active", date: "15 Nov 2021" },
  { id: 3, name: "Services Pro", owner: "Alice Nkurunziza", annonces: 8, status: "Suspendue", date: "10 Nov 2021" },
];

const initChatbot: ChatbotEntry[] = [
  { keyword: "annonce", response: "Pour publier une annonce : connectez-vous, cliquez « Ajouter une annonce », remplissez le formulaire." },
  { keyword: "boutique", response: "Pour créer votre boutique : allez dans « Ma Boutique », remplissez les infos et activez la géolocalisation." },
  { keyword: "livraison", response: "Notre système utilise la géolocalisation pour faciliter la livraison entre vendeurs et acheteurs." },
  { keyword: "abonnement", response: "Les abonnements permettent de publier des annonces et d'accéder aux fonctionnalités premium." },
];

/* ─── Confirm Dialog ─── */
function ConfirmDialog({ message, onConfirm, onCancel }: { message: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4">
        <p className="text-foreground font-medium mb-5 text-center">{message}</p>
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onCancel}>Annuler</Button>
          <Button className="flex-1 bg-red-500 hover:bg-red-600 text-white" onClick={onConfirm}>Confirmer</Button>
        </div>
      </div>
    </div>
  );
}

/* ─── Image Lightbox ─── */
function Lightbox({ src, onClose }: { src: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm" onClick={onClose}>
      <button className="absolute top-4 right-4 text-white/70 hover:text-white" onClick={onClose}>
        <X className="w-8 h-8" />
      </button>
      <img src={src} alt="preview" className="max-w-[90vw] max-h-[90vh] rounded-xl object-contain shadow-2xl" onClick={(e) => e.stopPropagation()} />
    </div>
  );
}

/* ─── Image Upload Box (Connecté à la Médiathèque Réelle) ─── */
function ImageBox({
  label, src, onUpload, onDelete, onPreview, squareSize = "w-24 h-24", coverRatio = false, category = "library"
}: {
  label: string; src: string; onUpload: (url: string) => void; onDelete: () => void;
  onPreview?: (url: string) => void; squareSize?: string; coverRatio?: boolean; category?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const uploadFile = async (file: File) => {
    setUploading(true);
    try {
      const res = await mediaAPI.upload([file], category);
      // Récupération de l'URL publique générée par le serveur
      const publicUrl = res.data.url;
      onUpload(publicUrl);
      toast({ title: "Fichier ajouté à la médiathèque", description: file.name });
    } catch (err: any) {
      toast({
        title: "Erreur lors de l'upload",
        description: err?.response?.data?.detail || "Impossible de téléverser l'image",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const cls = coverRatio ? "w-full h-28" : squareSize;
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">{label}</p>
      <div className={`relative group ${cls} rounded-xl overflow-hidden border-2 ${src ? "border-border" : "border-dashed border-border"} bg-secondary flex items-center justify-center cursor-pointer`}
        onClick={() => !src && !uploading && ref.current?.click()}>
        {uploading ? (
          <div className="flex flex-col items-center gap-1 text-accent">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-[9px] text-center">Envoi...</span>
          </div>
        ) : src ? (
          <>
            <img src={src} alt={label} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              {onPreview && (
                <button onClick={(e) => { e.stopPropagation(); onPreview(src); }}
                  className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors" title="Voir">
                  <Eye className="w-4 h-4" />
                </button>
              )}
              <button onClick={(e) => { e.stopPropagation(); ref.current?.click(); }}
                className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors" title="Remplacer">
                <UploadCloud className="w-4 h-4" />
              </button>
              <button onClick={(e) => { e.stopPropagation(); onDelete(); }}
                className="p-1.5 rounded-lg bg-red-500/70 hover:bg-red-500 text-white transition-colors" title="Supprimer">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-1 text-muted-foreground">
            <ImagePlus className="w-6 h-6" />
            <span className="text-[10px] text-center px-1">Ajouter</span>
          </div>
        )}
      </div>
      <input 
        ref={ref} 
        id={`img-upload-${label.toLowerCase().replace(/\s+/g, "-")}`}
        name={`img-upload-${label.toLowerCase().replace(/\s+/g, "-")}`}
        type="file" 
        accept="image/*" 
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f); }} 
      />
    </div>
  );
}


/* ─── Inline text field ─── */
function InlineField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const fieldId = useRef(`inline-field-${Math.random().toString(36).substr(2, 9)}`);
  return (
    <div>
      <label htmlFor={fieldId.current} className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</label>
      <input 
        id={fieldId.current}
        name={fieldId.current}
        value={value} 
        onChange={(e) => onChange(e.target.value)}
        autoComplete="off"
        className="w-full mt-0.5 h-8 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent" 
      />
    </div>
  );
}

/* ════════════════════════════════════════════ */
const Admin = () => {
  const { user, isAuthenticated, login, loading: authLoading } = useAuth();
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [searchQuery, setSearchQuery] = useState("");
  const [confirm, setConfirm] = useState<{ msg: string; action: () => void } | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);

  /* annonces */
  const [listings, setListings] = useState<Listing[]>([]);
  const [listingsLoading, setListingsLoading] = useState(false);
  const [editListingId, setEditListingId] = useState<number | null>(null);
  const [editListingTitle, setEditListingTitle] = useState("");
  const [editListingPrice, setEditListingPrice] = useState("");
  const [editListingImage, setEditListingImage] = useState("");

  /* users */
  const [users, setUsers] = useState<User[]>(initUsers);
  const [editUserId, setEditUserId] = useState<number | null>(null);
  const [editUserData, setEditUserData] = useState<Partial<User>>({});

  // Charger les annonces du backend
  const fetchAllListings = async () => {
    setListingsLoading(true);
    try {
      const res = await listingsAPI.getAll();
      if (res.data) {
        const apiListings = res.data.map((l: any) => ({
          id: l.id,
          title: l.title,
          category: l.category?.name_fr || l.category?.name || "À vendre",
          price: l.price > 0 ? `${l.price.toLocaleString("fr-BI")} ${l.currency || "BIF"}` : "Sur devis",
          description: l.description || "",
          rating: 4.5,
          reviews: 0,
          date: new Date(l.created_at || Date.now()).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }),
            image: (() => {
            const rawImg = l.image || (l.image_urls ? l.image_urls.split(",")[0] : null);
            if (!rawImg) return `${API_BASE}/media/listing/category-avendre.jpg`;
            if (rawImg.startsWith("http://") || rawImg.startsWith("https://")) return rawImg;
            return `${API_BASE}/${rawImg}`;
          })(),
          location: { lat: l.latitude || -3.38, lng: l.longitude || 29.36, address: l.city || "Bujumbura" }
        }));
        setListings(apiListings);
      }
    } catch (err) {
      console.error("Erreur de chargement d'admin listings:", err);
    } finally {
      setListingsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && user?.role === "admin") {
      usersAPI.getAll()
        .then((res) => {
          const apiUsers: User[] = res.data.map((u: any) => ({
            id: u.id,
            name: u.full_name || u.username,
            email: u.email,
            role: u.role === "admin" ? "Administrateur" : u.role === "merchant" ? "Vendeur" : "Acheteur",
            status: u.is_active ? "Actif" : "Suspendu",
            date: new Date(u.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }),
            avatar: u.avatar_url || "",
          }));
          setUsers(apiUsers);
        })
        .catch(() => {});
      
      fetchAllListings();
    }
  }, [isAuthenticated, user]);

  // Charge les médias quand l'onglet Médiathèque est actif
  useEffect(() => {
    if (activeTab === "medias" && isAuthenticated && user?.role === "admin") {
      loadMediaFiles();
    }
  }, [activeTab]);

  /* tarifs & abonnements */
  const [plansList, setPlansList] = useState<any[]>([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [editingPlanCode, setEditingPlanCode] = useState<string | null>(null);
  const [editPlanData, setEditPlanData] = useState<Partial<any>>({});
  const [planSaving, setPlanSaving] = useState(false);

  const loadPlans = async () => {
    setPlansLoading(true);
    try {
      const res = await subscriptionsAPI.getAllPlansAdmin();
      setPlansList(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      toast({ title: "Erreur", description: "Impossible de charger les plans d'abonnement.", variant: "destructive" });
    } finally {
      setPlansLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "tarifs" && isAuthenticated && user?.role === "admin") {
      loadPlans();
    }
  }, [activeTab]);

  const handleSavePlan = async (code: string) => {
    setPlanSaving(true);
    try {
      await subscriptionsAPI.updatePlan(code, editPlanData);
      toast({ title: `Plan ${code} mis à jour avec succès ✅` });
      setEditingPlanCode(null);
      loadPlans();
    } catch (err: any) {
      toast({
        title: "Erreur de sauvegarde",
        description: err?.response?.data?.detail || "Impossible de sauvegarder le plan.",
        variant: "destructive",
      });
    } finally {
      setPlanSaving(false);
    }
  };

  /* catégories */
  const [categoryTree, setCategoryTree] = useState<CategoryItem[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [catForm, setCatForm] = useState({ name: "", icon: "", parent_id: "" as string });
  const [editCatId, setEditCatId] = useState<number | null>(null);
  const [editCatName, setEditCatName] = useState("");
  const [editCatIcon, setEditCatIcon] = useState("");

  const loadCategories = async () => {
    setCategoriesLoading(true);
    try {
      const res = await listingsAPI.getCategoriesTree();
      setCategoryTree(Array.isArray(res.data) ? res.data : []);
    } catch {
      toast({ title: "Erreur", description: "Impossible de charger les catégories.", variant: "destructive" });
    } finally {
      setCategoriesLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "categories" && isAuthenticated && user?.role === "admin") {
      loadCategories();
    }
  }, [activeTab]);

  const handleCreateCategory = async () => {
    const name = catForm.name.trim();
    if (!name) {
      toast({ title: "Nom requis", variant: "destructive" });
      return;
    }
    try {
      await listingsAPI.createCategory({
        name,
        name_fr: name,
        icon: catForm.icon.trim() || undefined,
        parent_id: catForm.parent_id ? Number(catForm.parent_id) : null,
      });
      setCatForm({ name: "", icon: "", parent_id: "" });
      toast({ title: catForm.parent_id ? "Sous-catégorie créée" : "Catégorie créée" });
      loadCategories();
    } catch (err: any) {
      toast({
        title: "Erreur",
        description: err?.response?.data?.detail || "Création impossible",
        variant: "destructive",
      });
    }
  };

  const handleSaveCategory = async (id: number) => {
    const name = editCatName.trim();
    if (!name) {
      toast({ title: "Nom requis", variant: "destructive" });
      return;
    }
    try {
      await listingsAPI.updateCategory(id, {
        name,
        name_fr: name,
        icon: editCatIcon.trim() || null,
      });
      setEditCatId(null);
      toast({ title: "Catégorie mise à jour" });
      loadCategories();
    } catch (err: any) {
      toast({
        title: "Erreur",
        description: err?.response?.data?.detail || "Modification impossible",
        variant: "destructive",
      });
    }
  };

  const handleDeleteCategory = (id: number, label: string) => {
    setConfirm({
      msg: `Supprimer « ${label} » ?`,
      action: async () => {
        try {
          await listingsAPI.deleteCategory(id);
          toast({ title: "Catégorie supprimée" });
          loadCategories();
        } catch (err: any) {
          toast({
            title: "Suppression refusée",
            description: err?.response?.data?.detail || "Impossible de supprimer",
            variant: "destructive",
          });
        }
      },
    });
  };


  /* boutiques */
  const [boutiques, setBoutiques] = useState<Boutique[]>(initBoutiques);
  const [editBoutiqueId, setEditBoutiqueId] = useState<number | null>(null);
  const [editBoutiqueData, setEditBoutiqueData] = useState<Partial<Boutique>>({});

  /* reports */
  const [reports, setReports] = useState<Report[]>(initReports);

  /* chatbot */
  const [chatbotData, setChatbotData] = useState<ChatbotEntry[]>(initChatbot);
  const [editChatIdx, setEditChatIdx] = useState<number | null>(null);
  const [editChatKw, setEditChatKw] = useState("");
  const [editChatResp, setEditChatResp] = useState("");

  /* ─── BLOG ADMIN MANAGEMENT ─── */
  const [blogPostsState, setBlogPostsState] = useState<any[]>([]);
  const [editPostId, setEditPostId] = useState<number | null>(null);
  const [postTitle, setPostTitle] = useState("");
  const [postExcerpt, setPostExcerpt] = useState("");
  const [postCategory, setPostCategory] = useState("Guide");
  const [postImage, setPostImage] = useState("");
  const [postContent, setPostContent] = useState("");
  const [postTags, setPostTags] = useState("");

  // Charger les articles de blog depuis localStorage (avec fallback statique)
  const fetchBlogPosts = () => {
    const stored = localStorage.getItem("kukasoko-blog-posts");
    if (stored) {
      setBlogPostsState(JSON.parse(stored));
    } else {
      // Importer et initialiser
      import("@/data/blogPosts").then(({ blogPosts }) => {
        setBlogPostsState(blogPosts);
        localStorage.setItem("kukasoko-blog-posts", JSON.stringify(blogPosts));
      });
    }
  };

  useEffect(() => {
    fetchBlogPosts();
  }, []);

  const handleSaveBlogPost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!postTitle || !postExcerpt || !postContent) {
      toast({ title: "Erreur", description: "Veuillez remplir le titre, le résumé et le contenu.", variant: "destructive" });
      return;
    }

    let updated;
    if (editPostId !== null) {
      // Edition
      updated = blogPostsState.map((p) => {
        if (p.id === editPostId) {
          return {
            ...p,
            title: postTitle,
            excerpt: postExcerpt,
            category: postCategory,
            image: postImage || "/category-services.jpg",
            content: postContent,
            tags: postTags ? postTags.split(",").map(t => t.trim()).filter(Boolean) : p.tags
          };
        }
        return p;
      });
      toast({ title: "Article de blog modifié ✅" });
    } else {
      // Création
      const newPost = {
        id: Date.now(),
        title: postTitle,
        excerpt: postExcerpt,
        date: new Date().toLocaleDateString("fr-FR", { year: "numeric", month: "long", day: "numeric" }),
        image: postImage || "/category-services.jpg",
        category: postCategory,
        tags: postTags ? postTags.split(",").map(t => t.trim()).filter(Boolean) : ["Nouveau"],
        content: postContent,
        comments: []
      };
      updated = [newPost, ...blogPostsState];
      toast({ title: "Article de blog créé ✅" });
    }

    setBlogPostsState(updated);
    localStorage.setItem("kukasoko-blog-posts", JSON.stringify(updated));
    // Réinitialiser le formulaire
    setEditPostId(null);
    setPostTitle("");
    setPostExcerpt("");
    setPostCategory("Guide");
    setPostImage("");
    setPostContent("");
    setPostTags("");
  };

  const handleDeleteBlogPost = (id: number) => {
    ask("Supprimer définitivement cet article de blog ?", () => {
      const updated = blogPostsState.filter((p) => p.id !== id);
      setBlogPostsState(updated);
      localStorage.setItem("kukasoko-blog-posts", JSON.stringify(updated));
      toast({ title: "Article supprimé 🗑️" });
    });
  };

  /* ─── Médiathèque réelle (connectée backend) ─── */
  type MediaFile = {
    id: number;
    filename: string;
    url: string;
    file_path: string;
    mime_type: string;
    size_bytes: number;
    storage_provider: string;
    media_category: string;
    related_listing_id?: number;
    uploaded_by?: number;
    created_at: string;
  };
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaUploading, setMediaUploading] = useState(false);
  const [mediaFilter, setMediaFilter] = useState<string>("all");
  const [mediaStats, setMediaStats] = useState<{ total_files: number; total_size_mb: number; by_category: Record<string, number>; by_provider: Record<string, number> } | null>(null);
  const [mediaCopiedId, setMediaCopiedId] = useState<number | null>(null);

  const loadMediaFiles = async () => {
    setMediaLoading(true);
    try {
      const [filesRes, statsRes] = await Promise.all([
        mediaAPI.getAll(),
        mediaAPI.getStats(),
      ]);
      setMediaFiles(filesRes.data);
      setMediaStats(statsRes.data);
    } catch {
      /* silently ignore si backend non disponible */
    } finally {
      setMediaLoading(false);
    }
  };

  const handleMediaUpload = async (files: File[], category = "library") => {
    setMediaUploading(true);
    let uploaded = 0;
    for (const file of files) {
      try {
        const res = await mediaAPI.upload([file], category);
        setMediaFiles((prev) => [res.data, ...prev]);
        uploaded++;
      } catch (err: any) {
        toast({ title: `Erreur upload: ${file.name}`, description: err?.response?.data?.detail || "Fichier invalide", variant: "destructive" });
      }
    }
    if (uploaded > 0) {
      toast({ title: `✅ ${uploaded} fichier(s) uploadé(s)`, description: "Fichiers enregistrés dans backend/media/" });
      await mediaAPI.getStats().then(r => setMediaStats(r.data)).catch(() => {});
    }
    setMediaUploading(false);
  };

  const handleMediaDeleteReal = (file: MediaFile) => {
    ask(`Supprimer définitivement "${file.filename}" ?`, async () => {
      try {
        await mediaAPI.delete(file.id);
        setMediaFiles((prev) => prev.filter((f) => f.id !== file.id));
        toast({ title: "🗑️ Fichier supprimé", description: `${file.filename} retiré du serveur et de la DB.` });
      } catch (err: any) {
        toast({ title: "Erreur de suppression", description: err?.response?.data?.detail, variant: "destructive" });
      }
    });
  };

  const handleCopyUrl = (file: MediaFile) => {
    navigator.clipboard.writeText(file.url);
    setMediaCopiedId(file.id);
    toast({ title: "📋 URL copiée !", description: file.url });
    setTimeout(() => setMediaCopiedId(null), 2000);
  };

  const filteredMediaFiles = mediaFilter === "all"
    ? mediaFiles
    : mediaFiles.filter((f) => f.media_category === mediaFilter);

  /* site branding */
  const { settings: siteSettings, updateSettings: updateSiteSettings, resetSettings: resetSiteSettings } = useSite();

  const heroSlides =
    siteSettings.heroImages?.length > 0
      ? siteSettings.heroImages
      : siteSettings.heroImage
        ? [siteSettings.heroImage]
        : [];

  const saveHeroSlides = (next: string[]) =>
    updateSiteSettings({ heroImages: next, heroImage: next[0] || "" });

  const moveHeroSlide = (from: number, to: number) => {
    if (to < 0 || to >= heroSlides.length) return;
    const next = [...heroSlides];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    saveHeroSlides(next);
  };

  /* news ticker */
  const { messages: tickerMessages, addMessage: addTickerMsg, updateMessage: updateTickerMsg, deleteMessage: deleteTickerMsg, toggleMessage: toggleTickerMsg } = useNewsTicker();
  const [newTickerText, setNewTickerText] = useState("");
  const [newTickerPaid, setNewTickerPaid] = useState(false);
  const [newTickerPrice, setNewTickerPrice] = useState("");
  const [newTickerSponsor, setNewTickerSponsor] = useState("");
  const [editTickerId, setEditTickerId] = useState<number | null>(null);
  const [editTickerText, setEditTickerText] = useState("");
  const [editTickerPaid, setEditTickerPaid] = useState(false);
  const [editTickerPrice, setEditTickerPrice] = useState("");
  const [editTickerSponsor, setEditTickerSponsor] = useState("");

  const [adminSessionVerified, setAdminSessionVerified] = useState<boolean>(() => {
    return sessionStorage.getItem("isoko_admin_session") === "true";
  });

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminEmail.trim() || !adminPassword.trim()) {
      setLoginError("Veuillez saisir votre identifiant et votre mot de passe.");
      return;
    }
    setLoginError("");
    setSubmitting(true);
    try {
      const loggedUser = await login(adminEmail.trim(), adminPassword.trim());
      if (loggedUser.role !== "admin") {
        setLoginError("Accès refusé. Cette zone est réservée aux administrateurs.");
      } else {
        sessionStorage.setItem("isoko_admin_session", "true");
        setAdminSessionVerified(true);
        toast({ title: "Accès autorisé", description: "Bienvenue dans l'espace d'administration." });
      }
    } catch (err: any) {
      setLoginError("Identifiants incorrects ou problème de connexion.");
    } finally {
      setSubmitting(false);
    }
  };

  // Auth Loading Screen
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  // Admin Guard Screen: Exige toujours la saisie du mot de passe pour la session d'admin
  if (!isAuthenticated || user?.role !== "admin" || !adminSessionVerified) {
    const isLoggedAsNonAdmin = isAuthenticated && user?.role !== "admin";

    return (
      <div className="min-h-screen bg-background flex flex-col justify-center items-center px-4">
        <Navbar />
        <div className="max-w-md w-full bg-card border border-border p-8 rounded-2xl shadow-xl mt-16 text-center">
          <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-display font-bold text-foreground">Accès Réservé aux Administrateurs</h2>
          
          {isLoggedAsNonAdmin ? (
            <div className="mt-4 space-y-4">
              <p className="text-sm text-muted-foreground">
                Vous êtes actuellement connecté en tant que <span className="font-semibold text-foreground">{user?.full_name || user?.username}</span> (Rôle : <span className="capitalize">{user?.role}</span>).
              </p>
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-500 font-medium">
                ⛔ Votre compte ne possède pas les privilèges d'administrateur nécessaires pour accéder à cette zone.
              </div>
              <div className="flex flex-col gap-2 pt-2">
                <Button
                  onClick={() => {
                    localStorage.removeItem("kukasoko_token");
                    window.location.reload();
                  }}
                  className="w-full bg-accent text-accent-foreground hover:bg-accent/90 font-semibold"
                >
                  Se connecter avec un autre compte
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate("/")}
                  className="w-full"
                >
                  Retour à l'accueil
                </Button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-xs text-muted-foreground mt-1.5 mb-6">Veuillez vous authentifier avec un compte administrateur.</p>
              <form onSubmit={handleAdminLogin} className="space-y-4 text-left">
                <div>
                  <label htmlFor="admin-email" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nom d'utilisateur ou E-mail</label>
                  <input
                    id="admin-email"
                    type="text"
                    autoComplete="username"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="donald ou kandekedonald@gmail.com"
                    className="w-full mt-1.5 h-11 px-4 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    disabled={submitting}
                  />
                </div>
                <div>
                  <label htmlFor="admin-password" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Mot de passe</label>
                  <input
                    id="admin-password"
                    type="password"
                    autoComplete="current-password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full mt-1.5 h-11 px-4 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    disabled={submitting}
                  />
                </div>

                {loginError && (
                  <p className="text-xs text-red-500 font-medium text-center">{loginError}</p>
                )}

                <Button
                  type="submit"
                  className="w-full h-11 bg-accent text-accent-foreground hover:bg-accent/90 font-semibold"
                  disabled={submitting}
                >
                  <span className="flex items-center justify-center gap-2">
                    {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span>Se connecter</span>
                  </span>
                </Button>
              </form>
            </>
          )}
        </div>
        <Footer />
      </div>
    );
  }




  const ask = (msg: string, action: () => void) => setConfirm({ msg, action });

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "dashboard", label: "Tableau de bord", icon: <BarChart3 className="w-4 h-4" /> },
    { id: "annonces", label: "Annonces", icon: <ShoppingBag className="w-4 h-4" /> },
    { id: "boutiques", label: "Boutiques", icon: <Store className="w-4 h-4" /> },
    { id: "categories", label: "Catégories", icon: <Tags className="w-4 h-4" /> },
    { id: "utilisateurs", label: "Utilisateurs", icon: <Users className="w-4 h-4" /> },
    { id: "signalements", label: "Signalements", icon: <Flag className="w-4 h-4" /> },
    { id: "chatbot", label: "Chatbot IA", icon: <MessageSquare className="w-4 h-4" /> },
    { id: "bandeau", label: "Bandeau Info", icon: <Radio className="w-4 h-4" /> },
    { id: "blog", label: "Articles Blog", icon: <Pencil className="w-4 h-4" /> },
    { id: "tarifs", label: "Tarifs & Packs", icon: <DollarSign className="w-4 h-4" /> },
    { id: "medias", label: "Médiathèque", icon: <ImageIcon className="w-4 h-4" /> },
    { id: "personnalisation", label: "Personnalisation", icon: <Palette className="w-4 h-4" /> },
  ];

  const stats = [
    { label: "Annonces", value: listings.length, icon: <ShoppingBag className="w-5 h-5" />, color: "bg-accent/20 text-accent" },
    { label: "Utilisateurs", value: users.length, icon: <Users className="w-5 h-5" />, color: "bg-blue-500/20 text-blue-500" },
    { label: "Boutiques", value: boutiques.length, icon: <Store className="w-5 h-5" />, color: "bg-green-500/20 text-green-500" },
    { label: "Signalements", value: reports.filter((r) => r.status === "En attente").length, icon: <Flag className="w-5 h-5" />, color: "bg-red-500/20 text-red-500" },
  ];

  /* Chargement médiathèque au montage de l'onglet */
  // (géré dans le useEffect dédié ci-dessous)

  const handleMediaDelete = (type: string, id: any, label: string) => {
    ask(`Supprimer définitivement l'image "${label}" ?`, () => {
      if (type === "annonce") {
        setListings((prev) => prev.map((l) => l.id === id ? { ...l, image: "" } : l));
      } else if (type === "boutique-logo") {
        setBoutiques((prev) => prev.map((b) => b.id === id ? { ...b, logo: "" } : b));
      } else if (type === "boutique-cover") {
        setBoutiques((prev) => prev.map((b) => b.id === id ? { ...b, cover: "" } : b));
      } else if (type === "user") {
        setUsers((prev) => prev.map((u) => u.id === id ? { ...u, avatar: "" } : u));
      } else if (type === "report") {
        setReports((prev) => prev.map((r) => r.id === id ? { ...r, image: undefined } : r));
      } else if (type === "uploaded") {
        setUploadedMedias((prev) => prev.filter((_, idx) => idx !== id));
      }
      toast({ title: "Image supprimée" });
    });
  };

  const handleMediaModify = (type: string, id: any, newSrc: string) => {
    if (type === "annonce") {
      setListings((prev) => prev.map((l) => l.id === id ? { ...l, image: newSrc } : l));
    } else if (type === "boutique-logo") {
      setBoutiques((prev) => prev.map((b) => b.id === id ? { ...b, logo: newSrc } : b));
    } else if (type === "boutique-cover") {
      setBoutiques((prev) => prev.map((b) => b.id === id ? { ...b, cover: newSrc } : b));
    } else if (type === "user") {
      setUsers((prev) => prev.map((u) => u.id === id ? { ...u, avatar: newSrc } : u));
    } else if (type === "report") {
      setReports((prev) => prev.map((r) => r.id === id ? { ...r, image: newSrc } : r));
    } else if (type === "uploaded") {
      setUploadedMedias((prev) => prev.map((m, idx) => idx === id ? { ...m, src: newSrc } : m));
    }
    toast({ title: "Image modifiée ✅" });
  };

  return (
    <div className="min-h-screen bg-background">
      {confirm && <ConfirmDialog message={confirm.msg} onConfirm={() => { confirm.action(); setConfirm(null); }} onCancel={() => setConfirm(null)} />}
      {lightbox && <Lightbox src={lightbox} onClose={() => setLightbox(null)} />}

      <Navbar />
      <main className="pt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <Settings className="w-6 h-6 text-accent" />
              <h1 className="text-2xl font-display font-bold text-foreground">Administration</h1>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                sessionStorage.removeItem("isoko_admin_session");
                setAdminSessionVerified(false);
                toast({ title: "Session d'administration verrouillée 🔒" });
              }}
              className="text-xs font-semibold gap-1.5 border-border"
            >
              <ShieldOff className="w-3.5 h-3.5 text-amber-500" /> Verrouiller la session
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-card rounded-xl border border-border p-3 flex lg:flex-col overflow-x-auto lg:overflow-x-visible gap-2 lg:gap-1 sticky top-24 no-scrollbar">
                {tabs.map((tab) => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-colors whitespace-nowrap lg:whitespace-normal shrink-0 ${
                      activeTab === tab.id ? "bg-accent text-accent-foreground font-semibold" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    }`}>
                    {tab.icon} {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="lg:col-span-4 space-y-6 overflow-hidden">

              {/* ─── DASHBOARD ─── */}
              {activeTab === "dashboard" && (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {stats.map((s) => (
                      <div key={s.label} className="bg-card rounded-xl border border-border p-4">
                        <div className={`w-10 h-10 rounded-lg ${s.color} flex items-center justify-center mb-3`}>{s.icon}</div>
                        <p className="text-2xl font-bold text-foreground">{s.value}</p>
                        <p className="text-xs text-muted-foreground">{s.label}</p>
                      </div>
                    ))}
                  </div>
                  <div className="bg-card rounded-xl border border-border p-6">
                    <h3 className="font-semibold text-foreground mb-4">Derniers signalements</h3>
                    <div className="space-y-3">
                      {reports.slice(0, 3).map((r) => (
                        <div key={r.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                          <div>
                            <p className="text-sm font-medium text-foreground">{r.annonce}</p>
                            <p className="text-xs text-muted-foreground">{r.reason} — par {r.reporter}</p>
                          </div>
                          <Badge className={r.status === "En attente" ? "bg-amber-500/20 text-amber-600 border-0" : "bg-green-500/20 text-green-600 border-0"}>{r.status}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* ─── ANNONCES ─── */}
              {activeTab === "annonces" && (
                <div className="bg-card rounded-xl border border-border overflow-hidden">
                  <div className="p-4 border-b border-border flex items-center gap-3">
                    <Search className="w-4 h-4 text-muted-foreground" />
                    <input id="admin-search" name="admin-search" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Rechercher une annonce..." className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none" />
                    <span className="text-xs text-muted-foreground mr-2">{listings.length} annonce(s)</span>
                    <Button size="sm" className="bg-accent hover:bg-accent/90 text-accent-foreground text-xs font-semibold gap-1" onClick={() => {
                      const newId = Date.now();
                      const newListing = {
                        id: newId,
                        title: "Nouvelle annonce",
                        price: "0 Fbu",
                        category: "Autre",
                        date: new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }),
                        image: "",
                        location: "Bujumbura",
                        description: ""
                      };
                      setListings([newListing, ...listings]);
                      setEditListingId(newId);
                      setEditListingTitle("Nouvelle annonce");
                      setEditListingPrice("0 Fbu");
                      setEditListingImage("");
                    }}>
                      <Plus className="w-3.5 h-3.5" /> Ajouter
                    </Button>
                  </div>
                  <div className="divide-y divide-border">
                    {listings.filter((l) => l.title.toLowerCase().includes(searchQuery.toLowerCase())).map((listing) => (
                      <div key={listing.id}>
                        {editListingId === listing.id ? (
                          <div className="p-4 bg-secondary/30 space-y-4">
                            {/* IMAGE ANNONCE */}
                            <ImageBox
                              label="Image de l'annonce"
                              src={editListingImage}
                              onUpload={setEditListingImage}
                              onDelete={() => ask("Supprimer l'image de cette annonce ?", () => { setEditListingImage(""); toast({ title: "Image supprimée" }); })}
                              onPreview={setLightbox}
                              coverRatio
                              category="listing"
                            />
                            <div className="grid grid-cols-2 gap-3">
                              <InlineField label="Titre" value={editListingTitle} onChange={setEditListingTitle} />
                              <InlineField label="Prix" value={editListingPrice} onChange={setEditListingPrice} />
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" className="bg-accent hover:bg-accent/90 text-accent-foreground gap-1" onClick={() => {
                                setListings((prev) => prev.map((l) => l.id === listing.id
                                  ? { ...l, title: editListingTitle, price: editListingPrice, image: editListingImage || l.image } : l));
                                setEditListingId(null);
                                toast({ title: "Annonce modifiée ✅" });
                              }}>
                                <Save className="w-3.5 h-3.5" /> Sauvegarder
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => setEditListingId(null)}>
                                <X className="w-3.5 h-3.5" /> Annuler
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-4 p-4 hover:bg-secondary/30 transition-colors">
                            <div className="relative group w-16 h-14 flex-shrink-0">
                              {listing.image
                                ? <img src={listing.image} alt={listing.title} className="w-full h-full rounded-lg object-cover" />
                                : <div className="w-full h-full rounded-lg bg-secondary flex items-center justify-center"><ImageIcon className="w-5 h-5 text-muted-foreground" /></div>
                              }
                              {listing.image && (
                                <button onClick={() => setLightbox(listing.image)}
                                  className="absolute inset-0 rounded-lg bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <Eye className="w-4 h-4 text-white" />
                                </button>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-foreground text-sm truncate">{listing.title}</p>
                              <p className="text-xs text-muted-foreground">{listing.category} • {listing.date}</p>
                            </div>
                            <p className="text-sm font-semibold text-foreground whitespace-nowrap">{listing.price}</p>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-500 hover:text-blue-600" title="Voir" onClick={() => window.open(`/annonces/${listing.id}`, "_blank")}>
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-accent hover:text-accent/80" title="Modifier" onClick={() => {
                                setEditListingId(listing.id); setEditListingTitle(listing.title);
                                setEditListingPrice(listing.price); setEditListingImage(listing.image);
                              }}>
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600" title="Supprimer" onClick={() =>
                                ask(`Supprimer l'annonce "${listing.title}" ?`, async () => {
                                  try {
                                    await listingsAPI.delete(listing.id);
                                    setListings((prev) => prev.filter((l) => l.id !== listing.id));
                                    toast({ title: "Annonce supprimée 🗑️" });
                                  } catch {
                                    toast({ title: "Erreur", description: "Impossible de supprimer cette annonce." });
                                  }
                                })}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ─── BOUTIQUES ─── */}
              {activeTab === "boutiques" && (
                <div className="bg-card rounded-xl border border-border overflow-hidden">
                  <div className="p-4 border-b border-border flex items-center justify-between">
                    <h3 className="font-semibold text-foreground">Gestion des boutiques</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground mr-1">{boutiques.length} boutique(s)</span>
                      <Button size="sm" className="bg-accent hover:bg-accent/90 text-accent-foreground text-xs font-semibold gap-1" onClick={() => {
                        const newId = Date.now();
                        const newBoutique = {
                          id: newId,
                          name: "Nouvelle Boutique",
                          owner: "Propriétaire",
                          annonces: 0,
                          status: "Active",
                          date: new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
                        };
                        setBoutiques([newBoutique, ...boutiques]);
                        setEditBoutiqueId(newId);
                        setEditBoutiqueData({ name: "Nouvelle Boutique", owner: "Propriétaire", logo: "", cover: "" });
                      }}>
                        <Plus className="w-3.5 h-3.5" /> Ajouter
                      </Button>
                    </div>
                  </div>
                  <div className="divide-y divide-border">
                    {boutiques.map((b) => (
                      <div key={b.id}>
                        {editBoutiqueId === b.id ? (
                          <div className="p-4 bg-secondary/30 space-y-4">
                            {/* IMAGES BOUTIQUE */}
                            <div className="grid grid-cols-1 gap-3">
                              <ImageBox
                                label="Image de couverture"
                                src={editBoutiqueData.cover ?? b.cover ?? ""}
                                onUpload={(url) => setEditBoutiqueData((d) => ({ ...d, cover: url }))}
                                onDelete={() => ask("Supprimer la couverture ?", () => { setEditBoutiqueData((d) => ({ ...d, cover: "" })); toast({ title: "Couverture supprimée" }); })}
                                onPreview={setLightbox}
                                coverRatio
                                category="merchant"
                              />
                              <ImageBox
                                label="Logo de la boutique"
                                src={editBoutiqueData.logo ?? b.logo ?? ""}
                                onUpload={(url) => setEditBoutiqueData((d) => ({ ...d, logo: url }))}
                                onDelete={() => ask("Supprimer le logo ?", () => { setEditBoutiqueData((d) => ({ ...d, logo: "" })); toast({ title: "Logo supprimé" }); })}
                                onPreview={setLightbox}
                                squareSize="w-20 h-20"
                                category="merchant"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <InlineField label="Nom" value={editBoutiqueData.name ?? b.name} onChange={(v) => setEditBoutiqueData((d) => ({ ...d, name: v }))} />
                              <InlineField label="Propriétaire" value={editBoutiqueData.owner ?? b.owner} onChange={(v) => setEditBoutiqueData((d) => ({ ...d, owner: v }))} />
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" className="bg-accent hover:bg-accent/90 text-accent-foreground gap-1" onClick={() => {
                                setBoutiques((prev) => prev.map((x) => x.id === b.id ? { ...x, ...editBoutiqueData } : x));
                                setEditBoutiqueId(null);
                                toast({ title: "Boutique modifiée ✅" });
                              }}>
                                <Save className="w-3.5 h-3.5" /> Sauvegarder
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => setEditBoutiqueId(null)}>
                                <X className="w-3.5 h-3.5" /> Annuler
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-4 p-4 hover:bg-secondary/30 transition-colors">
                            {/* Logo preview */}
                            <div className="relative group w-12 h-12 rounded-xl overflow-hidden flex-shrink-0">
                              {b.logo
                                ? <img src={b.logo} alt={b.name} className="w-full h-full object-cover" />
                                : <div className="w-full h-full bg-accent/20 flex items-center justify-center"><Store className="w-5 h-5 text-accent" /></div>
                              }
                              {b.logo && (
                                <button onClick={() => setLightbox(b.logo!)}
                                  className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <Eye className="w-3.5 h-3.5 text-white" />
                                </button>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-foreground text-sm">{b.name}</p>
                              <p className="text-xs text-muted-foreground">Par {b.owner} • {b.annonces} annonces • {b.date}</p>
                            </div>
                            <Badge className={b.status === "Active" ? "bg-green-500/20 text-green-600 border-0" : "bg-red-500/20 text-red-600 border-0"}>{b.status}</Badge>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-accent hover:text-accent/80" title="Modifier" onClick={() => {
                                setEditBoutiqueId(b.id); setEditBoutiqueData({ name: b.name, owner: b.owner, logo: b.logo, cover: b.cover });
                              }}>
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8" title={b.status === "Active" ? "Suspendre" : "Réactiver"} onClick={() => {
                                setBoutiques((prev) => prev.map((x) => x.id === b.id ? { ...x, status: x.status === "Active" ? "Suspendue" : "Active" } : x));
                                toast({ title: b.status === "Active" ? "Boutique suspendue" : "Boutique réactivée" });
                              }}>
                                {b.status === "Active" ? <ShieldOff className="w-4 h-4 text-amber-500" /> : <ShieldCheck className="w-4 h-4 text-green-500" />}
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600" title="Supprimer" onClick={() =>
                                ask(`Supprimer la boutique "${b.name}" ?`, () => {
                                  setBoutiques((prev) => prev.filter((x) => x.id !== b.id));
                                  toast({ title: "Boutique supprimée" });
                                })}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ─── UTILISATEURS ─── */}
              {activeTab === "utilisateurs" && (
                <div className="bg-card rounded-xl border border-border overflow-hidden">
                  <div className="p-4 border-b border-border flex items-center justify-between">
                    <h3 className="font-semibold text-foreground">Gestion des utilisateurs</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground mr-1">{users.length} utilisateur(s)</span>
                      <Button size="sm" className="bg-accent hover:bg-accent/90 text-accent-foreground text-xs font-semibold gap-1" onClick={() => {
                        const newId = Date.now();
                        const newUser = {
                          id: newId,
                          name: "Nouvel Utilisateur",
                          email: "user@kukasoko.com",
                          role: "Acheteur",
                          status: "Actif",
                          date: new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
                        };
                        setUsers([newUser, ...users]);
                        setEditUserId(newId);
                        setEditUserData({ name: "Nouvel Utilisateur", email: "user@kukasoko.com", role: "Acheteur", avatar: "" });
                      }}>
                        <Plus className="w-3.5 h-3.5" /> Ajouter
                      </Button>
                    </div>
                  </div>
                  <div className="divide-y divide-border">
                    {users.map((u) => (
                      <div key={u.id}>
                        {editUserId === u.id ? (
                          <div className="p-4 bg-secondary/30 space-y-4">
                            {/* PHOTO DE PROFIL */}
                            <ImageBox
                              label="Photo de profil"
                              src={editUserData.avatar ?? u.avatar ?? ""}
                              onUpload={(url) => setEditUserData((d) => ({ ...d, avatar: url }))}
                              onDelete={() => ask("Supprimer la photo de profil ?", () => { setEditUserData((d) => ({ ...d, avatar: "" })); toast({ title: "Photo supprimée" }); })}
                              onPreview={setLightbox}
                              squareSize="w-20 h-20"
                              category="avatar"
                            />
                            <div className="grid grid-cols-2 gap-3">
                              <InlineField label="Nom" value={editUserData.name ?? u.name} onChange={(v) => setEditUserData((d) => ({ ...d, name: v }))} />
                              <InlineField label="Email" value={editUserData.email ?? u.email} onChange={(v) => setEditUserData((d) => ({ ...d, email: v }))} />
                              <div>
                                <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Rôle</label>
                                <select id="edit-user-role" name="edit-user-role" value={editUserData.role ?? u.role} onChange={(e) => setEditUserData((d) => ({ ...d, role: e.target.value }))}
                                  className="w-full mt-0.5 h-8 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent">
                                  <option>Acheteur</option>
                                  <option>Vendeur</option>
                                  <option>Administrateur</option>
                                </select>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" className="bg-accent hover:bg-accent/90 text-accent-foreground gap-1" onClick={async () => {
                                const newRoleStr = editUserData.role ?? u.role;
                                const backendRole = newRoleStr === "Administrateur" ? "admin" : newRoleStr === "Vendeur" ? "merchant" : "user";
                                try {
                                  await usersAPI.updateRole(u.id, backendRole);
                                  setUsers((prev) => prev.map((x) => x.id === u.id ? { ...x, ...editUserData } : x));
                                  setEditUserId(null);
                                  toast({ title: "Rôle utilisateur mis à jour dans la base de données ✅" });
                                } catch (e) {
                                  // Fallback local UI update if demo/synthetic user
                                  setUsers((prev) => prev.map((x) => x.id === u.id ? { ...x, ...editUserData } : x));
                                  setEditUserId(null);
                                  toast({ title: "Utilisateur modifié (local) ✅" });
                                }
                              }}>
                                <Save className="w-3.5 h-3.5" /> Sauvegarder
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => setEditUserId(null)}>
                                <X className="w-3.5 h-3.5" /> Annuler
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-4 p-4 hover:bg-secondary/30 transition-colors">
                            {/* Avatar preview */}
                            <div className="relative group w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                              {u.avatar
                                ? <img src={u.avatar} alt={u.name} className="w-full h-full object-cover" />
                                : <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground font-bold text-sm">
                                    {u.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                                  </div>
                              }
                              {u.avatar && (
                                <button onClick={() => setLightbox(u.avatar!)}
                                  className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <Eye className="w-3 h-3 text-white" />
                                </button>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-foreground text-sm">{u.name}</p>
                              <p className="text-xs text-muted-foreground">{u.email} • {u.date}</p>
                            </div>
                            <Badge variant="outline" className="text-xs hidden sm:inline-flex">{u.role}</Badge>
                            <Badge className={u.status === "Actif" ? "bg-green-500/20 text-green-600 border-0" : "bg-red-500/20 text-red-600 border-0"}>{u.status}</Badge>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-accent hover:text-accent/80" title="Modifier" onClick={() => {
                                setEditUserId(u.id); setEditUserData({ name: u.name, email: u.email, role: u.role, avatar: u.avatar });
                              }}>
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8" title={u.status === "Actif" ? "Suspendre" : "Réactiver"} onClick={() => {
                                setUsers((prev) => prev.map((x) => x.id === u.id ? { ...x, status: x.status === "Actif" ? "Suspendu" : "Actif" } : x));
                                toast({ title: u.status === "Actif" ? `${u.name} suspendu` : `${u.name} réactivé` });
                              }}>
                                {u.status === "Actif" ? <ShieldOff className="w-4 h-4 text-amber-500" /> : <ShieldCheck className="w-4 h-4 text-green-500" />}
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600" title="Supprimer" onClick={() =>
                                ask(`Supprimer l'utilisateur "${u.name}" ?`, () => {
                                  setUsers((prev) => prev.filter((x) => x.id !== u.id));
                                  toast({ title: "Utilisateur supprimé" });
                                })}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ─── SIGNALEMENTS ─── */}
              {activeTab === "signalements" && (
                <div className="bg-card rounded-xl border border-border overflow-hidden">
                  <div className="p-4 border-b border-border flex items-center justify-between">
                    <h3 className="font-semibold text-foreground">Signalements &amp; Réclamations</h3>
                    <span className="text-xs text-muted-foreground">{reports.filter((r) => r.status === "En attente").length} en attente</span>
                  </div>
                  <div className="divide-y divide-border">
                    {reports.map((r) => (
                      <div key={r.id} className="p-4 hover:bg-secondary/30 transition-colors space-y-3">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${r.type === "Signalement" ? "bg-red-500/20" : "bg-amber-500/20"}`}>
                            <Flag className={`w-5 h-5 ${r.type === "Signalement" ? "text-red-500" : "text-amber-500"}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground text-sm">{r.type}: {r.annonce}</p>
                            <p className="text-xs text-muted-foreground">{r.reason} — par {r.reporter} • {r.date}</p>
                          </div>
                          <Badge className={r.status === "En attente" ? "bg-amber-500/20 text-amber-600 border-0" : "bg-green-500/20 text-green-600 border-0"}>{r.status}</Badge>
                          <div className="flex gap-1">
                            {r.status === "En attente" && (
                              <Button variant="ghost" size="icon" className="h-8 w-8" title="Résolu" onClick={() => {
                                setReports((prev) => prev.map((x) => x.id === r.id ? { ...x, status: "Résolu" } : x));
                                toast({ title: "Signalement résolu ✅" });
                              }}><CheckCircle className="w-4 h-4 text-green-500" /></Button>
                            )}
                            {r.status === "Résolu" && (
                              <Button variant="ghost" size="icon" className="h-8 w-8" title="Remettre en attente" onClick={() => {
                                setReports((prev) => prev.map((x) => x.id === r.id ? { ...x, status: "En attente" } : x));
                                toast({ title: "Remis en attente" });
                              }}><XCircle className="w-4 h-4 text-amber-500" /></Button>
                            )}
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600" title="Supprimer" onClick={() =>
                              ask(`Supprimer ce signalement sur "${r.annonce}" ?`, () => {
                                setReports((prev) => prev.filter((x) => x.id !== r.id));
                                toast({ title: "Signalement supprimé" });
                              })}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        {/* PIÈCE JOINTE IMAGE DU SIGNALEMENT */}
                        <div className="ml-14">
                          <ImageBox
                            label="Pièce jointe (preuve)"
                            src={r.image ?? ""}
                            onUpload={(url) => setReports((prev) => prev.map((x) => x.id === r.id ? { ...x, image: url } : x))}
                            onDelete={() => ask("Supprimer cette pièce jointe ?", () => {
                              setReports((prev) => prev.map((x) => x.id === r.id ? { ...x, image: undefined } : x));
                              toast({ title: "Pièce jointe supprimée" });
                            })}
                            onPreview={setLightbox}
                            squareSize="w-24 h-16"
                            category="library"
                          />
                        </div>
                      </div>
                    ))}
                    {reports.length === 0 && <p className="text-center text-muted-foreground text-sm py-10">Aucun signalement.</p>}
                  </div>
                </div>
              )}

              {/* ─── CHATBOT ─── */}
              {activeTab === "chatbot" && (
                <div className="space-y-4">

                  {/* ── Statut Base de Connaissance IA ── */}
                  <div className="bg-gradient-to-br from-amber-500/10 to-emerald-600/10 border border-accent/30 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center text-xl">🧠</div>
                        <div>
                          <h3 className="font-bold text-foreground text-sm">Base de Connaissance IA</h3>
                          <p className="text-xs text-muted-foreground">Données réelles indexées pour le chatbot</p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 text-xs"
                        onClick={async () => {
                          const { KukasokoBrain } = await import("@/services/KukasokoBrainService");
                          await KukasokoBrain.forceRefresh();
                          const s = KukasokoBrain.getStats();
                          toast({ title: "Base mise à jour ✅", description: `${s.listings} annonces · ${s.shops} boutiques · ${s.blogs} articles indexés` });
                        }}
                      >
                        🔄 Mettre à jour la base
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { label: "Annonces", icon: "🛒", color: "text-blue-500", key: "listings" },
                        { label: "Boutiques", icon: "🏪", color: "text-emerald-500", key: "shops" },
                        { label: "Articles", icon: "📰", color: "text-purple-500", key: "blogs" },
                        { label: "Catégories", icon: "📂", color: "text-amber-500", key: "categories" },
                      ].map(({ label, icon, color, key }) => (
                        <div key={key} className="bg-background rounded-xl p-3 text-center border border-border/60">
                          <p className="text-xl mb-1">{icon}</p>
                          <p className={`text-lg font-bold ${color}`}>—</p>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 p-3 bg-background/60 rounded-lg border border-border/50">
                      <p className="text-xs text-muted-foreground">
                        💡 <strong>Comment ça fonctionne ?</strong> Le chatbot charge automatiquement toutes vos annonces, boutiques et articles au démarrage.
                        Il utilise un algorithme <strong>BM25</strong> (recherche par pertinence) pour trouver les meilleures réponses.
                        Cliquez "Mettre à jour" pour forcer un rechargement immédiat des données.
                      </p>
                    </div>
                  </div>

                  {/* ── FAQ Manuelles (complément) ── */}
                  <div className="bg-card rounded-xl border border-border p-6">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-foreground">Réponses FAQ personnalisées</h3>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/15 text-accent font-semibold">Complément IA</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-4">
                      Ces réponses s'ajoutent à l'IA. Utilisées en priorité sur les mots-clés configurés.
                    </p>
                    <div className="space-y-3">
                      {chatbotData.map((item, idx) => (
                        <div key={idx} className="bg-secondary/50 rounded-xl p-4">
                          {editChatIdx === idx ? (
                            <div className="space-y-2">
                              <input id={`ckw-${idx}`} name={`ckw-${idx}`} value={editChatKw} onChange={(e) => setEditChatKw(e.target.value)}
                                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent" placeholder="Mot-clé" />
                              <textarea id={`cresp-${idx}`} name={`cresp-${idx}`} value={editChatResp} onChange={(e) => setEditChatResp(e.target.value)}
                                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent min-h-[60px] resize-none" placeholder="Réponse" />
                              <div className="flex gap-2">
                                <Button size="sm" className="bg-accent hover:bg-accent/90 text-accent-foreground gap-1" onClick={() => {
                                  const updated = [...chatbotData];
                                  updated[idx] = { keyword: editChatKw, response: editChatResp };
                                  setChatbotData(updated); setEditChatIdx(null);
                                  toast({ title: "Réponse mise à jour ✅" });
                                }}><Save className="w-3.5 h-3.5" /> Sauvegarder</Button>
                                <Button size="sm" variant="outline" onClick={() => setEditChatIdx(null)}><X className="w-3.5 h-3.5" /> Annuler</Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <Badge className="bg-accent/20 text-accent border-0 text-xs mb-1">{item.keyword}</Badge>
                                <p className="text-sm text-muted-foreground">{item.response}</p>
                              </div>
                              <div className="flex gap-1 shrink-0">
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-accent hover:text-accent/80"
                                  onClick={() => { setEditChatIdx(idx); setEditChatKw(item.keyword); setEditChatResp(item.response); }}>
                                  <Pencil className="w-3.5 h-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-600"
                                  onClick={() => ask(`Supprimer "${item.keyword}" ?`, () => {
                                    setChatbotData((prev) => prev.filter((_, i) => i !== idx));
                                    toast({ title: "Supprimé" });
                                  })}>
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    <Button className="mt-4 bg-accent hover:bg-accent/90 text-accent-foreground text-sm gap-1" onClick={() => {
                      const idx = chatbotData.length;
                      setChatbotData([...chatbotData, { keyword: "nouveau", response: "Nouvelle réponse à configurer" }]);
                      setEditChatIdx(idx); setEditChatKw("nouveau"); setEditChatResp("Nouvelle réponse à configurer");
                    }}>
                      <Plus className="w-4 h-4" /> Ajouter une réponse FAQ
                    </Button>
                  </div>
                </div>
              )}


              {/* ─── MÉDIATHÈQUE ─── */}
              {activeTab === "medias" && (
                <div className="space-y-5">

                  {/* ── Stats Médiathèque ── */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-card rounded-xl border border-border p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center">
                        <ImageIcon className="w-5 h-5 text-accent" />
                      </div>
                      <div>
                        <p className="text-xl font-bold text-foreground">{mediaStats?.total_files ?? mediaFiles.length}</p>
                        <p className="text-xs text-muted-foreground">Fichiers total</p>
                      </div>
                    </div>
                    <div className="bg-card rounded-xl border border-border p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center">
                        <HardDrive className="w-5 h-5 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-xl font-bold text-foreground">{mediaStats?.total_size_mb?.toFixed(2) ?? "0"} Mo</p>
                        <p className="text-xs text-muted-foreground">Stockage utilisé</p>
                      </div>
                    </div>
                    <div className="bg-card rounded-xl border border-border p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                        <FolderOpen className="w-5 h-5 text-emerald-500" />
                      </div>
                      <div>
                        <p className="text-xl font-bold text-foreground">{Object.keys(mediaStats?.by_category ?? {}).length}</p>
                        <p className="text-xs text-muted-foreground">Catégories</p>
                      </div>
                    </div>
                    <div className="bg-card rounded-xl border border-border p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-500/15 flex items-center justify-center">
                        <Database className="w-5 h-5 text-purple-500" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground">{mediaStats?.by_provider?.local ? `Local (${mediaStats.by_provider.local})` : "Local"}</p>
                        <p className="text-xs text-muted-foreground">Provider actif</p>
                      </div>
                    </div>
                  </div>

                  {/* ── Bandeau Supabase-Ready ── */}
                  <div className="bg-gradient-to-r from-emerald-600/10 to-teal-600/10 border border-emerald-600/20 rounded-xl p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">☁️</span>
                      <div>
                        <p className="text-sm font-semibold text-foreground">Migration Supabase / S3 / Cloudinary prête</p>
                        <p className="text-xs text-muted-foreground">Tous les médias sont enregistrés en DB avec un champ <code className="bg-muted px-1 rounded text-[11px]">storage_provider</code>. Changer de <span className="text-emerald-600 font-bold">local</span> → <span className="text-purple-600 font-bold">supabase</span> ne nécessite qu'un changement de config.</p>
                      </div>
                    </div>
                    <Badge className="bg-emerald-600/20 text-emerald-600 border-emerald-600/30 text-xs shrink-0">Prêt</Badge>
                  </div>

                  {/* ── Panneau principal ── */}
                  <div className="bg-card rounded-xl border border-border p-6">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                      <div>
                        <h3 className="font-semibold text-foreground">Médiathèque</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {filteredMediaFiles.length} fichier(s) affiché(s) · Stockage physique dans <code className="bg-muted px-1 rounded text-[10px]">backend/media/</code>
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Bouton Rafraîchir */}
                        <Button
                          size="sm" variant="outline"
                          onClick={loadMediaFiles}
                          disabled={mediaLoading}
                          className="gap-1.5 text-xs"
                        >
                          {mediaLoading
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <RefreshCw className="w-3.5 h-3.5" />}
                          Rafraîchir
                        </Button>
                        {/* Input upload caché */}
                        <input
                          id="media-upload-real"
                          name="media-upload-real"
                          type="file"
                          accept="image/*,video/mp4,application/pdf"
                          multiple
                          className="hidden"
                          onChange={(e) => {
                            const files = Array.from(e.target.files || []);
                            if (files.length > 0) handleMediaUpload(files, "library");
                            e.target.value = "";
                          }}
                        />
                        <Button
                          size="sm"
                          className="bg-accent hover:bg-accent/90 text-accent-foreground text-xs font-semibold gap-1.5"
                          onClick={() => document.getElementById("media-upload-real")?.click()}
                          disabled={mediaUploading}
                        >
                          {mediaUploading
                            ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Upload en cours...</>
                            : <><UploadCloud className="w-3.5 h-3.5" /> Ajouter des médias</>}
                        </Button>
                      </div>
                    </div>

                    {/* Filtres par catégorie */}
                    <div className="flex gap-2 flex-wrap mb-5">
                      {["all", "library", "listing", "merchant", "avatar", "banner"].map((cat) => (
                        <button
                          key={cat}
                          onClick={() => setMediaFilter(cat)}
                          className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                            mediaFilter === cat
                              ? "bg-accent text-accent-foreground border-accent"
                              : "border-border text-muted-foreground hover:bg-secondary"
                          }`}
                        >
                          {cat === "all" ? "Tous" : cat === "library" ? "📚 Bibliothèque" : cat === "listing" ? "🏷️ Annonces" : cat === "merchant" ? "🏪 Boutiques" : cat === "avatar" ? "👤 Avatars" : "🖼️ Bannières"}
                          {cat !== "all" && mediaStats?.by_category?.[cat] ? ` (${mediaStats.by_category[cat]})` : ""}
                        </button>
                      ))}
                    </div>

                    {/* Grille des médias */}
                    {mediaLoading ? (
                      <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
                        <Loader2 className="w-8 h-8 animate-spin text-accent" />
                        <p className="text-sm">Chargement de la médiathèque...</p>
                      </div>
                    ) : filteredMediaFiles.length === 0 ? (
                      <div className="text-center py-16 text-muted-foreground">
                        <ImageIcon className="w-14 h-14 mx-auto mb-3 opacity-20" />
                        <p className="text-sm font-medium">Aucun fichier dans la médiathèque</p>
                        <p className="text-xs mt-1">Cliquez sur "Ajouter des médias" pour uploader des fichiers vers <code className="bg-muted px-1 rounded">backend/media/</code></p>
                        <Button
                          size="sm" className="mt-4 bg-accent text-accent-foreground gap-2"
                          onClick={() => document.getElementById("media-upload-real")?.click()}
                        >
                          <UploadCloud className="w-4 h-4" /> Uploader maintenant
                        </Button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                        {filteredMediaFiles.map((file) => {
                          const isImage = file.mime_type.startsWith("image/");
                          const isVideo = file.mime_type.startsWith("video/");
                          const sizeKb = (file.size_bytes / 1024).toFixed(1);
                          return (
                            <div
                              key={file.id}
                              className="relative group rounded-xl overflow-hidden border border-border bg-secondary/40 shadow-sm hover:shadow-md hover:border-accent/40 transition-all"
                            >
                              {/* Thumbnail */}
                              <div className="aspect-square w-full overflow-hidden bg-muted">
                                {isImage ? (
                                  <img
                                    src={file.url}
                                    alt={file.filename}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }}
                                  />
                                ) : isVideo ? (
                                  <div className="w-full h-full flex items-center justify-center text-3xl bg-zinc-900 text-white">🎬</div>
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-3xl bg-zinc-100">📄</div>
                                )}
                              </div>

                              {/* Overlay hover */}
                              <div className="absolute inset-0 bg-black/75 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                                <p className="text-white text-[10px] font-semibold text-center leading-tight truncate w-full px-1">
                                  {file.filename}
                                </p>
                                <Badge className="bg-accent/80 text-white border-0 text-[9px] font-bold px-2 py-0.5">
                                  {file.media_category}
                                </Badge>
                                <p className="text-white/60 text-[9px]">{sizeKb} Ko · {file.storage_provider}</p>
                                {/* Actions */}
                                <div className="flex items-center gap-1.5 mt-1">
                                  {isImage && (
                                    <button
                                      onClick={() => setLightbox(file.url)}
                                      className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors"
                                      title="Voir en grand"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleCopyUrl(file)}
                                    className="p-1.5 rounded-lg bg-white/20 hover:bg-emerald-500 text-white transition-colors"
                                    title="Copier l'URL"
                                  >
                                    {mediaCopiedId === file.id
                                      ? <CheckCircle className="w-3.5 h-3.5 text-emerald-300" />
                                      : <Copy className="w-3.5 h-3.5" />}
                                  </button>
                                  <button
                                    onClick={() => handleMediaDeleteReal(file)}
                                    className="p-1.5 rounded-lg bg-white/20 hover:bg-red-500 text-red-300 hover:text-white transition-colors"
                                    title="Supprimer définitivement"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              {/* Provider badge */}
                              <div className="absolute top-2 right-2">
                                <Badge className={`text-[8px] px-1.5 py-0.5 font-bold border-0 ${
                                  file.storage_provider === "local" ? "bg-zinc-700/80 text-white" :
                                  file.storage_provider === "supabase" ? "bg-emerald-600/90 text-white" :
                                  "bg-blue-600/90 text-white"
                                }`}>
                                  {file.storage_provider}
                                </Badge>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}


              {/* ─── PERSONNALISATION ─── */}
              {activeTab === "categories" && (
                <div className="space-y-6">
                  <div className="bg-card rounded-xl border border-border p-6 space-y-4">
                    <div>
                      <h3 className="font-semibold text-foreground">Ajouter une catégorie ou sous-catégorie</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Laissez « Parent » vide pour une catégorie principale.
                      </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <input
                        id="admin-category-name"
                        name="admin_category_name"
                        type="text"
                        placeholder="Nom *"
                        value={catForm.name}
                        onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                        className="h-10 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                      />
                      <input
                        id="admin-category-icon"
                        name="admin_category_icon"
                        type="text"
                        placeholder="Icône (emoji)"
                        value={catForm.icon}
                        onChange={(e) => setCatForm({ ...catForm, icon: e.target.value })}
                        className="h-10 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                      />
                      <select
                        id="admin-category-parent"
                        name="admin_category_parent"
                        value={catForm.parent_id}
                        onChange={(e) => setCatForm({ ...catForm, parent_id: e.target.value })}
                        className="h-10 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                      >
                        <option value="">Catégorie principale</option>
                        {categoryTree.map((p) => (
                          <option key={p.id} value={String(p.id)}>
                            Sous-catégorie de : {p.name_fr || p.name}
                          </option>
                        ))}
                      </select>
                      <Button id="admin-create-category" name="admin_create_category" onClick={handleCreateCategory} className="bg-accent text-accent-foreground hover:bg-accent/90">
                        <Plus className="w-4 h-4 mr-1" /> Ajouter
                      </Button>
                    </div>
                  </div>

                  <div className="bg-card rounded-xl border border-border overflow-hidden">
                    <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                      <h3 className="font-semibold text-foreground">Arborescence</h3>
                      <Button variant="outline" size="sm" onClick={loadCategories} disabled={categoriesLoading}>
                        <RefreshCw className={`w-3.5 h-3.5 mr-1 ${categoriesLoading ? "animate-spin" : ""}`} />
                        Actualiser
                      </Button>
                    </div>
                    {categoriesLoading ? (
                      <div className="p-10 flex justify-center">
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : categoryTree.length === 0 ? (
                      <p className="p-6 text-sm text-muted-foreground text-center">Aucune catégorie pour le moment.</p>
                    ) : (
                      <ul className="divide-y divide-border">
                        {categoryTree.map((parent) => (
                          <li key={parent.id} className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <span className="text-lg w-7 text-center">{parent.icon || "📁"}</span>
                              {editCatId === parent.id ? (
                                <>
                                  <input
                                    value={editCatName}
                                    onChange={(e) => setEditCatName(e.target.value)}
                                    className="flex-1 h-9 px-3 rounded-lg border border-border bg-background text-sm"
                                  />
                                  <input
                                    value={editCatIcon}
                                    onChange={(e) => setEditCatIcon(e.target.value)}
                                    placeholder="Icône"
                                    className="w-20 h-9 px-2 rounded-lg border border-border bg-background text-sm"
                                  />
                                  <Button size="sm" onClick={() => handleSaveCategory(parent.id)}>
                                    <Save className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={() => setEditCatId(null)}>
                                    <X className="w-3.5 h-3.5" />
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <span className="flex-1 font-medium text-foreground">{parent.name_fr || parent.name}</span>
                                  <Badge variant="secondary" className="text-[10px]">
                                    {(parent.children?.length || 0)} sous-cat.
                                  </Badge>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      setEditCatId(parent.id);
                                      setEditCatName(parent.name_fr || parent.name);
                                      setEditCatIcon(parent.icon || "");
                                    }}
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-red-500 hover:text-red-600"
                                    onClick={() => handleDeleteCategory(parent.id, parent.name_fr || parent.name)}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </>
                              )}
                            </div>
                            {(parent.children?.length ?? 0) > 0 && (
                              <ul className="mt-3 ml-8 space-y-2 border-l border-border pl-4">
                                {parent.children!.map((child) => (
                                  <li key={child.id} className="flex items-center gap-3">
                                    <span className="text-base w-6 text-center">{child.icon || "•"}</span>
                                    {editCatId === child.id ? (
                                      <>
                                        <input
                                          value={editCatName}
                                          onChange={(e) => setEditCatName(e.target.value)}
                                          className="flex-1 h-8 px-3 rounded-lg border border-border bg-background text-sm"
                                        />
                                        <input
                                          value={editCatIcon}
                                          onChange={(e) => setEditCatIcon(e.target.value)}
                                          placeholder="Icône"
                                          className="w-20 h-8 px-2 rounded-lg border border-border bg-background text-sm"
                                        />
                                        <Button size="sm" onClick={() => handleSaveCategory(child.id)}>
                                          <Save className="w-3.5 h-3.5" />
                                        </Button>
                                        <Button size="sm" variant="ghost" onClick={() => setEditCatId(null)}>
                                          <X className="w-3.5 h-3.5" />
                                        </Button>
                                      </>
                                    ) : (
                                      <>
                                        <span className="flex-1 text-sm text-foreground">{child.name_fr || child.name}</span>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => {
                                            setEditCatId(child.id);
                                            setEditCatName(child.name_fr || child.name);
                                            setEditCatIcon(child.icon || "");
                                          }}
                                        >
                                          <Pencil className="w-3.5 h-3.5" />
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="text-red-500 hover:text-red-600"
                                          onClick={() => handleDeleteCategory(child.id, child.name_fr || child.name)}
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </Button>
                                      </>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}

              {activeTab === "personnalisation" && (
                <div className="space-y-6">
                  {/* Identity & Theme */}
                  <div className="bg-card rounded-xl border border-border p-6 space-y-6">
                    <div>
                      <h3 className="font-semibold text-foreground">Identité &amp; Couleurs</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">Personnalisez le nom, le logo et les couleurs du site.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-4 md:col-span-2">
                        <InlineField
                          label="Nom du site web"
                          value={siteSettings.siteName}
                          onChange={(v) => updateSiteSettings({ siteName: v })}
                        />

                        {/* Theme select */}
                        <div>
                          <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Thème de couleurs prédéfini</label>
                          <select
                            id="site-theme"
                            name="site-theme"
                            value={siteSettings.themeName}
                            onChange={(e) => updateSiteSettings({ themeName: e.target.value as any })}
                            className="w-full mt-1.5 h-10 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                          >
                            <option value="Amber">Amber (Jaune/Or - Thème d'origine)</option>
                            <option value="Emerald">Emerald (Vert Émeraude)</option>
                            <option value="Blue">Blue (Bleu Pro)</option>
                            <option value="Ruby">Ruby (Rouge Rubis)</option>
                            <option value="Indigo">Indigo (Violet Profond)</option>
                            <option value="Custom">Customisé (Couleurs personnalisées)</option>
                          </select>
                        </div>
                      </div>

                      {/* Logo upload box */}
                      <div className="flex flex-col items-center justify-center border border-border bg-secondary/10 rounded-2xl p-4">
                        <ImageBox
                          label="Logo du site"
                          src={siteSettings.siteLogo}
                          onUpload={(url) => updateSiteSettings({ siteLogo: url })}
                          onDelete={() => ask("Supprimer le logo ?", () => { updateSiteSettings({ siteLogo: "" }); toast({ title: "Logo supprimé" }); })}
                          onPreview={setLightbox}
                          squareSize="w-20 h-20"
                          category="banner"
                        />
                        <span className="text-[10px] text-muted-foreground mt-2 text-center">Format carré conseillé</span>
                      </div>
                    </div>

                    {/* Custom HSL inputs for advanced developers */}
                    <div className="border-t border-border pt-4">
                      <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">Palette de Couleurs Personnalisée (Format HSL : Teinte Saturation% Luminosité%)</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        <InlineField
                          label="Primaire (Header, Footer)"
                          value={siteSettings.primaryColor}
                          onChange={(v) => updateSiteSettings({ primaryColor: v, themeName: "Custom" })}
                        />
                        <InlineField
                          label="Texte Primaire (sur Header/Footer)"
                          value={siteSettings.primaryFgColor}
                          onChange={(v) => updateSiteSettings({ primaryFgColor: v, themeName: "Custom" })}
                        />
                        <InlineField
                          label="Accentuation (Boutons actifs, icônes)"
                          value={siteSettings.accentColor}
                          onChange={(v) => updateSiteSettings({ accentColor: v, themeName: "Custom" })}
                        />
                        <InlineField
                          label="Texte Accentuation"
                          value={siteSettings.accentFgColor}
                          onChange={(v) => updateSiteSettings({ accentFgColor: v, themeName: "Custom" })}
                        />
                        <InlineField
                          label="Fond du site (Background)"
                          value={siteSettings.bgColor}
                          onChange={(v) => updateSiteSettings({ bgColor: v, themeName: "Custom" })}
                        />
                        <InlineField
                          label="Texte global (Foreground)"
                          value={siteSettings.fgColor}
                          onChange={(v) => updateSiteSettings({ fgColor: v, themeName: "Custom" })}
                        />
                        <InlineField
                          label="Fond des Cartes (Card)"
                          value={siteSettings.cardColor}
                          onChange={(v) => updateSiteSettings({ cardColor: v, themeName: "Custom" })}
                        />
                        <InlineField
                          label="Texte des Cartes"
                          value={siteSettings.cardFgColor}
                          onChange={(v) => updateSiteSettings({ cardFgColor: v, themeName: "Custom" })}
                        />
                        <InlineField
                          label="Bordures et Lignes (Border)"
                          value={siteSettings.borderColor}
                          onChange={(v) => updateSiteSettings({ borderColor: v, themeName: "Custom" })}
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-3 italic">
                        💡 Conseil : Les valeurs s'écrivent sous la forme "T S% L%" (ex : "220 20% 97%" pour du blanc cassé).
                      </p>
                    </div>
                  </div>

                  {/* Banner & Hero customization */}
                  <div className="bg-card rounded-xl border border-border p-6 space-y-6">
                    <div>
                      <h3 className="font-semibold text-foreground">Bannière d'accueil</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Carrousel de photos mises en avant (accueil, réseaux sociaux, campagnes). Elles défilent derrière le titre et la recherche.
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                        Images mises en avant (carrousel)
                      </p>
                      <p className="text-xs text-muted-foreground mb-3">
                        Ajoutez les visuels que vous voulez mettre en avant partout (accueil + partage). Plusieurs images = carrousel automatique. Réordonnez avec les flèches.
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {heroSlides.map((src, idx) => (
                          <div key={`${src}-${idx}`} className="space-y-1.5">
                            <ImageBox
                              label={`Slide ${idx + 1}`}
                              src={src}
                              onUpload={(url) => {
                                const next = [...heroSlides];
                                next[idx] = url;
                                saveHeroSlides(next);
                              }}
                              onDelete={() =>
                                ask("Retirer cette image du carrousel ?", () => {
                                  saveHeroSlides(heroSlides.filter((_, i) => i !== idx));
                                  toast({ title: "Image retirée du carrousel" });
                                })
                              }
                              onPreview={setLightbox}
                              coverRatio
                              category="banner"
                            />
                            {heroSlides.length > 1 && (
                              <div className="flex gap-1">
                                <button
                                  type="button"
                                  disabled={idx === 0}
                                  onClick={() => moveHeroSlide(idx, idx - 1)}
                                  className="flex-1 h-7 rounded-md border border-border bg-background text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center"
                                  title="Monter"
                                  aria-label={`Monter le slide ${idx + 1}`}
                                >
                                  <ChevronUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  disabled={idx === heroSlides.length - 1}
                                  onClick={() => moveHeroSlide(idx, idx + 1)}
                                  className="flex-1 h-7 rounded-md border border-border bg-background text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center"
                                  title="Descendre"
                                  aria-label={`Descendre le slide ${idx + 1}`}
                                >
                                  <ChevronDown className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                        <ImageBox
                          label="Ajouter une image"
                          src=""
                          onUpload={(url) => saveHeroSlides([...heroSlides, url])}
                          onDelete={() => {}}
                          coverRatio
                          category="banner"
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <InlineField
                        label="Titre principal de la bannière"
                        value={siteSettings.heroTitle}
                        onChange={(v) => updateSiteSettings({ heroTitle: v })}
                      />
                      <div>
                        <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Sous-titre de la bannière</label>
                        <textarea
                          id="hero-subtitle"
                          name="hero-subtitle"
                          value={siteSettings.heroSubtitle}
                          onChange={(e) => updateSiteSettings({ heroSubtitle: e.target.value })}
                          className="w-full mt-1.5 px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent min-h-[60px] resize-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Footer & Contacts customization */}
                  <div className="bg-card rounded-xl border border-border p-6 space-y-6">
                    <div>
                      <h3 className="font-semibold text-foreground">Pied de page &amp; Contacts</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">Configurez les liens et coordonnées affichés en bas du site.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <InlineField
                        label="Adresse email de contact"
                        value={siteSettings.footerEmail}
                        onChange={(v) => updateSiteSettings({ footerEmail: v })}
                      />
                      <InlineField
                        label="Numéro de téléphone de contact"
                        value={siteSettings.footerPhone}
                        onChange={(v) => updateSiteSettings({ footerPhone: v })}
                      />
                    </div>
                  </div>

                  {/* Settings Actions */}
                  <div className="flex gap-3 justify-end">
                    <Button
                      variant="outline"
                      className="gap-1.5 border-red-500/20 text-red-500 hover:bg-red-500/10 hover:text-red-600"
                      onClick={() => ask("Réinitialiser tous les styles et identifiants par défaut ?", () => {
                        resetSiteSettings();
                        toast({ title: "Site réinitialisé aux valeurs par défaut 🔄" });
                      })}
                    >
                      <RefreshCw className="w-4 h-4" /> Réinitialiser par défaut
                    </Button>
                    <Button
                      className="gap-1.5 bg-green-600 hover:bg-green-700 text-white font-bold"
                      onClick={() => {
                        toast({ title: "Modifications enregistrées ✅", description: "La personnalisation et l'identité de KUKASOKO ont été appliquées avec succès." });
                      }}
                    >
                      <CheckCircle className="w-4 h-4" /> Enregistrer & Appliquer
                    </Button>
                  </div>
                </div>
              )}

              {/* ─── BANDEAU INFO (NEWS TICKER) ─── */}
              {activeTab === "bandeau" && (
                <div className="space-y-6">
                  <div className="bg-card rounded-xl border border-border p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-9 h-9 rounded-lg bg-red-500/10 flex items-center justify-center">
                        <Radio className="w-4 h-4 text-red-500" />
                      </div>
                      <div>
                        <h2 className="font-semibold text-foreground">Bandeau d'information défilant</h2>
                        <p className="text-xs text-muted-foreground">Gérez les messages qui défilent en bas du site (style France 24)</p>
                      </div>
                    </div>

                    {/* Add new message */}
                    <div className="bg-secondary/50 rounded-xl border border-border p-4 mb-6 space-y-3">
                      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Plus className="w-4 h-4 text-accent" /> Ajouter un message
                      </h3>
                      <div>
                        <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Texte du message *</label>
                        <textarea
                          id="new-ticker-text"
                          name="new-ticker-text"
                          value={newTickerText}
                          onChange={(e) => setNewTickerText(e.target.value)}
                          placeholder="Ex: Nouvelle annonce disponible — iPhone 15 Pro à Kinshasa !"
                          rows={2}
                          className="w-full mt-0.5 px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                        />
                      </div>

                      {/* Paid toggle */}
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setNewTickerPaid(!newTickerPaid)}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                            newTickerPaid
                              ? "bg-amber-500/20 text-amber-600 border border-amber-500/30"
                              : "bg-secondary text-muted-foreground border border-border"
                          }`}
                        >
                          {newTickerPaid ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                          {newTickerPaid ? "Message payant (pub)" : "Message gratuit"}
                        </button>
                      </div>

                      {newTickerPaid && (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Prix ($)</label>
                            <input
                              type="number"
                              value={newTickerPrice}
                              onChange={(e) => setNewTickerPrice(e.target.value)}
                              placeholder="Ex: 50"
                              className="w-full mt-0.5 h-8 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Sponsor</label>
                            <input
                              id="new-ticker-sponsor"
                              name="new-ticker-sponsor"
                              type="text"
                              value={newTickerSponsor}
                              onChange={(e) => setNewTickerSponsor(e.target.value)}
                              placeholder="Nom du commanditaire"
                              className="w-full mt-0.5 h-8 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                            />
                          </div>
                        </div>
                      )}

                      <Button
                        onClick={() => {
                          if (!newTickerText.trim()) return;
                          addTickerMsg({
                            text: newTickerText.trim(),
                            paid: newTickerPaid,
                            active: true,
                            price: newTickerPaid && newTickerPrice ? parseFloat(newTickerPrice) : undefined,
                            sponsor: newTickerPaid ? newTickerSponsor : undefined,
                          });
                          setNewTickerText("");
                          setNewTickerPaid(false);
                          setNewTickerPrice("");
                          setNewTickerSponsor("");
                          toast({ title: "Message ajouté au bandeau ✅" });
                        }}
                        className="bg-accent text-accent-foreground hover:bg-accent/90"
                      >
                        <Plus className="w-4 h-4 mr-1" /> Ajouter
                      </Button>
                    </div>

                    {/* Messages list */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-foreground">Messages ({tickerMessages.length})</h3>
                        <div className="flex gap-2">
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 font-semibold">
                            {tickerMessages.filter(m => m.active).length} actifs
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 font-semibold">
                            {tickerMessages.filter(m => m.paid).length} payants
                          </span>
                        </div>
                      </div>

                      {tickerMessages.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                          Aucun message. Ajoutez-en un ci-dessus.
                        </div>
                      )}

                      {tickerMessages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`rounded-xl border p-4 transition-all ${
                            msg.active ? "border-border bg-card" : "border-border/40 bg-secondary/30 opacity-60"
                          }`}
                        >
                          {editTickerId === msg.id ? (
                            /* Edit mode */
                            <div className="space-y-3">
                              <textarea
                                id="edit-ticker-text"
                                name="edit-ticker-text"
                                value={editTickerText}
                                onChange={(e) => setEditTickerText(e.target.value)}
                                rows={2}
                                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                              />
                              <div className="flex items-center gap-3">
                                <button
                                  type="button"
                                  onClick={() => setEditTickerPaid(!editTickerPaid)}
                                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                                    editTickerPaid
                                      ? "bg-amber-500/20 text-amber-600 border border-amber-500/30"
                                      : "bg-secondary text-muted-foreground border border-border"
                                  }`}
                                >
                                  {editTickerPaid ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                                  {editTickerPaid ? "Payant" : "Gratuit"}
                                </button>
                              </div>
                              {editTickerPaid && (
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Prix ($)</label>
                                    <input 
                                      id="edit-ticker-price"
                                      name="edit-ticker-price"
                                      type="number" 
                                      value={editTickerPrice} 
                                      onChange={(e) => setEditTickerPrice(e.target.value)}
                                      className="w-full mt-0.5 h-8 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent" 
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Sponsor</label>
                                    <input 
                                      id="edit-ticker-sponsor"
                                      name="edit-ticker-sponsor"
                                      type="text" 
                                      value={editTickerSponsor} 
                                      onChange={(e) => setEditTickerSponsor(e.target.value)}
                                      className="w-full mt-0.5 h-8 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent" 
                                    />
                                  </div>
                                </div>
                              )}
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    updateTickerMsg(msg.id, {
                                      text: editTickerText,
                                      paid: editTickerPaid,
                                      price: editTickerPaid && editTickerPrice ? parseFloat(editTickerPrice) : undefined,
                                      sponsor: editTickerPaid ? editTickerSponsor : undefined,
                                    });
                                    setEditTickerId(null);
                                    toast({ title: "Message modifié ✅" });
                                  }}
                                  className="bg-accent text-accent-foreground hover:bg-accent/90"
                                >
                                  <Save className="w-3.5 h-3.5 mr-1" /> Sauvegarder
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => setEditTickerId(null)}>
                                  <X className="w-3.5 h-3.5 mr-1" /> Annuler
                                </Button>
                              </div>
                            </div>
                          ) : (
                            /* View mode */
                            <div className="flex items-start gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  {msg.paid && (
                                    <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-600 px-1.5 py-0.5 rounded">
                                      <DollarSign className="w-2.5 h-2.5" />
                                      Pub{msg.price ? ` · $${msg.price}` : ""}
                                    </span>
                                  )}
                                  {msg.sponsor && (
                                    <span className="text-[10px] text-muted-foreground">Sponsor: {msg.sponsor}</span>
                                  )}
                                  <span className={`text-[10px] font-semibold ml-auto ${
                                    msg.active ? "text-green-500" : "text-muted-foreground"
                                  }`}>
                                    {msg.active ? "● Actif" : "● Inactif"}
                                  </span>
                                </div>
                                <p className="text-sm text-foreground leading-relaxed">{msg.text}</p>
                                <p className="text-[10px] text-muted-foreground mt-1">
                                  {new Date(msg.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                                </p>
                              </div>
                              <div className="flex flex-col gap-1.5 shrink-0">
                                {/* Toggle active */}
                                <button
                                  onClick={() => { toggleTickerMsg(msg.id); toast({ title: msg.active ? "Message désactivé" : "Message activé ✅" }); }}
                                  className={`p-1.5 rounded-lg transition-colors ${
                                    msg.active
                                      ? "bg-green-500/10 text-green-600 hover:bg-green-500/20"
                                      : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                                  }`}
                                  title={msg.active ? "Désactiver" : "Activer"}
                                >
                                  {msg.active ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                                </button>
                                {/* Edit */}
                                <button
                                  onClick={() => {
                                    setEditTickerId(msg.id);
                                    setEditTickerText(msg.text);
                                    setEditTickerPaid(msg.paid);
                                    setEditTickerPrice(msg.price ? String(msg.price) : "");
                                    setEditTickerSponsor(msg.sponsor || "");
                                  }}
                                  className="p-1.5 rounded-lg bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-foreground transition-colors"
                                  title="Modifier"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                {/* Delete */}
                                <button
                                  onClick={() => ask(`Supprimer ce message du bandeau ?`, () => {
                                    deleteTickerMsg(msg.id);
                                    toast({ title: "Message supprimé" });
                                  })}
                                  className="p-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
                                  title="Supprimer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Revenue summary */}
                  <div className="bg-card rounded-xl border border-border p-6">
                    <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-accent" /> Revenus publicitaires
                    </h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-secondary/50 rounded-lg p-4 text-center">
                        <p className="text-2xl font-bold text-foreground">{tickerMessages.filter(m => m.paid).length}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide mt-1">Messages payants</p>
                      </div>
                      <div className="bg-secondary/50 rounded-lg p-4 text-center">
                        <p className="text-2xl font-bold text-accent">
                          ${tickerMessages.filter(m => m.paid && m.price).reduce((sum, m) => sum + (m.price || 0), 0).toFixed(0)}
                        </p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide mt-1">Revenus totaux</p>
                      </div>
                      <div className="bg-secondary/50 rounded-lg p-4 text-center">
                        <p className="text-2xl font-bold text-green-500">{tickerMessages.filter(m => m.active).length}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide mt-1">Messages actifs</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ─── GESTION DU BLOG ADMIN ─── */}
              {activeTab === "blog" && (
                <div className="space-y-6">
                  {/* Formulaire de création / modification */}
                  <div className="bg-card rounded-xl border border-border p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center">
                        <Pencil className="w-4 h-4 text-accent" />
                      </div>
                      <div>
                        <h2 className="font-semibold text-foreground">
                          {editPostId !== null ? "Modifier l'article de blog" : "Rédiger un nouvel article"}
                        </h2>
                        <p className="text-xs text-muted-foreground">Publiez des actualités ou des conseils sur Kukasoko</p>
                      </div>
                    </div>

                    <form onSubmit={handleSaveBlogPost} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="blog-title" className="text-xs font-semibold text-muted-foreground uppercase">Titre de l'article *</label>
                          <input
                            id="blog-title"
                            type="text"
                            value={postTitle}
                            onChange={(e) => setPostTitle(e.target.value)}
                            placeholder="Ex : 5 astuces pour vendre rapidement"
                            className="w-full mt-1.5 h-10 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                          />
                        </div>
                        <div>
                          <label htmlFor="blog-category" className="text-xs font-semibold text-muted-foreground uppercase">Catégorie</label>
                          <select
                            id="blog-category"
                            value={postCategory}
                            onChange={(e) => setPostCategory(e.target.value)}
                            className="w-full mt-1.5 h-10 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                          >
                            <option value="Guide">Guide</option>
                            <option value="Conseils">Conseils</option>
                            <option value="Immobilier">Immobilier</option>
                            <option value="Actualités">Actualités</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label htmlFor="blog-excerpt" className="text-xs font-semibold text-muted-foreground uppercase">Résumé de l'article * (2-3 phrases max)</label>
                        <textarea
                          id="blog-excerpt"
                          value={postExcerpt}
                          onChange={(e) => setPostExcerpt(e.target.value)}
                          placeholder="Un résumé court accrocheur qui sera dessiné sur l'image et servira d'aperçu..."
                          rows={2}
                          className="w-full mt-1.5 p-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-accent resize-none"
                        />
                      </div>

                      <div>
                        <label htmlFor="blog-content" className="text-xs font-semibold text-muted-foreground uppercase">Contenu complet *</label>
                        <textarea
                          id="blog-content"
                          value={postContent}
                          onChange={(e) => setPostContent(e.target.value)}
                          placeholder="Écrivez le corps de votre article de blog ici..."
                          rows={8}
                          className="w-full mt-1.5 p-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <ImageBox
                            label="Image de couverture de l'article"
                            src={postImage}
                            onUpload={(url) => setPostImage(url)}
                            onDelete={() => setPostImage("")}
                            coverRatio={true}
                            category="blog"
                          />
                        </div>
                        <div>
                          <label htmlFor="blog-tags" className="text-xs font-semibold text-muted-foreground uppercase">Mots-clés (séparés par des virgules)</label>
                          <input
                            id="blog-tags"
                            type="text"
                            value={postTags}
                            onChange={(e) => setPostTags(e.target.value)}
                            placeholder="Ex : Vente, Conseils, Boutique"
                            className="w-full mt-1.5 h-10 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                          />
                        </div>
                      </div>

                      <div className="flex gap-2 justify-end pt-2">
                        {editPostId !== null && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setEditPostId(null);
                              setPostTitle("");
                              setPostExcerpt("");
                              setPostCategory("Guide");
                              setPostImage("");
                              setPostContent("");
                              setPostTags("");
                            }}
                          >
                            Annuler
                          </Button>
                        )}
                        <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                          {editPostId !== null ? "Sauvegarder l'article" : "Publier l'article"}
                        </Button>
                      </div>
                    </form>
                  </div>

                  {/* Liste des articles */}
                  <div className="bg-card rounded-xl border border-border p-6">
                    <h3 className="text-sm font-semibold text-foreground mb-4">Articles publiés ({blogPostsState.length})</h3>
                    <div className="space-y-4">
                      {blogPostsState.map((p) => (
                        <div key={p.id} className="flex gap-4 p-4 border border-border/60 bg-secondary/10 rounded-xl items-start">
                          <img
                            src={p.image}
                            alt={p.title}
                            className="w-20 h-20 rounded-lg object-cover bg-muted shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="secondary" className="text-[10px]">{p.category}</Badge>
                              <span className="text-[10px] text-muted-foreground">{p.date}</span>
                            </div>
                            <h4 className="font-semibold text-sm text-foreground truncate">{p.title}</h4>
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{p.excerpt}</p>
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={() => {
                                setEditPostId(p.id);
                                setPostTitle(p.title);
                                setPostExcerpt(p.excerpt);
                                setPostCategory(p.category);
                                setPostImage(p.image);
                                setPostContent(p.content);
                                setPostTags(p.tags ? p.tags.join(", ") : "");
                              }}
                              className="p-2 rounded-lg bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/85"
                              title="Modifier"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteBlogPost(p.id)}
                              className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20"
                              title="Supprimer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab Tarifs */}
              {activeTab === "tarifs" && (
                <div className="space-y-6">
                  <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                          <DollarSign className="w-5 h-5 text-accent" /> Gestion des Tarifs & Packs d'Abonnement
                        </h2>
                        <p className="text-xs text-muted-foreground mt-1">
                          Modifiez les prix en BIF/mois, le nombre maximum d'annonces autorisées et les options de mise en avant (carrousel HD).
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={loadPlans}
                        disabled={plansLoading}
                        className="text-xs gap-1.5"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${plansLoading ? "animate-spin" : ""}`} /> Actualiser
                      </Button>
                    </div>

                    {plansLoading ? (
                      <div className="flex justify-center items-center h-32">
                        <Loader2 className="w-6 h-6 animate-spin text-accent" />
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                        {plansList.map((plan) => {
                          const isEditing = editingPlanCode === plan.code;

                          return (
                            <div
                              key={plan.id}
                              className={`bg-secondary/20 rounded-xl border p-5 flex flex-col justify-between transition-all ${
                                plan.code === "PRO"
                                  ? "border-accent shadow-md relative"
                                  : "border-border"
                              }`}
                            >
                              {plan.code === "PRO" && (
                                <span className="absolute -top-3 right-4 bg-accent text-accent-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">
                                  Populaire
                                </span>
                              )}

                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <h3 className="font-bold text-base text-foreground">{plan.name}</h3>
                                  <Badge variant={plan.is_active ? "default" : "secondary"}>
                                    {plan.is_active ? "Actif" : "Inactif"}
                                  </Badge>
                                </div>

                                <p className="text-xs text-muted-foreground mb-4 min-h-[32px]">
                                  {plan.description}
                                </p>

                                {isEditing ? (
                                  <div className="space-y-3 bg-card p-3 rounded-lg border border-border">
                                    <div>
                                      <label className="text-[10px] font-semibold text-muted-foreground uppercase">
                                        Nom du forfait
                                      </label>
                                      <input
                                        id={`edit-plan-name-${plan.code}`}
                                        name={`edit-plan-name-${plan.code}`}
                                        type="text"
                                        value={editPlanData.name ?? plan.name}
                                        onChange={(e) =>
                                          setEditPlanData({ ...editPlanData, name: e.target.value })
                                        }
                                        className="w-full text-xs p-1.5 rounded border border-border bg-background"
                                      />
                                    </div>

                                    <div>
                                      <label className="text-[10px] font-semibold text-muted-foreground uppercase">
                                        Prix ({plan.currency || "BIF"})
                                      </label>
                                      <input
                                        id={`edit-plan-price-${plan.code}`}
                                        name={`edit-plan-price-${plan.code}`}
                                        type="number"
                                        value={editPlanData.price ?? plan.price}
                                        onChange={(e) =>
                                          setEditPlanData({
                                            ...editPlanData,
                                            price: Number(e.target.value),
                                          })
                                        }
                                        className="w-full text-xs p-1.5 rounded border border-border bg-background font-bold text-accent"
                                      />
                                    </div>

                                    <div>
                                      <label className="text-[10px] font-semibold text-muted-foreground uppercase">
                                        Limite d'annonces
                                      </label>
                                      <input
                                        id={`edit-plan-max-${plan.code}`}
                                        name={`edit-plan-max-${plan.code}`}
                                        type="number"
                                        value={editPlanData.max_listings ?? plan.max_listings}
                                        onChange={(e) =>
                                          setEditPlanData({
                                            ...editPlanData,
                                            max_listings: Number(e.target.value),
                                          })
                                        }
                                        className="w-full text-xs p-1.5 rounded border border-border bg-background"
                                      />
                                    </div>

                                    <div className="flex items-center justify-between pt-1">
                                      <span className="text-[11px] font-medium text-foreground">
                                        Mise en avant (Carrousel HD)
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setEditPlanData({
                                            ...editPlanData,
                                            featured_listings: !(
                                              editPlanData.featured_listings ?? plan.featured_listings
                                            ),
                                          })
                                        }
                                        className="text-accent"
                                      >
                                        {(editPlanData.featured_listings ?? plan.featured_listings) ? (
                                          <ToggleRight className="w-6 h-6 text-green-500" />
                                        ) : (
                                          <ToggleLeft className="w-6 h-6 text-muted-foreground" />
                                        )}
                                      </button>
                                    </div>

                                    <div className="flex items-center justify-between pt-1">
                                      <span className="text-[11px] font-medium text-foreground">
                                        Statut Actif
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setEditPlanData({
                                            ...editPlanData,
                                            is_active: !(
                                              editPlanData.is_active ?? plan.is_active
                                            ),
                                          })
                                        }
                                      >
                                        {(editPlanData.is_active ?? plan.is_active) ? (
                                          <ToggleRight className="w-6 h-6 text-green-500" />
                                        ) : (
                                          <ToggleLeft className="w-6 h-6 text-muted-foreground" />
                                        )}
                                      </button>
                                    </div>

                                    <div className="flex gap-2 pt-2">
                                      <Button
                                        size="sm"
                                        onClick={() => handleSavePlan(plan.code)}
                                        disabled={planSaving}
                                        className="flex-1 text-xs h-8 bg-accent text-accent-foreground font-bold"
                                      >
                                        {planSaving ? (
                                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                          <>
                                            <Save className="w-3.5 h-3.5 mr-1" /> Enregistrer
                                          </>
                                        )}
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setEditingPlanCode(null)}
                                        className="text-xs h-8 px-2"
                                      >
                                        <X className="w-3.5 h-3.5" />
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="space-y-3">
                                    <div className="text-2xl font-extrabold text-foreground">
                                      {Number(plan.price).toLocaleString("fr-BI")}{" "}
                                      <span className="text-xs font-normal text-muted-foreground">
                                        {plan.currency || "BIF"} / mois
                                      </span>
                                    </div>

                                    <div className="space-y-1.5 text-xs text-muted-foreground border-t border-border/50 pt-3">
                                      <div className="flex items-center gap-1.5">
                                        <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                                        <span>
                                          <strong>{plan.max_listings}</strong> annonces actives
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-1.5">
                                        {plan.featured_listings ? (
                                          <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                                        ) : (
                                          <XCircle className="w-3.5 h-3.5 text-muted-foreground/40" />
                                        )}
                                        <span>Annonces & Boutiques mises en avant</span>
                                      </div>
                                      <div className="flex items-center gap-1.5">
                                        {plan.marketing_tools ? (
                                          <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                                        ) : (
                                          <XCircle className="w-3.5 h-3.5 text-muted-foreground/40" />
                                        )}
                                        <span>Outils marketing & Statistiques</span>
                                      </div>
                                    </div>

                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setEditingPlanCode(plan.code);
                                        setEditPlanData({
                                          name: plan.name,
                                          price: Number(plan.price),
                                          max_listings: plan.max_listings,
                                          featured_listings: plan.featured_listings,
                                          is_active: plan.is_active,
                                        });
                                      }}
                                      className="w-full mt-4 text-xs font-semibold gap-1.5 border-border"
                                    >
                                      <Pencil className="w-3.5 h-3.5" /> Modifier ce forfait
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Admin;

