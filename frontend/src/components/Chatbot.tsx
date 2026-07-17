import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Bot, User } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Message {
  id: number;
  role: "bot" | "user";
  text: string;
}

const FAQ: { keywords: string[]; answer: string }[] = [
  {
    keywords: ["bonjour", "salut", "hello", "hi", "hey"],
    answer: "Bonjour ! 👋 Je suis l'assistant Isoko. Comment puis-je vous aider ?",
  },
  {
    keywords: ["annonce", "publier", "ajouter annonce", "poster"],
    answer:
      "Pour publier une annonce :\n1. Connectez-vous ou créez un compte\n2. Cliquez sur « Ajouter une annonce » dans le menu\n3. Remplissez le formulaire (titre, catégorie, description, prix, photos)\n4. Validez et votre annonce sera visible !",
  },
  {
    keywords: ["boutique", "créer boutique", "ma boutique", "magasin"],
    answer:
      "Pour créer votre boutique :\n1. Allez dans « Ma Boutique » depuis le menu\n2. Remplissez les infos (nom, description, catégorie)\n3. Activez la géolocalisation pour que les clients vous trouvent\n4. Publiez vos annonces depuis votre boutique !",
  },
  {
    keywords: ["livraison", "localisation", "géolocalisation", "position", "livrer"],
    answer:
      "Notre système de livraison utilise la géolocalisation :\n• Le vendeur voit sa boutique sur la carte\n• Le client clique « Me localiser pour la livraison »\n• Sa position est partagée avec le vendeur pour organiser la livraison 🚚",
  },
  {
    keywords: ["abonnement", "payer", "prix", "tarif", "paiement"],
    answer:
      "Les abonnements permettent de publier des annonces et d'accéder aux fonctionnalités premium. Rendez-vous dans la section « Abonnement » pour voir les différentes formules disponibles.",
  },
  {
    keywords: ["connexion", "connecter", "login", "inscription", "compte", "mot de passe"],
    answer:
      "Pour vous connecter :\n1. Cliquez sur « Se connecter » en haut à droite\n2. Entrez votre email et mot de passe\n3. Si vous n'avez pas de compte, cliquez « Inscription »\n\nMot de passe oublié ? Utilisez le lien « Mot de passe oublié ».",
  },
  {
    keywords: ["catégorie", "immobilier", "service", "vendre"],
    answer:
      "Isoko propose 3 catégories principales :\n• 🏠 Immobilier — chambres, appartements, terrains\n• 🛠 Services — nettoyage, soudage, jardinage…\n• 🛒 À vendre — électronique, véhicules, objets…",
  },
  {
    keywords: ["avis", "noter", "évaluer", "review"],
    answer:
      "Vous pouvez laisser un avis sur chaque annonce :\n1. Ouvrez l'annonce\n2. Cliquez « Rédiger un avis » dans la barre latérale\n3. Donnez une note (1-5 étoiles) et écrivez votre commentaire",
  },
  {
    keywords: ["signaler", "réclamer", "problème", "fraude"],
    answer:
      "Pour signaler une annonce suspecte :\n1. Ouvrez l'annonce concernée\n2. Cliquez « Signaler l'annonce » ou « Réclamer l'annonce »\n3. Décrivez le problème\nNotre équipe examinera votre signalement rapidement.",
  },
  {
    keywords: ["blog", "article", "actualité"],
    answer:
      "Consultez notre blog pour des articles sur le commerce au Burundi, des conseils et des actualités. Cliquez sur « Blog » dans le menu principal.",
  },
  {
    keywords: ["contact", "aide", "support", "email"],
    answer:
      "Besoin d'aide supplémentaire ?\n📧 Email : support@isoko.bi\n📱 Téléphone : +257 XX XXX XXX\nOu utilisez le formulaire de contact en bas de page.",
  },
  {
    keywords: ["admin", "administration", "gérer", "dashboard"],
    answer:
      "Le panel d'administration est accessible aux administrateurs via « /admin ». Il permet de gérer les annonces, boutiques, utilisateurs et signalements.",
  },
];

function findAnswer(input: string): string {
  const lower = input.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  for (const faq of FAQ) {
    if (faq.keywords.some((kw) => lower.includes(kw.normalize("NFD").replace(/[\u0300-\u036f]/g, "")))) {
      return faq.answer;
    }
  }
  return "Je ne suis pas sûr de comprendre votre question. 🤔\n\nVoici ce que je peux vous expliquer :\n• Publier une annonce\n• Créer une boutique\n• Livraison et géolocalisation\n• Abonnements et paiements\n• Connexion et inscription\n• Signaler une annonce\n\nEssayez avec l'un de ces sujets !";
}

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, role: "bot", text: "Bonjour ! 👋 Je suis l'assistant Isoko. Posez-moi vos questions sur le fonctionnement du site !" },
  ]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;

    const userMsg: Message = { id: Date.now(), role: "user", text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    setTimeout(() => {
      const botMsg: Message = { id: Date.now() + 1, role: "bot", text: findAnswer(text) };
      setMessages((prev) => [...prev, botMsg]);
    }, 600);
  };

  return (
    <>
      {/* Floating button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-[9999] w-14 h-14 rounded-full bg-accent text-accent-foreground shadow-lg hover:bg-accent/90 transition-all flex items-center justify-center animate-bounce"
          aria-label="Ouvrir le chatbot"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      )}

      {/* Chat window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-[9999] w-[360px] max-w-[calc(100vw-2rem)] h-[500px] max-h-[calc(100vh-4rem)] bg-card rounded-2xl shadow-2xl border border-border flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-accent text-accent-foreground px-4 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5" />
              <div>
                <p className="font-semibold text-sm">Assistant Isoko</p>
                <p className="text-xs opacity-80">En ligne</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="hover:bg-accent-foreground/20 rounded-full p-1 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "bot" && (
                  <div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center shrink-0 mt-1">
                    <Bot className="w-4 h-4 text-accent" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-xl px-3 py-2 text-sm whitespace-pre-line ${
                    msg.role === "user"
                      ? "bg-accent text-accent-foreground rounded-br-sm"
                      : "bg-secondary text-foreground rounded-bl-sm"
                  }`}
                >
                  {msg.text}
                </div>
                {msg.role === "user" && (
                  <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0 mt-1">
                    <User className="w-4 h-4 text-muted-foreground" />
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-border p-3 shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex gap-2"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Posez votre question..."
                className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                maxLength={300}
              />
              <Button type="submit" size="icon" className="bg-accent hover:bg-accent/90 text-accent-foreground shrink-0">
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Chatbot;
