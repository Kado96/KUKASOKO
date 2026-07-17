import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Mail, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "@/hooks/use-toast";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({ title: "Erreur", description: "Veuillez entrer votre adresse e-mail." });
      return;
    }
    setSent(true);
    toast({ title: "E-mail envoyé", description: "Vérifiez votre boîte de réception pour réinitialiser votre mot de passe." });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-16">
        <div className="bg-primary py-12">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-3xl font-display font-bold text-primary-foreground mb-2">Mot de passe oublié</h1>
            <p className="text-primary-foreground/70">Réinitialisez votre mot de passe</p>
          </div>
        </div>

        <div className="container mx-auto px-4 py-12 max-w-md">
          <div className="bg-card rounded-xl border border-border p-8 shadow-md">
            {sent ? (
              <div className="text-center py-6">
                <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-8 h-8 text-accent" />
                </div>
                <h2 className="text-lg font-semibold text-foreground mb-2">Vérifiez votre e-mail</h2>
                <p className="text-sm text-muted-foreground mb-6">
                  Nous avons envoyé un lien de réinitialisation à <strong>{email}</strong>
                </p>
                <Link to="/login">
                  <Button className="bg-accent text-accent-foreground hover:bg-accent/90 font-semibold">
                    Retour à la connexion
                  </Button>
                </Link>
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mb-6">
                  Entrez votre adresse e-mail et nous vous enverrons un lien pour réinitialiser votre mot de passe.
                </p>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="email" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">E-mail *</label>
                    <div className="relative mt-1">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="votre@email.com"
                        className="w-full h-11 pl-10 pr-4 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90 font-semibold h-11">
                    Envoyer le lien
                  </Button>
                </form>
                <p className="text-center text-sm text-muted-foreground mt-6">
                  <Link to="/login" className="text-accent hover:underline font-medium">← Retour à la connexion</Link>
                </p>
              </>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ForgotPassword;
