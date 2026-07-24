import { useState } from "react";
import { Plus, Menu, X, User, Store, Map, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "react-router-dom";

import { useAuth } from "@/contexts/AuthContext";
import { useSite } from "@/contexts/SiteContext";

const navLinks = [
  { to: "/", label: "Accueil" },
  { to: "/annonces", label: "Annonces" },
  { to: "/carte", label: "🗺️ Carte" },
  { to: "/messages", label: "Messages" },
  { to: "/boutique", label: "Boutique" },
];

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { user, isAuthenticated, logout, unreadCount } = useAuth();
  const { settings } = useSite();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="fixed top-0 left-0 right-0 z-[1050] bg-primary/95 backdrop-blur-md border-b border-primary-foreground/10">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <Link to="/" className="flex items-center gap-2">
          {settings.siteLogo ? (
            <img src={settings.siteLogo} alt="Logo" className="w-9 h-9 rounded-lg object-cover" />
          ) : (
            <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center">
              <span className="font-display font-bold text-accent-foreground text-lg">
                {(settings.siteName || "I").charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div className="flex flex-col leading-tight">
            <span className="font-display font-bold text-primary-foreground text-lg tracking-tight uppercase">
              {settings.siteName}
            </span>
            <span className="text-[10px] text-primary-foreground/60 uppercase tracking-widest">Online</span>
          </div>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`text-sm font-medium transition-colors flex items-center gap-1.5 ${isActive(link.to) ? "text-accent" : "text-primary-foreground/80 hover:text-primary-foreground"}`}
            >
              <span>{link.label}</span>
              {link.to === "/messages" && unreadCount > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-1 animate-pulse">
                  {unreadCount}
                </span>
              )}
            </Link>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <Link to="/ma-boutique">
            <Button variant="ghost" size="sm" className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10">
              <Store className="w-4 h-4 mr-2" />
              Ma Boutique
            </Button>
          </Link>
          {isAuthenticated && user ? (
            <>
              <span className="text-sm font-medium text-primary-foreground/90">
                Bonjour, {user.full_name || user.username}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
              >
                Déconnexion
              </Button>
            </>
          ) : (
            <Link to="/login">
              <Button variant="ghost" size="sm" className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10">
                <User className="w-4 h-4 mr-2" />
                Se connecter
              </Button>
            </Link>
          )}
          <Link to="/ajouter-annonce">
            <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90 font-semibold">
              <Plus className="w-4 h-4 mr-2" />
              Ajouter une annonce
            </Button>
          </Link>
        </div>

        {/* Mobile toggle */}
        <button className="md:hidden text-primary-foreground" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-primary border-t border-primary-foreground/10 px-4 py-4 space-y-1">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center justify-between text-sm font-medium py-2.5 ${isActive(link.to) ? "text-accent" : "text-primary-foreground/80"}`}
            >
              <span>{link.label}</span>
              {link.to === "/messages" && unreadCount > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-1">
                  {unreadCount}
                </span>
              )}
            </Link>
          ))}
          <div className="pt-3 space-y-2 border-t border-primary-foreground/10">
            <Link to="/ma-boutique" onClick={() => setMobileOpen(false)}>
              <Button variant="outline" size="sm" className="w-full border-primary-foreground/20 text-primary-foreground">
                <Store className="w-4 h-4 mr-2" /> Ma Boutique
              </Button>
            </Link>
            {isAuthenticated && user ? (
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium text-primary-foreground/95 px-1 py-1">
                  Bonjour, {user.full_name || user.username}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setMobileOpen(false);
                    logout();
                  }}
                  className="w-full border-red-500/30 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                >
                  Déconnexion
                </Button>
              </div>
            ) : (
              <Link to="/login" onClick={() => setMobileOpen(false)}>
                <Button variant="outline" size="sm" className="w-full border-primary-foreground/20 text-primary-foreground">
                  <User className="w-4 h-4 mr-2" /> Se connecter
                </Button>
              </Link>
            )}
            <Link to="/ajouter-annonce" onClick={() => setMobileOpen(false)}>
              <Button size="sm" className="w-full bg-accent text-accent-foreground">
                <Plus className="w-4 h-4 mr-2" /> Ajouter une annonce
              </Button>
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
