import React, { useState } from "react";
import {
  View, Text, StyleSheet, Pressable, TextInput,
  Platform, ActivityIndicator, Alert, KeyboardAvoidingView, ScrollView,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useApp } from "@/context/AppContext";
import Colors from "@/constants/colors";
import * as Haptics from "expo-haptics";

const MODE_INFO = {
  kiosk: { icon: "monitor" as const, title: "TimePad Kioski", subtitle: "Kompaniya login va parolini kiriting", color: "#2563EB", bg: "#EEF2FF" },
  employee: { icon: "key" as const, title: "Xodim ilovasi", subtitle: "Xodim login va parolini kiriting", color: "#7C3AED", bg: "#F5F3FF" },
  admin: { icon: "users" as const, title: "HR Boshqaruv", subtitle: "Admin login va parolini kiriting", color: "#059669", bg: "#ECFDF5" },
};

export default function LoginScreen() {
  const { modeKey } = useLocalSearchParams<{ modeKey: string }>();
  const { kioskLogin, employeeLogin, adminLogin } = useApp();
  const insets = useSafeAreaInsets();
  const [loginVal, setLoginVal] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [saving, setSaving] = useState(false);
  const info = MODE_INFO[modeKey as keyof typeof MODE_INFO] || MODE_INFO.kiosk;

  const handleLogin = async () => {
    if (!loginVal.trim() || !password.trim()) {
      Alert.alert("Xato", "Login va parolni kiriting");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSaving(true);
    try {
      if (modeKey === "kiosk") { await kioskLogin(loginVal.trim(), password); router.replace("/kiosk"); }
      else if (modeKey === "employee") { await employeeLogin(loginVal.trim(), password); router.replace("/employee-home"); }
      else { await adminLogin(loginVal.trim(), password); router.replace("/admin-home"); }
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Kirish xatosi", e.message || "Login yoki parol noto'g'ri");
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.root,
          {
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 24),
            paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 24),
          }
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable onPress={() => router.back()} style={[styles.backBtn, { alignSelf: "flex-start" }]}>
          <Feather name="arrow-left" size={22} color={Colors.text} />
        </Pressable>

        <View style={styles.card}>
          <View style={[styles.iconBox, { backgroundColor: info.bg }]}>
            <Feather name={info.icon} size={36} color={info.color} />
          </View>
          <Text style={styles.title}>{info.title}</Text>
          <Text style={styles.subtitle}>{info.subtitle}</Text>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Login</Text>
              <View style={[styles.inputRow, { borderColor: loginVal ? info.color + "80" : Colors.border }]}>
                <Feather name="user" size={18} color={Colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={loginVal}
                  onChangeText={setLoginVal}
                  placeholder="login..."
                  placeholderTextColor={Colors.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Parol</Text>
              <View style={[styles.inputRow, { borderColor: password ? info.color + "80" : Colors.border }]}>
                <Feather name="lock" size={18} color={Colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor={Colors.textMuted}
                  secureTextEntry={!showPass}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                />
                <Pressable onPress={() => setShowPass(p => !p)} style={styles.eyeBtn}>
                  <Feather name={showPass ? "eye-off" : "eye"} size={18} color={Colors.textMuted} />
                </Pressable>
              </View>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.loginBtn,
                { backgroundColor: info.color },
                pressed && { opacity: 0.85 },
                saving && { opacity: 0.6 },
              ]}
              onPress={handleLogin}
              disabled={saving}
            >
              {saving
                ? <ActivityIndicator color="#fff" size="small" />
                : <>
                    <Feather name="log-in" size={18} color="#fff" />
                    <Text style={styles.loginBtnText}>Kirish</Text>
                  </>
              }
            </Pressable>
          </View>

          {modeKey === "employee" && (
            <View style={styles.hintBox}>
              <Feather name="info" size={14} color={Colors.textMuted} />
              <Text style={styles.hintText}>
                Login va parolni HR admin berib qo'yadi. Admin paneldan xodimga hisob yarating.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flexGrow: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
  },
  backBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.surface, alignItems: "center", justifyContent: "center", alignSelf: "flex-start", borderWidth: 1, borderColor: Colors.border },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 8,
  },
  iconBox: {
    width: 80,
    height: 80,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: { fontSize: 24, fontFamily: "Inter_700Bold", color: Colors.text, marginBottom: 4 },
  subtitle: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.textSecondary, marginBottom: 28, textAlign: "center" },
  form: { width: "100%", gap: 16 },
  inputGroup: { gap: 6 },
  label: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary },
  inputRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: Colors.background, borderRadius: 12,
    borderWidth: 1.5, paddingHorizontal: 14, height: 52,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 16, fontFamily: "Inter_400Regular", color: Colors.text },
  eyeBtn: { padding: 4 },
  loginBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    borderRadius: 14, height: 54, marginTop: 8,
  },
  loginBtnText: { color: "#fff", fontSize: 17, fontFamily: "Inter_700Bold" },
  hintBox: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    backgroundColor: Colors.background, borderRadius: 12, padding: 12, marginTop: 20, width: "100%",
  },
  hintText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textMuted, lineHeight: 18 },
});
