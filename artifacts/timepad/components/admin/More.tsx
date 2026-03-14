import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  ActivityIndicator, RefreshControl, Alert, Modal,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { API } from "@/context/AppContext";
import Colors from "@/constants/colors";
import * as Haptics from "expo-haptics";

type Props = { onLogout: () => void; onNavigate: (tab: any) => void };

function AdvancesSection() {
  const [advances, setAdvances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);

  useEffect(() => {
    fetch(`${API}/api/advances?status=pending&limit=50`, { credentials: "include" })
      .then(r => r.json()).then(d => setAdvances(d.data || d || []))
      .catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleApprove = async (id: number) => {
    setProcessingId(id);
    try {
      const r = await fetch(`${API}/api/advances/${id}/approve`, { method: "PUT", credentials: "include" });
      if (!r.ok) throw new Error((await r.json())?.message || "Xato");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setAdvances(prev => prev.filter(a => a.id !== id));
    } catch (e: any) {
      Alert.alert("Xato", e.message);
    } finally { setProcessingId(null); }
  };

  if (loading) return <ActivityIndicator color={Colors.primary} style={{ marginVertical: 16 }} />;
  if (advances.length === 0) return (
    <View style={aStyles.empty}>
      <Text style={aStyles.emptyText}>Avans so'rovlari yo'q</Text>
    </View>
  );

  return (
    <View style={{ gap: 8 }}>
      {advances.map((a, i) => (
        <View key={i} style={aStyles.card}>
          <View style={aStyles.cardTop}>
            <View>
              <Text style={aStyles.name}>{a.fullName || a.full_name}</Text>
              <Text style={aStyles.pos}>{a.position}</Text>
            </View>
            <Text style={aStyles.amount}>{(a.amount || 0).toLocaleString()} so'm</Text>
          </View>
          {a.reason && <Text style={aStyles.reason} numberOfLines={2}>{a.reason}</Text>}
          <Pressable
            style={[aStyles.approveBtn, processingId === a.id && { opacity: 0.6 }]}
            onPress={() => handleApprove(a.id)}
            disabled={processingId === a.id}
          >
            {processingId === a.id
              ? <ActivityIndicator size="small" color="#fff" />
              : <><Feather name="check" size={14} color="#fff" /><Text style={aStyles.approveBtnText}>Tasdiqlash</Text></>
            }
          </Pressable>
        </View>
      ))}
    </View>
  );
}

const aStyles = StyleSheet.create({
  empty: { paddingVertical: 20, alignItems: "center" },
  emptyText: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textMuted },
  card: { backgroundColor: Colors.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: Colors.border, gap: 8 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  name: { fontSize: 14, fontFamily: "Inter_700Bold", color: Colors.text },
  pos: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textSecondary },
  amount: { fontSize: 16, fontFamily: "Inter_700Bold", color: Colors.primary },
  reason: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textSecondary },
  approveBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: Colors.success, borderRadius: 10, paddingVertical: 9 },
  approveBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#fff" },
});

