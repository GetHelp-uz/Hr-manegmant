import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Pressable, Platform, Animated } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import * as Haptics from "expo-haptics";

function fmtTime() {
  return new Date().toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" });
}
function fmtDate() {
  const d = new Date();
  const months = ["Yanvar","Fevral","Mart","Aprel","May","Iyun","Iyul","Avgust","Sentabr","Oktabr","Noyabr","Dekabr"];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

export default function ResultScreen() {
  const { success, name, action, late, message } = useLocalSearchParams<{
    success: string; name: string; action: string; late: string; message: string;
  }>();
  const insets = useSafeAreaInsets();
  const isSuccess = success === "true";
  const lateMin = parseInt(late || "0");
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isSuccess) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 100, friction: 8 }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
    const timer = setTimeout(() => router.back(), 5000);
    return () => clearTimeout(timer);
  }, []);

  const actionLabel = action === "check_out" ? "Chiqish qayd etildi" :
                      action === "already_checked_in" ? "Bugun allaqachon kirib bo'lgan" :
                      "Kirish qayd etildi";

  return (
    <View style={[
      styles.root,
      { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0), paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) },
      isSuccess ? styles.successBg : styles.dangerBg,
    ]}>
      <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }], opacity: opacityAnim }]}>
        <View style={[styles.iconCircle, isSuccess ? styles.successCircle : styles.dangerCircle]}>
          <Feather
            name={isSuccess ? (action === "check_out" ? "log-out" : "log-in") : "x"}
            size={48}
            color={isSuccess ? Colors.success : Colors.danger}
          />
        </View>

        {name ? (
          <>
            <Text style={styles.greetingText}>
              {isSuccess ? (action === "check_out" ? "Xayr," : "Xush kelibsiz,") : "Xato!"}
            </Text>
            <Text style={styles.nameText}>{name}</Text>
          </>
        ) : (
          <Text style={styles.nameText}>{isSuccess ? "Muvaffaqiyat!" : "Ruxsat yo'q"}</Text>
        )}

        <View style={[styles.statusBadge, isSuccess ? styles.successBadge : styles.dangerBadge]}>
          <Text style={[styles.statusText, { color: isSuccess ? Colors.success : Colors.danger }]}>
            {isSuccess ? actionLabel : (message || "Xato yuz berdi")}
          </Text>
        </View>

        {isSuccess && lateMin > 0 && (
          <View style={styles.lateBadge}>
            <Feather name="alert-triangle" size={16} color={Colors.warning} />
            <Text style={styles.lateText}>Kechikish: {lateMin} daqiqa</Text>
          </View>
        )}

        <View style={styles.timeRow}>
          <View style={styles.timeItem}>
            <Feather name="clock" size={16} color={Colors.textMuted} />
            <Text style={styles.timeValue}>{fmtTime()}</Text>
          </View>
          <View style={styles.timeDivider} />
          <View style={styles.timeItem}>
            <Feather name="calendar" size={16} color={Colors.textMuted} />
            <Text style={styles.timeValue}>{fmtDate()}</Text>
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.8 }]}
          onPress={() => router.back()}
        >
          <Feather name="arrow-left" size={18} color="#fff" />
          <Text style={styles.backBtnText}>Orqaga (5s)</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  successBg: { backgroundColor: "#ECFDF5" },
  dangerBg: { backgroundColor: "#FEF2F2" },
  card: {
    width: "100%",
    maxWidth: 480,
    backgroundColor: "#fff",
    borderRadius: 28,
    padding: 40,
    alignItems: "center",
    gap: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 40,
    elevation: 16,
  },
  iconCircle: { width: 100, height: 100, borderRadius: 50, alignItems: "center", justifyContent: "center" },
  successCircle: { backgroundColor: Colors.successLight },
  dangerCircle: { backgroundColor: Colors.dangerLight },
  greetingText: { fontSize: 16, fontFamily: "Inter_400Regular", color: Colors.textSecondary },
  nameText: { fontSize: 32, fontFamily: "Inter_700Bold", color: Colors.text, textAlign: "center" },
  statusBadge: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20 },
  successBadge: { backgroundColor: Colors.successLight },
  dangerBadge: { backgroundColor: Colors.dangerLight },
  statusText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  lateBadge: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: Colors.warningLight, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12,
  },
  lateText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.warning },
  timeRow: {
    flexDirection: "row", alignItems: "center", gap: 16,
    backgroundColor: Colors.background, borderRadius: 14, paddingHorizontal: 20, paddingVertical: 12,
  },
  timeItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  timeDivider: { width: 1, height: 20, backgroundColor: Colors.border },
  timeValue: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.text },
  backBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: Colors.primary, borderRadius: 14, paddingHorizontal: 24, paddingVertical: 14,
    marginTop: 8,
  },
  backBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
