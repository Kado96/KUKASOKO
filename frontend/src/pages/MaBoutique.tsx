import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Store, MapPin, Phone, ImagePlus, Clock, CheckCircle2,
  Edit, Trash2, Plus, Navigation, Loader2, Send, MessageCircle,
  Search, Paperclip, Eye, Package, Star, ShoppingBag,
  ArrowRight, LayoutGrid, X, Lock, AlertCircle, Save
} from "lucide-react";
import LocationMap from "@/components/LocationMap";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import categoryImmobilier from "@/assets/category-immobilier.jpg";
import { useAuth } from "@/contexts/AuthContext";
import { merchantsAPI, messagesAPI, listingsAPI, API_BASE } from "@/services/api";
import { useChatWebSocket } from "@/hooks/useWebSocket";
import { useUserLocation } from "@/hooks/useUserLocation";
import { Link, useNavigate } from "react-router-dom";

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

// ─── Chat Center ─────────────────────────────────────────────────────────────
const ChatCenter = () => {
  const { user, playNotificationSound } = useAuth();
  const { location } = useUserLocation();
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [convLoading, setConvLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversations, activeId]);

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
      <div className="p-4 border-b border-border flex items-center gap-2 bg-gradient-to-r from-card to-secondary/30">
        <MessageCircle className="w-5 h-5 text-accent" />
        <h3 className="font-display font-bold text-foreground text-base">Messages clients</h3>
        {conversations.reduce((a, c) => a + c.unread, 0) > 0 && (
          <span className="ml-auto bg-accent text-accent-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">
            {conversations.reduce((a, c) => a + c.unread, 0)}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 h-[500px]">
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
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground text-sm gap-2">
                <MessageCircle className="w-8 h-8 opacity-30" />
                <span>Aucune conversation</span>
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

        <div className="col-span-2 flex flex-col h-full overflow-hidden">
          {active ? (
            <>
              <div className="p-3 bg-[#f0f2f5] dark:bg-zinc-800 border-b border-border flex items-center gap-3 shrink-0">
                <div className="w-10 h-10 rounded-full bg-accent/20 text-accent flex items-center justify-center font-bold text-sm shadow-sm">
                  {active.avatar}
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">{active.name}</p>
                  <p className="text-[11px] text-muted-foreground">client</p>
                </div>
              </div>

              <div
                className="flex-1 overflow-y-auto p-4 space-y-2"
                style={{
                  backgroundImage: "radial-gradient(#dfdcd6 1px, transparent 0)",
                  backgroundSize: "20px 20px",
                  backgroundColor: "#efeae2",
                }}
              >
                {!active.loaded ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="w-6 h-6 animate-spin text-accent" />
                  </div>
                ) : active.messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                    <span>Commencez la conversation.</span>
                  </div>
                ) : (
                  active.messages.map((m) => {
                    const isMe = m.from === "me";
                    return (
                      <div key={m.id} className={`flex w-full mb-1 ${isMe ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[70%] rounded-lg px-3 py-1.5 text-sm shadow-sm relative leading-relaxed ${isMe ? "bg-[#d9fdd3] text-[#111b21] rounded-tr-none" : "bg-white text-[#111b21] rounded-tl-none"}`}>
                          {m.location ? (
                            <div className="pr-10">
                              <div className="flex items-center gap-1 font-semibold mb-1 text-accent">
                                <MapPin className="w-3.5 h-3.5" />
                                <span>Position partagée</span>
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
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

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
              style={{ backgroundImage: "radial-gradient(#dfdcd6 1px, transparent 0)", backgroundSize: "20px 20px", backgroundColor: "#efeae2" }}>
              <div className="text-center bg-white/80 p-6 rounded-2xl shadow-sm border border-border/40 backdrop-blur-sm max-w-sm mx-4">
                <div className="w-16 h-16 bg-[#25d366]/10 text-[#25d366] rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="w-8 h-8" />
                </div>
                <h3 className="font-bold text-foreground text-base mb-1">Messages</h3>
                <p className="text-xs text-muted-foreground">
                  <span>Sélectionnez une conversation pour commencer à échanger.</span>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Listing Card ─────────────────────────────────────────────────────────────
interface ListingCardProps {
  listing: any;
  isMerchant: boolean;
  onDelete: () => void;
  onEdit: (listing: any) => void;
}

const ListingCard = ({ listing, isMerchant, onDelete, onEdit }: ListingCardProps) => {
  const now = Date.now();

  // Compte à rebours expiration 24h (clients sans boutique)
  const expiresIn = listing.expires_at
    ? (() => {
        const diff = new Date(listing.expires_at).getTime() - now;
        if (diff <= 0) return null;
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        return h > 0 ? `${h}h${m.toString().padStart(2, "0")}` : `${m}min`;
      })()
    : null;

  // Peut-il modifier ? Marchand = toujours oui. Client = dans la 1ère heure
  const canEdit = isMerchant || (() => {
    if (!listing.created_at) return false;
    const elapsed = now - new Date(listing.created_at).getTime();
    return elapsed <= 3600000; // 1 heure en ms
  })();

  // Temps restant pour modifier (si client)
  const editTimeLeft = !isMerchant && listing.created_at
    ? (() => {
        const elapsed = now - new Date(listing.created_at).getTime();
        const remaining = 3600000 - elapsed;
        if (remaining <= 0) return null;
        const m = Math.ceil(remaining / 60000);
        return `${m}min`;
      })()
    : null;

  return (
    <div className="group bg-card rounded-2xl border border-border overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col">
      <Link to={`/annonces/${listing.id}`} className="block relative aspect-[4/3] overflow-hidden bg-secondary">
        <img
          src={listing.image}
          alt={listing.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <Badge className="absolute top-3 left-3 bg-[#febb2d] text-zinc-950 border-0 text-xs font-semibold shadow-sm">
          {listing.category}
        </Badge>
        {/* Badge expiration 24h (clients sans boutique) */}
        {expiresIn && (
          <div className="absolute bottom-3 left-3 flex items-center gap-1 bg-black/70 backdrop-blur-sm text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
            <Clock className="w-3 h-3 text-[#febb2d]" />
            <span>Expire dans {expiresIn}</span>
          </div>
        )}
        {/* Boutons d'action (visibles au hover) */}
        <div className="absolute top-3 right-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <Link
            to={`/annonces/${listing.id}`}
            className="w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-sm hover:bg-white transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <Eye className="w-4 h-4 text-foreground" />
          </Link>
          {/* Bouton modifier : visible si autorisé */}
          {canEdit && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onEdit(listing);
              }}
              className="w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-sm hover:bg-blue-50 transition-colors"
              title="Modifier l'annonce"
            >
              <Edit className="w-4 h-4 text-blue-500" />
            </button>
          )}
          {/* Bouton supprimer */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDelete();
            }}
            className="w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-sm hover:bg-red-50 transition-colors"
            title="Supprimer l'annonce"
          >
            <Trash2 className="w-4 h-4 text-destructive" />
          </button>
        </div>
      </Link>
      <div className="p-4 flex-1 flex flex-col gap-2">
        <h4 className="font-semibold text-foreground text-sm line-clamp-2 leading-snug group-hover:text-[#febb2d] transition-colors">{listing.title}</h4>
        {/* Indicateur de délai de modification pour clients sans boutique */}
        {!isMerchant && (
          <div className="flex items-center gap-1.5">
            {canEdit && editTimeLeft ? (
              <p className="text-[10px] text-blue-500 flex items-center gap-1 font-medium">
                <Edit className="w-3 h-3" />
                <span>Modifiable encore {editTimeLeft}</span>
              </p>
            ) : !canEdit ? (
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Lock className="w-3 h-3" />
                <span>Modification expirée</span>
              </p>
            ) : null}
          </div>
        )}
        <div className="mt-auto flex items-center justify-between">
          <span className="text-[#c8911f] font-bold text-base">{listing.price}</span>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Eye className="w-3 h-3" />
            <span>{listing.views ?? 0} vues</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Ma Boutique page ─────────────────────────────────────────────────────────
const MaBoutique = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [hasShop, setHasShop] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [myListings, setMyListings] = useState<any[]>([]);
  const [listingsLoading, setListingsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"annonces" | "messages" | "stats">("annonces");
  const [form, setForm] = useState({
    name: "", description: "", category: "",
    address: "", phone: "", website: "",
    logo: null as string | null,
    cover: null as string | null,
  });
  const [shop, setShop] = useState<{
    name: string; description: string; category: string;
    address: string; phone: string; website: string;
    logo: string | null; cover: string | null;
    status: string; views: number;
    subscription_pack: string;
    location: { lat: number; lng: number } | null;
  } | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [editingListing, setEditingListing] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    price: "",
    categoryId: "",
    images: [] as string[],
  });
  const [categoriesList, setCategoriesList] = useState<Array<{ value: string; label: string }>>([]);
  const [editUploading, setEditUploading] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Charger les catégories au montage
  useEffect(() => {
    listingsAPI.getCategories()
      .then((res) => {
        if (Array.isArray(res.data)) {
          setCategoriesList(res.data.map((c: any) => ({
            value: String(c.id),
            label: c.name_fr || c.name || "Catégorie"
          })));
        }
      })
      .catch(() => {});
  }, []);


  // ── Charger les annonces — Fix: utiliser seller_id ────────────────────────
  const fetchMyListings = useCallback(async () => {
    if (!user) return;
    setListingsLoading(true);
    try {
      const res = await listingsAPI.getAll();
      if (Array.isArray(res.data)) {
        const filtered = res.data
          .filter((l: any) => l.seller_id === user.id)
          .map((l: any) => ({
            id: l.id,
            title: l.title,
            price: l.price > 0 ? `${l.price.toLocaleString("fr-BI")} ${l.currency || "BIF"}` : "Sur devis",
            category: l.category?.name_fr || l.category?.name || "À vendre",
            views: l.views ?? 0,
            status: l.status,
            expires_at: l.expires_at || null,  // Pour le badge countdown 24h
            rawPrice: l.price,
            rawDesc: l.description,
            rawCategoryId: l.category_id,
            rawImages: l.image_urls ? l.image_urls.split(",") : [],
            created_at: l.created_at,
            image: (() => {
              const rawImg = l.image_urls ? l.image_urls.split(",")[0].trim() : null;
              if (!rawImg) return `${API_BASE}/media/listing/category-avendre.jpg`;
              if (rawImg.startsWith("http://") || rawImg.startsWith("https://")) return rawImg;
              return `${API_BASE}/${rawImg}`;
            })(),
          }));
        setMyListings(filtered);
      }
    } catch (err) {
      console.error("Erreur chargement annonces:", err);
    } finally {
      setListingsLoading(false);
    }
  }, [user]);

  // ── Charger la boutique de l'utilisateur ──────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    // Charger les annonces pour tous (marchands ET clients simples)
    fetchMyListings();

    // Charger le profil marchand si existant
    merchantsAPI.getAll()
      .then((res) => {
        const list = res.data as Array<{
          id: number; user_id: number; shop_name: string;
          shop_description: string; address: string; phone: string;
          subscription_pack?: string; latitude?: number; longitude?: number;
          logo_url?: string; banner_url?: string;
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
            logo: myShop.logo_url || null,
            cover: myShop.banner_url || null,
            status: "active",
            views: 0,
            subscription_pack: myShop.subscription_pack || "Standard",
            location: myShop.latitude && myShop.longitude ? { lat: myShop.latitude, lng: myShop.longitude } : null,
          });
          setHasShop(true);
        }
      })
      .catch(() => {});
  }, [isAuthenticated, user, fetchMyListings]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, field: "logo" | "cover") => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setForm({ ...form, [field]: reader.result as string });
      reader.readAsDataURL(file);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.description || !form.category) {
      toast({ title: "Erreur", description: "Veuillez remplir les champs obligatoires.", variant: "destructive" });
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
        shop_name: string; shop_description: string;
        address: string; phone: string; subscription_pack: string;
        latitude?: number; longitude?: number;
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
        views: 0,
        subscription_pack: data.subscription_pack || "Standard",
        location: data.latitude && data.longitude ? { lat: data.latitude, lng: data.longitude } : null,
      });
      setHasShop(true);
      setShowForm(false);
      toast({ title: "Boutique créée ! 🎉", description: "Votre boutique est maintenant en ligne." });
    } catch {
      toast({ title: "Erreur", description: "Impossible de créer la boutique.", variant: "destructive" });
    }
  };

  const handleDeleteListing = async (id: number) => {
    if (!confirm("Voulez-vous vraiment supprimer cette annonce ?")) return;
    try {
      await listingsAPI.delete(id);
      toast({ title: "Annonce supprimée 🗑️" });
      fetchMyListings();
    } catch (err: any) {
      toast({
        title: "Erreur",
        description: err?.response?.data?.detail || "Impossible de supprimer l'annonce.",
        variant: "destructive"
      });
    }
  };

  // Suppression de la boutique entière
  const handleDeleteShop = async () => {
    if (!confirm("⚠️ ATTENTION : Voulez-vous vraiment supprimer votre boutique KUKASOKO définitivement ? Vos annonces ne seront plus liées à une boutique.")) return;
    try {
      await merchantsAPI.deleteMe();
      setShop(null);
      setHasShop(false);
      toast({ title: "Boutique supprimée 🗑️", description: "Votre espace boutique a été retiré." });
      // Recharger pour adapter le rôle
      window.location.reload();
    } catch {
      toast({ title: "Erreur", description: "Impossible de supprimer la boutique.", variant: "destructive" });
    }
  };

  // Ouvrir la modale d'édition de l'annonce
  const openEditModal = (listing: any) => {
    setEditingListing(listing);
    setEditForm({
      title: listing.title || "",
      description: listing.rawDesc || "",
      price: listing.rawPrice ? String(listing.rawPrice) : "",
      categoryId: listing.rawCategoryId ? String(listing.rawCategoryId) : "",
      images: listing.rawImages || [],
    });
  };

  // Upload d'image dans la modale d'édition
  const handleEditImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setEditUploading(true);
    try {
      const fileList = Array.from(files);
      const uploadedUrls: string[] = [];
      for (const file of fileList) {
        const res = await mediaAPI.upload([file], "listing");
        if (res.data.url) uploadedUrls.push(res.data.url);
      }
      setEditForm((prev) => ({ ...prev, images: [...prev.images, ...uploadedUrls] }));
      toast({ title: "Image ajoutée !" });
    } catch {
      toast({ title: "Erreur", description: "Échec de l'upload.", variant: "destructive" });
    } finally {
      setEditUploading(false);
    }
  };

  // Soumission des modifications de l'annonce
  const handleUpdateListing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingListing) return;
    if (!editForm.title || !editForm.categoryId || !editForm.description) {
      toast({ title: "Champs requis", description: "Veuillez remplir le titre, la catégorie et la description.", variant: "destructive" });
      return;
    }
    setEditSubmitting(true);
    try {
      await listingsAPI.update(editingListing.id, {
        title: editForm.title,
        description: editForm.description,
        price: editForm.price ? parseFloat(editForm.price) : 0,
        category_id: Number(editForm.categoryId),
        image_urls: editForm.images.join(","),
      });
      toast({ title: "Annonce mise à jour ! ✨" });
      setEditingListing(null);
      fetchMyListings();
    } catch (err: any) {
      toast({
        title: "Erreur",
        description: err?.response?.data?.detail || "Impossible de modifier l'annonce.",
        variant: "destructive"
      });
    } finally {
      setEditSubmitting(false);
    }
  };


  const totalViews = myListings.reduce((sum, l) => sum + (l.views || 0), 0);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-16 flex items-center justify-center min-h-screen">
          <div className="text-center p-8 bg-card rounded-2xl border border-border shadow-lg max-w-sm">
            <div className="text-5xl mb-4">🔒</div>
            <h2 className="text-xl font-bold text-foreground mb-2">Connexion requise</h2>
            <p className="text-muted-foreground text-sm mb-6">
              <span>Connectez-vous pour accéder à votre espace.</span>
            </p>
            <Button onClick={() => navigate("/login")} className="bg-[#febb2d] hover:bg-[#e2a828] text-zinc-950 font-semibold w-full">
              <span>Se connecter</span>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-16">

        {/* ── Hero Banner ── */}
        <div className="relative overflow-hidden bg-[#1a1c23] border-b border-zinc-800 py-16">
          <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-[#febb2d]/5 blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-blue-500/5 blur-3xl translate-y-1/2 -translate-x-1/4 pointer-events-none" />

          <div className="container mx-auto px-4 relative z-10">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#febb2d]/10 border border-[#febb2d]/25 flex items-center justify-center">
                    <ShoppingBag className="w-6 h-6 text-[#febb2d]" />
                  </div>
                  <div>
                    <p className="text-[#febb2d] text-xs font-semibold tracking-wider uppercase">Mon Espace Client / Boutique</p>
                    <h1 className="text-3xl font-display font-bold text-white leading-tight mt-1">
                      {hasShop && shop ? shop.name : `Bonjour, ${user?.full_name || user?.username} 👋`}
                    </h1>
                  </div>
                </div>
                <p className="text-zinc-400 text-sm max-w-md">
                  <span>
                    {hasShop
                      ? "Gérez vos annonces de boutique, suivez vos performances et répondez à vos clients."
                      : "Publiez et suivez vos annonces, ou créez votre boutique pour vendre en volume."}
                  </span>
                </p>
              </div>

              {/* Stats */}
              <div className="flex gap-3">
                {[
                  { label: "Annonces", value: String(myListings.length), icon: Package, color: "border-zinc-800" },
                  { label: "Vues", value: String(totalViews), icon: Eye, color: "border-zinc-800" },
                  { label: "Abonnement", value: shop?.subscription_pack || "Standard", icon: Star, color: "border-zinc-800" },
                ].map((stat) => (
                  <div key={stat.label} className={`bg-zinc-900/60 backdrop-blur-sm border ${stat.color} rounded-2xl p-4 text-center min-w-[100px]`}>
                    <stat.icon className="w-5 h-5 text-[#febb2d] mx-auto mb-1" />
                    <p className="text-xl font-bold text-white mt-1">{stat.value}</p>
                    <p className="text-zinc-500 text-[10px] font-semibold uppercase tracking-wider">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-10 max-w-6xl">

          {/* Créer boutique banner */}
          {!hasShop && !showForm && (
            <div className="mb-8 rounded-2xl border border-dashed border-[#febb2d]/40 bg-[#febb2d]/5 p-8 flex flex-col md:flex-row items-center gap-6">
              <div className="w-16 h-16 rounded-2xl bg-[#febb2d]/10 flex items-center justify-center shrink-0">
                <Store className="w-8 h-8 text-[#febb2d]" />
              </div>
              <div className="flex-1 text-center md:text-left">
                <h2 className="text-xl font-display font-bold text-foreground mb-1">
                  <span>Créez votre boutique gratuitement</span>
                </h2>
                <p className="text-muted-foreground text-sm">
                  <span>Bénéficiez d'une page personnalisée, publiez autant d'annonces que vous souhaitez et captez plus de clients.</span>
                </p>
              </div>
              <Button
                onClick={() => setShowForm(true)}
                className="bg-[#febb2d] hover:bg-[#e2a828] text-zinc-950 font-semibold h-12 px-8 rounded-full shrink-0"
              >
                <Plus className="w-5 h-5 mr-2" />
                <span>Créer ma boutique</span>
              </Button>
            </div>
          )}

          {/* Formulaire boutique */}
          {showForm && !hasShop && (
            <div className="mb-8 bg-card rounded-2xl border border-border p-8 shadow-lg">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-display font-bold text-foreground">Créer votre boutique</h2>
                <button onClick={() => setShowForm(false)} className="w-8 h-8 rounded-full hover:bg-secondary flex items-center justify-center text-muted-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <form onSubmit={handleCreate} className="space-y-5">
                <div>
                  <label htmlFor="shop-cover" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Image de couverture</label>
                  <div className="mt-1 relative aspect-[3/1] rounded-xl border-2 border-dashed border-border bg-secondary/50 overflow-hidden cursor-pointer hover:border-accent transition-colors">
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="shop-name" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nom de la boutique *</label>
                    <input id="shop-name" name="shop-name" type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ma Super Boutique" className="w-full mt-1 h-11 px-4 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
                  </div>
                  <div>
                    <label htmlFor="shop-category" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Catégorie *</label>
                    <select id="shop-category" name="shop-category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full mt-1 h-11 px-4 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent">
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
                  <textarea id="shop-description" name="shop-description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Décrivez votre boutique..." rows={3} className="w-full mt-1 px-4 py-3 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent resize-none" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="shop-address" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Adresse</label>
                    <div className="relative mt-1">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input id="shop-address" name="shop-address" type="text" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Bujumbura, Mukaza" className="w-full h-11 pl-10 pr-4 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="shop-phone" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Téléphone</label>
                    <div className="relative mt-1">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input id="shop-phone" name="shop-phone" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+257 XX XX XX" className="w-full h-11 pl-10 pr-4 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="border-border text-foreground rounded-full px-6">
                    <span>Annuler</span>
                  </Button>
                  <Button type="submit" className="bg-[#febb2d] hover:bg-[#e2a828] text-zinc-950 font-semibold flex-1 rounded-full">
                    <span>Créer la boutique 🚀</span>
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* Shop Info (si boutique existante) */}
          {hasShop && shop && (
            <div className="mb-8 bg-card rounded-2xl border border-border overflow-hidden shadow-md">
              <div className="h-32 relative overflow-hidden">
                {shop.cover
                  ? <img src={shop.cover} alt="Cover" className="w-full h-full object-cover" />
                  : <img src={categoryImmobilier} alt="Cover" className="w-full h-full object-cover" />}
                <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-transparent" />
              </div>
              <div className="p-5 flex flex-col md:flex-row items-center md:items-end gap-4 -mt-10 relative z-10">
                <div className="w-20 h-20 rounded-2xl border-4 border-card bg-card shadow-xl overflow-hidden shrink-0">
                  {shop.logo
                    ? <img src={shop.logo} alt="Logo" className="w-full h-full object-cover" />
                    : <div className="w-full h-full bg-gradient-to-br from-[#febb2d]/25 to-[#febb2d]/5 flex items-center justify-center"><Store className="w-8 h-8 text-[#febb2d]" /></div>}
                </div>
                <div className="flex-1 text-center md:text-left pt-2">
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-1">
                    <h2 className="text-xl font-display font-bold text-foreground">{shop.name}</h2>
                    <Badge className="bg-green-500/10 text-green-600 border-0 text-xs py-0.5 px-2 font-semibold">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      <span>Actif</span>
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-1 max-w-lg">{shop.description}</p>
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-2 text-xs text-muted-foreground">
                    {shop.address && <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-[#febb2d]" /><span>{shop.address}</span></span>}
                    {shop.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3 text-[#febb2d]" /><span>{shop.phone}</span></span>}
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-[#febb2d]" /><span>Créée aujourd'hui</span></span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button variant="outline" size="sm" className="border-border text-foreground hover:bg-secondary rounded-full gap-1.5">
                    <Edit className="w-4 h-4" />
                    <span>Modifier</span>
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="rounded-full gap-1.5"
                    onClick={handleDeleteShop}
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Supprimer la boutique</span>
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 bg-secondary/50 rounded-2xl p-1 mb-8 border border-border w-fit">
            {[
              { key: "annonces", label: "Mes Annonces", icon: LayoutGrid, count: myListings.length },
              { key: "messages", label: "Messages", icon: MessageCircle },
              ...(hasShop ? [{ key: "stats", label: "Localisation", icon: MapPin }] : []),
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  activeTab === tab.key
                    ? "bg-card text-foreground shadow-sm border border-border"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="bg-[#febb2d] text-zinc-950 text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* TAB: Annonces */}
          {activeTab === "annonces" && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-display font-bold text-foreground">Mes Annonces en ligne</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    <span>{myListings.length} annonce{myListings.length !== 1 ? "s" : ""} gérée{myListings.length !== 1 ? "s" : ""}</span>
                  </p>
                </div>
                <Button
                  onClick={() => navigate("/ajouter-annonce")}
                  className="bg-[#febb2d] hover:bg-[#e2a828] text-zinc-950 font-semibold rounded-full gap-2 shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Nouvelle annonce</span>
                </Button>
              </div>

              {listingsLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-card rounded-2xl border border-border overflow-hidden animate-pulse">
                      <div className="aspect-[4/3] bg-secondary" />
                      <div className="p-4 space-y-2">
                        <div className="h-4 bg-secondary rounded w-3/4" />
                        <div className="h-3 bg-secondary rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : myListings.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {myListings.map((listing) => (
                    <ListingCard
                      key={listing.id}
                      listing={listing}
                      isMerchant={hasShop}
                      onDelete={() => handleDeleteListing(listing.id)}
                      onEdit={openEditModal}
                    />
                  ))}
                  {/* Ajouter Card */}
                  <button
                    onClick={() => navigate("/ajouter-annonce")}
                    className="group bg-card rounded-2xl border-2 border-dashed border-border hover:border-[#febb2d] transition-all duration-300 aspect-[4/3] flex flex-col items-center justify-center gap-3 text-muted-foreground hover:text-[#febb2d]"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-secondary group-hover:bg-[#febb2d]/10 transition-colors flex items-center justify-center">
                      <Plus className="w-7 h-7" />
                    </div>
                    <span className="text-sm font-semibold">Ajouter une annonce</span>
                  </button>
                </div>
              ) : (
                <div className="rounded-2xl border-2 border-dashed border-border bg-secondary/30 p-16 text-center">
                  <div className="w-20 h-20 rounded-2xl bg-card border border-border flex items-center justify-center mx-auto mb-5 shadow-sm">
                    <Package className="w-10 h-10 text-muted-foreground/40" />
                  </div>
                  <h3 className="text-lg font-display font-bold text-foreground mb-2">Aucune annonce</h3>
                  <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                    <span>Publiez votre première annonce pour commencer à vendre.</span>
                  </p>
                  <Button
                    onClick={() => navigate("/ajouter-annonce")}
                    className="bg-[#febb2d] hover:bg-[#e2a828] text-zinc-950 font-semibold rounded-full gap-2 px-8"
                  >
                    <Plus className="w-5 h-5" />
                    <span>Créer une annonce</span>
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* TAB: Messages */}
          {activeTab === "messages" && <ChatCenter />}

          {/* TAB: Localisation */}
          {activeTab === "stats" && hasShop && shop && (
            <div className="bg-card rounded-2xl border border-border p-6">
              <div className="flex items-center gap-2 mb-5">
                <MapPin className="w-5 h-5 text-accent" />
                <h3 className="font-display font-bold text-foreground">Localisation de la boutique</h3>
              </div>
              {shop.location ? (
                <LocationMap lat={shop.location.lat} lng={shop.location.lng} label={shop.name} className="h-[350px] rounded-xl overflow-hidden" />
              ) : (
                <div className="text-center py-12">
                  <MapPin className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground mb-4">
                    <span>Aucune position enregistrée pour votre boutique.</span>
                  </p>
                  <Button
                    variant="outline"
                    className="gap-2 border-[#febb2d] text-[#febb2d] hover:bg-[#febb2d] hover:text-zinc-950 rounded-full"
                    disabled={geoLoading}
                    onClick={() => {
                      if (!navigator.geolocation) return;
                      setGeoLoading(true);
                      navigator.geolocation.getCurrentPosition(
                        (pos) => {
                          setShop({ ...shop, location: { lat: pos.coords.latitude, lng: pos.coords.longitude } });
                          setGeoLoading(false);
                          toast({ title: "Position enregistrée !" });
                        },
                        () => { setGeoLoading(false); toast({ title: "Erreur GPS", variant: "destructive" }); },
                        { enableHighAccuracy: true }
                      );
                    }}
                  >
                    {geoLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
                    <span>Géolocaliser ma boutique</span>
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Explore Banner */}
          <div className="mt-10 rounded-2xl bg-gradient-to-br from-[#1a1c23] to-[#2a2d3d] border border-zinc-800 p-8 flex flex-col md:flex-row items-center gap-6 relative overflow-hidden">
            <div className="absolute right-0 top-0 w-48 h-48 rounded-full bg-[#febb2d]/5 blur-3xl pointer-events-none" />
            <div className="flex-1 text-center md:text-left">
              <h3 className="text-xl font-display font-bold text-white mb-1">
                <span>Découvrez le marketplace</span>
              </h3>
              <p className="text-zinc-400 text-sm">
                <span>Explorez toutes les annonces publiées sur Isoko.</span>
              </p>
            </div>
            <Link
              to="/annonces"
              className="flex items-center gap-2 bg-[#febb2d] hover:bg-[#e2a828] text-zinc-950 font-semibold px-7 py-3 rounded-full transition-colors shrink-0 shadow-lg shadow-[#febb2d]/10"
            >
              <span>Voir le marketplace</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Modale d'édition d'annonce */}
          {editingListing && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-card w-full max-w-lg rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-5 border-b border-border flex items-center justify-between">
                  <h3 className="text-lg font-display font-bold text-foreground flex items-center gap-2">
                    <Edit className="w-5 h-5 text-[#febb2d]" />
                    <span>Modifier l'annonce</span>
                  </h3>
                  <button
                    onClick={() => setEditingListing(null)}
                    className="w-8 h-8 rounded-full hover:bg-secondary flex items-center justify-center text-muted-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <form onSubmit={handleUpdateListing} className="flex-1 overflow-y-auto p-5 space-y-4">
                  {/* Titre */}
                  <div className="space-y-1.5">
                    <label htmlFor="edit-title" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Titre de l'annonce *</label>
                    <Input
                      id="edit-title"
                      value={editForm.title}
                      onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                      placeholder="Ex: Appartement 3 pièces"
                      className="bg-background"
                    />
                  </div>

                  {/* Catégorie */}
                  <div className="space-y-1.5">
                    <label htmlFor="edit-category" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Catégorie *</label>
                    <select
                      id="edit-category"
                      value={editForm.categoryId}
                      onChange={(e) => setEditForm({ ...editForm, categoryId: e.target.value })}
                      className="w-full h-10 px-3 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="">Sélectionnez une catégorie</option>
                      {categoriesList.map((cat) => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Prix */}
                  <div className="space-y-1.5">
                    <label htmlFor="edit-price" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Prix de vente (BIF)</label>
                    <Input
                      id="edit-price"
                      type="number"
                      value={editForm.price}
                      onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                      placeholder="Ex: 150000"
                      className="bg-background"
                    />
                  </div>

                  {/* Description */}
                  <div className="space-y-1.5">
                    <label htmlFor="edit-desc" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Description *</label>
                    <Textarea
                      id="edit-desc"
                      value={editForm.description}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      placeholder="Détails de l'annonce..."
                      rows={4}
                      className="bg-background resize-none"
                    />
                  </div>

                  {/* Images */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Photos</label>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {editForm.images.map((img, i) => (
                        <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-border group shrink-0">
                          <img src={img} alt={`Img ${i}`} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setEditForm({ ...editForm, images: editForm.images.filter((_, idx) => idx !== i) })}
                            className="absolute top-0.5 right-0.5 w-4 h-4 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      ))}
                      <label htmlFor="edit-img-upload" className="w-16 h-16 rounded-lg border border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-accent hover:text-accent transition-colors text-muted-foreground shrink-0">
                        {editUploading ? (
                          <Loader2 className="w-4 h-4 animate-spin text-accent" />
                        ) : (
                          <>
                            <ImagePlus className="w-4 h-4 mb-0.5" />
                            <span className="text-[9px]">Ajouter</span>
                          </>
                        )}
                        <input id="edit-img-upload" type="file" accept="image/*" multiple disabled={editUploading} onChange={handleEditImageUpload} className="hidden" />
                      </label>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-3 border-t border-border mt-5">
                    <Button type="button" variant="outline" onClick={() => setEditingListing(null)} className="rounded-full px-6 flex-1">
                      <span>Annuler</span>
                    </Button>
                    <Button type="submit" disabled={editSubmitting || editUploading} className="bg-[#febb2d] hover:bg-[#e2a828] text-zinc-950 font-semibold rounded-full flex-1 gap-2">
                      {editSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      <span>Enregistrer</span>
                    </Button>
                  </div>
                </form>
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
