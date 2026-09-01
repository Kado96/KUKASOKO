import { useState, useRef, useEffect } from "react";
import { Plus, Menu, X, User, Store, LogOut, ChevronDown, Map, MessageCircle, Home, Tag, Info, DollarSign, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSite } from "@/contexts/SiteContext";
import NotificationBell from "./NotificationBell";

const navLinks = [
  { to: "/", label: "Accueil", icon: Home },
  { to: "/annonces", label: "Annonces", icon: Tag },
  { to: "/carte", label: "Carte", icon: Map },
  { to: "/messages", label: "Messages", icon: MessageCircle },
  { to: "/boutique", label: "Boutique", icon: Store },
  { to: "/blog", label: "Blog", icon: FileText },
  { to: "/pricing", label: "Tarifs", icon: DollarSign },
  { to: "/a-propos", label: "À Propos", icon: Info },
];

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const { user, isAuthenticated, logout, unreadCount } = useAuth();
  const { settings } = useSite();

  const isActive = (path: string) => location.pathname === path;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const initials = user
    ? (user.full_name || user.username || "U")
        .split(" ")
        .map((w: string) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "U";

  return (
    <nav className="fixed top-0 left-0 right-0 z-[1100] bg-[#1a2236] border-b border-white/10 shadow-lg">
      <div className="max-w-[1400px] mx-auto flex items-center h-16 px-6 gap-6">

        {/* ── Logo ── */}
        <Link to="/" className="flex items-center gap-2.5 shrink-0">
          <img src={settings.siteLogo || "/logo.jpg"} alt="Kukasoko Online" className="w-10 h-10 rounded-xl object-cover ring-2 ring-yellow-400/40 shadow-sm" />
          <div className="flex flex-col leading-none">
            <span className="font-bold text-white text-base tracking-wider uppercase font-display">
              {settings.siteName || "KUKASOKO"}
            </span>
            <span className="text-[10px] text-white/50 tracking-[0.25em] uppercase font-semibold mt-0.5">
              ONLINE
            </span>
          </div>
        </Link>

        {/* ── Desktop Nav Links ── */}
        <div className="hidden xl:flex items-center gap-1 flex-1">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`
                relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150
                ${isActive(link.to)
                  ? "text-white bg-white/10"
                  : "text-white/60 hover:text-white hover:bg-white/8"}
              `}
            >
              <span>{link.label}</span>
              {link.to === "/messages" && unreadCount > 0 && (
                <span className="bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-1">
                  {unreadCount}
                </span>
              )}
              {isActive(link.to) && (
                <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-yellow-400 rounded-full" />
              )}
            </Link>
          ))}
        </div>

        {/* ── Right Section ── */}
        <div className="hidden md:flex items-center gap-2 ml-auto shrink-0">

          {/* Notification Bell */}
          {isAuthenticated && (
            <div className="text-white/70 hover:text-white transition-colors">
              <NotificationBell />
            </div>
          )}

          {/* CTA Button */}
          <Link to="/ajouter-annonce">
            <Button size="sm" className="h-9 bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-bold text-sm shadow-sm px-4 border-0">
              <Plus className="w-4 h-4 mr-1.5" />
              Ajouter
            </Button>
          </Link>

          {/* User Auth */}
          {isAuthenticated && user ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl hover:bg-white/10 transition-colors text-white group"
              >
                {/* Avatar */}
                <div className="w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center text-gray-900 font-bold text-xs shrink-0">
                  {initials}
                </div>
                <div className="flex flex-col items-start leading-none">
                  <span className="text-[11px] text-white/50 font-medium">Bonjour,</span>
                  <span className="text-sm font-semibold text-white max-w-[100px] truncate">
                    {user.full_name?.split(" ")[0] || user.username}
                  </span>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-white/50 transition-transform ${userDropdownOpen ? "rotate-180" : ""}`} />
              </button>

              {/* Dropdown */}
              {userDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-52 bg-[#1e2d47] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
                  <div className="px-4 py-3 border-b border-white/10">
                    <p className="text-xs text-white/50">Connecté en tant que</p>
                    <p className="text-sm font-semibold text-white truncate">{user.full_name || user.username}</p>
                    <p className="text-xs text-white/40 truncate">{user.email}</p>
                  </div>
                  <div className="py-1">
                    <Link
                      to="/ma-boutique"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-white/80 hover:text-white hover:bg-white/8 transition-colors"
                    >
                      <Store className="w-4 h-4 text-yellow-400" />
                      Ma Boutique
                    </Link>
                    <Link
                      to="/profile"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-white/80 hover:text-white hover:bg-white/8 transition-colors"
                    >
                      <User className="w-4 h-4 text-blue-400" />
                      Mon Profil
                    </Link>
                  </div>
                  <div className="py-1 border-t border-white/10">
                    <button
                      onClick={() => { setUserDropdownOpen(false); logout(); }}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors w-full text-left"
                    >
                      <LogOut className="w-4 h-4" />
                      Déconnexion
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login">
              <Button variant="ghost" size="sm" className="h-9 text-sm text-white/70 hover:text-white hover:bg-white/10 px-3 border border-white/10">
                <User className="w-4 h-4 mr-1.5" />
                Se connecter
              </Button>
            </Link>
          )}
        </div>

        {/* ── Mobile Toggle ── */}
        <button
          className="xl:hidden text-white/80 hover:text-white ml-auto"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* ── Mobile Menu ── */}
      {mobileOpen && (
        <div className="xl:hidden bg-[#1e2d47] border-t border-white/10 px-4 py-4 space-y-1">
          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive(link.to)
                    ? "bg-white/10 text-white"
                    : "text-white/70 hover:text-white hover:bg-white/8"
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4" />
                  {link.label}
                </span>
                {link.to === "/messages" && unreadCount > 0 && (
                  <span className="bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-1">
                    {unreadCount}
                  </span>
                )}
              </Link>
            );
          })}
          <div className="pt-3 space-y-2 border-t border-white/10">
            {isAuthenticated && user ? (
              <>
                <div className="flex items-center gap-3 px-3 py-2">
                  <div className="w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center text-gray-900 font-bold text-xs shrink-0">
                    {initials}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{user.full_name || user.username}</p>
                    <p className="text-xs text-white/40">{user.email}</p>
                  </div>
                </div>
                <Link to="/ma-boutique" onClick={() => setMobileOpen(false)}>
                  <Button size="sm" className="w-full bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-bold border-0">
                    <Store className="w-4 h-4 mr-2" /> Ma Boutique
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setMobileOpen(false); logout(); }}
                  className="w-full border-red-500/30 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                >
                  <LogOut className="w-4 h-4 mr-2" /> Déconnexion
                </Button>
              </>
            ) : (
              <Link to="/login" onClick={() => setMobileOpen(false)}>
                <Button variant="outline" size="sm" className="w-full border-white/20 text-white hover:bg-white/10">
                  <User className="w-4 h-4 mr-2" /> Se connecter
                </Button>
              </Link>
            )}
            <Link to="/ajouter-annonce" onClick={() => setMobileOpen(false)}>
              <Button size="sm" className="w-full bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-bold border-0">
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
