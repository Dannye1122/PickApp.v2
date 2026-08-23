import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.pickapp.tracker',
  appName: 'PickApp',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
