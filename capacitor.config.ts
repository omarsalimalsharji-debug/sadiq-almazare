import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'om.sadiq.almazare',
  appName: 'صديق المزارع',
  webDir: 'dist',
  server: {
    // The first Android test APK loads the already-hosted Render app.
    // This keeps the existing /api endpoints and Firebase web flow connected.
    url: 'https://sadiq-almazare.onrender.com',
    cleartext: false,
    allowNavigation: ['sadiq-almazare.onrender.com'],
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
