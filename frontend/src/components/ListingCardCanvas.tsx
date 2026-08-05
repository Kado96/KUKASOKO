import React, { useRef, useEffect } from "react";
import { ListingTemplateData } from "@/services/TemplateEngineService";

interface ListingCardCanvasProps {
  data: ListingTemplateData;
  width?: number;
  height?: number;
  displayWidth?: number;
  displayHeight?: number;
  accentColor?: string;
  customText?: string;
  className?: string;
  isBlog?: boolean;
  onRendered?: (dataUrl: string) => void;
}

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
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

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number, maxLines = 2): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const t = line ? `${line} ${w}` : w;
    if (ctx.measureText(t).width > maxW && line) {
      lines.push(line);
      line = w;
      if (lines.length >= maxLines) break;
    } else {
      line = t;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  return lines;
}

function fit(ctx: CanvasRenderingContext2D, text: string, maxW: number): string {
  if (ctx.measureText(text).width <= maxW) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + "…").width > maxW) t = t.slice(0, -1);
  return t + "…";
}

function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  dx: number, dy: number, dw: number, dh: number
) {
  if (!img.complete || img.naturalWidth === 0) {
    const g = ctx.createLinearGradient(dx, dy, dx + dw, dy + dh);
    g.addColorStop(0, "#1a1a2e");
    g.addColorStop(1, "#0f0f1a");
    ctx.fillStyle = g;
    ctx.fillRect(dx, dy, dw, dh);
    return;
  }
  const ir = img.naturalWidth / img.naturalHeight;
  const cr = dw / dh;
  let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;
  if (ir > cr) { sw = sh * cr; sx = (img.naturalWidth - sw) / 2; }
  else { sh = sw / cr; sy = (img.naturalHeight - sh) / 2; }
  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
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
  isBlog = false,
  onRendered,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cbRef = useRef(onRendered);
  useEffect(() => { cbRef.current = onRendered; }, [onRendered]);

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

    // Détecter le format
    const isLandscape = W > H * 1.25;
    const S = W / 1080; // facteur de mise à l'échelle

    const img = new Image();
    img.crossOrigin = "anonymous";
    const src = data.image || "";
    img.src = src.startsWith("http") ? (src.includes("?") ? `${src}&nc=1` : `${src}?nc=1`) : src;

    // Chargement du vrai logo KUKASOKO depuis /public/logo.jpg
    const logoImg = new Image();
    logoImg.crossOrigin = "anonymous";
    logoImg.src = `${window.location.origin}/logo.jpg`;

    const DARK_BG = "#0b0b10";
    const PAD = Math.round(52 * S);

    let imgReady = false;
    let logoReady = false;

    const tryDraw = () => {
      if (!imgReady || !logoReady) return;
      draw();
    };

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      if (isLandscape) {
        // ═══════════════════════════════════════════
        // FORMAT PAYSAGE : Photo gauche | Texte droite
        // ═══════════════════════════════════════════
        const photoW = Math.round(W * 0.54);
        const textX = photoW + Math.round(8 * S);
        const textW = W - textX;

        // ── Photo (gauche, plein) ──────────────────
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, photoW, H);
        ctx.clip();
        drawCoverImage(ctx, img, 0, 0, photoW, H);
        // Vignette douce côté droit pour la transition
        const vg = ctx.createLinearGradient(photoW - Math.round(120 * S), 0, photoW, 0);
        vg.addColorStop(0, "rgba(0,0,0,0)");
        vg.addColorStop(1, DARK_BG);
        ctx.fillStyle = vg;
        ctx.fillRect(0, 0, photoW, H);
        ctx.restore();

        // ── Top vignette sur la photo ──────────────
        const topG = ctx.createLinearGradient(0, 0, 0, Math.round(160 * S));
        topG.addColorStop(0, "rgba(0,0,0,0.55)");
        topG.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = topG;
        ctx.fillRect(0, 0, photoW, Math.round(160 * S));

        // ── Panel droite ──────────────────────────
        ctx.fillStyle = DARK_BG;
        ctx.fillRect(photoW, 0, textW + 10, H);

        // Barre accent verticale
        ctx.fillStyle = accentColor;
        ctx.fillRect(photoW, 0, Math.round(6 * S), H);

        drawTextPanel(ctx, textX, 0, textW, H, S, PAD, data, accentColor, customText, isBlog);

        // Badge logo sur la photo
        drawTopBadge(ctx, Math.round(44 * S), Math.round(44 * S), S, accentColor, data.category, logoImg);

      } else {
        // ═══════════════════════════════════════════
        // FORMAT PORTRAIT / CARRÉ : Photo haut | Texte bas
        // ═══════════════════════════════════════════
        const photoH = Math.round(H * 0.545);
        const textY = photoH + Math.round(7 * S);
        const textH = H - textY;

        // ── Photo (haut, pleine) ───────────────────
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, W, photoH);
        ctx.clip();
        drawCoverImage(ctx, img, 0, 0, W, photoH);
        // Vignette uniquement en haut (petit) pour lisibilité du badge
        const topG = ctx.createLinearGradient(0, 0, 0, Math.round(180 * S));
        topG.addColorStop(0, "rgba(0,0,0,0.52)");
        topG.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = topG;
        ctx.fillRect(0, 0, W, Math.round(180 * S));
        ctx.restore();

        // ── Barre accent (séparateur) ──────────────
        ctx.fillStyle = accentColor;
        ctx.fillRect(0, photoH, W, Math.round(7 * S));

        // ── Panel bas (texte) ─────────────────────
        ctx.fillStyle = DARK_BG;
        ctx.fillRect(0, textY, W, textH + 4);

        drawTextPanel(ctx, 0, textY, W, textH, S, PAD, data, accentColor, customText, isBlog);

        // Badge logo sur la photo
        drawTopBadge(ctx, PAD, Math.round(44 * S), S, accentColor, data.category, logoImg);
      }

      // Callback PNG HD
      if (cbRef.current && canvasRef.current) {
        cbRef.current(canvasRef.current.toDataURL("image/png", 1.0));
      }
    };

    img.onload = () => { imgReady = true; tryDraw(); };
    img.onerror = () => { imgReady = true; tryDraw(); };
    logoImg.onload = () => { logoReady = true; tryDraw(); };
    logoImg.onerror = () => { logoReady = true; tryDraw(); };

    // Si les deux sont déjà en cache
    if (img.complete) imgReady = true;
    if (logoImg.complete) logoReady = true;
    if (imgReady && logoReady) draw();

  }, [data, width, height, accentColor, customText, isBlog]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        width: displayWidth ? `${displayWidth}px` : "100%",
        height: displayHeight ? `${displayHeight}px` : "auto",
        imageRendering: "auto",
      }}
      className={`rounded-xl shadow-xl ${className}`}
    />
  );
};

