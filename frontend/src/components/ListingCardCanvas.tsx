import React, { useRef, useEffect } from "react";
import { ListingTemplateData } from "@/services/TemplateEngineService";

interface ListingCardCanvasProps {
  data: ListingTemplateData;
  width?: number;
  height?: number;
  /** Taille d'affichage CSS (rendu HD natif, affiché en petit) */
  displayWidth?: number;
  displayHeight?: number;
  /** Couleur accent (hex) — modifiable par l'utilisateur */
  accentColor?: string;
  /** Texte personnalisé à afficher sur la photo */
  customText?: string;
  className?: string;
  onRendered?: (dataUrl: string) => void;
}

/** Dessine un rectangle arrondi compatible tous navigateurs */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.lineTo(x + w - rad, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
  ctx.lineTo(x + w, y + h - rad);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
  ctx.lineTo(x + rad, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rad);
  ctx.lineTo(x, y + rad);
  ctx.quadraticCurveTo(x, y, x + rad, y);
  ctx.closePath();
}

/** Coupe un texte pour qu'il rentre dans maxWidth */
function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 0 && ctx.measureText(t + "…").width > maxWidth) {
    t = t.slice(0, -1);
  }
  return t + "…";
}

/** Word-wrap : retourne max maxLines lignes */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines = 2
): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
      if (lines.length >= maxLines) break;
    } else {
      line = test;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  return lines;
}

