import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Phone, MapPin, Send, MessageSquare, Bot, Star, Sparkles, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { KukasokoBrain } from "@/services/KukasokoBrainService";
import PageHero from "@/components/PageHero";

interface Review {
  id: number;
  name: string;
  rating: number;
  text: string;
  response?: string;
  date: string;
}

export default function About() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [newReview, setNewReview] = useState({ name: "", rating: 5, text: "" });
  const [submittingReview, setSubmittingReview] = useState(false);

  // Charger les avis factices + persistés du localStorage
  useEffect(() => {
    const saved = localStorage.getItem("kukasoko_about_reviews");
    if (saved) {
      setReviews(JSON.parse(saved));
    } else {
      const initialReviews: Review[] = [
        {
          id: 1,
          name: "Marc Ndayisaba",
          rating: 5,
          text: "Excellent service ! J'ai pu vendre ma voiture en moins de 3 jours grâce à la géolocalisation ultra-précise de Bujumbura.",
          response: "Merci beaucoup Marc ! Nous sommes ravis que notre service de géolocalisation vous ait aidé à vendre rapidement. 🚀",
          date: "12/08/2026",
        },
        {
          id: 2,
          name: "Marie-Claire Inamahoro",
          rating: 4,
          text: "Très bonne application, très facile d'utilisation sur mon téléphone Android. Je recommande pour trouver des appartements à louer.",
          response: "Merci Marie-Claire ! Notre équipe s'efforce d'optimiser l'expérience mobile sur Android pour faciliter vos recherches de logement. 🏢",
          date: "14/08/2026",
        },
      ];
      setReviews(initialReviews);
      localStorage.setItem("kukasoko_about_reviews", JSON.stringify(initialReviews));
    }
  }, []);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReview.name.trim() || !newReview.text.trim()) {
      toast({ title: "Champs requis", description: "Veuillez entrer votre nom et votre avis.", variant: "destructive" });
      return;
    }

    setSubmittingReview(true);
    try {
      // 1. Ajouter l'avis client
      const reviewDate = new Date().toLocaleDateString("fr-FR");
      const createdReview: Review = {
        id: Date.now(),
        name: newReview.name,
        rating: newReview.rating,
        text: newReview.text,
        date: reviewDate,
      };

      // 2. Faire répondre l'IA en utilisant la base de connaissance du site (KukasokoBrain)
      const aiQuery = `Avis client de ${newReview.name} (${newReview.rating}/5 étoiles) : "${newReview.text}". Rédige une réponse courte, professionnelle et chaleureuse de remerciement au nom de l'équipe de Kukasoko en rapport avec son avis.`;
      
      let aiResponse = "Merci pour votre précieux retour ! Nous sommes heureux de vous compter parmi nos utilisateurs.";
      try {
        const brainAnswer = await KukasokoBrain.answer(aiQuery);
        if (brainAnswer && brainAnswer.answer) {
          aiResponse = brainAnswer.answer;
        }
      } catch (err) {
        console.warn("L'IA n'a pas pu générer une réponse sur mesure, utilisation de la réponse par défaut.");
      }

      createdReview.response = aiResponse;

      const updated = [createdReview, ...reviews];
      setReviews(updated);
      localStorage.setItem("kukasoko_about_reviews", JSON.stringify(updated));

      toast({ title: "Avis publié ! ✅", description: "Merci pour votre retour, notre assistant IA vient d'y répondre." });
      setNewReview({ name: "", rating: 5, text: "" });
    } catch {
      toast({ title: "Erreur", description: "Impossible de publier l'avis.", variant: "destructive" });
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-grow pt-16">
        {/* Hero Section avec Carrousel HD */}
        <PageHero
          title="À Propos de Kukasoko"
          subtitle="La plateforme d'annonces en ligne nouvelle génération, conçue pour connecter instantanément acheteurs et vendeurs grâce à la géolocalisation et l'intelligence artificielle."
          showSearch={false}
          compact={true}
        />

        {/* Qui sommes-nous & Contacts */}
        <section className="py-16 container mx-auto px-4 max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
            <div className="space-y-6">
              <h2 className="text-3xl font-display font-bold text-foreground">Notre Mission</h2>
              <p className="text-muted-foreground leading-relaxed">
                Kukasoko a été créé pour dynamiser l'économie locale en proposant un outil simple, performant et accessible. Que vous soyez un professionnel cherchant à booster sa boutique ou un particulier vendant ses objets, notre plateforme s'adapte à tous vos besoins.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
                <div className="p-4 rounded-xl border border-border bg-card text-center">
                  <span className="text-3xl">📍</span>
                  <h4 className="font-semibold text-sm mt-2">Géolocalisation</h4>
                  <p className="text-xs text-muted-foreground mt-1">Trouvez des offres à proximité.</p>
                </div>
                <div className="p-4 rounded-xl border border-border bg-card text-center">
                  <span className="text-3xl">🤖</span>
                  <h4 className="font-semibold text-sm mt-2">IA Assistante</h4>
                  <p className="text-xs text-muted-foreground mt-1">Un coach intelligent à vos côtés.</p>
                </div>
                <div className="p-4 rounded-xl border border-border bg-card text-center">
                  <span className="text-3xl">💬</span>
                  <h4 className="font-semibold text-sm mt-2">Chat en Direct</h4>
                  <p className="text-xs text-muted-foreground mt-1">Discutez en temps réel.</p>
                </div>
              </div>
            </div>

            {/* Contacts */}
            <div className="bg-card border border-border rounded-2xl p-8 shadow-sm space-y-6">
              <h3 className="text-2xl font-display font-bold text-foreground">Contactez-nous</h3>
              <p className="text-sm text-muted-foreground">Une question, un partenariat ou besoin d'assistance ? Notre équipe est là pour vous répondre.</p>
              
              <div className="space-y-4">
                <div className="flex items-center gap-4 text-muted-foreground">
                  <div className="w-10 h-10 rounded-full bg-accent/10 text-accent flex items-center justify-center shrink-0">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground uppercase tracking-wider">Email</p>
                    <p className="text-sm">info@isoko-online.com</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-muted-foreground">
                  <div className="w-10 h-10 rounded-full bg-accent/10 text-accent flex items-center justify-center shrink-0">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground uppercase tracking-wider">Téléphone / WhatsApp</p>
                    <p className="text-sm">+243 000 000 000</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-muted-foreground">
                  <div className="w-10 h-10 rounded-full bg-accent/10 text-accent flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground uppercase tracking-wider">Adresse</p>
                    <p className="text-sm">Bujumbura, Burundi</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Espace Avis Clients et IA Répondeuse */}
        <section className="bg-secondary/40 py-16 border-y border-border">
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <h2 className="text-3xl font-display font-bold text-foreground">Avis de nos Clients</h2>
              <p className="text-muted-foreground mt-2">Découvrez les retours de nos utilisateurs et laissez le vôtre. Notre équipe IA vous répondra en temps réel.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
              {/* Formulaire de dépôt */}
              <div className="lg:col-span-1 bg-card border border-border rounded-2xl p-6 shadow-sm sticky top-24">
                <h3 className="text-lg font-bold text-foreground mb-4">Laisser un avis</h3>
                <form onSubmit={handleSubmitReview} className="space-y-4">
                  <div>
                    <label htmlFor="client-name" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Votre nom</label>
                    <Input
                      id="client-name"
                      value={newReview.name}
                      onChange={(e) => setNewReview({ ...newReview, name: e.target.value })}
                      placeholder="Jean Dupont"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label htmlFor="client-rating" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Note (étoiles)</label>
                    <select
                      id="client-rating"
                      value={newReview.rating}
                      onChange={(e) => setNewReview({ ...newReview, rating: Number(e.target.value) })}
                      className="w-full mt-1 h-10 px-3 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    >
                      <option value="5">⭐⭐⭐⭐⭐ (5/5)</option>
                      <option value="4">⭐⭐⭐⭐ (4/5)</option>
                      <option value="3">⭐⭐⭐ (3/5)</option>
                      <option value="2">⭐⭐ (2/5)</option>
                      <option value="1">⭐ (1/5)</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="client-text" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Votre message</label>
                    <Textarea
                      id="client-text"
                      value={newReview.text}
                      onChange={(e) => setNewReview({ ...newReview, text: e.target.value })}
                      placeholder="Comment s'est passée votre expérience sur Kukasoko ?"
                      className="mt-1 min-h-[100px]"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={submittingReview}
                    className="w-full bg-accent text-accent-foreground hover:bg-accent/90 font-semibold"
                  >
                    {submittingReview ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Publier mon avis
                      </>
                    )}
                  </Button>
                </form>
              </div>

              {/* Liste des avis et réponses IA */}
              <div className="lg:col-span-2 space-y-6">
                {reviews.map((rev) => (
                  <div key={rev.id} className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <p className="font-bold text-foreground">{rev.name}</p>
                        <div className="flex gap-1 mt-1 text-amber-500">
                          {Array.from({ length: rev.rating }).map((_, i) => (
                            <Star key={i} className="w-4 h-4 fill-current" />
                          ))}
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">{rev.date}</span>
                    </div>

                    <p className="text-sm text-foreground/80 leading-relaxed italic">
                      "{rev.text}"
                    </p>

                    {/* Réponse de l'algorithme intelligent */}
                    {rev.response && (
                      <div className="bg-secondary/60 rounded-xl p-4 border border-border/80 flex gap-3 items-start mt-2">
                        <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                          <Bot className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-1">
                            <p className="text-xs font-bold text-foreground">Support Kukasoko IA</p>
                            <span className="text-[10px] bg-emerald-500/10 text-emerald-600 px-1.5 py-0.5 rounded-full font-medium flex items-center gap-1 shrink-0">
                              <Sparkles className="w-2.5 h-2.5" /> Algorithme Intelligent
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
                            {rev.response}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
