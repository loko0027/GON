export default ({ config }) => ({
  ...config,
  name: "GoleiroON",
  slug: "goleiroon",
  version: "2.0.0",
  orientation: "portrait",
  icon: "./assets/images/goleiroon.png",
  scheme: "myapp",
  userInterfaceStyle: "automatic",
  
  notification: {
    iosDisplayInForeground: true,
    // No Android, a cor do ícone da notificação será definida no plugin abaixo
  },

  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.seunome.goleiroon",
    infoPlist: {
      UIBackgroundModes: ["remote-notification"],
    },
  },

  android: {
    package: "com.seunome.goleiroon",
    versionCode: 1,
    permissions: [
      "CAMERA",
      "RECORD_AUDIO",
      "WRITE_EXTERNAL_STORAGE",
      "READ_EXTERNAL_STORAGE",
      "ACCESS_FINE_LOCATION",
      "ACCESS_COARSE_LOCATION",
    ],
    adaptiveIcon: {
      foregroundImage: "./assets/images/goleiroon.png",
      backgroundColor: "#FFFFFF",
    },
  },

  web: {
    bundler: "metro",
    output: "single",
    favicon: "./assets/images/goleiroon.png",
  },

  plugins: [
    "expo-router",
    "expo-font",
    "expo-web-browser",
    [
      "expo-notifications",
      {
        icon: "./assets/images/Sino.png",
        color: "#FF0000",
        mode: "production", // usar 'development' se estiver testando localmente
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
      projectId: "c29e779a-d56e-46f2-a7db-a524757a9c52",
    },
  },

  updates: {
    fallbackToCacheTimeout: 0, // padrão recomendado para EAS
  },

  runtimeVersion: {
    policy: "appVersion",
  },
});
