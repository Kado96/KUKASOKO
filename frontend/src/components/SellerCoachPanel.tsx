/**
 * SellerCoachPanel.tsx
 * Panneau de coaching IA affiché dans Ma Boutique.
 * Analyse les stats du vendeur et donne des conseils personnalisés.
 */

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  Brain, TrendingUp, X, ChevronRight, Loader2,
  Zap, Star, Crown, Package, MessageCircle, Eye, Award
} from "lucide-react";
import { SellerCoachService, SellerStats, CoachMessage } from "@/services/SellerCoachService";

interface Props {
  token: string;
  userName: string;
}

const PLAN_COLORS: Record<string, string> = {
  FREE: "bg-gray-500",
  PRO: "bg-purple-600",
  BUSINESS: "bg-amber-500",
};

const PLAN_ICONS: Record<string, React.ReactNode> = {
  FREE: <Zap className="w-3.5 h-3.5" />,
  PRO: <Star className="w-3.5 h-3.5" />,
  BUSINESS: <Crown className="w-3.5 h-3.5" />,
};

const MSG_TYPE_COLORS: Record<string, string> = {
  upgrade: "border-l-purple-500 bg-purple-50 dark:bg-purple-900/20",
  tip: "border-l-amber-500 bg-amber-50 dark:bg-amber-900/20",
  stats: "border-l-blue-500 bg-blue-50 dark:bg-blue-900/20",
  encourage: "border-l-green-500 bg-green-50 dark:bg-green-900/20",
  warning: "border-l-red-500 bg-red-50 dark:bg-red-900/20",
};

function parseMarkdown(text: string): React.ReactNode {
  // Convert **bold** to <strong>
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

export default function SellerCoachPanel({ token, userName }: Props) {
  const [stats, setStats] = useState<SellerStats | null>(null);
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const s = await SellerCoachService.fetchStats(token);
        setStats(s);
        setMessages(SellerCoachService.generateMessages(s));
      } catch (e) {
        console.warn("Coach IA: impossible de charger les stats.", e);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [token]);

  const visibleMessages = messages.filter((_, i) => !dismissed.has(i));

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-2xl p-6 flex items-center gap-3 shadow-sm">
        <Loader2 className="w-5 h-5 animate-spin text-accent" />
        <span className="text-sm text-muted-foreground">Votre coach IA analyse votre boutique…</span>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
      {/* Header du coach */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between px-5 py-4 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground hover:opacity-95 transition-opacity"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-accent text-accent-foreground flex items-center justify-center">
            <Brain className="w-5 h-5" />
          </div>
          <div className="text-left">
            <p className="font-bold text-sm">Assistant IA Kukasoko</p>
            <p className="text-xs opacity-75">{SellerCoachService.getGreeting(userName)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {stats && (
            <span className={`text-xs font-bold px-2 py-1 rounded-full ${PLAN_COLORS[stats.plan]} text-white flex items-center gap-1`}>
              {PLAN_ICONS[stats.plan]} {stats.plan}
            </span>
          )}
          <ChevronRight className={`w-4 h-4 transition-transform ${collapsed ? "" : "rotate-90"}`} />
        </div>
      </button>

      {!collapsed && (
        <div className="p-5 space-y-4">
          {/* Stats rapides */}
          {stats && (
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-secondary/50 rounded-xl p-3 text-center">
                <div className="flex justify-center mb-1 text-accent">
                  <Package className="w-4 h-4" />
                </div>
                <p className="text-lg font-bold text-foreground">{stats.totalListings}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Annonces</p>
              </div>
              <div className="bg-secondary/50 rounded-xl p-3 text-center">
                <div className="flex justify-center mb-1 text-blue-500">
                  <Eye className="w-4 h-4" />
                </div>
                <p className="text-lg font-bold text-foreground">{stats.totalViews}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Vues</p>
              </div>
              <div className="bg-secondary/50 rounded-xl p-3 text-center">
                <div className="flex justify-center mb-1 text-green-500">
                  <MessageCircle className="w-4 h-4" />
                </div>
                <p className="text-lg font-bold text-foreground">{stats.totalMessages}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Messages</p>
              </div>
            </div>
          )}

          {/* Messages de coaching */}
          <div className="space-y-3">
            {visibleMessages.length === 0 && (
              <div className="text-center py-6 text-muted-foreground">
                <Award className="w-8 h-8 mx-auto mb-2 text-accent" />
                <p className="text-sm font-medium">Tous vos conseils ont été lus !</p>
                <p className="text-xs mt-1">Revenez demain pour de nouveaux conseils personnalisés.</p>
              </div>
            )}
            {messages.map((msg, i) => {
              if (dismissed.has(i)) return null;
              return (
                <div
                  key={i}
                  className={`relative border-l-4 rounded-r-xl p-4 ${MSG_TYPE_COLORS[msg.type]}`}
                >
                  <button
                    onClick={() => setDismissed(prev => new Set([...prev, i]))}
                    className="absolute top-2 right-2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Fermer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                  <div className="flex items-start gap-2 pr-5">
                    <span className="text-lg shrink-0">{msg.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground mb-1">{msg.title}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {parseMarkdown(msg.body)}
                      </p>
                      {msg.cta && (
                        <Link to={msg.cta.link}>
                          <Button
                            size="sm"
                            className="mt-3 h-8 text-xs bg-accent text-accent-foreground hover:bg-accent/90 font-semibold"
                          >
                            {msg.cta.label} <ChevronRight className="w-3 h-3 ml-1" />
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Lien vers les statistiques avancées */}
          {stats && stats.plan !== "FREE" && (
            <div className="pt-2 border-t border-border flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Statistiques avancées disponibles</span>
              <Link to="/ma-boutique">
                <Button variant="ghost" size="sm" className="h-8 text-xs text-accent">
                  Voir tout <TrendingUp className="w-3.5 h-3.5 ml-1" />
                </Button>
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
