import React, { useState } from "react";
import {
  View, Text, StyleSheet, Pressable, Platform, Animated,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useApp, API } from "@/context/AppContext";
import Colors from "@/constants/colors";
import * as Haptics from "expo-haptics";

const KEYS = [
  ["1","2","3"],
  ["4","5","6"],
  ["7","8","9"],
  ["Kirish","0","⌫"],
];

export default function TimePadEntry() {
  const { company } = useApp();
  const insets = useSafeAreaInsets();
  const [code, setCode] = useState("");
  const [direction, setDirection] = useState<"in" | "out">("in");
  const [loading, setLoading] = useState(false);

  const handleKey = (key: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (key === "⌫") {
      setCode(prev => prev.slice(0, -1));
    } else if (key === "Kirish") {
      submitCode();
    } else if (code.length < 8) {
      setCode(prev => prev + key);
    }
  };

  const submitCode = async () => {
    if (!code || code.length < 4) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    if (!company) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/mobile/timepad-check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code, companyId: company.id, direction }),
      });
      const result = await res.json();
      if (result.granted) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.push({
          pathname: "/result",
          params: {
            success: "true",
            name: result.employee?.fullName || "",
            action: result.action || "check_in",
            late: (result.lateMinutes || 0).toString(),
            message: result.message || "",
          }
        });
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        router.push({ pathname: "/result", params: { success: "false", message: result.message || "Kod noto'g'ri", name: "", action: "" } });
      }
    } catch {
      router.push({ pathname: "/result", params: { success: "false", message: "Server bilan bog'lanib bo'lmadi", name: "", action: "" } });
    } finally {
      setLoading(false);
      setCode("");
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0), paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) }]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={Colors.text} />
        </Pressable>
        <Text style={styles.topTitle}>TimePad</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.body}>
        <View style={styles.iconBox}>
          <Feather name="grid" size={36} color="#7C3AED" />
        </View>
        <Text style={styles.heading}>Shaxsiy kodingizni kiriting</Text>
        <Text style={styles.subheading}>Admin tomonidan berilgan 4-8 xonali kod</Text>

        {/* Direction */}
        <View style={styles.dirRow}>
          <Pressable style={[styles.dirBtn, direction === "in" && styles.dirIn]} onPress={() => setDirection("in")}>
            <Feather name="log-in" size={14} color={direction === "in" ? "#fff" : Colors.textSecondary} />
            <Text style={[styles.dirText, direction === "in" && { color: "#fff" }]}>Kirish</Text>
          </Pressable>
          <Pressable style={[styles.dirBtn, direction === "out" && styles.dirOut]} onPress={() => setDirection("out")}>
            <Feather name="log-out" size={14} color={direction === "out" ? "#fff" : Colors.textSecondary} />
            <Text style={[styles.dirText, direction === "out" && { color: "#fff" }]}>Chiqish</Text>
          </Pressable>
        </View>

        {/* Code display */}
        <View style={styles.codeDisplay}>
          {[...Array(Math.max(code.length, 4))].map((_, i) => (
            <View
              key={i}
              style={[
                styles.codeDot,
                i < code.length ? styles.codeDotFilled : styles.codeDotEmpty,
              ]}
            >
              {i < code.length && <Text style={styles.codeChar}>•</Text>}
            </View>
          ))}
        </View>

        {/* Numpad */}
        <View style={styles.numpad}>
          {KEYS.map((row, ri) => (
            <View key={ri} style={styles.numpadRow}>
              {row.map((key) => (
                <Pressable
                  key={key}
                  style={({ pressed }) => [
                    styles.numKey,
                    key === "Kirish" && styles.numKeyGreen,
                    key === "⌫" && styles.numKeyDelete,
                    pressed && { opacity: 0.7, transform: [{ scale: 0.95 }] },
                  ]}
                  onPress={() => handleKey(key)}
                  disabled={loading}
                >
                  <Text style={[
                    styles.numKeyText,
                    key === "Kirish" && styles.numKeyTextGreen,
                    key === "⌫" && styles.numKeyTextDelete,
                  ]}>
                    {key}
                  </Text>
                </Pressable>
              ))}
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: Colors.background, alignItems: "center", justifyContent: "center" },
  topTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.text },
  body: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 20 },
  iconBox: { width: 72, height: 72, borderRadius: 20, backgroundColor: "#F5F3FF", alignItems: "center", justifyContent: "center" },
  heading: { fontSize: 22, fontFamily: "Inter_700Bold", color: Colors.text, textAlign: "center" },
  subheading: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.textSecondary, textAlign: "center" },
  dirRow: { flexDirection: "row", gap: 10 },
  dirBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, backgroundColor: Colors.border + "60", borderWidth: 1, borderColor: Colors.border },
  dirIn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  dirOut: { backgroundColor: Colors.danger, borderColor: Colors.danger },
  dirText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary },
  codeDisplay: { flexDirection: "row", gap: 10, alignItems: "center", minHeight: 56 },
  codeDot: { width: 48, height: 56, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  codeDotFilled: { backgroundColor: "#7C3AED", shadowColor: "#7C3AED", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  codeDotEmpty: { backgroundColor: Colors.surface, borderWidth: 2, borderColor: Colors.border },
  codeChar: { fontSize: 32, color: "#fff", fontFamily: "Inter_700Bold" },
  numpad: { gap: 12, width: "100%", maxWidth: 320 },
  numpadRow: { flexDirection: "row", gap: 12, justifyContent: "center" },
  numKey: {
    width: 88, height: 72, borderRadius: 18,
    backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  numKeyGreen: { backgroundColor: "#059669", borderColor: "#059669" },
  numKeyDelete: { backgroundColor: Colors.dangerLight, borderColor: Colors.danger + "40" },
  numKeyText: { fontSize: 26, fontFamily: "Inter_700Bold", color: Colors.text },
  numKeyTextGreen: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#fff" },
  numKeyTextDelete: { fontSize: 22, color: Colors.danger },
});
