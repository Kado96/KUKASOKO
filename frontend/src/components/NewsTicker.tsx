import { useEffect, useRef, useState, useCallback } from "react";
import { X, Radio } from "lucide-react";
import { useNewsTicker } from "@/contexts/NewsTickerContext";

/**
 * France 24–style continuous news ticker.
 *
 * The scroll track holds TWO identical copies of the message list.
 * The animation moves the track leftward by exactly one copy width,
 * then instantly resets — producing a perfectly seamless loop that
 * always starts from the RIGHT edge of the viewport.
 *
 *  ┌──────────────────────────────────────────────────────┐
 *  │ viewport                                             │
 *  │         [copy A ────────────────] [copy B ──────────│──]
 *  └──────────────────────────────────────────────────────┘
 *         ← scrolls left until copy B aligns with copy A's start
 *         → JS resets position → seamless
 */

const PX_PER_SEC = 80; // scroll speed (pixels per second)

const NewsTicker = () => {
  const { messages, isVisible, setIsVisible } = useNewsTicker();
  const [isPaused, setIsPaused] = useState(false);

  // Refs for the two-copy track and animation frame
  const trackRef = useRef<HTMLDivElement>(null);
  const copyARef = useRef<HTMLSpanElement>(null);
  const rafRef = useRef<number>(0);
  const posRef = useRef<number>(0);       // current X position (px), starts at 0 = right edge
  const startXRef = useRef<number>(0);   // viewport width (starting offset)
  const copyWidthRef = useRef<number>(0);
  const lastTimeRef = useRef<number | null>(null);

  const activeMessages = messages.filter((m) => m.active);

  // Measure and start the animation
  const startTicker = useCallback(() => {
    if (!trackRef.current || !copyARef.current) return;

    const viewportW = trackRef.current.parentElement?.clientWidth ?? window.innerWidth;
    const copyW = copyARef.current.offsetWidth;

    if (copyW === 0) return; // not rendered yet

    copyWidthRef.current = copyW;
    startXRef.current = viewportW;   // text enters from right
    posRef.current = viewportW;      // initial position = just off right edge
    lastTimeRef.current = null;

    // Apply initial position instantly (no transition)
    trackRef.current.style.transition = "none";
    trackRef.current.style.transform = `translateX(${viewportW}px)`;
  }, []);

  // Main animation loop
  useEffect(() => {
    if (!isVisible || activeMessages.length === 0) return;

    // Wait one frame for DOM to paint, then measure
    const initFrame = requestAnimationFrame(() => {
      startTicker();
    });

    const animate = (timestamp: number) => {
      if (!trackRef.current) return;

      if (!isPaused) {
        if (lastTimeRef.current === null) {
          lastTimeRef.current = timestamp;
        }
        const delta = (timestamp - lastTimeRef.current) / 1000; // seconds
        lastTimeRef.current = timestamp;

        posRef.current -= PX_PER_SEC * delta;

        // When the first copy has fully scrolled off left, reset to seamless start
        if (posRef.current <= -copyWidthRef.current) {
          posRef.current += copyWidthRef.current;
        }

        trackRef.current.style.transform = `translateX(${posRef.current}px)`;
      } else {
        lastTimeRef.current = null; // reset delta when unpausing
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(initFrame);
      cancelAnimationFrame(rafRef.current);
    };
  }, [isVisible, activeMessages.length, isPaused, startTicker]);

  // Re-measure when messages change
  useEffect(() => {
    // Give DOM one paint to render new messages then re-measure
    const t = setTimeout(startTicker, 50);
    return () => clearTimeout(t);
  }, [messages, startTicker]);

  if (!isVisible || activeMessages.length === 0) return null;

  // Duplicate the list for seamless looping
  const renderMessages = (keySuffix: string) =>
    activeMessages.map((msg, idx) => (
      <span
        key={`${keySuffix}-${msg.id}-${idx}`}
        className="inline-flex items-center"
      >
        {/* Bullet separator */}
        <span className="mx-3 sm:mx-5 text-red-500 font-bold text-xs sm:text-base select-none">●</span>

        {/* Message text */}
        <span
          className="text-xs sm:text-sm font-semibold tracking-wide"
          style={{ color: msg.paid ? "#fbbf24" : "#f1f5f9" }}
        >
          {msg.text}
        </span>

        {/* Paid badge */}
        {msg.paid && (
          <span className="ml-2.5 text-[9px] font-black uppercase tracking-widest bg-amber-500 text-amber-950 px-1.5 py-0.5 rounded-sm">
            Pub
          </span>
        )}
      </span>
    ));

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] flex items-stretch select-none shadow-md h-9 sm:h-11">
      {/* ── Red label — icône seule sur mobile, "Info" dès sm ── */}
      <div className="flex items-center gap-1 px-2.5 sm:gap-2 sm:px-3.5 bg-red-600 text-white shrink-0 z-10">
        <Radio className="w-3 h-3 sm:w-3.5 sm:h-3.5 animate-pulse shrink-0" />
        <span className="hidden sm:inline text-[11px] font-black uppercase tracking-[0.2em] whitespace-nowrap">
          Info
        </span>
      </div>

      {/* ── Triangle separator — étroit sur mobile ── */}
      <div
        className="shrink-0 w-0 h-0 border-t-[36px] sm:border-t-[44px] border-r-[8px] sm:border-r-[16px] border-t-red-600 border-r-transparent"
        aria-hidden
      />

      {/* ── Scrolling viewport ── */}
      <div
        className="flex-1 bg-[#111827] overflow-hidden relative flex items-center"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <div
          ref={trackRef}
          className="flex items-center whitespace-nowrap will-change-transform"
          style={{ transform: "translateX(0)" }}
        >
          <span ref={copyARef} className="inline-flex items-center">
            {renderMessages("a")}
          </span>
          <span className="inline-flex items-center" aria-hidden>
            {renderMessages("b")}
          </span>
        </div>
      </div>

      {/* ── Close button ── */}
      <button
        onClick={() => setIsVisible(false)}
        className="shrink-0 flex items-center justify-center w-8 sm:w-10 bg-[#0d0d1a] hover:bg-[#1a1a2e] text-white/50 hover:text-white transition-colors"
        title="Fermer le bandeau"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

export default NewsTicker;
