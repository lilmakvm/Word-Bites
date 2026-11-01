import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.lilma.wordbites',
  appName: 'Word Bites',
  webDir: 'dist',
  bundledWebRuntime: false,
  android: {
    backgroundColor: '#f4ead9'
  }
};

export default config;