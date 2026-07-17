import { useState, useRef } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  BarChart3, Users, ShoppingBag, Flag, MessageSquare, Store, Settings,
  Eye, Trash2, CheckCircle, XCircle, Search, Pencil, Save, X, Plus,
  ShieldCheck, ShieldOff, ImagePlus, Image as ImageIcon, UploadCloud,
  Palette, RefreshCw, Loader2, Radio, DollarSign, ToggleLeft, ToggleRight
} from "lucide-react";
import { useNewsTicker } from "@/contexts/NewsTickerContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { allListings } from "@/data/listings";
import { toast } from "@/hooks/use-toast";
import { useSite, THEMES } from "@/contexts/SiteContext";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

type Tab = "dashboard" | "annonces" | "boutiques" | "utilisateurs" | "signalements" | "chatbot" | "medias" | "personnalisation" | "bandeau";

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

/* ─── Image Upload Box ─── */
function ImageBox({
  label, src, onUpload, onDelete, onPreview, squareSize = "w-24 h-24", coverRatio = false
}: {
  label: string; src: string; onUpload: (url: string) => void; onDelete: () => void;
  onPreview?: (url: string) => void; squareSize?: string; coverRatio?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const readFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => onUpload(e.target?.result as string);
    reader.readAsDataURL(file);
  };
  const cls = coverRatio ? "w-full h-28" : squareSize;
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">{label}</p>
      <div className={`relative group ${cls} rounded-xl overflow-hidden border-2 ${src ? "border-border" : "border-dashed border-border"} bg-secondary flex items-center justify-center cursor-pointer`}
        onClick={() => !src && ref.current?.click()}>
        {src ? (
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
      <input ref={ref} type="file" accept="image/*" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) readFile(f); }} />
    </div>
  );
}

