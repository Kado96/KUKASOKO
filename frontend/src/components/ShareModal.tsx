import React, { useState } from "react";
import {
  Share2,
  Copy,
  Check,
  Send,
  Facebook,
  Instagram,
  Twitter,
  MessageCircle,
  QrCode,
  Smartphone,
  ExternalLink
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

interface ShareButtonProps {
  title: string;
  description?: string;
  url?: string;
  image?: string;
  price?: string;
  className?: string;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
  showText?: boolean;
}

export const ShareModal: React.FC<ShareButtonProps> = ({
  title,
  description = "",
  url = window.location.href,
  image = "",
  price = "",
  className = "",
  variant = "outline",
  size = "default",
  showText = true,
}) => {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  const fullUrl = url.startsWith("http") ? url : `${window.location.origin}${url}`;
  const shareText = `Regarde cette annonce sur ISOKO : ${title} ${price ? `(${price})` : ""} - ${fullUrl}`;

  // Copy link
  const handleCopyLink = () => {
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    toast({
      title: "Lien copié ! 📋",
      description: "Le lien de l'annonce a été copié dans votre presse-papier.",
    });
    setTimeout(() => setCopied(false), 2500);
  };

  // Native Web Share API with real image file sharing (WhatsApp, Instagram, etc.)
  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        let shareData: ShareData = {
          title: title,
          text: shareText,
          url: fullUrl,
        };

        // Try to attach real image file if available
        if (image) {
          try {
            const response = await fetch(image);
            const blob = await response.blob();
            const file = new File([blob], `annonce-${title.toLowerCase().replace(/\s+/g, "-")}.jpg`, { type: blob.type || "image/jpeg" });

            if (navigator.canShare && navigator.canShare({ files: [file] })) {
              shareData = {
                title: title,
                text: shareText,
                files: [file],
              };
            }
          } catch (e) {
            // fallback to text + url share data if image fetch fails
          }
        }

        await navigator.share(shareData);
        toast({ title: "Partagé avec succès ! 🎉" });
        return;
      } catch (err) {
        // Fallback to custom modal if user cancelled or error
      }
    }
    setOpen(true);
  };


  // Direct Social Share URLs
  const shareLinks = {
    whatsappMessage: `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`,
    whatsappStatus: `whatsapp://send?text=${encodeURIComponent(shareText)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(fullUrl)}`,
    twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(fullUrl)}`,
    telegram: `https://t.me/share/url?url=${encodeURIComponent(fullUrl)}&text=${encodeURIComponent(title)}`,
    email: `mailto:?subject=${encodeURIComponent(`Annonce ISOKO : ${title}`)}&body=${encodeURIComponent(shareText)}`,
  };

  const openShare = (linkUrl: string, name: string) => {
    window.open(linkUrl, "_blank", "noopener,noreferrer,width=600,height=500");
    toast({ title: `Partage sur ${name} 🚀` });
  };

  const handleInstagramShare = () => {
    navigator.clipboard.writeText(shareText);
    if (image) {
      const a = document.createElement("a");
      a.href = image;
      a.download = `isoko-${title.toLowerCase().replace(/\s+/g, "-")}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
    toast({
      title: "Image téléchargée & Texte copié ! 📸",
      description: "L'image de l'annonce a été téléchargée et le texte avec lien copié. Ouvrez Instagram pour la publier !",
    });
    setTimeout(() => {
      window.open("https://www.instagram.com", "_blank");
    }, 1500);
  };

  const handleDownloadImage = () => {
    if (!image) return;
    const a = document.createElement("a");
    a.href = image;
    a.download = `isoko-annonce-${title.toLowerCase().replace(/\s+/g, "-")}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast({
      title: "Photo de l'annonce téléchargée ! 🖼️",
      description: "Vous pouvez maintenant la joindre directement sur WhatsApp, Facebook ou Instagram.",
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={`gap-2 ${className}`}
          onClick={(e) => {
            // Optional: call Web Share if supported on mobile touch devices
            if (/Android|iPhone|iPad/i.test(navigator.userAgent) && navigator.share) {
              e.preventDefault();
              handleNativeShare();
            }
          }}
        >
          <Share2 className="w-4 h-4 text-accent" />
          {showText && <span>Partager</span>}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md rounded-2xl p-6 bg-card border border-border shadow-2xl">
        <DialogHeader className="text-center sm:text-left">
          <DialogTitle className="text-xl font-display font-bold text-foreground flex items-center gap-2">
            <Share2 className="w-5 h-5 text-accent" /> Partager cette annonce
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-1">
            Partagez facilement cette annonce sur vos réseaux sociaux ou copiez son lien direct.
          </DialogDescription>
        </DialogHeader>

        {/* Preview Card */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50 border border-border my-3">
          {image && (
            <img
              src={image}
              alt={title}
              className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
            />
          )}
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-foreground text-sm truncate">{title}</p>
            {price && <p className="text-xs font-bold text-accent">{price}</p>}
            <p className="text-[11px] text-muted-foreground truncate">{fullUrl}</p>
          </div>
          {image && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadImage}
              className="text-xs gap-1 font-medium text-accent border-accent/30 hover:bg-accent/10 flex-shrink-0"
              title="Télécharger la photo pour la joindre"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Photo
            </Button>
          )}
        </div>


        {/* Share Buttons Grid */}
        <div className="grid grid-cols-4 gap-3 my-4 text-center">
          {/* WhatsApp Direct / Message */}
          <button
            onClick={() => openShare(shareLinks.whatsappMessage, "WhatsApp")}
            className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 transition-colors group"
          >
            <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
              <MessageCircle className="w-5 h-5 fill-current" />
            </div>
            <span className="text-[11px] font-medium leading-tight">WhatsApp (Message)</span>
          </button>

          {/* WhatsApp Statut */}
          <button
            onClick={() => openShare(shareLinks.whatsappMessage, "Statut WhatsApp")}
            className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl bg-green-500/10 hover:bg-green-500/20 text-green-600 transition-colors group"
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-green-600 to-emerald-400 text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
              <Send className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-medium leading-tight">Statut WhatsApp</span>
          </button>

          {/* Facebook */}
          <button
            onClick={() => openShare(shareLinks.facebook, "Facebook")}
            className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 transition-colors group"
          >
            <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
              <Facebook className="w-5 h-5 fill-current" />
            </div>
            <span className="text-[11px] font-medium leading-tight">Facebook</span>
          </button>

          {/* Instagram Story / Feed */}
          <button
            onClick={handleInstagramShare}
            className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl bg-pink-500/10 hover:bg-pink-500/20 text-pink-600 transition-colors group"
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
              <Instagram className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-medium leading-tight">Instagram</span>
          </button>

          {/* Telegram */}
          <button
            onClick={() => openShare(shareLinks.telegram, "Telegram")}
            className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 transition-colors group"
          >
            <div className="w-10 h-10 rounded-full bg-sky-500 text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
              <Send className="w-4 h-4 ml-0.5" />
            </div>
            <span className="text-[11px] font-medium leading-tight">Telegram</span>
          </button>

          {/* Twitter / X */}
          <button
            onClick={() => openShare(shareLinks.twitter, "Twitter / X")}
            className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl bg-slate-500/10 hover:bg-slate-500/20 text-slate-700 dark:text-slate-300 transition-colors group"
          >
            <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
              <Twitter className="w-4 h-4 fill-current" />
            </div>
            <span className="text-[11px] font-medium leading-tight">Twitter / X</span>
          </button>

          {/* Email */}
          <button
            onClick={() => openShare(shareLinks.email, "E-mail")}
            className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 transition-colors group"
          >
            <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
              <ExternalLink className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-medium leading-tight">E-mail</span>
          </button>

          {/* Option Partager via téléphone (Native Share) */}
          <button
            onClick={handleNativeShare}
            className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 transition-colors group"
          >
            <div className="w-10 h-10 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
              <Smartphone className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-medium leading-tight">Autres apps</span>
          </button>
        </div>

        {/* Copy Link Input Section */}
        <div className="mt-2 space-y-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Lien de l'annonce</label>
          <div className="flex items-center gap-2">
            <input
              id="share-link-url"
              name="share-link-url"
              type="text"
              readOnly
              autoComplete="off"
              value={fullUrl}
              className="flex-1 h-10 px-3 rounded-lg border border-border bg-background text-xs text-foreground focus:outline-none"
            />
            <Button
              onClick={handleCopyLink}
              className={`h-10 px-4 font-semibold text-xs transition-all ${
                copied ? "bg-green-600 hover:bg-green-700 text-white" : "bg-accent hover:bg-accent/90 text-accent-foreground"
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 mr-1" /> Copié
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-1" /> Copier
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareModal;
