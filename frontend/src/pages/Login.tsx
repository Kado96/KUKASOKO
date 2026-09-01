import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PageHero from "@/components/PageHero";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Mail, Lock, User, Eye, EyeOff, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

const Login = () => {
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      toast({ title: "Erreur", description: "Veuillez remplir tous les champs obligatoires.", variant: "destructive" });
      return;
    }
    if (!isLogin && form.password !== form.confirmPassword) {
      toast({ title: "Erreur", description: "Les mots de passe ne correspondent pas.", variant: "destructive" });
      return;
    }
    if (!isLogin && !form.username) {
      toast({ title: "Erreur", description: "Le nom d'utilisateur est obligatoire.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        await login(form.email, form.password);
        toast({ title: "Connexion réussie ✅", description: "Bienvenue sur Kukasoko !" });
        navigate("/");
      } else {
        await register({
          email: form.email,
          username: form.username,
          password: form.password,
          full_name: form.name || undefined,
        });
        toast({ title: "Inscription réussie ✅", description: "Votre compte a été créé. Vous êtes maintenant connecté." });
        navigate("/");
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        "Une erreur est survenue. Vérifiez vos identifiants.";
      toast({ title: "Erreur", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-grow pt-16">
        <PageHero
          title={isLogin ? "Connexion à votre compte" : "Créer un compte Kukasoko"}
          subtitle={isLogin ? "Accédez à votre espace vendeur, gérez vos annonces et interagissez avec les acheteurs." : "Rejoignez la plus grande communauté d'acheteurs et vendeurs géolocalisés au Burundi."}
          showSearch={false}
          compact={true}
        />

        <div className="container mx-auto px-4 py-12 max-w-md">
          <div className="bg-card rounded-xl border border-border p-8 shadow-md">
            {/* Toggle */}
            <div className="flex rounded-lg bg-secondary p-1 mb-8">
              <button
                onClick={() => setIsLogin(true)}
                className={`flex-1 py-2.5 rounded-md text-sm font-medium transition-all ${isLogin ? "bg-accent text-accent-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                Connexion
              </button>
              <button
                onClick={() => setIsLogin(false)}
                className={`flex-1 py-2.5 rounded-md text-sm font-medium transition-all ${!isLogin ? "bg-accent text-accent-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                Inscription
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <>
                  <div>
                    <label htmlFor="fullname" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Nom complet
                    </label>
                    <div className="relative mt-1">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        id="fullname"
                        name="fullname"
                        type="text"
                        autoComplete="name"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder="Votre nom complet"
                        className="w-full h-11 pl-10 pr-4 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="username" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Nom d'utilisateur *
                    </label>
                    <div className="relative mt-1">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        id="username"
                        name="username"
                        type="text"
                        autoComplete="username"
                        value={form.username}
                        onChange={(e) => setForm({ ...form, username: e.target.value })}
                        placeholder="nom_utilisateur"
                        className="w-full h-11 pl-10 pr-4 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label htmlFor="email" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {isLogin ? "Nom d'utilisateur *" : "E-mail *"}
                </label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground flex items-center justify-center">
                    {isLogin ? <User className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
                  </span>
                  <input
                    id="email"
                    name="email"
                    type={isLogin ? "text" : "email"}
                    autoComplete={isLogin ? "username" : "email"}
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder={isLogin ? "Votre nom d'utilisateur" : "votre@email.com"}
                    className="w-full h-11 pl-10 pr-4 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Mot de passe *
                </label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete={isLogin ? "current-password" : "new-password"}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full h-11 pl-10 pr-10 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {!isLogin && (
                <div>
                  <label htmlFor="confirmPassword" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Confirmer le mot de passe *
                  </label>
                  <div className="relative mt-1">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      value={form.confirmPassword}
                      onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                      placeholder="••••••••"
                      className="w-full h-11 pl-10 pr-4 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                  </div>
                </div>
              )}

              {isLogin && (
                <div className="flex items-center justify-between">
                  <label htmlFor="rememberMe" className="flex items-center gap-2 text-sm text-muted-foreground">
                    <input id="rememberMe" name="rememberMe" type="checkbox" className="rounded border-border" />
                    Se souvenir de moi
                  </label>
                  <Link to="/mot-de-passe-oublie" className="text-sm text-accent hover:underline">
                    Mot de passe oublié ?
                  </Link>
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-accent text-accent-foreground hover:bg-accent/90 font-semibold h-11 flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{isLogin ? "Se connecter" : "Créer mon compte"}</span>
              </Button>
            </form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-card px-3 text-muted-foreground">ou continuer avec</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-4">
                <Button
                  variant="outline"
                  className="h-11 border-border text-foreground hover:bg-secondary"
                  type="button"
                  onClick={async () => {
                    const email = prompt("Entrez votre adresse email Google :", "votre.email@gmail.com");
                    if (!email) return;
                    const name = email.split("@")[0].replace(".", " ");
                    setLoading(true);
                    try {
                      await loginWithProvider(
                        email,
                        name.charAt(0).toUpperCase() + name.slice(1),
                        "google",
                        "mock_google_token_12345"
                      );
                      toast({ title: "Connexion Google réussie ✅", description: "Bienvenue sur Kukasoko !" });
                      navigate("/");
                    } catch (err: any) {
                      toast({ title: "Erreur", description: "Connexion Google impossible", variant: "destructive" });
                    } finally {
                      setLoading(false);
                    }
                  }}
                >
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  Google
                </Button>
                <Button
                  variant="outline"
                  className="h-11 border-border text-foreground hover:bg-secondary"
                  type="button"
                  onClick={async () => {
                    const email = prompt("Entrez votre adresse email Facebook :", "votre.email@facebook.com");
                    if (!email) return;
                    const name = email.split("@")[0].replace(".", " ");
                    setLoading(true);
                    try {
                      await loginWithProvider(
                        email,
                        name.charAt(0).toUpperCase() + name.slice(1),
                        "facebook",
                        "mock_fb_token_67890"
                      );
                      toast({ title: "Connexion Facebook réussie ✅", description: "Bienvenue sur Kukasoko !" });
                      navigate("/");
                    } catch (err: any) {
                      toast({ title: "Erreur", description: "Connexion Facebook impossible", variant: "destructive" });
                    } finally {
                      setLoading(false);
                    }
                  }}
                >
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  Facebook
                </Button>
              </div>
            </div>

            <p className="text-center text-sm text-muted-foreground mt-6">
              {isLogin ? "Pas encore de compte ?" : "Déjà un compte ?"}{" "}
              <button onClick={() => setIsLogin(!isLogin)} className="text-accent hover:underline font-medium">
                {isLogin ? "Inscrivez-vous" : "Connectez-vous"}
              </button>
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Login;