/* ─── Inline text field ─── */
function InlineField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full mt-0.5 h-8 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
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
  const [listings, setListings] = useState<Listing[]>([...allListings] as Listing[]);
  const [editListingId, setEditListingId] = useState<number | null>(null);
  const [editListingTitle, setEditListingTitle] = useState("");
  const [editListingPrice, setEditListingPrice] = useState("");
  const [editListingImage, setEditListingImage] = useState("");

  /* users */
  const [users, setUsers] = useState<User[]>(initUsers);
  const [editUserId, setEditUserId] = useState<number | null>(null);
  const [editUserData, setEditUserData] = useState<Partial<User>>({});

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

  /* media library extra uploads */
  const [uploadedMedias, setUploadedMedias] = useState<{ src: string; label: string; section: string }[]>([]);

  /* site branding */
  const { settings: siteSettings, updateSettings: updateSiteSettings, resetSettings: resetSiteSettings } = useSite();

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

  // Admin Guard Screen
  if (!isAuthenticated || user?.role !== "admin") {
    return (
      <div className="min-h-screen bg-background flex flex-col justify-center items-center px-4">
        <Navbar />
        <div className="max-w-md w-full bg-card border border-border p-8 rounded-2xl shadow-xl mt-16">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-accent/10 text-accent rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-display font-bold text-foreground">Administration</h2>
            <p className="text-xs text-muted-foreground mt-1.5">Veuillez vous authentifier pour accéder au panneau de configuration.</p>
          </div>

          <form onSubmit={handleAdminLogin} className="space-y-4">
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
    { id: "utilisateurs", label: "Utilisateurs", icon: <Users className="w-4 h-4" /> },
    { id: "signalements", label: "Signalements", icon: <Flag className="w-4 h-4" /> },
    { id: "chatbot", label: "Chatbot IA", icon: <MessageSquare className="w-4 h-4" /> },
    { id: "bandeau", label: "Bandeau Info", icon: <Radio className="w-4 h-4" /> },
    { id: "medias", label: "Médiathèque", icon: <ImageIcon className="w-4 h-4" /> },
    { id: "personnalisation", label: "Personnalisation", icon: <Palette className="w-4 h-4" /> },
  ];

  const stats = [
    { label: "Annonces", value: listings.length, icon: <ShoppingBag className="w-5 h-5" />, color: "bg-accent/20 text-accent" },
    { label: "Utilisateurs", value: users.length, icon: <Users className="w-5 h-5" />, color: "bg-blue-500/20 text-blue-500" },
    { label: "Boutiques", value: boutiques.length, icon: <Store className="w-5 h-5" />, color: "bg-green-500/20 text-green-500" },
    { label: "Signalements", value: reports.filter((r) => r.status === "En attente").length, icon: <Flag className="w-5 h-5" />, color: "bg-red-500/20 text-red-500" },
  ];

  /* All images across the site for Médiathèque */
  const allMediaImages = [
    ...listings.filter((l) => l.image).map((l) => ({ type: "annonce", id: l.id, src: l.image, label: l.title, section: "Annonce" })),
    ...boutiques.filter((b) => b.logo).map((b) => ({ type: "boutique-logo", id: b.id, src: b.logo!, label: b.name + " (logo)", section: "Boutique" })),
    ...boutiques.filter((b) => b.cover).map((b) => ({ type: "boutique-cover", id: b.id, src: b.cover!, label: b.name + " (couverture)", section: "Boutique" })),
    ...users.filter((u) => u.avatar).map((u) => ({ type: "user", id: u.id, src: u.avatar!, label: u.name, section: "Utilisateur" })),
    ...reports.filter((r) => r.image).map((r) => ({ type: "report", id: r.id, src: r.image!, label: r.annonce, section: "Signalement" })),
    ...uploadedMedias.map((m, idx) => ({ type: "uploaded", id: idx, src: m.src, label: m.label, section: m.section })),
  ];

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
          <div className="flex items-center gap-3 mb-8">
            <Settings className="w-6 h-6 text-accent" />
            <h1 className="text-2xl font-display font-bold text-foreground">Administration</h1>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-card rounded-xl border border-border p-3 space-y-1 sticky top-24">
                {tabs.map((tab) => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                      activeTab === tab.id ? "bg-accent text-accent-foreground font-semibold" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    }`}>
                    {tab.icon} {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="lg:col-span-4 space-y-6">

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
                                ask(`Supprimer l'annonce "${listing.title}" ?`, () => {
                                  setListings((prev) => prev.filter((l) => l.id !== listing.id));
                                  toast({ title: "Annonce supprimée" });
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
                              />
                              <ImageBox
                                label="Logo de la boutique"
                                src={editBoutiqueData.logo ?? b.logo ?? ""}
                                onUpload={(url) => setEditBoutiqueData((d) => ({ ...d, logo: url }))}
                                onDelete={() => ask("Supprimer le logo ?", () => { setEditBoutiqueData((d) => ({ ...d, logo: "" })); toast({ title: "Logo supprimé" }); })}
                                onPreview={setLightbox}
                                squareSize="w-20 h-20"
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
                          email: "user@isoko.com",
                          role: "Acheteur",
                          status: "Actif",
                          date: new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
                        };
                        setUsers([newUser, ...users]);
                        setEditUserId(newId);
                        setEditUserData({ name: "Nouvel Utilisateur", email: "user@isoko.com", role: "Acheteur", avatar: "" });
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
                            />
                            <div className="grid grid-cols-2 gap-3">
                              <InlineField label="Nom" value={editUserData.name ?? u.name} onChange={(v) => setEditUserData((d) => ({ ...d, name: v }))} />
                              <InlineField label="Email" value={editUserData.email ?? u.email} onChange={(v) => setEditUserData((d) => ({ ...d, email: v }))} />
                              <div>
                                <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Rôle</label>
                                <select value={editUserData.role ?? u.role} onChange={(e) => setEditUserData((d) => ({ ...d, role: e.target.value }))}
                                  className="w-full mt-0.5 h-8 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent">
                                  <option>Acheteur</option>
                                  <option>Vendeur</option>
                                  <option>Administrateur</option>
                                </select>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" className="bg-accent hover:bg-accent/90 text-accent-foreground gap-1" onClick={() => {
                                setUsers((prev) => prev.map((x) => x.id === u.id ? { ...x, ...editUserData } : x));
                                setEditUserId(null);
                                toast({ title: "Utilisateur modifié ✅" });
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
                  <div className="bg-card rounded-xl border border-border p-6">
                    <h3 className="font-semibold text-foreground mb-1">Configuration du Chatbot</h3>
                    <p className="text-xs text-muted-foreground mb-4">Ajoutez, modifiez ou supprimez les réponses automatiques du chatbot.</p>
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
                      <Plus className="w-4 h-4" /> Ajouter une réponse
                    </Button>
                  </div>
                </div>
              )}

              {/* ─── MÉDIATHÈQUE ─── */}
              {activeTab === "medias" && (
                <div className="space-y-4">
                  <div className="bg-card rounded-xl border border-border p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="font-semibold text-foreground">Médiathèque</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">Gérez toutes les images du site — {allMediaImages.length} fichier(s)</p>
                      </div>
                      <div className="flex gap-2">
                        {/* Hidden Input for direct library upload */}
                        <input
                          id="library-upload"
                          name="library-upload"
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={(e) => {
                            const files = Array.from(e.target.files || []);
                            files.forEach((file) => {
                              const reader = new FileReader();
                              reader.onload = (ev) => {
                                const base64 = ev.target?.result as string;
                                setUploadedMedias((prev) => [
                                  ...prev,
                                  { src: base64, label: file.name, section: "Bibliothèque" },
                                ]);
                              };
                              reader.readAsDataURL(file);
                            });
                            toast({ title: `${files.length} image(s) ajoutée(s)` });
                          }}
                        />
                        <Button
                          size="sm"
                          className="bg-accent hover:bg-accent/90 text-accent-foreground text-xs font-semibold gap-1.5"
                          onClick={() => document.getElementById("library-upload")?.click()}
                        >
                          <Plus className="w-3.5 h-3.5" /> Ajouter des photos
                        </Button>
                      </div>
                    </div>

                    {allMediaImages.length === 0 ? (
                      <div className="text-center py-16 text-muted-foreground">
                        <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">Aucune image. Cliquez sur "Ajouter des photos" pour commencer.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {allMediaImages.map((img, i) => {
                          const fileInputId = `modify-media-${img.type}-${img.id}`;
                          return (
                            <div key={i} className="relative group rounded-xl overflow-hidden border border-border aspect-square bg-secondary shadow-sm hover:shadow-md transition-shadow">
                              <img src={img.src} alt={img.label} className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-3">
                                <p className="text-white text-[10px] font-bold text-center leading-tight truncate w-full px-1">{img.label}</p>
                                <Badge className="bg-accent text-accent-foreground border-0 text-[9px] font-bold px-2 py-0.5">{img.section}</Badge>
                                
                                <div className="flex items-center gap-2 mt-2">
                                  {/* View Button */}
                                  <button
                                    onClick={() => setLightbox(img.src)}
                                    className="p-2 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors"
                                    title="Voir en grand"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>

                                  {/* Modify Hidden Input */}
                                  <input
                                    id={fileInputId}
                                    name={fileInputId}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        const reader = new FileReader();
                                        reader.onload = (ev) => {
                                          handleMediaModify(img.type, img.id, ev.target?.result as string);
                                        };
                                        reader.readAsDataURL(file);
                                      }
                                    }}
                                  />
                                  {/* Modify Trigger */}
                                  <button
                                    onClick={() => document.getElementById(fileInputId)?.click()}
                                    className="p-2 rounded-lg bg-white/20 hover:bg-white/30 text-blue-300 transition-colors"
                                    title="Modifier / Remplacer"
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </button>

                                  {/* Delete Button */}
                                  <button
                                    onClick={() => handleMediaDelete(img.type, img.id, img.label)}
                                    className="p-2 rounded-lg bg-white/20 hover:bg-red-500 text-red-300 hover:text-white transition-colors"
                                    title="Supprimer"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
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
                      <p className="text-xs text-muted-foreground mt-0.5">Modifiez la photo d'arrière-plan et les textes de présentation.</p>
                    </div>

                    <ImageBox
                      label="Image d'arrière-plan de la bannière"
                      src={siteSettings.heroImage}
                      onUpload={(url) => updateSiteSettings({ heroImage: url })}
                      onDelete={() => ask("Réinitialiser l'image de la bannière ?", () => { updateSiteSettings({ heroImage: "" }); toast({ title: "Image réinitialisée" }); })}
                      onPreview={setLightbox}
                      coverRatio
                    />

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
                                    <input type="number" value={editTickerPrice} onChange={(e) => setEditTickerPrice(e.target.value)}
                                      className="w-full mt-0.5 h-8 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
                                  </div>
                                  <div>
                                    <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Sponsor</label>
                                    <input type="text" value={editTickerSponsor} onChange={(e) => setEditTickerSponsor(e.target.value)}
                                      className="w-full mt-0.5 h-8 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
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

            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Admin;