export const ListingCardCanvas: React.FC<ListingCardCanvasProps> = ({
  data,
  width = 1080,
  height = 1080,
  displayWidth,
  displayHeight,
  accentColor = "#F59E0B",
  customText,
  className = "",
  onRendered,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onRenderedRef = useRef(onRendered);

  useEffect(() => {
    onRenderedRef.current = onRendered;
  }, [onRendered]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    const W = width;
    const H = height;
    const scale = W / 1080;

    // ── Load product image ────────────────────────────────────────────────────
    const img = new Image();
    img.crossOrigin = "anonymous";
    const src = data.image || "";
    img.src = src.startsWith("http") ? (src.includes("?") ? `${src}&t=1` : `${src}?t=1`) : src;

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      // ── 1. FULL-BLEED BACKGROUND ─────────────────────────────────────────
      if (img.complete && img.naturalWidth > 0) {
        const ir = img.naturalWidth / img.naturalHeight;
        const cr = W / H;
        let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;
        if (ir > cr) { sw = sh * cr; sx = (img.naturalWidth - sw) / 2; }
        else { sh = sw / cr; sy = (img.naturalHeight - sh) / 2; }
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, W, H);
      } else {
        // Fallback gradient
        const g = ctx.createLinearGradient(0, 0, W, H);
        g.addColorStop(0, "#1a1a2e");
        g.addColorStop(1, "#0f0f1a");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
      }

      // ── 2. GRADIENT OVERLAYS ────────────────────────────────────────────
      // Top vignette (for badge readability)
      const topG = ctx.createLinearGradient(0, 0, 0, H * 0.38);
      topG.addColorStop(0, "rgba(0,0,0,0.60)");
      topG.addColorStop(1, "rgba(0,0,0,0.00)");
      ctx.fillStyle = topG;
      ctx.fillRect(0, 0, W, H * 0.38);

      // Bottom gradient (main text area)
      const botG = ctx.createLinearGradient(0, H * 0.28, 0, H);
      botG.addColorStop(0, "rgba(0,0,0,0.00)");
      botG.addColorStop(0.42, "rgba(0,0,0,0.72)");
      botG.addColorStop(1,   "rgba(0,0,0,0.97)");
      ctx.fillStyle = botG;
      ctx.fillRect(0, H * 0.28, W, H * 0.72);

      const pad = Math.round(40 * scale);

      // ── 3. TOP-LEFT : LOGO K + CATEGORY PILLS ───────────────────────────
      const topY = Math.round(44 * scale);
      const logoR = Math.round(26 * scale);

      // Logo circle
      ctx.beginPath();
      ctx.arc(pad + logoR, topY + logoR, logoR, 0, Math.PI * 2);
      ctx.fillStyle = accentColor;
      ctx.fill();

      ctx.font = `bold ${Math.round(24 * scale)}px Inter, system-ui, sans-serif`;
      ctx.fillStyle = "#fff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("K", pad + logoR, topY + logoR + 1);

      // Category pill (amber)
      const pillH = Math.round(34 * scale);
      const pillR2 = pillH / 2;
      const cat1X = pad + logoR * 2 + Math.round(14 * scale);
      const cat1Y = topY + logoR - pillH / 2;
      ctx.font = `600 ${Math.round(15 * scale)}px Inter, system-ui, sans-serif`;
      const cat1W = ctx.measureText(data.category).width + Math.round(26 * scale);
      roundRect(ctx, cat1X, cat1Y, cat1W, pillH, pillR2);
      ctx.fillStyle = accentColor;
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(data.category, cat1X + Math.round(13 * scale), cat1Y + pillH / 2);

      // Sub-cat pill (glass)
      const cat2X = cat1X + cat1W + Math.round(8 * scale);
      const subLabel = data.location || "Bujumbura";
      ctx.font = `500 ${Math.round(14 * scale)}px Inter, system-ui, sans-serif`;
      const cat2W = ctx.measureText(subLabel).width + Math.round(24 * scale);
      roundRect(ctx, cat2X, cat1Y, cat2W, pillH, pillR2);
      ctx.fillStyle = "rgba(255,255,255,0.20)";
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.35)";
      ctx.lineWidth = Math.max(1, Math.round(1.5 * scale));
      ctx.stroke();
      ctx.fillStyle = "#fff";
      ctx.fillText(subLabel, cat2X + Math.round(12 * scale), cat1Y + pillH / 2);
      ctx.textBaseline = "top";

      // ── 4. RIGHT-SIDE FEATURE PILLS ────────────────────────────────────
      const features = [
        { icon: "⏱", label: "Disponibilité", sub: data.availability || "Rapide" },
        { icon: "🛡", label: "Garantie",      sub: data.guarantee   || "Complet" },
        { icon: "📍", label: "Lieu",          sub: data.location    || "Bujumbura" },
      ];
      const fpW  = Math.round(210 * scale);
      const fpH2 = Math.round(56 * scale);
      const fpGap = Math.round(12 * scale);
      const fpX  = W - pad - fpW;
      const fpStartY = Math.round(160 * scale);

      features.forEach((f, i) => {
        const fy = fpStartY + i * (fpH2 + fpGap);
        roundRect(ctx, fpX, fy, fpW, fpH2, Math.round(10 * scale));
        ctx.fillStyle = "rgba(0,0,0,0.52)";
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.18)";
        ctx.lineWidth = Math.max(1, scale);
        ctx.stroke();

        ctx.font = `${Math.round(20 * scale)}px sans-serif`;
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#fff";
        ctx.fillText(f.icon, fpX + Math.round(14 * scale), fy + fpH2 / 2);

        ctx.font = `600 ${Math.round(14 * scale)}px Inter, system-ui, sans-serif`;
        ctx.fillStyle = "#ffffff";
        ctx.textBaseline = "top";
        ctx.fillText(f.label, fpX + Math.round(44 * scale), fy + Math.round(10 * scale));

        ctx.font = `${Math.round(12 * scale)}px Inter, system-ui, sans-serif`;
        ctx.fillStyle = "rgba(255,255,255,0.68)";
        ctx.fillText(f.sub, fpX + Math.round(44 * scale), fy + Math.round(28 * scale));
      });

      // ── 5. VERIFIED BADGE ───────────────────────────────────────────────
      const verifiedY = Math.round(H * 0.525);
      const vH = Math.round(36 * scale);
      const vLabel = "✔  PROFESSIONNEL VÉRIFIÉ";
      ctx.font = `700 ${Math.round(13 * scale)}px Inter, system-ui, sans-serif`;
      const vW = ctx.measureText(vLabel).width + Math.round(28 * scale);
      roundRect(ctx, pad, verifiedY, vW, vH, vH / 2);
      ctx.fillStyle = "rgba(16,185,129,0.88)";
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.textBaseline = "middle";
      ctx.fillText(vLabel, pad + Math.round(14 * scale), verifiedY + vH / 2);
      ctx.textBaseline = "top";

      // ── 6. TITLE (word-wrapped, 2 lines max) ────────────────────────────
      const titleSize = Math.round(54 * scale);
      ctx.font = `800 ${titleSize}px Inter, system-ui, sans-serif`;
      ctx.fillStyle = "#ffffff";
      const titleY = verifiedY + vH + Math.round(18 * scale);
      const titleLines = wrapText(ctx, data.title, W - pad * 2.5, 2);
      titleLines.forEach((ln, i) => {
        ctx.fillText(ln, pad, titleY + i * (titleSize + Math.round(6 * scale)));
      });

      // ── 7. CUSTOM TEXT / DESCRIPTION ────────────────────────────────────
      const descText = customText || "Disponible maintenant sur KoraChannel";
      const descY = titleY + titleLines.length * (titleSize + Math.round(6 * scale)) + Math.round(10 * scale);
      ctx.font = `400 ${Math.round(18 * scale)}px Inter, system-ui, sans-serif`;
      ctx.fillStyle = "rgba(255,255,255,0.72)";
      ctx.fillText(fitText(ctx, descText, W - pad * 2), pad, descY);

      // ── 8. STAR RATING ──────────────────────────────────────────────────
      const starY = descY + Math.round(38 * scale);
      const starSz = Math.round(22 * scale);
      for (let i = 0; i < 5; i++) {
        ctx.fillStyle = i < Math.floor(data.rating) ? "#F59E0B" : "rgba(255,255,255,0.28)";
        ctx.font = `${starSz}px sans-serif`;
        ctx.textBaseline = "top";
        ctx.fillText("★", pad + i * (starSz + 4), starY);
      }
      ctx.font = `500 ${Math.round(17 * scale)}px Inter, sans-serif`;
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.fillText(
        `${data.rating.toFixed(1)} (${data.reviewCount} avis)`,
        pad + 5 * (starSz + 4) + Math.round(10 * scale),
        starY + 2
      );

      // ── 9. STATS ROW ────────────────────────────────────────────────────
      const statsY = starY + starSz + Math.round(22 * scale);
      const statItems = [
        { icon: "🕐", label: "Disponibilité", val: data.availability || "2 jours" },
        { icon: "✅", label: "Garantie",      val: data.guarantee   || "Complet" },
        { icon: "🌿", label: "Interventions", val: data.location    || "Sur place" },
      ];
      const colW = (W - pad * 2) / 3;
      statItems.forEach((s, i) => {
        const sx = pad + i * colW;
        ctx.font = `${Math.round(18 * scale)}px sans-serif`;
        ctx.fillStyle = "#fff";
        ctx.textBaseline = "top";
        ctx.fillText(s.icon, sx, statsY);

        ctx.font = `600 ${Math.round(14 * scale)}px Inter, sans-serif`;
        ctx.fillStyle = "rgba(255,255,255,0.60)";
        ctx.fillText(s.label, sx + Math.round(28 * scale), statsY + 1);

        ctx.font = `700 ${Math.round(16 * scale)}px Inter, sans-serif`;
        ctx.fillStyle = "#fff";
        ctx.fillText(s.val, sx + Math.round(28 * scale), statsY + Math.round(18 * scale));
      });

      // ── 10. PRICE CARD ──────────────────────────────────────────────────
      const pcH = Math.round(130 * scale);
      const pcY = H - Math.round(170 * scale);
      const pcPad = Math.round(24 * scale);
      roundRect(ctx, pad, pcY, W - pad * 2, pcH, Math.round(18 * scale));
      ctx.fillStyle = "rgba(10,10,15,0.88)";
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.10)";
      ctx.lineWidth = Math.max(1, scale);
      ctx.stroke();

      // "À partir de"
      ctx.font = `400 ${Math.round(14 * scale)}px Inter, sans-serif`;
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.textBaseline = "top";
      ctx.fillText("À partir de", pad + pcPad, pcY + Math.round(18 * scale));

      // Price
      ctx.font = `800 ${Math.round(42 * scale)}px Inter, system-ui, sans-serif`;
      ctx.fillStyle = "#ffffff";
      ctx.fillText(data.price, pad + pcPad, pcY + Math.round(36 * scale));

      // CTA Button
      const btnW = Math.round(290 * scale);
      const btnH = Math.round(58 * scale);
      const btnX = W - pad - pcPad - btnW;
      const btnY2 = pcY + (pcH - btnH) / 2;
      roundRect(ctx, btnX, btnY2, btnW, btnH, btnH / 2);
      ctx.fillStyle = accentColor;
      ctx.fill();

      ctx.font = `700 ${Math.round(18 * scale)}px Inter, system-ui, sans-serif`;
      ctx.fillStyle = "#fff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("📅 Réserver maintenant", btnX + btnW / 2, btnY2 + btnH / 2);
      ctx.textAlign = "left";
      ctx.textBaseline = "top";

      // ── 11. FOOTER ──────────────────────────────────────────────────────
      ctx.font = `400 ${Math.round(13 * scale)}px Inter, sans-serif`;
      ctx.fillStyle = "rgba(255,255,255,0.42)";
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.fillText(
        "✔ Paiement sécurisé  •  Service de qualité  •  KoraChannel",
        W / 2,
        H - Math.round(18 * scale)
      );
      ctx.textAlign = "left";
      ctx.textBaseline = "top";

      // ── 12. WATERMARK ───────────────────────────────────────────────────
      ctx.font = `bold ${Math.round(16 * scale)}px Inter, sans-serif`;
      ctx.fillStyle = "rgba(255,255,255,0.28)";
      ctx.textAlign = "right";
      ctx.textBaseline = "bottom";
      ctx.fillText("KoraChannel", W - Math.round(28 * scale), H - Math.round(44 * scale));
      ctx.textAlign = "left";
      ctx.textBaseline = "top";

      // Callback → full-res PNG
      if (onRenderedRef.current && canvasRef.current) {
        onRenderedRef.current(canvasRef.current.toDataURL("image/png", 1.0));
      }
    };

    img.onload = draw;
    img.onerror = draw;
    // Rendu immédiat si image déjà en cache
    if (img.complete) draw();
  }, [data, width, height, accentColor, customText]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        width: displayWidth ? `${displayWidth}px` : "100%",
        height: displayHeight ? `${displayHeight}px` : "auto",
        imageRendering: "crisp-edges",
      }}
      className={`rounded-2xl shadow-lg border border-white/10 ${className}`}
    />
  );
};
