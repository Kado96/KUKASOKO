import React, { useState, useRef } from "react";
import {
  ListingTemplateData,
  SOCIAL_CHANNELS,
  generateListingXML,
  generateSocialCaptions,
} from "@/services/TemplateEngineService";
import { ListingCardCanvas } from "./ListingCardCanvas";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Download, Copy, Check, Code, Share2, Sparkles, Layers, Image as ImageIcon } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { API_BASE } from "@/services/api";

interface TemplateStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  listing: {
    id: number;
    title: string;
    category: string;
    price: string | number;
    currency?: string;
    image?: string;
    image_urls?: string;
    date?: string;
    created_at?: string;
    rating?: number;
    reviewCount?: number;
    reviews?: number;
    isVerified?: boolean;
    availability?: string;
    guarantee?: string;
    city?: string;
    sellerName?: string;
    phone?: string;
  };
}

export const TemplateStudioModal: React.FC<TemplateStudioModalProps> = ({
  isOpen,
  onClose,
  listing,
}) => {
  const [activeChannel, setActiveChannel] = useState<string>("instagram_post");
  const [activeTab, setActiveTab] = useState<"visuals" | "captions" | "xml" | "android">("visuals");
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [generatedImages, setGeneratedImages] = useState<Record<string, string>>({});
  // ── Personnalisation visuelle ─────────────────────────────────────────────────────
  const [accentColor, setAccentColor] = useState("#F59E0B");
  const [customText, setCustomText] = useState("");

  // Prepare normalized template data
  const formattedPrice = typeof listing.price === "number" ? `${listing.price} Fbu` : listing.price || "Sur devis";
  const rawImageSrc = listing.image || (listing.image_urls ? listing.image_urls.split(",")[0] : "");
  const imageSrc = (() => {
    if (!rawImageSrc) return `${API_BASE}/media/listing/category-avendre.jpg`;
    if (rawImageSrc.startsWith("http://") || rawImageSrc.startsWith("https://") || rawImageSrc.startsWith("data:")) return rawImageSrc;
    if (rawImageSrc.startsWith("/") || rawImageSrc.startsWith("assets/") || rawImageSrc.startsWith("category-")) {
      const clean = rawImageSrc.startsWith("/") ? rawImageSrc : `/${rawImageSrc}`;
      return `${window.location.origin}${clean}`;
    }
    return `${API_BASE}/${rawImageSrc}`;
  })();
  const displayDate = listing.date || (listing.created_at ? new Date(listing.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "16 NOV 2021");

  const templateData = React.useMemo<ListingTemplateData>(() => ({
    id: listing.id,
    title: listing.title,
    category: listing.category || "Services",
    price: formattedPrice,
    currency: listing.currency || "BIF",
    image: imageSrc,
    date: displayDate,
    rating: listing.rating || 4.0,
    reviewCount: listing.reviewCount || listing.reviews || 2,
    isVerified: listing.isVerified ?? true,
    availability: listing.availability || "2 jours",
    guarantee: listing.guarantee || "Complet",
    location: listing.city || "Bujumbura",
    sellerName: listing.sellerName || "Vendeur KUKASOKO",
    sellerPhone: listing.phone || "",
    url: `${window.location.origin}/annonces/${listing.id}`,
  }), [listing, formattedPrice, imageSrc, displayDate]);

  const xmlContent = generateListingXML(templateData);
  const captions = generateSocialCaptions(templateData);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    toast({ title: "Copié ! 📋", description: `${label} copié dans le presse-papier.` });
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleDownloadImage = (channelId: string) => {
    const dataUrl = generatedImages[channelId];
    if (!dataUrl) {
      toast({ title: "Génération en cours...", description: "Veuillez patienter un instant." });
      return;
    }
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `korachannel_${listing.id}_${channelId}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast({ title: "Image HD téléchargée ! 🖼️", description: `Format ${SOCIAL_CHANNELS[channelId]?.name} prêt à publier — KoraChannel.` });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 rounded-2xl bg-card border-border shadow-2xl">
        <DialogHeader className="sticky top-0 z-10 p-5 bg-gradient-to-r from-amber-500 via-emerald-600 to-teal-700 text-white rounded-t-2xl flex flex-row items-center justify-between space-y-0 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center font-bold text-lg shrink-0">
              🎙️
            </div>
            <div>
              <DialogTitle className="text-xl font-display font-bold text-white leading-tight">
                Studio de Publication Kora
              </DialogTitle>
              <DialogDescription className="text-xs text-white/80 mt-0.5 leading-snug">
                1 seule annonce ➔ Génération automatique pour Web, Android & Tous Réseaux Sociaux
              </DialogDescription>
            </div>
          </div>
          <Badge className="bg-white/20 hover:bg-white/30 text-white border-0 text-xs px-3 py-1 font-semibold shrink-0 ml-3">
            KoraChannel
          </Badge>
        </DialogHeader>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          {/* Main Navigation Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
            <TabsList className="grid grid-cols-4 w-full bg-muted/60 p-1 rounded-xl">
              <TabsTrigger value="visuals" className="gap-2 font-medium text-xs sm:text-sm">
                <ImageIcon className="w-4 h-4 text-amber-500" /> Visuels Sociaux
              </TabsTrigger>
              <TabsTrigger value="captions" className="gap-2 font-medium text-xs sm:text-sm">
                <Share2 className="w-4 h-4 text-emerald-500" /> Textes & Hashtags
              </TabsTrigger>
              <TabsTrigger value="xml" className="gap-2 font-medium text-xs sm:text-sm">
                <Code className="w-4 h-4 text-blue-500" /> Moteur XML
              </TabsTrigger>
              <TabsTrigger value="android" className="gap-2 font-medium text-xs sm:text-sm">
                <Layers className="w-4 h-4 text-purple-500" /> Fiche Android / Web
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: VISUELS SOCIAUX */}
            <TabsContent value="visuals" className="space-y-6 mt-6">
              {/* Channel Selector */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {Object.values(SOCIAL_CHANNELS).map((channel) => (
                  <button
                    key={channel.id}
                    onClick={() => setActiveChannel(channel.id)}
                    className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1 ${
                      activeChannel === channel.id
                        ? "border-amber-500 bg-amber-500/10 shadow-sm ring-2 ring-amber-500/20"
                        : "border-border hover:bg-secondary/50 text-muted-foreground"
                    }`}
                  >
                    <span className="text-xl">{channel.icon}</span>
                    <span className="text-[11px] font-semibold text-foreground truncate w-full">
                      {channel.name}
                    </span>
                    <span className="text-[9px] text-muted-foreground">{channel.aspectRatio}</span>
                  </button>
                ))}
              </div>

              {/* Preview Area */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start bg-secondary/30 p-6 rounded-2xl border border-border/50">
                {/* Visual Canvas Card */}
                <div className="flex flex-col items-center justify-center">
                  <div className="text-xs font-semibold text-muted-foreground mb-3 flex items-center gap-1.5">
                    <span>Aperçu généré en temps réel :</span>
                    <Badge variant="outline" className="text-[10px]">
                      {SOCIAL_CHANNELS[activeChannel]?.width} x {SOCIAL_CHANNELS[activeChannel]?.height} px
                    </Badge>
                  </div>
                  <ListingCardCanvas
                    data={templateData}
                    width={SOCIAL_CHANNELS[activeChannel]?.width || 1080}
                    height={SOCIAL_CHANNELS[activeChannel]?.height || 1080}
                    displayWidth={460}
                    displayHeight={460}
                    accentColor={accentColor}
                    customText={customText || undefined}
                    onRendered={(url) => setGeneratedImages((prev) => ({ ...prev, [activeChannel]: url }))}
                  />
                </div>

                {/* Actions & Infos */}
                <div className="space-y-4">
                  {/* ── Personnalisation ──────────────────────── */}
                  <div className="bg-card border border-border rounded-xl p-4 space-y-3">
                    <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      🎨 Personnaliser le visuel
                    </p>

                    {/* Couleur accent */}
                    <div className="flex items-center gap-3">
                      <label className="text-xs text-muted-foreground w-28 shrink-0">Couleur principale :</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={accentColor}
                          onChange={(e) => setAccentColor(e.target.value)}
                          className="w-9 h-9 rounded-lg cursor-pointer border border-border p-0.5 bg-transparent"
                          title="Choisir la couleur accent"
                        />
                        <span className="text-xs font-mono text-muted-foreground">{accentColor.toUpperCase()}</span>
                      </div>
                      {/* Couleurs rapides */}
                      <div className="flex gap-1.5 ml-auto">
                        {["#F59E0B", "#EF4444", "#3B82F6", "#10B981", "#8B5CF6", "#EC4899"].map((c) => (
                          <button
                            key={c}
                            onClick={() => setAccentColor(c)}
                            title={c}
                            style={{ background: c }}
                            className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${
                              accentColor === c ? "border-foreground scale-110" : "border-transparent"
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Texte personnalisé */}
                    <div className="flex items-center gap-3">
                      <label className="text-xs text-muted-foreground w-28 shrink-0">Texte sur la photo :</label>
                      <input
                        type="text"
                        value={customText}
                        onChange={(e) => setCustomText(e.target.value)}
                        placeholder="Ex : Disponible ce weekend !"
                        className="flex-1 h-8 rounded-lg border border-border bg-background px-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent"
                        maxLength={60}
                      />
                    </div>
                  </div>

                  {/* Infos channel */}
                  <div>
                    <h4 className="font-bold text-foreground text-base flex items-center gap-2">
                      <span>{SOCIAL_CHANNELS[activeChannel]?.icon}</span>
                      {SOCIAL_CHANNELS[activeChannel]?.name}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      {SOCIAL_CHANNELS[activeChannel]?.description}
                    </p>
                  </div>

                  <div className="bg-card p-4 rounded-xl border border-border space-y-2 text-xs">
                    <p className="font-semibold text-foreground">Éléments inclus automatiquement :</p>
                    <ul className="space-y-1 text-muted-foreground list-disc list-inside">
                      <li>Badge catégorie ambre (<strong className="text-foreground">{templateData.category}</strong>)</li>
                      <li>Badge de vérification (<strong className="text-emerald-600">Vérifié ✔</strong>)</li>
                      <li>Étoiles et note globale ({templateData.rating}/5)</li>
                      <li>Disponibilité & Garantie</li>
                      <li>Filigrane et marque <strong>KUKASOKO</strong></li>
                    </ul>
                  </div>

                  <div className="pt-2 flex flex-col gap-2">
                    <Button
                      onClick={() => handleDownloadImage(activeChannel)}
                      className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold gap-2 shadow-md"
                    >
                      <Download className="w-4 h-4" /> Télécharger HD — {SOCIAL_CHANNELS[activeChannel]?.name}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleCopy(captions[activeChannel.split("_")[0]] || captions.facebook, "Légende sociale")}
                      className="w-full gap-2 text-xs"
                    >
                      <Copy className="w-3.5 h-3.5" /> Copier le texte + hashtags associés
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* TAB 2: TEXTES ET HASHTAGS */}
            <TabsContent value="captions" className="space-y-4 mt-6">
              <p className="text-xs text-muted-foreground">
                Textes pré-rédigés et optimisés selon les codes de chaque réseau social :
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(captions).map(([key, text]) => (
                  <div key={key} className="bg-card p-4 rounded-xl border border-border flex flex-col justify-between space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm capitalize text-foreground flex items-center gap-1.5">
                        <span>{key === "whatsapp" ? "💬" : key === "instagram" ? "📷" : key === "facebook" ? "📘" : key === "linkedin" ? "💼" : "🐦"}</span>
                        {key}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleCopy(text, key)}
                        className="h-7 px-2 text-xs gap-1 text-accent"
                      >
                        {copiedText === key ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                        Copier
                      </Button>
                    </div>
                    <pre className="text-xs bg-muted/50 p-3 rounded-lg text-foreground whitespace-pre-wrap font-sans max-h-36 overflow-y-auto">
                      {text}
                    </pre>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* TAB 3: MOTEUR XML */}
            <TabsContent value="xml" className="space-y-4 mt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-foreground text-sm">Export XML Universel (KUKASOKO Standard)</h3>
                  <p className="text-xs text-muted-foreground">
                    Ce flux XML permet l'import direct vers Android, Google Merchant Center ou Facebook Catalog.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCopy(xmlContent, "XML")}
                  className="gap-2 text-xs"
                >
                  <Copy className="w-3.5 h-3.5" /> Copier XML
                </Button>
              </div>

              <pre className="p-4 rounded-xl bg-zinc-900 text-emerald-400 font-mono text-xs overflow-x-auto max-h-96 border border-zinc-800">
                {xmlContent}
              </pre>
            </TabsContent>

            {/* TAB 4: FICHE ANDROID & WEB */}
            <TabsContent value="android" className="space-y-4 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 rounded-xl bg-card border border-border space-y-3">
                  <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                    📱 Fiche Android (Format Native JSON/Data)
                  </h4>
                  <pre className="p-3 rounded-lg bg-muted text-xs font-mono overflow-x-auto max-h-60 text-muted-foreground">
                    {JSON.stringify(templateData, null, 2)}
                  </pre>
                </div>

                <div className="p-4 rounded-xl bg-card border border-border space-y-3">
                  <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                    🌐 Page Web (Meta Tags OpenGraph & Schema)
                  </h4>
                  <pre className="p-3 rounded-lg bg-muted text-xs font-mono overflow-x-auto max-h-60 text-muted-foreground">
{`<meta property="og:title" content="${templateData.title}" />
<meta property="og:description" content="${templateData.category} - ${templateData.price}" />
<meta property="og:image" content="${templateData.image}" />
<meta property="og:url" content="${templateData.url}" />
<meta name="twitter:card" content="summary_large_image" />`}
                  </pre>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};
