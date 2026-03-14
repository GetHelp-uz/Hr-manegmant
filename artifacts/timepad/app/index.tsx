import React, { useEffect } from "react";
import {
  View, Text, StyleSheet, Pressable, Platform, ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useApp } from "@/context/AppContext";
import Colors from "@/constants/colors";
import * as Haptics from "expo-haptics";

const MODES = [
  {
    key: "kiosk",
    icon: "monitor" as const,
    title: "TimePad Kioski",
    subtitle: "Planshet kioski — QR, NFC, TimePad kod",
    color: "#2563EB",
    bg: "#EEF2FF",
    badge: "Planshet",
  },
  {
    key: "employee",
    icon: "key" as const,
    title: "Xodim ilovasi",
    subtitle: "Shaxsiy QR, NFC, TimePad kodingizni ko'ring",
    color: "#7C3AED",
    bg: "#F5F3FF",
    badge: "Mobile Key",
  },
  {
    key: "admin",
    icon: "users" as const,
    title: "HR Boshqaruv",
    subtitle: "Xodimlar, davomat, maosh nazorati",
    color: "#059669",
    bg: "#ECFDF5",
    badge: "HR Control",
  },
] as const;

export default function ModeSelect() {
  const { mode, loading } = useApp();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (loading) return;
    if (mode === "kiosk") router.replace("/kiosk");
    else if (mode === "employee") router.replace("/employee-home");
    else if (mode === "admin") router.replace("/admin-home");
  }, [mode, loading]);

  if (loading) {
    return (
      <View style={styles.loadingCenter}>
        <View style={styles.logoBox}>
          <Feather name="clock" size={32} color={Colors.primary} />
        </View>
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 24 }} />
      </View>
    );
  }

  const handleSelect = (key: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({ pathname: "/login", params: { modeKey: key } });
  };

  return (
    <View style={[
      styles.root,
      {
        paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0),
        paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0),
      }
    ]}>
      {/* Logo */}
      <View style={styles.header}>
        <View style={styles.logoBox}>
          <Feather name="clock" size={32} color={Colors.primary} />
        </View>
        <Text style={styles.appName}>HR Control</Text>
        <Text style={styles.appSub}>O'rta Osiyo uchun HR Boshqaruv Tizimi</Text>
      </View>

      {/* Mode cards */}
      <View style={styles.modeList}>
        <Text style={styles.selectLabel}>Rejimni tanlang</Text>
        {MODES.map((m) => (
          <Pressable
            key={m.key}
            style={({ pressed }) => [
              styles.modeCard,
              { borderColor: m.color + "30" },
              pressed && { transform: [{ scale: 0.98 }], opacity: 0.9 },
            ]}
            onPress={() => handleSelect(m.key)}
          >
            <View style={[styles.modeIconBox, { backgroundColor: m.bg }]}>
              <Feather name={m.icon} size={28} color={m.color} />
            </View>
            <View style={styles.modeInfo}>
              <View style={styles.modeTitleRow}>
                <Text style={styles.modeTitle}>{m.title}</Text>
                <View style={[styles.modeBadge, { backgroundColor: m.color + "15" }]}>
                  <Text style={[styles.modeBadgeText, { color: m.color }]}>{m.badge}</Text>
                </View>
              </View>
              <Text style={styles.modeSubtitle}>{m.subtitle}</Text>
            </View>
            <Feather name="chevron-right" size={20} color={Colors.textMuted} />
          </Pressable>
        ))}
      </View>

      <Text style={styles.footer}>HR Workforce Management Platform — O'zbekiston</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: 24,
  },
  loadingCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.background,
  },
  header: {
    alignItems: "center",
    paddingTop: 40,
    paddingBottom: 32,
  },
  logoBox: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  appName: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  appSub: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginTop: 4,
    textAlign: "center",
  },
  modeList: {
    gap: 12,
    flex: 1,
  },
  selectLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  modeCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1.5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  modeIconBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  modeInfo: {
    flex: 1,
    gap: 4,
  },
  modeTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  modeTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  modeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  modeBadgeText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  modeSubtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  footer: {
    textAlign: "center",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    paddingVertical: 24,
  },
});
