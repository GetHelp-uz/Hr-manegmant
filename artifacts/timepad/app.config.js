const MODE = process.env.EXPO_PUBLIC_DEFAULT_MODE || "unified";

const profiles = {
  kiosk: {
    name: "TimePad Kioski",
    slug: "timepad",
    scheme: "timepad-kiosk",
    package: "com.hrcontrol.kiosk",
    bundleId: "com.hrcontrol.kiosk",
    splashBg: "#2563EB",
    iconBg: "#2563EB",
    description: "TimePad — Planshet kioski, QR, NFC, PIN davomat",
  },
  employee: {
    name: "HR Mobile Key",
    slug: "timepad",
    scheme: "hrcontrol-employee",
    package: "com.hrcontrol.employee",
    bundleId: "com.hrcontrol.employee",
    splashBg: "#7C3AED",
    iconBg: "#7C3AED",
    description: "Xodim kaliti — QR, NFC, PIN kirish ilovasi",
  },
  admin: {
    name: "HR Admin",
    slug: "timepad",
    scheme: "hrcontrol-admin",
    package: "com.hrcontrol.admin",
    bundleId: "com.hrcontrol.admin",
    splashBg: "#059669",
    iconBg: "#059669",
    description: "HR Boshqaruv — xodimlar va davomat nazorati",
  },
  unified: {
    name: "HR Control",
    slug: "timepad",
    scheme: "hrcontrol",
    package: "com.hrcontrol.app",
    bundleId: "com.hrcontrol.app",
    splashBg: "#1A56DB",
    iconBg: "#1A56DB",
    description: "HR Workforce Management — TimePad, Mobile Key, HR Admin",
  },
};

const p = profiles[MODE] || profiles.unified;

module.exports = {
  expo: {
    name: p.name,
    slug: p.slug,
    version: "1.0.0",
    orientation: "default",
    icon: "./assets/images/icon.png",
    scheme: p.scheme,
    userInterfaceStyle: "light",
    newArchEnabled: true,
    splash: {
      image: "./assets/images/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: p.splashBg,
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: p.bundleId,
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: p.iconBg,
      },
      package: p.package,
      permissions: [
        "CAMERA",
        "VIBRATE",
        "NFC",
        "READ_PHONE_STATE",
      ],
    },
    web: {
      favicon: "./assets/images/icon.png",
    },
    plugins: [
      [
        "expo-router",
        {
          origin: "https://replit.com/",
        },
      ],
      "expo-font",
      "expo-web-browser",
      [
        "expo-camera",
        {
          cameraPermission: "QR kod skanerlash uchun kameraga ruxsat kerak",
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    extra: {
      defaultMode: MODE,
      eas: {
        projectId: process.env.EAS_PROJECT_ID || "",
      },
    },
  },
};
