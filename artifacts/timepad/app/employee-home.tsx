import React, { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, Pressable, Platform,
  ScrollView, Image, ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useApp, API } from "@/context/AppContext";
import Colors from "@/constants/colors";
import * as Haptics from "expo-haptics";

const METHOD_INFO = {
  qr: { icon: "maximize" as const, label: "QR Kod", color: "#2563EB", bg: "#EEF2FF", desc: "QR kodingizni scanner qurilmasiga ko'rsating" },
  timepad: { icon: "grid" as const, label: "TimePad Kod", color: "#7C3AED", bg: "#F5F3FF", desc: "4-8 xonali shaxsiy kodingizni kioskte tering" },
  nfc: { icon: "wifi" as const, label: "NFC Karta", color: "#059669", bg: "#ECFDF5", desc: "NFC kartangizni kiosk qurilmasiga tuting" },
  face: { icon: "camera" as const, label: "Yuz aniqlash", color: "#DC2626", bg: "#FEF2F2", desc: "Kiosk kamerasiga yuzingizni ko'rsating" },
  skud: { icon: "shield" as const, label: "СКУД", color: "#EA580C", bg: "#FFF7ED", desc: "NFC kartangizni СКУД qurilmasiga tuting" },
};

function fmtTime(d: string) {
  return new Date(d).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" });
}

