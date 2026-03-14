import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, Pressable, ScrollView,
  Platform, Animated, ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useApp, API } from "@/context/AppContext";
import Colors from "@/constants/colors";
import * as Haptics from "expo-haptics";

function formatTime(d: Date) {
  return d.toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit", hour12: false });
}
function formatDate(d: Date) {
  const days = ["Yakshanba","Dushanba","Seshanba","Chorshanba","Payshanba","Juma","Shanba"];
  const months = ["Yanvar","Fevral","Mart","Aprel","May","Iyun","Iyul","Avgust","Sentabr","Oktabr","Noyabr","Dekabr"];
  return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

const METHOD_CONFIG = {
  qr:       { icon: "qr-code-outline" as any, feather: null, label: "QR Kod",     color: "#2563EB", bg: "#EEF2FF", iconLib: "Ionicons" as const },
  timepad:  { icon: null, feather: "grid" as any,             label: "TimePad",   color: "#7C3AED", bg: "#F5F3FF", iconLib: "Feather" as const },
  nfc:      { icon: null, feather: "wifi" as any,             label: "NFC Karta", color: "#059669", bg: "#ECFDF5", iconLib: "Feather" as const },
  face:     { icon: null, feather: "camera" as any,           label: "Face ID",   color: "#DC2626", bg: "#FEF2F2", iconLib: "Feather" as const },
  skud:     { icon: null, feather: "shield" as any,           label: "СКУД",      color: "#EA580C", bg: "#FFF7ED", iconLib: "Feather" as const },
};

export default function KioskScreen() {
  const { company, logout } = useApp();
  const insets = useSafeAreaInsets();
  const [now, setNow] = useState(new Date());
  const [todayAttendance, setTodayAttendance] = useState<any[]>([]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [lastCheckin, setLastCheckin] = useState<any>(null);

  useEffect(() => {
    if (!company) { router.replace("/"); return; }
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, [company]);

  const loadAttendance = useCallback(async () => {
    if (!company) return;
    setLoadingAttendance(true);
    try {
      const r = await fetch(`${API}/api/mobile/today-attendance`, { credentials: "include" });
      if (r.ok) setTodayAttendance(await r.json());
    } catch {}
    setLoadingAttendance(false);
  }, [company]);

  useEffect(() => { loadAttendance(); const t = setInterval(loadAttendance, 10000); return () => clearInterval(t); }, [loadAttendance]);

  const methods = company?.attendanceMethods?.length ? company.attendanceMethods : ["qr", "timepad"];

  const handleMethod = (method: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (method === "qr") router.push("/qr-scan");
    else if (method === "timepad") router.push("/timepad-entry");
    else if (method === "nfc") router.push("/nfc-entry");
    else if (method === "face") router.push("/face-entry");
  };

  const handleLogout = () => {
    logout();
    router.replace("/");
  };

  if (!company) return (
    <View style={styles.loadingCenter}>
      <ActivityIndicator size="large" color={Colors.primary} />
    </View>
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) }]}>
      {/* Header bar */}
      <View style={styles.header}>
        <View style={styles.companyInfo}>
          <View style={styles.companyIcon}>
            <Feather name="briefcase" size={20} color={Colors.primary} />
          </View>
          <Text style={styles.companyName}>{company.name}</Text>
        </View>
        <Pressable onPress={handleLogout} style={styles.logoutBtn}>
          <Feather name="log-out" size={18} color={Colors.textSecondary} />
        </Pressable>
      </View>

      <View style={styles.content}>
        {/* Left: Clock + Methods */}
        <View style={styles.leftPanel}>
          {/* Clock */}
          <View style={styles.clockCard}>
            <Text style={styles.clockTime}>{formatTime(now)}</Text>
            <Text style={styles.clockDate}>{formatDate(now)}</Text>
            <View style={styles.workTimeRow}>
              <Feather name="sunrise" size={14} color={Colors.primary} />
              <Text style={styles.workTimeText}>Ish boshlanishi: {company.workStartTime}</Text>
            </View>
          </View>

          {/* Attendance Methods */}
          <Text style={styles.sectionLabel}>Kirish usulini tanlang</Text>
          <View style={styles.methodGrid}>
            {methods.map((method) => {
              const cfg = METHOD_CONFIG[method as keyof typeof METHOD_CONFIG];
              if (!cfg) return null;
              return (
                <Pressable
                  key={method}
                  style={({ pressed }) => [
                    styles.methodCard,
                    { backgroundColor: cfg.bg, borderColor: cfg.color + "40" },
                    pressed && { transform: [{ scale: 0.96 }], opacity: 0.9 },
                  ]}
                  onPress={() => handleMethod(method)}
                >
                  <View style={[styles.methodIcon, { backgroundColor: cfg.color + "20" }]}>
                    <Feather name={cfg.feather || "grid"} size={32} color={cfg.color} />
                  </View>
                  <Text style={[styles.methodLabel, { color: cfg.color }]}>{cfg.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Right: Today's attendance */}
        <View style={styles.rightPanel}>
          <View style={styles.attendanceHeader}>
            <Text style={styles.attendanceTitle}>Bugungi davomat</Text>
            <View style={styles.attendanceBadge}>
              <Text style={styles.attendanceBadgeText}>{todayAttendance.length}</Text>
            </View>
            <Pressable onPress={loadAttendance} style={styles.refreshBtn}>
              <Feather name="refresh-cw" size={16} color={Colors.textSecondary} />
            </Pressable>
          </View>

          {loadingAttendance && todayAttendance.length === 0 ? (
            <View style={styles.attendanceEmpty}>
              <ActivityIndicator color={Colors.primary} />
            </View>
          ) : todayAttendance.length === 0 ? (
            <View style={styles.attendanceEmpty}>
              <Feather name="users" size={36} color={Colors.textMuted} />
              <Text style={styles.emptyText}>Hali hech kim kelmagan</Text>
            </View>
          ) : (
            <ScrollView style={styles.attendanceList} showsVerticalScrollIndicator={false}>
              {todayAttendance.map((item) => (
                <View key={item.id} style={styles.attendanceItem}>
                  <View style={[styles.avatarCircle, { backgroundColor: item.status === "late" ? Colors.warningLight : Colors.successLight }]}>
                    <Feather name="user" size={16} color={item.status === "late" ? Colors.warning : Colors.success} />
                  </View>
                  <View style={styles.attendanceInfo}>
                    <Text style={styles.attendeeName} numberOfLines={1}>{item.full_name}</Text>
                    <Text style={styles.attendeePosition} numberOfLines={1}>{item.position}</Text>
                  </View>
                  <View style={styles.attendanceTime}>
                    <Text style={[styles.timeText, { color: item.status === "late" ? Colors.warning : Colors.success }]}>
                      {item.check_in ? new Date(item.check_in).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" }) : "—"}
                    </Text>
                    {item.late_minutes > 0 && (
                      <Text style={styles.lateText}>+{item.late_minutes}m</Text>
                    )}
                    {item.check_out && (
                      <Text style={styles.checkOutText}>
                        {new Date(item.check_out).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })}
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 14,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  companyInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  companyIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },
  companyName: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  logoutBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
    flexDirection: "row",
    padding: 20,
    gap: 20,
  },
  leftPanel: {
    flex: 1.2,
    gap: 20,
  },
  clockCard: {
    backgroundColor: Colors.primary,
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
  },
  clockTime: {
    fontSize: 64,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    letterSpacing: -2,
  },
  clockDate: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.8)",
    marginTop: 4,
  },
  workTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  workTimeText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  sectionLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  methodGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
  },
  methodCard: {
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    minWidth: 130,
    flex: 1,
    minHeight: 120,
  },
  methodIcon: {
    width: 60,
    height: 60,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  methodLabel: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  rightPanel: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  attendanceHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 8,
  },
  attendanceTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    flex: 1,
  },
  attendanceBadge: {
    backgroundColor: Colors.primary,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  attendanceBadgeText: {
    color: "#fff",
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  refreshBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  attendanceEmpty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    textAlign: "center",
  },
  attendanceList: {
    flex: 1,
  },
  attendanceItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 10,
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  attendanceInfo: {
    flex: 1,
    gap: 2,
  },
  attendeeName: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  attendeePosition: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  attendanceTime: {
    alignItems: "flex-end",
    gap: 2,
  },
  timeText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  lateText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: Colors.warning,
  },
  checkOutText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
  },
});
