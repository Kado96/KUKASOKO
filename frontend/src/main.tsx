import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n"; // Initialize i18next before rendering
import { Capacitor } from "@capacitor/core";
import { SplashScreen } from "@capacitor/splash-screen";

// Rendre l'app React
const root = createRoot(document.getElementById("root")!);
root.render(<App />);

// Cacher le splash APRÈS que React a peint le premier écran
// - launchAutoHide: false dans capacitor.config.ts maintient le splash jusqu'ici
// - Le délai de 200ms garantit que le DOM est visible avant la transition
// - Le fond jaune du splash disparaît proprement grâce au fondu (fadeOutDuration: 300ms)
if (Capacitor.isNativePlatform()) {
  setTimeout(() => {
    SplashScreen.hide({ fadeOutDuration: 300 });
  }, 200);
}
