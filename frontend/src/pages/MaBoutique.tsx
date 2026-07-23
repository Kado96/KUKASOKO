import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Store, MapPin, Phone, Globe, ImagePlus, Clock, CheckCircle2, Edit, Trash2, Plus, Navigation, Loader2, Send, MessageCircle, Search, Paperclip } from "lucide-react";
import LocationMap from "@/components/LocationMap";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import categoryImmobilier from "@/assets/category-immobilier.jpg";
import { useAuth } from "@/contexts/AuthContext";
import { merchantsAPI, messagesAPI, listingsAPI } from "@/services/api";
import { useChatWebSocket } from "@/hooks/useWebSocket";
import { useUserLocation } from "@/hooks/useUserLocation";

// ─── Types ──────────────────────────────────────────────────────────────────
interface ChatMessage {
  id: number;
  from: "me" | "them";
  text: string;
  time: string;
  location?: { lat: number; lng: number };
  message_type?: string;
}
interface ChatConversation {
  id: number;
  name: string;
  avatar: string;
  lastMessage: string;
  time: string;
  unread: number;
  online: boolean;
  messages: ChatMessage[];
  loaded: boolean;
}
const formatChatTime = (iso: string) => {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  } catch { return iso; }
};

// ─── Chat Center — clone exact de Messages.tsx ────────────────────────────
const ChatCenter = () => {
  const { user, playNotificationSound } = useAuth();
  const { location } = useUserLocation();
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [convLoading, setConvLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Charger les conversations
  useEffect(() => {
    setConvLoading(true);
    messagesAPI.getConversations()
      .then((res) => {
        const apiConvs = res.data as Array<{
          partner_id: number; partner_name: string;
          last_message: string; last_message_time: string; unread_count: number;
        }>;
        setConversations(apiConvs.map((c) => ({
          id: c.partner_id,
          name: c.partner_name,
          avatar: c.partner_name.charAt(0).toUpperCase(),
          lastMessage: c.last_message,
          time: formatChatTime(c.last_message_time),
          unread: c.unread_count,
          online: false,
          messages: [],
          loaded: false,
        })));
        if (apiConvs.length > 0) setActiveId(apiConvs[0].partner_id);
      })
      .catch(() => setConversations([]))
      .finally(() => setConvLoading(false));
  }, []);

  // Charger les messages de la conversation active
  useEffect(() => {
    if (activeId === null) return;
    const conv = conversations.find((c) => c.id === activeId);
    if (!conv || conv.loaded) return;
    messagesAPI.getThread(activeId).then((res) => {
      const msgs = res.data as Array<{
        id: number; sender_id: number; content: string;
        created_at: string; message_type?: string; latitude?: number; longitude?: number;
      }>;
      setConversations((prev) => prev.map((c) =>
        c.id === activeId ? {
          ...c, loaded: true,
          messages: msgs.map((m) => ({
            id: m.id,
            from: m.sender_id === user?.id ? "me" : "them",
            text: m.content,
            time: formatChatTime(m.created_at),
            message_type: m.message_type,
            location: m.latitude && m.longitude ? { lat: m.latitude, lng: m.longitude } : undefined,
          })),
        } : c
      ));
    });
  }, [activeId, conversations, user?.id]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversations, activeId]);

  // WebSocket temps réel
  const handleWsMessage = useCallback((data: object) => {
    const msg = data as {
      type?: string; id?: number; sender_id?: number; content?: string;
      created_at?: string; message_type?: string; latitude?: number; longitude?: number;
    };
    if (msg.type === "message" && msg.sender_id !== undefined) {
      const partnerId = msg.sender_id;
      const newMsg: ChatMessage = {
        id: msg.id ?? Date.now(), from: "them",
        text: msg.content ?? "",
        time: formatChatTime(msg.created_at ?? new Date().toISOString()),
        message_type: msg.message_type,
        location: msg.latitude && msg.longitude ? { lat: msg.latitude, lng: msg.longitude } : undefined,
      };
      playNotificationSound();
      setConversations((prev) => {
        const exists = prev.find((c) => c.id === partnerId);
        if (exists) {
          return prev.map((c) => c.id === partnerId ? {
            ...c, lastMessage: newMsg.text || "📍 Position", time: newMsg.time,
            unread: c.id !== activeId ? c.unread + 1 : 0,
            messages: [...c.messages, newMsg],
          } : c);
        }
        return [{ id: partnerId, name: `Utilisateur #${partnerId}`, avatar: "#", lastMessage: newMsg.text, time: newMsg.time, unread: 1, online: true, messages: [newMsg], loaded: true }, ...prev];
      });
    }
  }, [activeId, playNotificationSound]);

  const { sendMessage: wsSend } = useChatWebSocket(user?.id ?? null, handleWsMessage);

  const sendMessage = (text: string, loc?: { lat: number; lng: number }) => {
    if (!text.trim() && !loc) return;
    if (activeId === null) return;
    const time = formatChatTime(new Date().toISOString());
    const newMsg: ChatMessage = {
      id: Date.now(), from: "me",
      text: loc ? "📍 Ma position actuelle" : text,
      time, location: loc, message_type: loc ? "location" : "text",
    };
    setConversations((prev) => prev.map((c) =>
      c.id === activeId ? { ...c, lastMessage: newMsg.text, time, messages: [...c.messages, newMsg] } : c
    ));
    setInput("");
    wsSend({ receiver_id: activeId, content: loc ? `${loc.lat},${loc.lng}` : text, message_type: loc ? "location" : "text" });
  };

  const sharePosition = () => {
    if (!location) {
      toast({ title: "Position non disponible", description: "Activez d'abord votre position." });
      return;
    }
    sendMessage("", { lat: location.lat, lng: location.lng });
    toast({ title: "Position partagée ✅" });
  };

  const active = conversations.find((c) => c.id === activeId);
  const filtered = conversations.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-md">
      {/* Titre */}
      <div className="p-4 border-b border-border flex items-center gap-2">
        <MessageCircle className="w-5 h-5 text-accent" />
        <h3 className="font-display font-bold text-foreground text-base">Discussions avec les clients</h3>
        {conversations.reduce((a, c) => a + c.unread, 0) > 0 && (
          <span className="ml-auto bg-accent text-accent-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">
            {conversations.reduce((a, c) => a + c.unread, 0)}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 h-[500px]">
        {/* Gauche : Liste des conversations */}
        <div className="border-r border-border flex flex-col bg-card">
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher..."
                className="w-full h-9 pl-9 pr-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {convLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-5 h-5 animate-spin text-accent" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground text-sm">
                <MessageCircle className="w-8 h-8 mb-2 opacity-30" />
                Aucune conversation
              </div>
            ) : (
              filtered.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setActiveId(c.id);
                    setConversations((prev) => prev.map((cv) => cv.id === c.id ? { ...cv, unread: 0 } : cv));
                  }}
                  className={`w-full flex items-center gap-3 p-3 hover:bg-secondary/50 transition-colors text-left border-b border-border ${activeId === c.id ? "bg-secondary/60" : ""}`}
                >
                  <div className="relative shrink-0">
                    <div className="w-11 h-11 rounded-full bg-accent/20 text-accent flex items-center justify-center font-bold text-sm">
                      {c.avatar}
                    </div>
                    {c.online && <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-card" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-sm text-foreground truncate">{c.name}</p>
                      <span className="text-xs text-muted-foreground shrink-0">{c.time}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <p className="text-xs text-muted-foreground truncate">{c.lastMessage}</p>
                      {c.unread > 0 && (
                        <span className="shrink-0 bg-accent text-accent-foreground text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                          {c.unread}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Droite : Conversation active */}
        <div className="col-span-2 flex flex-col h-full overflow-hidden">
          {active ? (
            <>
              {/* En-tête style WhatsApp */}
              <div className="p-3 bg-[#f0f2f5] dark:bg-zinc-800 border-b border-border flex items-center gap-3 shrink-0">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-accent/20 text-accent flex items-center justify-center font-bold text-sm shadow-sm">
                    {active.avatar}
                  </div>
                  {active.online && <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#25d366] rounded-full border-2 border-[#f0f2f5]" />}
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm leading-tight">{active.name}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {active.online ? <span className="text-[#25d366] font-medium">en ligne</span> : "client"}
                  </p>
                </div>
              </div>

              {/* Corps des messages style WhatsApp */}
              <div
                className="flex-1 overflow-y-auto p-4 space-y-2"
                style={{
                  backgroundImage: "radial-gradient(#dfdcd6 1px, transparent 0), radial-gradient(#dfdcd6 1px, transparent 0)",
                  backgroundSize: "20px 20px",
                  backgroundPosition: "0 0, 10px 10px",
                  backgroundColor: "#efeae2",
                }}
              >
                {!active.loaded ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="w-6 h-6 animate-spin text-accent" />
                  </div>
                ) : active.messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                    Commencez la conversation.
                  </div>
                ) : (
                  active.messages.map((m) => {
                    const isMe = m.from === "me";
                    return (
                      <div key={m.id} className={`flex w-full mb-1 ${isMe ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[70%] rounded-lg px-3 py-1.5 text-sm shadow-sm relative leading-relaxed ${
                          isMe
                            ? "bg-[#d9fdd3] text-[#111b21] rounded-tr-none"
                            : "bg-white text-[#111b21] rounded-tl-none"
                        }`}>
                          {m.location ? (
                            <div className="pr-10">
                              <div className="flex items-center gap-1 font-semibold mb-1 text-accent">
                                <MapPin className="w-3.5 h-3.5" /> Position partagée
                              </div>
                              <a
                                href={`https://www.openstreetmap.org/?mlat=${m.location.lat}&mlon=${m.location.lng}#map=15/${m.location.lat}/${m.location.lng}`}
                                target="_blank" rel="noreferrer"
                                className="underline text-xs opacity-90 block hover:text-accent"
                              >
                                {m.location.lat.toFixed(5)}, {m.location.lng.toFixed(5)}
                              </a>
                            </div>
                          ) : (
                            <p className="whitespace-pre-wrap pr-12">{m.text}</p>
                          )}
                          <div className="absolute bottom-1 right-2 flex items-center gap-1 select-none text-[9px] text-[#667781]">
                            <span>{m.time}</span>
                            {isMe && (
                              <svg viewBox="0 0 16 15" width="14" height="13" className="fill-current text-[#53bdeb] inline-block ml-0.5">
                                <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033L5.138 7.37a.365.365 0 0 0-.507.012l-.462.462a.36.36 0 0 0-.007.512l3.435 3.447a.49.49 0 0 0 .708-.007l5.78-7.973a.35.35 0 0 0-.074-.507z"/>
                                <path d="M11.19 3.316l-.478-.372a.365.365 0 0 0-.51.063L4.846 9.879a.32.32 0 0 1-.484.033L1.318 7.37a.365.365 0 0 0-.507.012l-.462.462a.36.36 0 0 0-.007.512l3.435 3.447a.49.49 0 0 0 .708-.007l5.78-7.973a.35.35 0 0 0-.074-.507z"/>
                              </svg>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Barre d'envoi style WhatsApp */}
              <form
                onSubmit={(e) => { e.preventDefault(); sendMessage(input); }}
                className="p-2.5 bg-[#f0f2f5] dark:bg-zinc-800 flex items-center gap-2 shrink-0 border-t border-border"
              >
                <button type="button" onClick={sharePosition} title="Partager ma position"
                  className="w-9 h-9 rounded-full hover:bg-secondary/80 text-muted-foreground flex items-center justify-center transition-colors shrink-0">
                  <MapPin className="w-5 h-5 text-[#54656f]" />
                </button>
                <button type="button" title="Bientôt disponible"
                  className="w-9 h-9 rounded-full hover:bg-secondary/80 text-muted-foreground flex items-center justify-center transition-colors shrink-0">
                  <Paperclip className="w-5 h-5 text-[#54656f]" />
                </button>
                <input
                  autoComplete="off"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Écrire un message..."
                  className="flex-1 h-9 px-4 rounded-lg border-0 bg-white text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                />
                <Button type="submit" size="icon"
                  className="w-9 h-9 rounded-full bg-[#00a884] hover:bg-[#008f72] text-white shrink-0 flex items-center justify-center shadow-sm">
                  <Send className="w-4 h-4 ml-0.5" />
                </Button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center"
              style={{
                backgroundImage: "radial-gradient(#dfdcd6 1px, transparent 0), radial-gradient(#dfdcd6 1px, transparent 0)",
                backgroundSize: "20px 20px",
                backgroundPosition: "0 0, 10px 10px",
                backgroundColor: "#efeae2",
              }}
            >
              <div className="text-center bg-white/80 p-6 rounded-2xl shadow-sm border border-border/40 backdrop-blur-sm max-w-sm mx-4">
                <div className="w-16 h-16 bg-[#25d366]/10 text-[#25d366] rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="w-8 h-8" />
                </div>
                <h3 className="font-bold text-foreground text-base mb-1">Isoko Chat</h3>
                <p className="text-xs text-muted-foreground">Sélectionnez une conversation dans la liste pour commencer à échanger en toute sécurité.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Ma Boutique page ─────────────────────────────────────────────────────
const MaBoutique = () => {
  const { user, isAuthenticated } = useAuth();
  const [hasShop, setHasShop] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [myListings, setMyListings] = useState<any[]>([]);
  const [listingsLoading, setListingsLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    category: "",
    address: "",
    phone: "",
    website: "",
    logo: null as string | null,
    cover: null as string | null,
  });

  const [shop, setShop] = useState<{
    name: string;
    description: string;
    category: string;
    address: string;
    phone: string;
    website: string;
    logo: string | null;
    cover: string | null;
    status: string;
    listings: number;
    views: number;
    subscription_pack: string;
    location: { lat: number; lng: number } | null;
  } | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);

  // Fonction pour charger les annonces de l'utilisateur connecté
  const fetchMyListings = useCallback(async () => {
    if (!user) return;
    setListingsLoading(true);
    try {
      const res = await listingsAPI.getAll();
      if (res.data) {
        const filtered = res.data.filter((l: any) => l.user_id === user.id).map((l: any) => ({
          id: l.id,
          title: l.title,
          price: l.price > 0 ? `${l.price.toLocaleString("fr-BI")} ${l.currency || "BIF"}` : "Sur devis",
          category: l.category?.name_fr || l.category?.name || "À vendre",
          image: (() => {
            const rawImg = l.image || (l.image_urls ? l.image_urls.split(",")[0] : null);
            if (!rawImg) return "http://localhost:8000/media/listing/category-avendre.jpg";
            if (rawImg.startsWith("http://") || rawImg.startsWith("https://")) return rawImg;
            return `http://localhost:8000/${rawImg}`;
          })()
        }));
        setMyListings(filtered);
      }
    } catch (err) {
      console.error("Erreur de chargement des annonces utilisateur:", err);
    } finally {
      setListingsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    merchantsAPI.getAll()
      .then((res) => {
        const list = res.data as Array<{
          id: number;
          user_id: number;
          shop_name: string;
          shop_description: string;
          address: string;
          phone: string;
          subscription_pack?: string;
          latitude?: number;
          longitude?: number;
        }>;
        const myShop = list.find((m) => m.user_id === user.id);
        if (myShop) {
          setShop({
            name: myShop.shop_name,
            description: myShop.shop_description,
            category: "Général",
            address: myShop.address || "",
            phone: myShop.phone || "",
            website: "",
            logo: null,
            cover: null,
            status: "active",
            listings: 0,
            views: 0,
            subscription_pack: myShop.subscription_pack || "Standard",
            location: myShop.latitude && myShop.longitude ? { lat: myShop.latitude, lng: myShop.longitude } : null,
          });
          setHasShop(true);
          fetchMyListings();
        }
      })
      .catch(() => {});
  }, [isAuthenticated, user, fetchMyListings]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, field: "logo" | "cover") => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm({ ...form, [field]: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.description || !form.category) {
      toast({ title: "Erreur", description: "Veuillez remplir les champs obligatoires." });
      return;
    }
    try {
      const res = await merchantsAPI.create({
        shop_name: form.name,
        shop_description: form.description,
        address: form.address,
        phone: form.phone,
        whatsapp: form.phone,
      });
      const data = res.data as {
        shop_name: string;
        shop_description: string;
        address: string;
        phone: string;
        subscription_pack: string;
        latitude?: number;
        longitude?: number;
      };
      setShop({
        name: data.shop_name,
        description: data.shop_description,
        category: form.category,
        address: data.address || "",
        phone: data.phone || "",
        website: form.website,
        logo: form.logo,
        cover: form.cover,
        status: "active",
        listings: 0,
        views: 0,
        subscription_pack: data.subscription_pack || "Standard",
        location: data.latitude && data.longitude ? { lat: data.latitude, lng: data.longitude } : null,
      });
      setHasShop(true);
      setShowForm(false);
      toast({ title: "Boutique créée !", description: "Votre boutique est maintenant en ligne." });
    } catch {
      toast({ title: "Erreur", description: "Impossible de créer la boutique en base de données.", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-16">
        <div className="bg-primary py-12">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-3xl font-display font-bold text-primary-foreground mb-2">Ma Boutique</h1>
            <p className="text-primary-foreground/70">Gérez votre boutique et vos produits</p>
          </div>
        </div>

        <div className="container mx-auto px-4 py-12 max-w-4xl">
          {/* No shop yet */}
          {!hasShop && !showForm && (
            <div className="text-center py-16">
              <div className="w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-6">
                <Store className="w-10 h-10 text-accent" />
              </div>
              <h2 className="text-2xl font-display font-bold text-foreground mb-3">
                Vous n'avez pas encore de boutique
              </h2>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                Créez votre boutique pour commencer à vendre vos produits et services sur Isoko.
              </p>
              <Button onClick={() => setShowForm(true)} className="bg-accent text-accent-foreground hover:bg-accent/90 font-semibold h-12 px-8">
                <Plus className="w-5 h-5 mr-2" />
                Créer ma boutique
              </Button>
            </div>
          )}

          {/* Create shop form */}
          {showForm && !hasShop && (
            <div className="bg-card rounded-xl border border-border p-8 shadow-md">
              <h2 className="text-xl font-display font-bold text-foreground mb-6">Créer votre boutique</h2>
              <form onSubmit={handleCreate} className="space-y-5">
                {/* Cover */}
                <div>
                  <label htmlFor="shop-cover" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Image de couverture</label>
                  <div className="mt-1 relative aspect-[3/1] rounded-lg border-2 border-dashed border-border bg-secondary/50 overflow-hidden cursor-pointer hover:border-accent transition-colors">
                    {form.cover ? (
                      <img src={form.cover} alt="Cover" className="w-full h-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
                        <ImagePlus className="w-8 h-8 mb-2" />
                        <span className="text-sm">Cliquez pour ajouter une couverture</span>
                      </div>
                    )}
                    <input id="shop-cover" name="shop-cover" type="file" accept="image/*" onChange={(e) => handleImageUpload(e, "cover")} className="absolute inset-0 opacity-0 cursor-pointer" />
                  </div>
                </div>
                {/* Logo */}
                <div>
                  <label htmlFor="shop-logo" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Logo</label>
                  <div className="mt-1 flex items-center gap-4">
                    <div className="w-20 h-20 rounded-xl border-2 border-dashed border-border bg-secondary/50 overflow-hidden relative cursor-pointer hover:border-accent transition-colors">
                      {form.logo ? (
                        <img src={form.logo} alt="Logo" className="w-full h-full object-cover" />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                          <ImagePlus className="w-6 h-6" />
                        </div>
                      )}
                      <input id="shop-logo" name="shop-logo" type="file" accept="image/*" onChange={(e) => handleImageUpload(e, "logo")} className="absolute inset-0 opacity-0 cursor-pointer" />
                    </div>
                    <p className="text-xs text-muted-foreground">Format recommandé : 200x200px, PNG ou JPG</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="shop-name" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nom de la boutique *</label>
                    <input id="shop-name" name="shop-name" type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ma Super Boutique" className="w-full mt-1 h-11 px-4 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
                  </div>
                  <div>
                    <label htmlFor="shop-category" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Catégorie *</label>
                    <select id="shop-category" name="shop-category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full mt-1 h-11 px-4 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent">
                      <option value="">Sélectionnez une catégorie</option>
                      <option value="Immobilier">Immobilier</option>
                      <option value="À vendre">À vendre</option>
                      <option value="Services">Services</option>
                      <option value="Alimentation">Alimentation</option>
                      <option value="Électronique">Électronique</option>
                      <option value="Mode">Mode</option>
                      <option value="Autre">Autre</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label htmlFor="shop-description" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Description *</label>
                  <textarea id="shop-description" name="shop-description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Décrivez votre boutique..." rows={3} className="w-full mt-1 px-4 py-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent resize-none" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div>
                    <label htmlFor="shop-address" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Adresse</label>
                    <div className="relative mt-1">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input id="shop-address" name="shop-address" type="text" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Bujumbura" className="w-full h-11 pl-10 pr-4 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="shop-phone" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Téléphone</label>
                    <div className="relative mt-1">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input id="shop-phone" name="shop-phone" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+257 XX XX XX" className="w-full h-11 pl-10 pr-4 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="shop-website" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Site web</label>
                    <div className="relative mt-1">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input id="shop-website" name="shop-website" type="url" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://..." className="w-full h-11 pl-10 pr-4 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
                    </div>
                  </div>
                </div>
                {/* GPS */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Position GPS de la boutique</p>
                  <Button type="button" variant="outline" className="w-full mt-1 gap-2 border-accent text-accent hover:bg-accent hover:text-accent-foreground" disabled={geoLoading}
                    onClick={() => {
                      if (!navigator.geolocation) return;
                      setGeoLoading(true);
                      navigator.geolocation.getCurrentPosition(
                        (pos) => { setForm({ ...form, address: form.address || "Position captée" }); setGeoLoading(false); toast({ title: "Position captée !", description: `${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}` }); },
                        () => { setGeoLoading(false); toast({ title: "Erreur", description: "Impossible de capter la position." }); },
                        { enableHighAccuracy: true }
                      );
                    }}
                  >
                    <span className="flex items-center justify-center shrink-0 w-4 h-4">
                      {geoLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
                    </span>
                    <span>Géolocaliser ma boutique</span>
                  </Button>
                </div>
                <div className="flex gap-3 pt-2">
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="border-border text-foreground">Annuler</Button>
                  <Button type="submit" className="bg-accent text-accent-foreground hover:bg-accent/90 font-semibold flex-1">Créer la boutique</Button>
                </div>
              </form>
            </div>
          )}

          {/* Shop Dashboard */}
          {hasShop && shop && (
            <div className="space-y-8">
              {/* Shop Header */}
              <div className="bg-card rounded-xl border border-border overflow-hidden shadow-md">
                <div className="aspect-[4/1] bg-secondary relative">
                  {shop.cover ? <img src={shop.cover} alt="Cover" className="w-full h-full object-cover" /> : <img src={categoryImmobilier} alt="Cover" className="w-full h-full object-cover" />}
                </div>
                <div className="p-6 flex flex-col md:flex-row items-center md:items-start gap-5 -mt-10 relative z-10">
                  <div className="w-24 h-24 rounded-2xl border-4 border-card bg-card flex items-center justify-center overflow-hidden shadow-md shrink-0">
                    {shop.logo ? <img src={shop.logo} alt="Logo" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-secondary flex items-center justify-center"><Store className="w-10 h-10 text-muted-foreground" /></div>}
                  </div>
                  <div className="flex-1 text-center md:text-left pt-2 md:pt-4">
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5 mb-1.5">
                      <h2 className="text-2xl font-display font-bold text-foreground leading-none">{shop.name}</h2>
                      <Badge className="bg-green-500/10 text-green-600 border-0 text-xs py-1 px-2.5 font-semibold shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Actif
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground max-w-xl">{shop.description}</p>
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-3 text-xs text-muted-foreground">
                      {shop.address && <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-accent" /> {shop.address}</span>}
                      <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-accent" /> Créée aujourd'hui</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-2 md:pt-4 self-center md:self-start">
                    <Button variant="outline" size="sm" className="border-border text-foreground hover:bg-secondary"><Edit className="w-4 h-4 mr-1.5" /> Modifier</Button>
                    <Button variant="outline" size="sm" className="border-destructive/30 text-destructive hover:bg-destructive/10" onClick={() => { setHasShop(false); setShop(null); toast({ title: "Boutique supprimée" }); }}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Localisation */}
              <div className="bg-card rounded-xl border border-border p-6">
                <div className="flex items-center gap-2 mb-4">
                  <MapPin className="w-5 h-5 text-accent" />
                  <h3 className="font-display font-bold text-foreground">Localisation de la boutique</h3>
                </div>
                {shop.location ? (
                  <LocationMap lat={shop.location.lat} lng={shop.location.lng} label={shop.name} className="h-[300px]" />
                ) : (
                  <div className="text-center py-8">
                    <MapPin className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground mb-3">Aucune position enregistrée</p>
                    <Button variant="outline" className="gap-2 border-accent text-accent hover:bg-accent hover:text-accent-foreground" disabled={geoLoading}
                      onClick={() => {
                        if (!navigator.geolocation) return;
                        setGeoLoading(true);
                        navigator.geolocation.getCurrentPosition(
                          (pos) => { setShop({ ...shop, location: { lat: pos.coords.latitude, lng: pos.coords.longitude } }); setGeoLoading(false); toast({ title: "Position enregistrée !" }); },
                          () => { setGeoLoading(false); toast({ title: "Erreur", description: "Impossible de capter la position." }); },
                          { enableHighAccuracy: true }
                        );
                      }}
                    >
                      <span className="flex items-center justify-center shrink-0 w-4 h-4">
                        {geoLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
                      </span>
                      <span>Ajouter ma position</span>
                    </Button>
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { label: "Annonces", value: String(myListings.length), icon: Store },
                  { label: "Vues", value: "0", icon: Globe },
                  { label: "Abonnement", value: shop.subscription_pack || "Standard", icon: CheckCircle2 },
                ].map((stat) => (
                  <div key={stat.label} className="bg-card rounded-xl border border-border p-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center">
                      <stat.icon className="w-6 h-6 text-accent" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* ─── Chat Center (clone de Messages.tsx) ─── */}
              <ChatCenter />

              {/* Liste des annonces de ma boutique */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-display font-bold text-foreground flex items-center gap-2">
                    <Store className="w-5 h-5 text-accent" /> Mes Annonces en ligne ({myListings.length})
                  </h3>
                  <Button asChild size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90 font-semibold">
                    <a href="/ajouter-annonce">
                      <Plus className="w-4 h-4 mr-1.5" /> Nouvelle annonce
                    </a>
                  </Button>
                </div>

                {listingsLoading ? (
                  <div className="bg-card rounded-xl border border-border p-12 text-center flex flex-col items-center justify-center gap-2">
                    <Loader2 className="w-8 h-8 animate-spin text-accent" />
                    <p className="text-sm text-muted-foreground">Chargement de vos annonces...</p>
                  </div>
                ) : myListings.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {myListings.map((listing) => (
                      <div key={listing.id} className="bg-card rounded-xl border border-border overflow-hidden hover:shadow-md transition-shadow flex flex-col justify-between">
                        <div>
                          <div className="aspect-video relative overflow-hidden bg-secondary">
                            <img src={listing.image} alt={listing.title} className="w-full h-full object-cover" />
                            <Badge className="absolute top-2 right-2 bg-accent text-accent-foreground border-0 text-[10px] font-bold">
                              {listing.category}
                            </Badge>
                          </div>
                          <div className="p-4">
                            <h4 className="font-semibold text-foreground text-sm line-clamp-1 mb-1">{listing.title}</h4>
                            <p className="text-accent font-bold text-sm">{listing.price}</p>
                          </div>
                        </div>
                        <div className="p-4 pt-0 flex gap-2 border-t border-border/50 mt-2">
                          <Button asChild variant="outline" size="xs" className="flex-1 text-xs py-1 h-8 border-border hover:bg-secondary">
                            <a href={`/annonces/${listing.id}`}>Voir</a>
                          </Button>
                          <Button
                            variant="outline"
                            size="xs"
                            className="flex-1 text-xs py-1 h-8 text-destructive border-destructive/20 hover:bg-destructive/10"
                            onClick={async () => {
                              if (confirm("Voulez-vous vraiment supprimer cette annonce ?")) {
                                try {
                                  await listingsAPI.delete(listing.id);
                                  toast({ title: "Annonce supprimée 🗑️", description: "L'annonce a été retirée de votre boutique." });
                                  fetchMyListings();
                                } catch {
                                  toast({ title: "Erreur", description: "Impossible de supprimer l'annonce." });
                                }
                              }
                            }}
                          >
                            Supprimer
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-card rounded-xl border border-border p-8 text-center">
                    <Store className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">Aucune annonce dans votre boutique</h3>
                    <p className="text-sm text-muted-foreground mb-4">Ajoutez votre première annonce pour commencer à vendre.</p>
                    <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90 font-semibold">
                      <a href="/ajouter-annonce">
                        <Plus className="w-4 h-4 mr-2" /> Ajouter une annonce
                      </a>
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default MaBoutique;
