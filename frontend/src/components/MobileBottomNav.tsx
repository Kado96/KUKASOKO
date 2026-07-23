import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, Search, Map, MessageSquare, PlusCircle, Store } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export const MobileBottomNav = () => {
  const location = useLocation();
  const { unreadCount } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-[110] bg-card/95 backdrop-blur-lg border-t border-border shadow-2xl px-2 py-1 flex items-center justify-around">
      <Link
        to="/"
        className={`flex flex-col items-center gap-1 p-1.5 min-w-[56px] rounded-xl transition-all ${
          isActive("/") ? "text-accent font-bold scale-105" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <Home className="w-5 h-5" />
        <span className="text-[10px]">Accueil</span>
      </Link>

      <Link
        to="/annonces"
        className={`flex flex-col items-center gap-1 p-1.5 min-w-[56px] rounded-xl transition-all ${
          isActive("/annonces") ? "text-accent font-bold scale-105" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <Search className="w-5 h-5" />
        <span className="text-[10px]">Annonces</span>
      </Link>

      {/* Main Action Call to Action button */}
      <Link
        to="/ajouter-annonce"
        className="flex flex-col items-center justify-center text-accent-foreground -mt-5"
      >
        <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-500 to-amber-400 flex items-center justify-center shadow-lg shadow-amber-500/30 ring-4 ring-background transform hover:scale-110 active:scale-95 transition-all">
          <PlusCircle className="w-7 h-7 text-primary-foreground fill-primary-foreground/20" />
        </div>
        <span className="text-[10px] font-bold text-amber-500 mt-1">Publier</span>
      </Link>

      <Link
        to="/carte"
        className={`flex flex-col items-center gap-1 p-1.5 min-w-[56px] rounded-xl transition-all ${
          isActive("/carte") ? "text-accent font-bold scale-105" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <Map className="w-5 h-5" />
        <span className="text-[10px]">Carte</span>
      </Link>

      <Link
        to="/messages"
        className={`flex flex-col items-center gap-1 p-1.5 min-w-[56px] rounded-xl transition-all relative ${
          isActive("/messages") ? "text-accent font-bold scale-105" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <div className="relative">
          <MessageSquare className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center animate-pulse">
              {unreadCount}
            </span>
          )}
        </div>
        <span className="text-[10px]">Messages</span>
      </Link>
    </div>
  );
};
