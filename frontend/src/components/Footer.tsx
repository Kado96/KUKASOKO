import { Link } from "react-router-dom";
import { useSite } from "@/contexts/SiteContext";

const Footer = () => {
  const { settings } = useSite();

  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="container mx-auto px-4 pt-8 pb-16"> {/* pb-16 gives space for the 44px ticker */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <img src={settings.siteLogo || "/logo.jpg"} alt="Kukasoko Online" className="w-9 h-9 rounded-xl object-cover ring-2 ring-yellow-400/40" />
              <div className="flex flex-col leading-none">
                <span className="font-display font-bold text-lg uppercase tracking-wider text-primary-foreground">KUKASOKO</span>
                <span className="text-[10px] text-accent tracking-[0.2em] font-bold uppercase mt-0.5">ONLINE</span>
              </div>
            </div>
            <p className="text-primary-foreground/60 text-sm leading-relaxed">
              La plateforme d'annonces en ligne pour trouver tout ce dont vous avez besoin.
            </p>
          </div>

          <div>
            <h4 className="font-sans font-semibold text-sm mb-4 uppercase tracking-wider text-primary-foreground/80">Navigation</h4>
            <ul className="space-y-2 text-sm text-primary-foreground/60">
              <li><Link to="/" className="hover:text-accent transition-colors">Accueil</Link></li>
              <li><Link to="/annonces" className="hover:text-accent transition-colors">Annonces</Link></li>
              <li><Link to="/boutique" className="hover:text-accent transition-colors">Boutique</Link></li>
              <li><Link to="/blog" className="hover:text-accent transition-colors">Blog</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-sans font-semibold text-sm mb-4 uppercase tracking-wider text-primary-foreground/80">Catégories</h4>
            <ul className="space-y-2 text-sm text-primary-foreground/60">
              <li><a href="#" className="hover:text-accent transition-colors">Immobilier</a></li>
              <li><a href="#" className="hover:text-accent transition-colors">Services</a></li>
              <li><a href="#" className="hover:text-accent transition-colors">À vendre</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-sans font-semibold text-sm mb-4 uppercase tracking-wider text-primary-foreground/80">Contact</h4>
            <ul className="space-y-2 text-sm text-primary-foreground/60">
              <li>{settings.footerEmail}</li>
              <li>{settings.footerPhone}</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-primary-foreground/10 mt-8 pt-4 text-center text-xs text-primary-foreground/40">
          © {new Date().getFullYear()} {settings.siteName} Online. Tous droits réservés.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
