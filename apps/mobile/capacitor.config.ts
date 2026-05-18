import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.junkawasaki.spirit-in-physics',
  appName: 'Spirit in Physics',
  webDir: '../web/build',
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
    hostname: 'spirit-in-physics.com',
    allowNavigation: [
      'sip.junkawasaki.com',
      'spirit-in-physics.com',
      '*.spirit-in-physics.com',
      // Local development
      'localhost',
      '127.0.0.1'
    ]
  },
  ios: {
    contentInset: 'always',
    // Allow inline media playback (for better WebView experience)
    allowsLinkPreview: false
  },
  plugins: {
    // Capacitor HTTP plugin for better cookie handling
    CapacitorHttp: {
      enabled: true
    }
  }
};

export default config;

