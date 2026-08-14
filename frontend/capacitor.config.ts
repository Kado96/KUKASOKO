import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kukasoko.app',
  appName: 'KUKASOKO',
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      // Le splash reste affiché jusqu'à ce qu'on appelle SplashScreen.hide()
      // dans main.tsx — cela évite la page blanche ET le fond jaune persistant
      launchAutoHide: false,
      // Durée max de sécurité si hide() n'est jamais appelé
      launchShowDuration: 5000,
      // Fondu rapide à la sortie
      launchFadeOutDuration: 300,
      // Fond jaune KUKASOKO pendant le splash uniquement
      backgroundColor: '#FFC107',
      // Android : logo centré, sans étirement
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_INSIDE',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
  },
};

export default config;