export default function EmployeeHome() {
  const { employee, logout, refreshEmployee } = useApp();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!employee) { router.replace("/"); return; }
    refreshEmployee();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshEmployee();
    setRefreshing(false);
  };

  const handleLogout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    logout();
    router.replace("/");
  };

  if (!employee) {
    return <View style={styles.loadingCenter}><ActivityIndicator color={Colors.primary} /></View>;
  }

  const method = employee.attendanceMethod || "qr";
  const methodInfo = METHOD_INFO[method as keyof typeof METHOD_INFO] || METHOD_INFO.qr;
  const today = employee.todayAttendance;

  return (
    <View style={[styles.root, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.userRow}>
          <View style={styles.avatar}>
            {employee.photo
              ? <Image source={{ uri: employee.photo }} style={styles.avatarImg} />
              : <Feather name="user" size={22} color={Colors.primary} />
            }
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{employee.fullName}</Text>
            <Text style={styles.userPosition}>{employee.position}</Text>
          </View>
        </View>
        <Pressable onPress={handleRefresh} style={styles.refreshBtn}>
          {refreshing
            ? <ActivityIndicator size="small" color={Colors.primary} />
            : <Feather name="refresh-cw" size={18} color={Colors.textSecondary} />
          }
        </Pressable>
        <Pressable onPress={handleLogout} style={styles.logoutBtn}>
          <Feather name="log-out" size={18} color={Colors.textSecondary} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 16) }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Today attendance status */}
        <View style={[
          styles.todayCard,
          today ? (today.check_in && today.check_out ? styles.doneCard : styles.inCard) : styles.absentCard
        ]}>
          <View style={styles.todayLeft}>
            <Text style={styles.todayLabel}>Bugungi holat</Text>
            <Text style={styles.todayStatus}>
              {!today ? "Hali kelmagan" :
               today.check_out ? "Ish tugallangan" :
               today.late_minutes > 0 ? `Kechikib keldi (+${today.late_minutes} daqiqa)` : "Ishda"}
            </Text>
          </View>
          <View style={styles.todayRight}>
            {today ? (
              <>
                <View style={styles.timeBox}>
                  <Feather name="log-in" size={12} color="rgba(255,255,255,0.8)" />
                  <Text style={styles.timeBoxText}>{fmtTime(today.check_in)}</Text>
                </View>
                {today.check_out && (
                  <View style={styles.timeBox}>
                    <Feather name="log-out" size={12} color="rgba(255,255,255,0.8)" />
                    <Text style={styles.timeBoxText}>{fmtTime(today.check_out)}</Text>
                  </View>
                )}
              </>
            ) : (
              <Feather name="clock" size={28} color="rgba(255,255,255,0.5)" />
            )}
          </View>
        </View>

        {/* Company */}
        <View style={styles.companyRow}>
          <Feather name="briefcase" size={14} color={Colors.textMuted} />
          <Text style={styles.companyText}>{employee.companyName}</Text>
        </View>

        {/* Attendance method */}
        <Text style={styles.sectionLabel}>Sizning kirish usuli</Text>
        <View style={[styles.methodCard, { borderColor: methodInfo.color + "30" }]}>
          <View style={[styles.methodIconBox, { backgroundColor: methodInfo.bg }]}>
            <Feather name={methodInfo.icon} size={32} color={methodInfo.color} />
          </View>
          <View style={styles.methodInfo}>
            <Text style={[styles.methodLabel, { color: methodInfo.color }]}>{methodInfo.label}</Text>
            <Text style={styles.methodDesc}>{methodInfo.desc}</Text>
          </View>
        </View>

        {/* QR Code display */}
        {method === "qr" && employee.qrCode && (
          <>
            <Text style={styles.sectionLabel}>Sizning QR kodingiz</Text>
            <View style={styles.qrCard}>
              <Image source={{ uri: employee.qrCode }} style={styles.qrImage} resizeMode="contain" />
              <Text style={styles.qrHint}>Scanner qurilmasiga ko'rsating</Text>
            </View>
          </>
        )}

        {/* TimePad code */}
        {method === "timepad" && employee.timepadCode && (
          <>
            <Text style={styles.sectionLabel}>Sizning TimePad kodingiz</Text>
            <View style={styles.timepadCard}>
              <Text style={styles.timepadLabel}>Shaxsiy TimePad Kod</Text>
              <View style={styles.codeDisplay}>
                {employee.timepadCode.split("").map((c, i) => (
                  <View key={i} style={styles.codeDigit}>
                    <Text style={styles.codeDigitText}>{c}</Text>
                  </View>
                ))}
              </View>
              <Text style={styles.timepadHint}>Bu kodni faqat o'zingiz bilib turishi kerak</Text>
            </View>
          </>
        )}

        {/* NFC Card info */}
        {(method === "nfc" || method === "skud") && (
          <>
            <Text style={styles.sectionLabel}>NFC Karta</Text>
            <View style={styles.nfcCard}>
              <Feather name="credit-card" size={32} color={methodInfo.color} />
              {employee.nfcCardId ? (
                <>
                  <Text style={styles.nfcId}>{employee.nfcCardId}</Text>
                  <Text style={styles.nfcHint}>NFC kartangiz biriktirilgan</Text>
                </>
              ) : (
                <>
                  <Text style={styles.nfcNoCard}>NFC karta biriktirilmagan</Text>
                  <Text style={styles.nfcHint}>Admin bilan bog'laning</Text>
                </>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  loadingCenter: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: Colors.background },
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
    gap: 8,
  },
  userRow: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: "#EEF2FF", alignItems: "center", justifyContent: "center", overflow: "hidden",
  },
  avatarImg: { width: "100%", height: "100%" },
  userInfo: { flex: 1 },
  userName: { fontSize: 15, fontFamily: "Inter_700Bold", color: Colors.text },
  userPosition: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textSecondary },
  refreshBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.background, alignItems: "center", justifyContent: "center" },
  logoutBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.background, alignItems: "center", justifyContent: "center" },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, gap: 16 },
  todayCard: {
    borderRadius: 20, padding: 20, flexDirection: "row", alignItems: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 6,
  },
  inCard: { backgroundColor: Colors.primary },
  doneCard: { backgroundColor: Colors.success },
  absentCard: { backgroundColor: Colors.textSecondary },
  todayLeft: { flex: 1 },
  todayLabel: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.75)", marginBottom: 4 },
  todayStatus: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#fff" },
  todayRight: { gap: 6, alignItems: "flex-end" },
  timeBox: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  timeBoxText: { color: "#fff", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  companyRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  companyText: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textMuted },
  sectionLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary, textTransform: "uppercase", letterSpacing: 0.4 },
  methodCard: {
    flexDirection: "row", alignItems: "center", gap: 16,
    backgroundColor: Colors.surface, borderRadius: 18, padding: 18, borderWidth: 1.5,
  },
  methodIconBox: { width: 60, height: 60, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  methodInfo: { flex: 1 },
  methodLabel: { fontSize: 17, fontFamily: "Inter_700Bold", marginBottom: 4 },
  methodDesc: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textSecondary },
  qrCard: {
    backgroundColor: Colors.surface, borderRadius: 18, padding: 24,
    alignItems: "center", borderWidth: 1, borderColor: Colors.border, gap: 12,
  },
  qrImage: { width: 220, height: 220, borderRadius: 8 },
  qrHint: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textSecondary },
  timepadCard: {
    backgroundColor: Colors.surface, borderRadius: 18, padding: 24,
    alignItems: "center", borderWidth: 1, borderColor: "#7C3AED40", gap: 12,
  },
  timepadLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary, textTransform: "uppercase" },
  codeDisplay: { flexDirection: "row", gap: 8 },
  codeDigit: {
    width: 52, height: 64, borderRadius: 14,
    backgroundColor: "#7C3AED", alignItems: "center", justifyContent: "center",
    shadowColor: "#7C3AED", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  codeDigitText: { fontSize: 28, fontFamily: "Inter_700Bold", color: "#fff" },
  timepadHint: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textMuted },
  nfcCard: {
    backgroundColor: Colors.surface, borderRadius: 18, padding: 24,
    alignItems: "center", borderWidth: 1, borderColor: Colors.border, gap: 10,
  },
  nfcId: { fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.text, fontVariant: ["tabular-nums"] },
  nfcNoCard: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary },
  nfcHint: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textMuted },
});
