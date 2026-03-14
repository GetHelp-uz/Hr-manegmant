import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Pressable, Platform } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useApp, API } from "@/context/AppContext";
import Colors from "@/constants/colors";
import * as Haptics from "expo-haptics";

export default function QrScanScreen() {
  const { company } = useApp();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [direction, setDirection] = useState<"in" | "out">("in");

  const handleScan = async ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      let parsed: any;
      try { parsed = JSON.parse(data); } catch { parsed = null; }

      if (!parsed?.employee_id) {
        router.push({ pathname: "/result", params: { success: "false", message: "Noto'g'ri QR kod", name: "", action: "" } });
        return;
      }

      const res = await fetch(`${API}/api/attendance/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ qrData: data, deviceId: "timepad-kiosk" }),
      });
      const result = await res.json();

      if (res.ok) {
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
        router.push({ pathname: "/result", params: { success: "false", message: result.message || "Xato", name: "", action: "" } });
      }
    } catch {
      router.push({ pathname: "/result", params: { success: "false", message: "Server bilan bog'lanib bo'lmadi", name: "", action: "" } });
    }
  };

  if (!permission) return <View style={styles.root} />;

  if (!permission.granted) {
    return (
      <View style={[styles.root, styles.center, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) }]}>
        <Feather name="camera-off" size={48} color={Colors.textMuted} />
        <Text style={styles.permText}>Kamera ruxsati kerak</Text>
        <Pressable style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.permBtnText}>Ruxsat berish</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) }]}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color="#fff" />
        </Pressable>
        <Text style={styles.topTitle}>QR Kod skanerlash</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Direction toggle */}
      <View style={styles.directionRow}>
        <Pressable
          style={[styles.dirBtn, direction === "in" && styles.dirBtnActive]}
          onPress={() => setDirection("in")}
        >
          <Feather name="log-in" size={16} color={direction === "in" ? "#fff" : Colors.textSecondary} />
          <Text style={[styles.dirBtnText, direction === "in" && styles.dirBtnTextActive]}>Kirish</Text>
        </Pressable>
        <Pressable
          style={[styles.dirBtn, direction === "out" && styles.dirBtnActiveOut]}
          onPress={() => setDirection("out")}
        >
          <Feather name="log-out" size={16} color={direction === "out" ? "#fff" : Colors.textSecondary} />
          <Text style={[styles.dirBtnText, direction === "out" && styles.dirBtnTextActive]}>Chiqish</Text>
        </Pressable>
      </View>

      {/* Camera */}
      <View style={styles.cameraContainer}>
        {Platform.OS === "web" ? (
          <View style={styles.webFallback}>
            <Feather name="camera" size={60} color={Colors.textMuted} />
            <Text style={styles.webFallbackText}>QR skaner faqat mobil qurilmada ishlaydi</Text>
          </View>
        ) : (
          <CameraView
            style={styles.camera}
            facing="front"
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={scanned ? undefined : handleScan}
          >
            <View style={styles.overlay}>
              <View style={styles.scanFrame}>
                <View style={[styles.corner, styles.cornerTL]} />
                <View style={[styles.corner, styles.cornerTR]} />
                <View style={[styles.corner, styles.cornerBL]} />
                <View style={[styles.corner, styles.cornerBR]} />
              </View>
              <Text style={styles.scanHint}>QR kodni frame ichiga joylang</Text>
            </View>
          </CameraView>
        )}
      </View>

      {scanned && (
        <Pressable style={styles.rescanBtn} onPress={() => setScanned(false)}>
          <Text style={styles.rescanText}>Qayta skanerlash</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0a0a0a" },
  center: { alignItems: "center", justifyContent: "center", gap: 16 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center" },
  topTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#fff" },
  directionRow: { flexDirection: "row", gap: 10, paddingHorizontal: 20, marginBottom: 16 },
  dirBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.1)" },
  dirBtnActive: { backgroundColor: Colors.primary },
  dirBtnActiveOut: { backgroundColor: Colors.danger },
  dirBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary },
  dirBtnTextActive: { color: "#fff" },
  cameraContainer: { flex: 1, marginHorizontal: 20, borderRadius: 24, overflow: "hidden" },
  camera: { flex: 1 },
  webFallback: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, backgroundColor: "#1a1a1a" },
  webFallbackText: { color: Colors.textMuted, fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", paddingHorizontal: 40 },
  overlay: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.4)" },
  scanFrame: { width: 250, height: 250, borderRadius: 12 },
  corner: { position: "absolute", width: 30, height: 30, borderColor: "#fff", borderWidth: 3 },
  cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 8 },
  cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 8 },
  cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 8 },
  cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 8 },
  scanHint: { marginTop: 24, color: "rgba(255,255,255,0.8)", fontSize: 14, fontFamily: "Inter_400Regular" },
  permText: { fontSize: 16, fontFamily: "Inter_400Regular", color: Colors.textSecondary, textAlign: "center" },
  permBtn: { backgroundColor: Colors.primary, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  permBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  rescanBtn: { margin: 20, backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 16, alignItems: "center" },
  rescanText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