// ── Badge logo + catégorie (top de la photo) ──────────────────────────────────
function drawTopBadge(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  S: number, accentColor: string, category: string,
  logoImg?: HTMLImageElement
) {
  const logoSize = Math.round(112 * S); // logo bien visible
  const logoRadius = Math.round(20 * S);

  // Dessiner le logo KUKASOKO en carré arrondi avec clip
  ctx.save();
  rr(ctx, x, y, logoSize, logoSize, logoRadius);

  if (logoImg && logoImg.complete && logoImg.naturalWidth > 0) {
    // Clip et dessin du vrai logo
    ctx.clip();
    ctx.drawImage(logoImg, x, y, logoSize, logoSize);
  } else {
    // Fallback : carré accent + lettre K
    ctx.fillStyle = accentColor;
    ctx.fill();
    ctx.clip();
    ctx.font = `bold ${Math.round(32 * S)}px Inter, system-ui, sans-serif`;
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("K", x + logoSize / 2, y + logoSize / 2 + 1);
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
  }
  ctx.restore();

  // Contour blanc autour du logo
  ctx.save();
  rr(ctx, x, y, logoSize, logoSize, logoRadius);
  ctx.strokeStyle = "rgba(255,255,255,0.85)";
  ctx.lineWidth = Math.max(2, Math.round(3 * S));
  ctx.stroke();
  ctx.restore();

  // Pill catégorie (à droite du logo)
  const pillH = Math.round(44 * S);
  const pillX = x + logoSize + Math.round(16 * S);
  const pillY = y + (logoSize - pillH) / 2;
  ctx.font = `700 ${Math.round(20 * S)}px Inter, system-ui, sans-serif`;
  const pillW = ctx.measureText(category).width + Math.round(34 * S);
  rr(ctx, pillX, pillY, pillW, pillH, pillH / 2);
  ctx.fillStyle = accentColor;
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.textBaseline = "middle";
  ctx.fillText(category, pillX + Math.round(17 * S), pillY + pillH / 2);
  ctx.textBaseline = "top";
}


