export default ({ config }) => ({
  ...config,
  name: "GoleiroON",
  slug: "goleiroon",
  version: "3.0.01",
  orientation: "portrait",
  icon: "./assets/images/newicone.png",

  // ✅ CONFIGURAÇÃO DA TELA DE SPLASH ADICIONADA
  splash: {
    image: "./assets/images/Splashinew.png", // Apontando para a sua imagem
    resizeMode: "contain",                  // Garante que a imagem não seja cortada
    backgroundColor: "#FFFFFF",             // Cor de fundo (pode alterar se quiser)
  },

  scheme: "goleiroon",
  userInterfaceStyle: "automatic",

  notification: {
    iosDisplayInForeground: true,
  },

  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.pablo095.goleiroon",
    infoPlist: {
      UIBackgroundModes: ["remote-notification"],
    },
  },

  android: {
    package: "com.pablo095.goleiroon",
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
      foregroundImage: "./assets/images/newicone.png",
      backgroundColor: "#FFFFFF",
    },
    notification: {
      icon: "./assets/images/Sino.png",
      color: "#FF0000",
    },
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
        mode: "production",
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