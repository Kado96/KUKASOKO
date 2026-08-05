import React, { useRef, useEffect, useState } from "react";
import { ListingTemplateData } from "@/services/TemplateEngineService";
import { Star } from "lucide-react";

interface ListingCardCanvasProps {
  data: ListingTemplateData;
  width?: number;
  height?: number;
  /** Taille d’affichage CSS (le canvas est rendu en pleine résolution HD mais affiché en plus petit) */
  displayWidth?: number;
  displayHeight?: number;
  className?: string;
  onRendered?: (dataUrl: string) => void;
}

export const ListingCardCanvas: React.FC<ListingCardCanvasProps> = ({
  data,
  width = 1080,
  height = 1080,
  displayWidth,
  displayHeight,
  className = "",
  onRendered,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const onRenderedRef = useRef(onRendered);

  // Garder la référence à jour sans déclencher d'effet
  useEffect(() => {
    onRenderedRef.current = onRendered;
  }, [onRendered]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear
    ctx.clearRect(0, 0, width, height);
    // Activer le lissage haute qualité pour des photos nettes (comme Instagram)
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    // Draw background rounded card
    const padding = Math.round(width * 0.03);
    const cardX = padding;
    const cardY = padding;
    const cardW = width - padding * 2;
    const cardH = height - padding * 2;
    const radius = Math.round(width * 0.04);

    // Card background fill & shadow
    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.08)";
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 8;
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, radius);
    ctx.fillStyle = "#FFFFFF";
    ctx.fill();
    ctx.restore();

    // Card Border
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, radius);
    ctx.strokeStyle = "#E5E7EB";
    ctx.lineWidth = Math.max(1, Math.round(width * 0.003));
    ctx.stroke();

    // Image section height (58% of card height)
    const imgHeight = Math.round(cardH * 0.58);
    const imgRadius = Math.round(radius * 0.8);

    // Load and draw image
    const img = new Image();
    img.crossOrigin = "anonymous";
    
    // Éviter le cache du navigateur qui conserve l'image sans les en-têtes CORS
    if (data.image && (data.image.startsWith("http://") || data.image.startsWith("https://"))) {
      img.src = data.image.includes("?") ? `${data.image}&cors=1` : `${data.image}?cors=1`;
    } else {
      img.src = data.image;
    }

    const renderCardContent = () => {
      // 1. Draw image container with top rounded corners
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(cardX + 2, cardY + 2, cardW - 4, imgHeight, [imgRadius, imgRadius, 0, 0]);
      ctx.clip();

      if (img.complete && img.naturalWidth !== 0) {
        // Draw image cover style
        const imgRatio = img.naturalWidth / img.naturalHeight;
        const targetRatio = (cardW - 4) / imgHeight;
        let sWidth = img.naturalWidth;
        let sHeight = img.naturalHeight;
        let sX = 0;
        let sY = 0;

        if (imgRatio > targetRatio) {
          sWidth = img.naturalHeight * targetRatio;
          sX = (img.naturalWidth - sWidth) / 2;
        } else {
          sHeight = img.naturalWidth / targetRatio;
          sY = (img.naturalHeight - sHeight) / 2;
        }

        ctx.drawImage(img, sX, sY, sWidth, sHeight, cardX + 2, cardY + 2, cardW - 4, imgHeight);
      } else {
        // Fallback gradient background if image load fails
        const grad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + imgHeight);
        grad.addColorStop(0, "#E2E8F0");
        grad.addColorStop(1, "#CBD5E1");
        ctx.fillStyle = grad;
        ctx.fillRect(cardX + 2, cardY + 2, cardW - 4, imgHeight);
      }
      ctx.restore();

      // 2. Category Pill Badge (Yellow/Amber background like sample)
      const pillX = cardX + Math.round(cardW * 0.04);
      const pillY = cardY + Math.round(cardH * 0.035);
      const pillH = Math.round(cardH * 0.06);
      const fontSizePill = Math.max(11, Math.round(width * 0.026));

      ctx.font = `600 ${fontSizePill}px Inter, system-ui, sans-serif`;
      const textMetrics = ctx.measureText(data.category);
      const pillW = textMetrics.width + Math.round(fontSizePill * 2);

      ctx.beginPath();
      ctx.roundRect(pillX, pillY, pillW, pillH, pillH / 2);
      ctx.fillStyle = "#F59E0B"; // Bright amber/orange-yellow
      ctx.fill();

      ctx.fillStyle = "#FFFFFF";
      ctx.textBaseline = "middle";
      ctx.fillText(data.category, pillX + Math.round(fontSizePill), pillY + pillH / 2 + 1);

      // 3. Content section below image
      const contentY = cardY + imgHeight + Math.round(cardH * 0.04);
      const contentLeft = cardX + Math.round(cardW * 0.05);
      const contentWidth = cardW - Math.round(cardW * 0.1);

      // Title + Verified checkmark
      const fontTitleSize = Math.max(14, Math.round(width * 0.035));
      ctx.font = `bold ${fontTitleSize}px "Playfair Display", Georgia, serif`;
      ctx.fillStyle = "#111827";
      ctx.textBaseline = "top";

      // Truncate title if too long
      let titleText = data.title;
      if (ctx.measureText(titleText).width > contentWidth - 30) {
        while (titleText.length > 0 && ctx.measureText(titleText + "...").width > contentWidth - 30) {
          titleText = titleText.slice(0, -1);
        }
        titleText += "...";
      }

      ctx.fillText(titleText, contentLeft, contentY);

      // Draw Green Checkmark icon ✅ next to title
      const titleWidth = ctx.measureText(titleText).width;
      const checkX = contentLeft + titleWidth + 6;
      const checkY = contentY + 2;
      const checkSize = Math.round(fontTitleSize * 0.85);

      ctx.beginPath();
      ctx.arc(checkX + checkSize / 2, checkY + checkSize / 2, checkSize / 2, 0, Math.PI * 2);
      ctx.fillStyle = "#10B981"; // Emerald green
      ctx.fill();

      // White check mark inside green circle
      ctx.beginPath();
      ctx.moveTo(checkX + checkSize * 0.28, checkY + checkSize * 0.52);
      ctx.lineTo(checkX + checkSize * 0.44, checkY + checkSize * 0.7);
      ctx.lineTo(checkX + checkSize * 0.74, checkY + checkSize * 0.32);
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = Math.max(1.5, checkSize * 0.15);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();

      // Date added line (uppercase gray text)
      const fontDateSize = Math.max(9, Math.round(width * 0.022));
      const dateY = contentY + fontTitleSize + Math.round(cardH * 0.025);
      ctx.font = `600 ${fontDateSize}px Inter, system-ui, sans-serif`;
      ctx.fillStyle = "#6B7280";
      ctx.fillText(`AJOUTÉ LE ${data.date.toUpperCase()}`, contentLeft, dateY);

      // Stars Rating & Review Count
      const ratingY = dateY + fontDateSize + Math.round(cardH * 0.02);
      const starSize = Math.max(10, Math.round(width * 0.024));

      for (let i = 0; i < 5; i++) {
        const sx = contentLeft + i * (starSize + 3);
        ctx.fillStyle = i < Math.floor(data.rating) ? "#F59E0B" : "#D1D5DB";
        ctx.font = `${starSize}px sans-serif`;
        ctx.fillText("★", sx, ratingY);
      }

      // Rating score text (e.g. "4.0 (2)")
      const fontRatingSize = Math.max(10, Math.round(width * 0.023));
      ctx.font = `500 ${fontRatingSize}px Inter, sans-serif`;
      ctx.fillStyle = "#4B5563";
      ctx.fillText(
        `${data.rating.toFixed(1)} (${data.reviewCount})`,
        contentLeft + 5 * (starSize + 3) + 6,
        ratingY + 1
      );

      // Specifications line (Disponibilité / Garantie)
      const fontSpecSize = Math.max(10, Math.round(width * 0.023));
      const specY = ratingY + starSize + Math.round(cardH * 0.025);

      ctx.font = `bold ${fontSpecSize}px Inter, sans-serif`;
      ctx.fillStyle = "#111827";
      ctx.fillText("Disponibilité: ", contentLeft, specY);

      const dispWidth = ctx.measureText("Disponibilité: ").width;
      ctx.font = `normal ${fontSpecSize}px Inter, sans-serif`;
      ctx.fillStyle = "#6B7280";
      ctx.fillText(data.availability || "2 jours", contentLeft + dispWidth, specY);

      const dispTotal = contentLeft + dispWidth + ctx.measureText(data.availability || "2 jours").width + 16;
      ctx.font = `bold ${fontSpecSize}px Inter, sans-serif`;
      ctx.fillStyle = "#111827";
      ctx.fillText("Garantie: ", dispTotal, specY);

      const garWidth = ctx.measureText("Garantie: ").width;
      ctx.font = `normal ${fontSpecSize}px Inter, sans-serif`;
      ctx.fillStyle = "#6B7280";
      ctx.fillText(data.guarantee || "Complet", dispTotal + garWidth, specY);

      // Price line (Bold bottom title e.g. "Sur devis" or "500 Fbu")
      const fontPriceSize = Math.max(13, Math.round(width * 0.032));
      const priceY = specY + fontSpecSize + Math.round(cardH * 0.035);

      ctx.font = `bold ${fontPriceSize}px Inter, system-ui, sans-serif`;
      ctx.fillStyle = "#111827";
      ctx.fillText(data.price, contentLeft, priceY);

      // Brand Watermark in bottom right corner
      const fontBrandSize = Math.max(9, Math.round(width * 0.02));
      ctx.font = `bold ${fontBrandSize}px Inter, sans-serif`;
      ctx.fillStyle = "#059669";
      ctx.textAlign = "right";
      ctx.fillText("KoraChannel", cardX + cardW - Math.round(cardW * 0.05), priceY + 2);
      ctx.textAlign = "left";

      // Trigger callback if provided (export full-res data URL)
      if (onRenderedRef.current && canvasRef.current) {
        onRenderedRef.current(canvasRef.current.toDataURL("image/png", 1.0));
      }
    };

    img.onload = () => {
      setImageLoaded(true);
      renderCardContent();
    };

    img.onerror = () => {
      renderCardContent();
    };

    // Render immediately if image cached or failing
    renderCardContent();
  }, [data, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        width: displayWidth ? `${displayWidth}px` : undefined,
        height: displayHeight ? `${displayHeight}px` : undefined,
        imageRendering: "crisp-edges",
      }}
      className={`rounded-2xl shadow-sm border border-border/40 max-w-full h-auto ${className}`}
    />
  );
};
