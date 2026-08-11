import { useState, useRef, useEffect, useCallback } from "react";
import { MessageCircle, X, Send, Bot, User, Loader2, ExternalLink, Search, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { KukasokoBrain, KnowledgeItem } from "@/services/KukasokoBrainService";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  id: number;
  role: "bot" | "user";
  text: string;
  items?: KnowledgeItem[];
  suggestions?: string[];
  isLoading?: boolean;
}

// ─── Sous-composant : Carte de résultat ──────────────────────────────────────

const ResultCard = ({ item }: { item: KnowledgeItem }) => {
  const isMap = item.meta?.isMapLink;
  const icon =
    item.type === "listing" ? "🛒"
    : item.type === "shop" ? "🏪"
    : item.type === "blog" ? "📰"
    : item.type === "category" ? "📂"
    : "🗺️";

  return (
    <Link
      to={item.url}
      className="flex gap-2.5 p-2.5 rounded-xl bg-background border border-border hover:border-accent hover:shadow-sm transition-all group"
    >
      {item.image && !isMap ? (
        <img
          src={item.image}
          alt={item.title}
          className="w-14 h-14 rounded-lg object-cover shrink-0 bg-muted"
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
      ) : (
        <div className="w-14 h-14 rounded-lg bg-accent/10 flex items-center justify-center shrink-0 text-2xl">
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-foreground leading-tight truncate group-hover:text-accent transition-colors">
          {item.title}
        </p>
        {item.price && item.type === "listing" && (
          <p className="text-xs font-bold text-accent mt-0.5">{item.price}</p>
        )}
        {item.city && (
          <p className="text-[10px] text-muted-foreground mt-0.5 truncate">📍 {item.city}</p>
        )}
        {item.type === "blog" && item.meta?.excerpt && (
          <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">
            {String(item.meta.excerpt)}
          </p>
        )}
        {item.category && item.type !== "listing" && (
          <p className="text-[10px] text-muted-foreground mt-0.5">{item.category}</p>
        )}
      </div>
      <ExternalLink className="w-3.5 h-3.5 text-muted-foreground group-hover:text-accent shrink-0 mt-1 transition-colors" />
    </Link>
  );
};

// ─── Sous-composant : Bulle de message ───────────────────────────────────────

const formatText = (text: string) => {
  // Transforme **bold** en <strong> et les retours à la ligne en <br>
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
};

const MessageBubble = ({
  msg,
  onSuggestionClick,
}: {
  msg: Message;
  onSuggestionClick: (s: string) => void;
}) => {
  if (msg.role === "user") {
    return (
      <div className="flex gap-2 justify-end">
        <div className="max-w-[82%] rounded-2xl rounded-br-sm px-3 py-2 text-sm bg-accent text-accent-foreground">
          {msg.text}
        </div>
        <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0 mt-1">
          <User className="w-4 h-4 text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2 justify-start">
      <div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center shrink-0 mt-1">
        {msg.isLoading ? (
          <Loader2 className="w-4 h-4 text-accent animate-spin" />
        ) : (
          <Bot className="w-4 h-4 text-accent" />
        )}
      </div>
      <div className="flex-1 min-w-0 space-y-2">
        {/* Texte principal */}
        <div className="max-w-[92%] rounded-2xl rounded-bl-sm px-3 py-2 text-sm bg-secondary text-foreground whitespace-pre-line leading-relaxed">
          {msg.isLoading ? (
            <span className="flex items-center gap-2 text-muted-foreground">
              <Search className="w-3.5 h-3.5 animate-pulse" />
              Je recherche dans la base Kukasoko…
            </span>
          ) : (
            formatText(msg.text)
          )}
        </div>

        {/* Cartes de résultats */}
        {!msg.isLoading && msg.items && msg.items.length > 0 && (
          <div className="space-y-1.5 pr-2">
            {msg.items.map((item) => (
              <ResultCard key={`${item.type}-${item.id}`} item={item} />
            ))}
          </div>
        )}

        {/* Suggestions cliquables */}
        {!msg.isLoading && msg.suggestions && msg.suggestions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {msg.suggestions.map((s) => (
              <button
                key={s}
                onClick={() => onSuggestionClick(s)}
                className="text-[11px] px-2.5 py-1 rounded-full border border-accent/40 text-accent hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Composant principal ──────────────────────────────────────────────────────

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      role: "bot",
      text: "Bonjour ! 👋 Je suis l'assistant intelligent de **Kukasoko**.\n\nJe connais toutes les annonces, boutiques et articles du site en temps réel. Posez-moi n'importe quelle question !",
      suggestions: [
        "Chercher un appartement",
        "Trouver une boutique",
        "Lire le blog",
        "Comment publier ?",
      ],
    },
  ]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [brainReady, setBrainReady] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Pré-charger la base dès l'ouverture
  useEffect(() => {
    if (isOpen && !brainReady) {
      KukasokoBrain.load().then(() => setBrainReady(true));
    }
  }, [isOpen, brainReady]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = useCallback(
    async (text?: string) => {
      const query = (text ?? input).trim();
      if (!query || isThinking) return;

      setInput("");
      setIsThinking(true);

      // Message utilisateur
      const userMsg: Message = { id: Date.now(), role: "user", text: query };
      // Placeholder "en cours"
      const loadingId = Date.now() + 1;
      const loadingMsg: Message = {
        id: loadingId,
        role: "bot",
        text: "",
        isLoading: true,
      };
      setMessages((prev) => [...prev, userMsg, loadingMsg]);

      try {
        const result = await KukasokoBrain.answer(query);
        const botMsg: Message = {
          id: loadingId,
          role: "bot",
          text: result.answer,
          items: result.items,
          suggestions: result.suggestions,
        };
        setMessages((prev) =>
          prev.map((m) => (m.id === loadingId ? botMsg : m))
        );
      } catch {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === loadingId
              ? {
                  ...m,
                  isLoading: false,
                  text: "😕 Une erreur s'est produite. Réessayez dans un instant.",
                }
              : m
          )
        );
      } finally {
        setIsThinking(false);
      }
    },
    [input, isThinking]
  );

  const handleRefresh = async () => {
    await KukasokoBrain.forceRefresh();
    const stats = KukasokoBrain.getStats();
    const refreshMsg: Message = {
      id: Date.now(),
      role: "bot",
      text: `✅ Base mise à jour !\n\n📊 **${stats.listings}** annonces · **${stats.shops}** boutiques · **${stats.blogs}** articles · **${stats.categories}** catégories`,
    };
    setMessages((prev) => [...prev, refreshMsg]);
  };

  return (
    <>
      {/* Bouton flottant */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-[9999] w-14 h-14 rounded-full bg-accent text-accent-foreground shadow-xl hover:bg-accent/90 hover:scale-110 transition-all flex items-center justify-center"
          aria-label="Ouvrir l'assistant Kukasoko"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      )}

      {/* Fenêtre du chat */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-[9999] w-[380px] max-w-[calc(100vw-1.5rem)] h-[580px] max-h-[calc(100vh-5rem)] bg-card rounded-2xl shadow-2xl border border-border flex flex-col overflow-hidden">

          {/* Header */}
          <div className="bg-gradient-to-r from-amber-500 to-emerald-600 text-white px-4 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-sm leading-tight">Assistant Kukasoko</p>
                <p className="text-[11px] opacity-85 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-300 inline-block animate-pulse" />
                  {brainReady ? "Base connectée · IA active" : "Chargement de la base…"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleRefresh}
                className="hover:bg-white/20 rounded-full p-1.5 transition-colors"
                title="Actualiser la base"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="hover:bg-white/20 rounded-full p-1.5 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Zone des messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                msg={msg}
                onSuggestionClick={(s) => handleSend(s)}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Zone de saisie */}
          <div className="border-t border-border p-3 shrink-0 bg-background/60 backdrop-blur">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex gap-2"
            >
              <input
                id="chatbot-input"
                name="chatbot-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Posez votre question…"
                disabled={isThinking}
                className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"
                maxLength={300}
              />
              <Button
                type="submit"
                size="icon"
                disabled={isThinking || !input.trim()}
                className="bg-accent hover:bg-accent/90 text-accent-foreground shrink-0 rounded-xl"
              >
                {isThinking ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </form>
            <p className="text-[10px] text-muted-foreground text-center mt-1.5">
              IA alimentée par les données réelles de Kukasoko
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default Chatbot;
