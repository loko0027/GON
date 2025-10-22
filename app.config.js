import 'dotenv/config';

export default ({ config }) => ({
  ...config,
  name: "GoleiroON",
  slug: "goleiroon",
  version: "5.0.22",
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
    versionCode: 7,
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
          // ===================================================================
          //                           CORREÇÃO APLICADA
          // O Expo SDK 53 exige o Android SDK 35. As versões foram atualizadas.
          // ===================================================================
          compileSdkVersion: 35,
          targetSdkVersion: 35,
          buildToolsVersion: "35.0.0",
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
