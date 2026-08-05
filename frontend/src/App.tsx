import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { SiteProvider } from "@/contexts/SiteContext";
import { NewsTickerProvider } from "@/contexts/NewsTickerContext";
import Index from "./pages/Index";
import Annonces from "./pages/Annonces";
import AnnonceDetail from "./pages/AnnonceDetail";
import Boutique from "./pages/Boutique";
import MaBoutique from "./pages/MaBoutique";
import Blog from "./pages/Blog";
import BlogDetail from "./pages/BlogDetail";
import AjouterAnnonce from "./pages/AjouterAnnonce";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import Admin from "./pages/Admin";
import Carte from "./pages/Carte";
import Messages from "./pages/Messages";
import Marchand from "./pages/Marchand";
import NotFound from "./pages/NotFound";
import Chatbot from "./components/Chatbot";
import NewsTicker from "./components/NewsTicker";
import { MobileBottomNav } from "./components/MobileBottomNav";
import { SplashScreen } from "./components/SplashScreen";
import React from "react";

const queryClient = new QueryClient();

// ─── ErrorBoundary global ─────────────────────────────────────────────────────
// Capture les erreurs de reconciliation DOM (ex: conflit Portal + extensions navigateur)
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: Error) {
    // Ignorer silencieusement les erreurs DOM causées par des extensions navigateur
    if (error.message?.includes("removeChild") || error.message?.includes("is not a child")) {
      this.setState({ hasError: false });
    }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 32, textAlign: "center" }}>
          <h2 style={{ marginBottom: 12 }}>Une erreur est survenue</h2>
          <button onClick={() => { this.setState({ hasError: false }); window.location.reload(); }}>
            Recharger la page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <SplashScreen />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <SiteProvider>
            <NewsTickerProvider>
              <AuthProvider>
                <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/annonces" element={<Annonces />} />
                <Route path="/annonces/:id" element={<AnnonceDetail />} />
                <Route path="/carte" element={<Carte />} />
                <Route path="/messages" element={<Messages />} />
                <Route path="/boutique" element={<Boutique />} />
                <Route path="/ma-boutique" element={<MaBoutique />} />
                <Route path="/marchand/:id" element={<Marchand />} />
                <Route path="/blog" element={<Blog />} />
                <Route path="/blog/:id" element={<BlogDetail />} />
                <Route path="/ajouter-annonce" element={<AjouterAnnonce />} />
                <Route path="/login" element={<Login />} />
                <Route path="/mot-de-passe-oublie" element={<ForgotPassword />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
              <Chatbot />
              <NewsTicker />
              </AuthProvider>
            </NewsTickerProvider>
          </SiteProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
