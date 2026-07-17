import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { ShoppingBag, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import categoryAvendre from "@/assets/category-avendre.jpg";
import categoryImmobilier from "@/assets/category-immobilier.jpg";
import categoryServices from "@/assets/category-services.jpg";

const products = [
  { id: 1, name: "Pack Premium - 30 jours", description: "Publiez jusqu'à 20 annonces avec mise en avant", price: "0 FBU", image: categoryAvendre, badge: "Populaire" },
  { id: 2, name: "Pack Standard - 15 jours", description: "Publiez jusqu'à 10 annonces", price: "0 FBU", image: categoryImmobilier, badge: null },
  { id: 3, name: "Pack Pro - 60 jours", description: "Annonces illimitées + publication réseaux sociaux", price: "0 FBU", image: categoryServices, badge: "Meilleure offre" },
];

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { merchantsAPI } from "@/services/api";
import { toast } from "@/hooks/use-toast";
import { Check, X, CreditCard } from "lucide-react";

interface Product {
  id: number;
  name: string;
  description: string;
  price: string;
  image: string;
  badge: string | null;
}

const Boutique = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, playNotificationSound } = useAuth();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);

  const handleBuyClick = (product: Product) => {
    if (!isAuthenticated) {
      toast({
        title: "Connexion requise",
        description: "Veuillez vous connecter pour acheter un pack d'abonnement.",
        variant: "destructive",
      });
      navigate("/login");
      return;
    }
    setSelectedProduct(product);
  };

  const handleConfirmPayment = async () => {
    if (!selectedProduct) return;
    setLoading(true);
    try {
      await merchantsAPI.updateSubscription(selectedProduct.name);
      
      playNotificationSound();
      toast({
        title: "Abonnement activé !",
        description: `Votre boutique est désormais sous le pack : ${selectedProduct.name}.`,
      });

      setSelectedProduct(null);
      navigate("/ma-boutique");
    } catch (err: any) {
      if (err.response?.status === 404) {
        toast({
          title: "Boutique requise",
          description: "Veuillez d'abord créer votre boutique dans l'onglet 'Ma Boutique' avant d'acheter un pack.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erreur",
          description: "Une erreur est survenue lors de l'activation de votre pack.",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col relative">
      <Navbar />
      <main className="pt-16 flex-1">
        <div className="bg-primary py-12">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-3xl font-display font-bold text-primary-foreground mb-2">Boutique</h1>
            <p className="text-primary-foreground/70">Choisissez votre abonnement pour publier vos annonces</p>
          </div>
        </div>

        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {products.map((product) => (
              <div key={product.id} className="bg-card rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-shadow duration-300 flex flex-col">
                <div className="relative aspect-[16/10] overflow-hidden">
                  <img src={product.image} alt={product.name} className="w-full h-full object-cover" loading="lazy" />
                  {product.badge && (
                    <span className="absolute top-3 right-3 bg-accent text-accent-foreground text-xs font-bold px-3 py-1 rounded-full">{product.badge}</span>
                  )}
                </div>
                <div className="p-6 flex-1 flex flex-col">
                  <h3 className="font-sans font-semibold text-foreground text-xl mb-2">{product.name}</h3>
                  <p className="text-muted-foreground text-sm mb-4 flex-1">{product.description}</p>
                  <div className="flex items-center justify-between mt-auto">
                    <span className="text-2xl font-bold text-accent">{product.price}</span>
                    <Button 
                      onClick={() => handleBuyClick(product)}
                      className="bg-accent text-accent-foreground hover:bg-accent/90 font-semibold"
                    >
                      <ShoppingBag className="w-4 h-4 mr-2" />
                      Acheter
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Simulated AfriPay Payment Modal */}
        {selectedProduct && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-2xl max-w-md w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              <div className="p-5 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-accent animate-pulse" />
                  <h3 className="font-display font-bold text-foreground text-base">Passerelle AfriPay Burundi</h3>
                </div>
                <button 
                  onClick={() => setSelectedProduct(null)}
                  className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-secondary"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="bg-secondary/40 border border-border p-4 rounded-xl">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Produit sélectionné</p>
                  <p className="text-foreground font-bold text-sm mt-1">{selectedProduct.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">{selectedProduct.description}</p>
                  <div className="flex justify-between items-center border-t border-border mt-3 pt-3">
                    <span className="text-sm font-semibold text-foreground">Montant à régler :</span>
                    <span className="text-lg font-bold text-accent">{selectedProduct.price}</span>
                  </div>
                </div>

                <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl text-emerald-600 dark:text-emerald-400 text-xs space-y-1.5">
                  <p className="font-semibold flex items-center gap-1">
                    <Check className="w-4 h-4" /> Mode simulation AfriPay activé
                  </p>
                  <p className="opacity-90">L'intégration réelle d'AfriPay (EcoCash / Lumicash) sera déployée prochainement sur votre boutique. Pour le moment, l'activation est immédiate et 100% gratuite.</p>
                </div>
              </div>

              <div className="p-4 bg-secondary/20 border-t border-border flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setSelectedProduct(null)}
                  className="flex-1"
                  disabled={loading}
                >
                  Annuler
                </Button>
                <Button 
                  onClick={handleConfirmPayment}
                  className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90"
                  disabled={loading}
                >
                  {loading ? "Activation..." : "Confirmer (Gratuit)"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Boutique;
