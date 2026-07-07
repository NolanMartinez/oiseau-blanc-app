import type { CapacitorConfig } from '@capacitor/cli';

// Configuration de l'app native (iOS/Android) qui embarque l'app web Friggo.
// L'app charge le build local (dossier `dist`) et appelle l'API du serveur
// (URL injectée au build via VITE_API_URL) → app autonome, validable par l'App Store.
const config: CapacitorConfig = {
  appId: 'fr.oiseaublanc.friggo',
  appName: 'Friggo',
  webDir: 'dist',
  backgroundColor: '#ffffff',
  ios: {
    contentInset: 'always',
  },
};

export default config;
