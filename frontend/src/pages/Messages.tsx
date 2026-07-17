import { useState, useEffect, useRef, useCallback } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Send, MapPin, Paperclip, Search, MessageCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUserLocation } from "@/hooks/useUserLocation";
import { toast } from "@/hooks/use-toast";
import { messagesAPI } from "@/services/api";
import { useChatWebSocket } from "@/hooks/useWebSocket";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

interface Message {
  id: number;
  from: "me" | "them";
  text: string;
  time: string;
  location?: { lat: number; lng: number };
  message_type?: string;
}

interface Conversation {
  id: number;           // partner user id
  name: string;
  avatar: string;
  lastMessage: string;
  time: string;
  unread: number;
  online: boolean;
  messages: Message[];
  loaded: boolean;     // whether messages have been fetched from API
}

const formatTime = (isoOrTime: string) => {
  try {
    const d = new Date(isoOrTime);
    if (isNaN(d.getTime())) return isoOrTime;
    return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  } catch {
    return isoOrTime;
  }
};

const Messages = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading, playNotificationSound } = useAuth();
  const { location } = useUserLocation();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [convLoading, setConvLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/login");
    }
  }, [authLoading, isAuthenticated, navigate]);

  // Load conversations list from API
  useEffect(() => {
    if (!isAuthenticated) return;
    setConvLoading(true);
    messagesAPI
      .getConversations()
      .then((res) => {
        const apiConvs = res.data as Array<{
          partner_id: number;
          partner_name: string;
          last_message: string;
          last_message_time: string;
          unread_count: number;
        }>;
        setConversations(
          apiConvs.map((c) => ({
            id: c.partner_id,
            name: c.partner_name,
            avatar: c.partner_name.charAt(0).toUpperCase(),
            lastMessage: c.last_message,
            time: formatTime(c.last_message_time),
            unread: c.unread_count,
            online: false,
            messages: [],
            loaded: false,
          }))
        );
        if (apiConvs.length > 0) setActiveId(apiConvs[0].partner_id);
      })
      .catch(() => {
        // If no conversations yet, show empty state
        setConversations([]);
      })
      .finally(() => setConvLoading(false));
  }, [isAuthenticated]);

  // Load messages for active conversation
  useEffect(() => {
    if (activeId === null) return;
    const conv = conversations.find((c) => c.id === activeId);
    if (!conv || conv.loaded) return;

    messagesAPI.getThread(activeId).then((res) => {
      const msgs = res.data as Array<{
        id: number;
        sender_id: number;
        content: string;
        created_at: string;
        message_type?: string;
        latitude?: number;
        longitude?: number;
      }>;
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeId
            ? {
                ...c,
                loaded: true,
                messages: msgs.map((m) => ({
                  id: m.id,
                  from: m.sender_id === user?.id ? "me" : "them",
                  text: m.content,
                  time: formatTime(m.created_at),
                  message_type: m.message_type,
                  location:
                    m.latitude && m.longitude
                      ? { lat: m.latitude, lng: m.longitude }
                      : undefined,
                })),
              }
            : c
        )
      );
    });
  }, [activeId, conversations, user?.id]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversations, activeId]);

  // WebSocket: receive incoming messages in real-time
  const handleWsMessage = useCallback(
    (data: object) => {
      const msg = data as {
        type?: string;
        id?: number;
        sender_id?: number;
        content?: string;
        created_at?: string;
        message_type?: string;
        latitude?: number;
        longitude?: number;
      };
      if (msg.type === "message" && msg.sender_id !== undefined) {
        const partnerId = msg.sender_id;
        const newMsg: Message = {
          id: msg.id ?? Date.now(),
          from: "them",
          text: msg.content ?? "",
          time: formatTime(msg.created_at ?? new Date().toISOString()),
          message_type: msg.message_type,
          location:
            msg.latitude && msg.longitude
              ? { lat: msg.latitude, lng: msg.longitude }
              : undefined,
        };

        // Play standard notification sound for incoming chat message
        playNotificationSound();

        setConversations((prev) => {
          const exists = prev.find((c) => c.id === partnerId);
          if (exists) {
            return prev.map((c) =>
              c.id === partnerId
                ? {
                    ...c,
                    lastMessage: newMsg.text || "📍 Position",
                    time: newMsg.time,
                    unread: c.id !== activeId ? c.unread + 1 : 0,
                    messages: [...c.messages, newMsg],
                  }
                : c
            );
          }
          // New conversation started
          return [
            {
              id: partnerId,
              name: `Utilisateur #${partnerId}`,
              avatar: "#",
              lastMessage: newMsg.text,
              time: newMsg.time,
              unread: 1,
              online: true,
              messages: [newMsg],
              loaded: true,
            },
            ...prev,
          ];
        });
      }
    },
    [activeId, playNotificationSound]
  );

  const { sendMessage: wsSend } = useChatWebSocket(user?.id ?? null, handleWsMessage);

  const sendMessage = (text: string, loc?: { lat: number; lng: number }) => {
    if (!text.trim() && !loc) return;
    if (activeId === null) return;

    const now = new Date();
    const time = formatTime(now.toISOString());

    const newMsg: Message = {
      id: Date.now(),
      from: "me",
      text: loc ? "📍 Ma position actuelle" : text,
      time,
      location: loc,
      message_type: loc ? "location" : "text",
    };

    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeId
          ? { ...c, lastMessage: newMsg.text, time, messages: [...c.messages, newMsg] }
          : c
      )
    );
    setInput("");

    // Send via WebSocket (real-time) + persisted via REST
    wsSend({
      receiver_id: activeId,
      content: loc ? `${loc.lat},${loc.lng}` : text,
      message_type: loc ? "location" : "text",
    });
  };

  const sharePosition = () => {
    if (!location) {
      toast({
        title: "Position non disponible",
        description: "Activez d'abord votre position depuis la bannière.",
      });
      return;
    }
    sendMessage("", { lat: location.lat, lng: location.lng });
    toast({ title: "Position partagée ✅" });
  };

  const active = conversations.find((c) => c.id === activeId);
  const filtered = conversations.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="pt-16 flex-1">
        <div className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[calc(100vh-8rem)]">
            {/* Conversations list */}
            <div
              className={`md:col-span-1 bg-card border border-border rounded-2xl overflow-hidden flex flex-col ${
                activeId && "hidden md:flex"
              }`}
            >
              <div className="p-4 border-b border-border">
                <h2 className="font-display font-bold text-foreground text-lg mb-3 flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-accent" />
                  Messages
                </h2>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    id="messages-search"
                    name="search"
                    type="text"
                    autoComplete="off"
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
                        setConversations((prev) =>
                          prev.map((conv) => (conv.id === c.id ? { ...conv, unread: 0 } : conv))
                        );
                      }}
                      className={`w-full flex items-center gap-3 p-3 hover:bg-secondary/50 transition-colors text-left border-b border-border ${
                        activeId === c.id ? "bg-secondary/60" : ""
                      }`}
                    >
                      <div className="relative shrink-0">
                        <div className="w-11 h-11 rounded-full bg-accent/20 text-accent flex items-center justify-center font-bold text-sm">
                          {c.avatar}
                        </div>
                        {c.online && (
                          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-card" />
                        )}
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

            {/* Active conversation */}
            <div
              className={`md:col-span-2 bg-[#efeae2] dark:bg-zinc-900 border border-border rounded-2xl overflow-hidden flex flex-col relative h-full ${
                !activeId ? "hidden md:flex" : ""
              }`}
            >
              {active ? (
                <>
                  {/* WhatsApp style header */}
                  <div className="p-3 bg-[#f0f2f5] dark:bg-zinc-800 border-b border-border flex items-center justify-between gap-3 shrink-0">
                    <div className="flex items-center gap-3">
                      <button onClick={() => setActiveId(null)} className="md:hidden text-foreground hover:bg-secondary/80 p-1.5 rounded-full">
                        ←
                      </button>
                      <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-accent/20 text-accent flex items-center justify-center font-bold text-sm shadow-sm">
                          {active.avatar}
                        </div>
                        {active.online && (
                          <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#25d366] rounded-full border-2 border-[#f0f2f5] dark:border-zinc-800" />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground text-sm leading-tight">{active.name}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {active.online ? (
                            <span className="text-[#25d366] font-medium">en ligne</span>
                          ) : (
                            "hors ligne"
                          )}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Message body with WhatsApp style doodle/background */}
                  <div 
                    className="flex-1 overflow-y-auto p-4 space-y-2 bg-[#efeae2] dark:bg-[#0b141a] relative"
                    style={{
                      backgroundImage: "radial-gradient(#dfdcd6 1px, transparent 0), radial-gradient(#dfdcd6 1px, transparent 0)",
                      backgroundSize: "20px 20px",
                      backgroundPosition: "0 0, 10px 10px",
                    }}
                  >
                    {!active.loaded ? (
                      <div className="flex items-center justify-center h-full">
                        <Loader2 className="w-6 h-6 animate-spin text-accent" />
                      </div>
                    ) : (
                      active.messages.map((m) => {
                        const isMe = m.from === "me";
                        return (
                          <div key={m.id} className={`flex w-full mb-1 ${isMe ? "justify-end" : "justify-start"}`}>
                            <div
                              className={`max-w-[70%] rounded-lg px-3 py-1.5 text-sm shadow-sm relative leading-relaxed ${
                                isMe
                                  ? "bg-[#d9fdd3] dark:bg-[#005c4b] text-[#111b21] dark:text-[#e9edef] rounded-tr-none"
                                  : "bg-white dark:bg-[#202c33] text-[#111b21] dark:text-[#e9edef] rounded-tl-none"
                              }`}
                            >
                              {m.location ? (
                                <div className="pr-10">
                                  <div className="flex items-center gap-1 font-semibold mb-1 text-accent dark:text-emerald-400">
                                    <MapPin className="w-3.5 h-3.5" /> Position partagée
                                  </div>
                                  <a
                                    href={`https://www.openstreetmap.org/?mlat=${m.location.lat}&mlon=${m.location.lng}#map=15/${m.location.lat}/${m.location.lng}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="underline text-xs opacity-90 block hover:text-accent"
                                  >
                                    {m.location.lat.toFixed(5)}, {m.location.lng.toFixed(5)}
                                  </a>
                                </div>
                              ) : (
                                <p className="whitespace-pre-wrap pr-12">{m.text}</p>
                              )}
                              
                              {/* WhatsApp style time + status ticks bottom right of bubble */}
                              <div className="absolute bottom-1 right-2 flex items-center gap-1 select-none text-[9px] text-[#667781] dark:text-[#aebac1]">
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

                  {/* WhatsApp style input footer */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      sendMessage(input);
                    }}
                    className="p-2.5 bg-[#f0f2f5] dark:bg-zinc-800 flex items-center gap-2 shrink-0 border-t border-border"
                  >
                    <button
                      type="button"
                      onClick={sharePosition}
                      title="Partager ma position"
                      className="w-9 h-9 rounded-full hover:bg-secondary/80 text-muted-foreground flex items-center justify-center transition-colors shrink-0"
                    >
                      <MapPin className="w-5 h-5 text-[#54656f] dark:text-[#aebac1]" />
                    </button>
                    <button
                      type="button"
                      title="Bientôt disponible"
                      className="w-9 h-9 rounded-full hover:bg-secondary/80 text-muted-foreground flex items-center justify-center transition-colors shrink-0"
                    >
                      <Paperclip className="w-5 h-5 text-[#54656f] dark:text-[#aebac1]" />
                    </button>
                    <input
                      id="message-input"
                      name="message"
                      autoComplete="off"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Écrire un message..."
                      className="flex-1 h-9 px-4 rounded-lg border-0 bg-white dark:bg-zinc-700 text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                    <Button
                      type="submit"
                      size="icon"
                      className="w-9 h-9 rounded-full bg-[#00a884] hover:bg-[#008f72] text-white shrink-0 flex items-center justify-center shadow-sm"
                    >
                      <Send className="w-4 h-4 ml-0.5" />
                    </Button>
                  </form>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-muted-foreground bg-[#efeae2] dark:bg-[#0b141a]">
                  <div className="text-center bg-white/80 dark:bg-zinc-800/80 p-6 rounded-2xl shadow-sm border border-border/40 backdrop-blur-sm max-w-sm mx-4">
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
      </main>
      <Footer />
    </div>
  );
};

export default Messages;
