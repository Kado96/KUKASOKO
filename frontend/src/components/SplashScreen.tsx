import React, { useEffect, useState } from "react";

export const SplashScreen: React.FC = () => {
  const [visible, setVisible] = useState(true);
  const [animateOut, setAnimateOut] = useState(false);

  useEffect(() => {
    // Check if we've already shown the splash during this browser session
    const hasShown = sessionStorage.getItem("kukasoko_splash_shown");
    if (hasShown) {
      setVisible(false);
      return;
    }

    const timer = setTimeout(() => {
      setAnimateOut(true);
      const hideTimer = setTimeout(() => {
        setVisible(false);
        sessionStorage.setItem("kukasoko_splash_shown", "true");
      }, 600); // fade out duration
      return () => clearTimeout(hideTimer);
    }, 2200); // display duration

    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#FBBF24] transition-opacity duration-500 ease-in-out ${
        animateOut ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      <div className="flex flex-col items-center space-y-6 animate-pulse">
        {/* Rounded Golden/Yellow App-Icon Style Logo */}
        <div className="w-36 h-36 rounded-[2.5rem] bg-white shadow-2xl p-1 overflow-hidden flex items-center justify-center ring-4 ring-white/30 transform hover:scale-105 transition-transform duration-500">
          <img
            src="/logo.jpg"
            alt="KUKASOKO Logo"
            className="w-full h-full object-cover rounded-[2.3rem]"
          />
        </div>

        {/* Brand details */}
        <div className="text-center">
          <h1 className="font-display font-black text-3xl tracking-wider text-slate-900 uppercase">
            KUKASOKO
          </h1>
          <p className="text-[10px] font-bold text-slate-800 tracking-[0.3em] uppercase mt-1">
            — ONLINE —
          </p>
        </div>

        {/* Loading Spinner */}
        <div className="w-8 h-8 border-4 border-slate-900/20 border-t-slate-900 rounded-full animate-spin mt-4"></div>
      </div>
    </div>
  );
};
