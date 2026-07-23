import React, { createContext, useContext, useState, useEffect } from "react";

export interface SiteSettings {
  siteName: string;
  siteLogo: string;
  footerEmail: string;
  footerPhone: string;
  heroTitle: string;
  heroSubtitle: string;
  heroImage: string;
  // Theme Colors (HSL components)
  primaryColor: string;      // --primary
  primaryFgColor: string;    // --primary-foreground
  accentColor: string;       // --accent
  accentFgColor: string;     // --accent-foreground
  bgColor: string;           // --background
  fgColor: string;           // --foreground
  cardColor: string;         // --card
  cardFgColor: string;       // --card-foreground
  borderColor: string;       // --border
  themeName: "Amber" | "Emerald" | "Blue" | "Ruby" | "Indigo" | "Custom";
}

interface SiteContextType {
  settings: SiteSettings;
  updateSettings: (newSettings: Partial<SiteSettings>) => void;
  resetSettings: () => void;
}

const defaultSettings: SiteSettings = {
  siteName: "KUKASOKO",
  siteLogo: "/logo.jpg",
  footerEmail: "info@kukasoko.com",
  footerPhone: "+257 00 00 00 00",
  heroTitle: "Trouvez tout ce dont vous avez besoin au Burundi.",
  heroSubtitle: "Recherchez des propriétés, des services et des articles à vendre en un clic",
  heroImage: "",
  // Default values matching index.css :root
  primaryColor: "225 30% 18%",
  primaryFgColor: "45 100% 96%",
  accentColor: "40 95% 55%",
  accentFgColor: "225 30% 12%",
  bgColor: "220 20% 97%",
  fgColor: "225 25% 15%",
  cardColor: "0 0% 100%",
  cardFgColor: "225 25% 15%",
  borderColor: "220 15% 90%",
  themeName: "Amber",
};

// Preset beautiful colors themes with full color palettes
export const THEMES = {
  Amber: {
    primaryColor: "225 30% 18%",
    primaryFgColor: "45 100% 96%",
    accentColor: "40 95% 55%",
    accentFgColor: "225 30% 12%",
    bgColor: "220 20% 97%",
    fgColor: "225 25% 15%",
    cardColor: "0 0% 100%",
    cardFgColor: "225 25% 15%",
    borderColor: "220 15% 90%",
  },
  Emerald: {
    primaryColor: "155 35% 16%",
    primaryFgColor: "140 100% 96%",
    accentColor: "142 76% 45%",
    accentFgColor: "155 35% 10%",
    bgColor: "150 15% 97%",
    fgColor: "155 25% 15%",
    cardColor: "0 0% 100%",
    cardFgColor: "155 25% 15%",
    borderColor: "150 15% 90%",
  },
  Blue: {
    primaryColor: "220 40% 18%",
    primaryFgColor: "210 100% 97%",
    accentColor: "217 91% 60%",
    accentFgColor: "0 0% 100%",
    bgColor: "210 20% 97%",
    fgColor: "220 25% 15%",
    cardColor: "0 0% 100%",
    cardFgColor: "220 25% 15%",
    borderColor: "210 15% 90%",
  },
  Ruby: {
    primaryColor: "345 35% 15%",
    primaryFgColor: "340 100% 97%",
    accentColor: "346 84% 50%",
    accentFgColor: "0 0% 100%",
    bgColor: "340 15% 97%",
    fgColor: "345 25% 15%",
    cardColor: "0 0% 100%",
    cardFgColor: "345 25% 15%",
    borderColor: "340 15% 90%",
  },
  Indigo: {
    primaryColor: "244 35% 17%",
    primaryFgColor: "240 100% 97%",
    accentColor: "262 83% 58%",
    accentFgColor: "0 0% 100%",
    bgColor: "240 20% 97%",
    fgColor: "244 25% 15%",
    cardColor: "0 0% 100%",
    cardFgColor: "244 25% 15%",
    borderColor: "240 15% 90%",
  },
};

const SiteContext = createContext<SiteContextType | undefined>(undefined);

export const SiteProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<SiteSettings>(() => {
    const saved = localStorage.getItem("isoko_site_settings");
    if (saved) {
      try { return { ...defaultSettings, ...JSON.parse(saved) }; } catch { return defaultSettings; }
    }
    return defaultSettings;
  });

  // Apply all colors dynamically to document root styles
  useEffect(() => {
    const root = document.documentElement;
    if (root) {
      root.style.setProperty("--background", settings.bgColor);
      root.style.setProperty("--foreground", settings.fgColor);
      root.style.setProperty("--card", settings.cardColor);
      root.style.setProperty("--card-foreground", settings.cardFgColor);
      root.style.setProperty("--primary", settings.primaryColor);
      root.style.setProperty("--primary-foreground", settings.primaryFgColor);
      root.style.setProperty("--accent", settings.accentColor);
      root.style.setProperty("--accent-foreground", settings.accentFgColor);
      root.style.setProperty("--border", settings.borderColor);
      root.style.setProperty("--input", settings.borderColor);
      root.style.setProperty("--ring", settings.accentColor);

      // Save setting to localStorage
      localStorage.setItem("isoko_site_settings", JSON.stringify(settings));
    }
  }, [settings]);

  const updateSettings = (newSettings: Partial<SiteSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      // If themeName changed (and is not Custom), update colors automatically
      if (newSettings.themeName && newSettings.themeName !== "Custom" && newSettings.themeName in THEMES) {
        const theme = THEMES[newSettings.themeName];
        Object.assign(updated, theme);
      }
      return updated;
    });
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
    localStorage.removeItem("isoko_site_settings");
  };

  return (
    <SiteContext.Provider value={{ settings, updateSettings, resetSettings }}>
      {children}
    </SiteContext.Provider>
  );
};

export const useSite = () => {
  const context = useContext(SiteContext);
  if (!context) {
    throw new Error("useSite must be used within a SiteProvider");
  }
  return context;
};
