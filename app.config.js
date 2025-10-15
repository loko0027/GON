import 'dotenv/config';

export default ({ config }) => ({
  ...config,
  name: "GoleiroON",
  slug: "goleiroon",
  version: "4.0.02",
  orientation: "portrait",
  icon: "./assets/images/newicone.png",

  splash: {
    image: "./assets/images/newicone.png",
    resizeMode: "contain",
    backgroundColor: "#8b5cf6",
  },

  scheme: "goleiroon",
  userInterfaceStyle: "automatic",

  notification: {
    iosDisplayInForeground: true, 
  },

  android: {
    package: "com.pablo095.goleiroon",
    // ===== ALTERAÇÃO IMPORTANTE E OBRIGATÓRIA =====
    versionCode: 4, // <-- AUMENTEI DE 1 PARA 2. AUMENTE PARA O PRÓXIMO NÚMERO DISPONÍVEL.
    // ===============================================
    permissions: [
      "CAMERA",
      "RECORD_AUDIO",
      "WRITE_EXTERNAL_STORAGE",
      "READ_EXTERNAL_STORAGE",
      "ACCESS_FINE_LOCATION",
      "ACCESS_COARSE_LOCATION",
      "com.google.android.c2dm.permission.RECEIVE",
    ],
    adaptiveIcon: {
      foregroundImage: "./assets/images/newicone.png",
      backgroundColor: "#FFFFFF",
    },
    googleServicesFile: "./google-services.json",
  },

  web: {
    bundler: "metro",
    output: "single",
    favicon: "./assets/images/newicone.png",
  },

  plugins: [
    "expo-router",
    "expo-font",
    "expo-web-browser",
    [
      "expo-notifications",
      {
        "icon": "./assets/images/Sino.png",
        "color": "#FF0000",
        "mode": "production",
      },
    ],
    [
      "expo-build-properties",
      {
        android: {
          compileSdkVersion: 36,
          targetSdkVersion: 36,
          buildToolsVersion: "36.0.0",
        },
        ios: {
          deploymentTarget: "15.1",
        },
      },
    ],
  ],

  experiments: {
    typedRoutes: true,
    tsconfigPaths: true,
  },

  extra: {
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    eas: {
      projectId: "b94c12e5-d086-46c1-a641-f399cda2ce70",
    },
  },

  updates: {
    fallbackToCacheTimeout: 0,
  },

  runtimeVersion: {
    policy: "appVersion",
  },
});