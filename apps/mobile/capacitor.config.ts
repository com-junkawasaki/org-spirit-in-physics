import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ai.gftd.spirit',
  appName: 'Spirit in Physics',
  webDir: '../web/build',
  bundledWebRuntime: false,
  server: {
    androidScheme: 'https',
    hostname: 'sip.junkawasaki.com', // 本番ドメインに合わせる
    allowNavigation: ['sip.junkawasaki.com', '*.clerk.accounts.dev', 'localhost', '127.0.0.1']
  },
  ios: {
    contentInset: 'always'
  }
};

export default config;