function DepartmentsSection() {
  const [depts, setDepts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/departments`, { credentials: "include" })
      .then(r => r.json()).then(d => setDepts(Array.isArray(d) ? d : d.data || []))
      .catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <ActivityIndicator color={Colors.primary} style={{ marginVertical: 12 }} />;
  if (depts.length === 0) return <Text style={{ fontSize: 13, color: Colors.textMuted, textAlign: "center", paddingVertical: 12 }}>Bo'limlar mavjud emas</Text>;
  return (
    <View style={{ gap: 6 }}>
      {depts.map((d, i) => (
        <View key={i} style={dStyles.card}>
          <View style={dStyles.colorDot} />
          <View style={dStyles.info}>
            <Text style={dStyles.name}>{d.name}</Text>
            {d.description && <Text style={dStyles.desc} numberOfLines={1}>{d.description}</Text>}
          </View>
          <Text style={dStyles.count}>{d.employeeCount || 0} xodim</Text>
        </View>
      ))}
    </View>
  );
}

const dStyles = StyleSheet.create({
  card: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: Colors.surface, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: Colors.border },
  colorDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary },
  info: { flex: 1 },
  name: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.text },
  desc: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textSecondary },
  count: { fontSize: 13, fontFamily: "Inter_700Bold", color: Colors.primary },
});

function ShiftsSection() {
  const [shifts, setShifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/shifts`, { credentials: "include" })
      .then(r => r.json()).then(d => setShifts(Array.isArray(d) ? d : d.data || []))
      .catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <ActivityIndicator color={Colors.primary} style={{ marginVertical: 12 }} />;
  if (shifts.length === 0) return <Text style={{ fontSize: 13, color: Colors.textMuted, textAlign: "center", paddingVertical: 12 }}>Smenalar mavjud emas</Text>;
  return (
    <View style={{ gap: 6 }}>
      {shifts.map((s, i) => (
        <View key={i} style={sStyles.card}>
          <View style={[sStyles.colorBar, { backgroundColor: s.color || Colors.primary }]} />
          <View style={sStyles.info}>
            <Text style={sStyles.name}>{s.name}</Text>
            <Text style={sStyles.time}>{s.workStartTime || "—"} — {s.workEndTime || "—"}</Text>
          </View>
          <View style={sStyles.lateBox}>
            <Text style={sStyles.lateLabel}>Kechikish chegarasi</Text>
            <Text style={sStyles.lateVal}>{s.lateThreshold || s.late_threshold || 0} daqiqa</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const sStyles = StyleSheet.create({
  card: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: Colors.surface, borderRadius: 12, overflow: "hidden", borderWidth: 1, borderColor: Colors.border },
  colorBar: { width: 4, alignSelf: "stretch" },
  info: { flex: 1, paddingVertical: 12 },
  name: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.text },
  time: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textSecondary, marginTop: 2 },
  lateBox: { paddingRight: 12, alignItems: "flex-end" },
  lateLabel: { fontSize: 10, fontFamily: "Inter_400Regular", color: Colors.textMuted },
  lateVal: { fontSize: 13, fontFamily: "Inter_700Bold", color: Colors.text },
});

export default function AdminMore({ onLogout, onNavigate }: Props) {
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const SECTIONS = [
    { key: "advances", icon: "credit-card" as const, label: "Avanslar", color: "#059669", bg: "#ECFDF5", desc: "Xodimlar avans so'rovlari" },
    { key: "departments", icon: "briefcase" as const, label: "Bo'limlar", color: "#2563EB", bg: "#EEF2FF", desc: "Kompaniya bo'limlari ro'yxati" },
    { key: "shifts", icon: "clock" as const, label: "Smenalar", color: "#7C3AED", bg: "#F5F3FF", desc: "Ish smenalarini boshqarish" },
  ];

  const toggleSection = (key: string) => {
    Haptics.selectionAsync();
    setActiveSection(prev => prev === key ? null : key);
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
      <Text style={styles.pageTitle}>Qo'shimcha boshqaruv</Text>

      {SECTIONS.map(s => (
        <View key={s.key}>
          <Pressable
            style={[styles.sectionHeader, activeSection === s.key && styles.sectionHeaderActive]}
            onPress={() => toggleSection(s.key)}
          >
            <View style={[styles.sectionIcon, { backgroundColor: s.bg }]}>
              <Feather name={s.icon} size={20} color={s.color} />
            </View>
            <View style={styles.sectionInfo}>
              <Text style={styles.sectionLabel}>{s.label}</Text>
              <Text style={styles.sectionDesc}>{s.desc}</Text>
            </View>
            <Feather name={activeSection === s.key ? "chevron-up" : "chevron-down"} size={18} color={Colors.textMuted} />
          </Pressable>
          {activeSection === s.key && (
            <View style={styles.sectionContent}>
              {s.key === "advances" && <AdvancesSection />}
              {s.key === "departments" && <DepartmentsSection />}
              {s.key === "shifts" && <ShiftsSection />}
            </View>
          )}
        </View>
      ))}

      {/* Navigation shortcuts */}
      <Text style={styles.shortcutsTitle}>Tezkor o'tish</Text>
      <View style={styles.shortcuts}>
        {[
          { icon: "users", label: "Xodimlar", tab: "employees" },
          { icon: "clock", label: "Davomat", tab: "attendance" },
          { icon: "calendar", label: "Ta'til", tab: "leaves" },
          { icon: "dollar-sign", label: "Maosh", tab: "payroll" },
        ].map(item => (
          <Pressable key={item.tab} style={styles.shortcutBtn} onPress={() => { Haptics.selectionAsync(); onNavigate(item.tab); }}>
            <Feather name={item.icon as any} size={20} color={Colors.primary} />
            <Text style={styles.shortcutLabel}>{item.label}</Text>
          </Pressable>
        ))}
      </View>

      {/* Logout */}
      <Pressable style={styles.logoutBtn} onPress={onLogout}>
        <Feather name="log-out" size={18} color={Colors.danger} />
        <Text style={styles.logoutText}>Tizimdan chiqish</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  pageTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.text, paddingBottom: 4 },
  sectionHeader: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: Colors.surface, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: Colors.border,
  },
  sectionHeaderActive: { borderColor: Colors.primary + "40", backgroundColor: Colors.primary + "04" },
  sectionIcon: { width: 46, height: 46, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  sectionInfo: { flex: 1 },
  sectionLabel: { fontSize: 15, fontFamily: "Inter_700Bold", color: Colors.text },
  sectionDesc: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textSecondary, marginTop: 2 },
  sectionContent: { backgroundColor: Colors.surface, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: Colors.border, marginTop: -6, gap: 4 },
  shortcutsTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary, textTransform: "uppercase", letterSpacing: 0.4 },
  shortcuts: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  shortcutBtn: {
    width: "47%", flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: Colors.surface, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: Colors.border,
  },
  shortcutLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.text },
  logoutBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    backgroundColor: Colors.danger + "08", borderRadius: 16, padding: 16,
    borderWidth: 1.5, borderColor: Colors.danger + "30",
  },
  logoutText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: Colors.danger },
});