// ── Panel texte professionnel ─────────────────────────────────────────────────
function drawTextPanel(
  ctx: CanvasRenderingContext2D,
  px: number, py: number, pw: number, ph: number,
  S: number, PAD: number,
  data: ListingTemplateData,
  accentColor: string,
  customText?: string,
  isBlog?: boolean
) {
  const innerX = px + PAD;
  const innerW = pw - PAD * 2;
  let curY = py + Math.round(36 * S);

  // ── Badge VÉRIFIÉ / BLOG BADGE ─────────────────────────────────────────────
  const vLabel = isBlog ? "📰  ARTICLE DE BLOG KUKASOKO" : "✔  PROFESSIONNEL VÉRIFIÉ";
  ctx.font = `700 ${Math.round(17 * S)}px Inter, system-ui, sans-serif`;
  const vW = ctx.measureText(vLabel).width + Math.round(28 * S);
  const vH = Math.round(36 * S);
  rr(ctx, innerX, curY, vW, vH, vH / 2);
  ctx.fillStyle = isBlog ? accentColor : "#10B981";
  ctx.fill();
  ctx.fillStyle = isBlog ? "#000" : "#fff";
  ctx.textBaseline = "middle";
  ctx.fillText(vLabel, innerX + Math.round(14 * S), curY + vH / 2);
  ctx.textBaseline = "top";
  curY += vH + Math.round(30 * S);

  // ── TITRE (grand, impactant) ──────────────────────────────────────────────
  const titleSize = Math.round(isBlog ? 52 * S : 72 * S);
  ctx.font = `900 ${titleSize}px Inter, system-ui, sans-serif`;
  ctx.fillStyle = "#FFFFFF";
  const titleLines = wrap(ctx, data.title, innerW, 2);
  const lineH = Math.round(titleSize * 1.12);
  titleLines.forEach((ln, i) => {
    ctx.fillText(ln, innerX, curY + i * lineH);
  });
  curY += titleLines.length * lineH + Math.round(22 * S);

  if (isBlog) {
    // ── BLOC RÉSUMÉ BLOG (3-4 phrases minimum au lieu d'étoiles/prix) ───────
    // customText contient le résumé de l'article transmis
    const descText = customText?.trim() || "Découvrez l'intégralité de notre dossier et nos conseils sur le blog Kukasoko.";
    ctx.font = `400 ${Math.round(24 * S)}px Inter, system-ui, sans-serif`;
    ctx.fillStyle = "rgba(255,255,255,0.72)";
    const descLines = wrap(ctx, descText, innerW, 4); // Permet jusqu'à 4 lignes de texte
    const descLineH = Math.round(32 * S);
    descLines.forEach((ln, i) => {
      ctx.fillText(ln, innerX, curY + i * descLineH);
    });
    curY += descLines.length * descLineH + Math.round(34 * S);

    // Ligne séparateur
    ctx.beginPath();
    ctx.moveTo(innerX, curY);
    ctx.lineTo(px + pw - PAD, curY);
    ctx.strokeStyle = "rgba(255,255,255,0.10)";
    ctx.lineWidth = Math.max(1, S);
    ctx.stroke();
    curY += Math.round(28 * S);

    // Bouton de lecture CTA
    const btnH = Math.round(76 * S);
    const btnW2 = pw - PAD * 2;
    const btnY = curY;
    rr(ctx, innerX, btnY, btnW2, btnH, Math.round(12 * S));
    ctx.fillStyle = accentColor;
    ctx.fill();

    ctx.font = `700 ${Math.round(26 * S)}px Inter, system-ui, sans-serif`;
    ctx.fillStyle = "#000";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("📖  Lire l'article sur KUKASOKO", innerX + btnW2 / 2, btnY + btnH / 2);
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    curY += btnH + Math.round(22 * S);

  } else {
    // ── Étoiles + note (Annonce E-commerce) ──────────────────────────────────
    const starSz = Math.round(30 * S);
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = i < Math.floor(data.rating) ? accentColor : "rgba(255,255,255,0.22)";
      ctx.font = `${starSz}px sans-serif`;
      ctx.textBaseline = "top";
      ctx.fillText("★", innerX + i * (starSz + 5), curY);
    }
    ctx.font = `600 ${Math.round(24 * S)}px Inter, sans-serif`;
    ctx.fillStyle = "rgba(255,255,255,0.80)";
    ctx.fillText(
      `  ${data.rating.toFixed(1)} · ${data.reviewCount} avis`,
      innerX + 5 * (starSz + 5),
      curY + 3
    );
    curY += starSz + Math.round(30 * S);

    // Ligne séparateur
    ctx.beginPath();
    ctx.moveTo(innerX, curY);
    ctx.lineTo(px + pw - PAD, curY);
    ctx.strokeStyle = "rgba(255,255,255,0.10)";
    ctx.lineWidth = Math.max(1, S);
    ctx.stroke();
    curY += Math.round(28 * S);

    // ── PRIX ──────────────────────────────────────────────────────────────────
    ctx.font = `400 ${Math.round(22 * S)}px Inter, sans-serif`;
    ctx.fillStyle = "rgba(255,255,255,0.48)";
    ctx.textBaseline = "top";
    ctx.fillText("Prix annoncé", innerX, curY);
    curY += Math.round(26 * S);

    ctx.font = `900 ${Math.round(80 * S)}px Inter, system-ui, sans-serif`;
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(data.price, innerX, curY);
    curY += Math.round(84 * S) + Math.round(28 * S);

    // ── Bouton CTA ────────────────────────────────────────────────────────────
    const btnH = Math.round(76 * S);
    const btnW2 = pw - PAD * 2;
    const btnY = curY;
    rr(ctx, innerX, btnY, btnW2, btnH, Math.round(12 * S));
    ctx.fillStyle = accentColor;
    ctx.fill();

    ctx.font = `700 ${Math.round(28 * S)}px Inter, system-ui, sans-serif`;
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("📅  Réserver maintenant", innerX + btnW2 / 2, btnY + btnH / 2);
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    curY += btnH + Math.round(22 * S);
  }

  // ── Footer ────────────────────────────────────────────────────────────────
  ctx.font = `400 ${Math.round(18 * S)}px Inter, sans-serif`;
  ctx.fillStyle = "rgba(255,255,255,0.32)";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText("✔ Paiement sécurisé  •  Service de qualité  •  KUKASOKO", px + pw / 2, curY);
  ctx.textAlign = "left";
}
