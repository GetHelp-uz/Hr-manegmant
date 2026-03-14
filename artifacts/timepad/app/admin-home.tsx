import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, Pressable, Platform,
  ScrollView, ActivityIndicator, RefreshControl,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useApp, API } from "@/context/AppContext";
import Colors from "@/constants/colors";
import * as Haptics from "expo-haptics";

function fmtTime(d: string) {
  return new Date(d).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" });
}

export default function AdminHome() {
  const { logout } = useApp();
  const insets = useSafeAreaInsets();
  const [attendance, setAttendance] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"attendance" | "employees">("attendance");

  const loadData = async () => {
    try {
      const [attRes, empRes] = await Promise.all([
        fetch(`${API}/api/attendance?limit=50`, { credentials: "include" }),
        fetch(`${API}/api/employees?limit=100`, { credentials: "include" }),
      ]);
      if (attRes.ok) {
        const attData = await attRes.json();
        setAttendance(attData.data || attData || []);
      }
      if (empRes.ok) {
        const empData = await empRes.json();
        setEmployees(empData.data || empData || []);
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleLogout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    logout();
    router.replace("/");
  };

  const todayAttendance = attendance.filter(a => {
    const date = new Date(a.checkIn || a.check_in || a.createdAt || a.created_at);
    const today = new Date();
    return date.toDateString() === today.toDateString();
  });
  const presentCount = todayAttendance.filter(a => a.status === "present" || a.status === "late").length;
  const lateCount = todayAttendance.filter(a => a.status === "late").length;

  return (
    <View style={[styles.root, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIcon}>
            <Feather name="users" size={20} color="#059669" />
          </View>
          <View>
            <Text style={styles.headerTitle}>HR Boshqaruv</Text>
            <Text style={styles.headerSub}>Admin paneli</Text>
          </View>
        </View>
        <Pressable onPress={handleLogout} style={styles.logoutBtn}>
          <Feather name="log-out" size={18} color={Colors.textSecondary} />
        </Pressable>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        {[
          { label: "Bugun keldi", value: presentCount, icon: "check-circle" as const, color: Colors.success },
          { label: "Kechikdi", value: lateCount, icon: "clock" as const, color: Colors.warning },
          { label: "Jami xodim", value: employees.length, icon: "users" as const, color: Colors.primary },
        ].map((s, i) => (
          <View key={i} style={styles.statCard}>
            <Feather name={s.icon} size={20} color={s.color} />
            <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Tab bar */}
      <View style={styles.tabs}>
        {(["attendance", "employees"] as const).map(tab => (
          <Pressable
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Feather
              name={tab === "attendance" ? "clock" : "users"}
              size={16}
              color={activeTab === tab ? Colors.primary : Colors.textSecondary}
            />
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === "attendance" ? "Davomat" : "Xodimlar"}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View style={styles.loadingCenter}><ActivityIndicator color={Colors.primary} /></View>
      ) : (
        <ScrollView
          style={styles.list}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 16) }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
          showsVerticalScrollIndicator={false}
        >
          {activeTab === "attendance" ? (
            todayAttendance.length === 0 ? (
              <View style={styles.emptyState}>
                <Feather name="clock" size={40} color={Colors.textMuted} />
                <Text style={styles.emptyText}>Bugun hali davomat yo'q</Text>
              </View>
            ) : (
              todayAttendance.map((item, i) => (
                <View key={i} style={styles.attendanceItem}>
                  <View style={[styles.statusDot, { backgroundColor: item.status === "late" ? Colors.warning : Colors.success }]} />
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{item.fullName || item.full_name || "—"}</Text>
                    <Text style={styles.itemSub}>{item.position || "—"}</Text>
                  </View>
                  <View style={styles.itemTime}>
                    <Text style={styles.timeIn}>{item.checkIn || item.check_in ? fmtTime(item.checkIn || item.check_in) : "—"}</Text>
                    {item.lateMinutes > 0 && <Text style={styles.lateBadge}>+{item.lateMinutes}m</Text>}
                    {(item.checkOut || item.check_out) && <Text style={styles.timeOut}>{fmtTime(item.checkOut || item.check_out)}</Text>}
                  </View>
                </View>
              ))
            )
          ) : (
            employees.length === 0 ? (
              <View style={styles.emptyState}>
                <Feather name="users" size={40} color={Colors.textMuted} />
                <Text style={styles.emptyText}>Xodimlar topilmadi</Text>
              </View>
            ) : (
              employees.map((emp: any, i: number) => (
                <View key={i} style={styles.employeeItem}>
                  <View style={styles.empAvatar}>
                    <Feather name="user" size={18} color={Colors.primary} />
                  </View>
                  <View style={styles.empInfo}>
                    <Text style={styles.empName}>{emp.fullName || emp.full_name}</Text>
                    <Text style={styles.empSub}>{emp.position}</Text>
                  </View>
                  <View style={styles.empMethod}>
                    <Text style={styles.methodTag}>
                      {emp.attendanceMethod === "qr" ? "QR" :
                       emp.attendanceMethod === "timepad" ? "PIN" :
                       emp.attendanceMethod === "nfc" ? "NFC" :
                       emp.attendanceMethod === "face" ? "Face" : "QR"}
                    </Text>
                  </View>
                  <View style={[styles.empStatus, { backgroundColor: emp.status === "active" ? Colors.successLight : Colors.dangerLight }]}>
                    <Text style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: emp.status === "active" ? Colors.success : Colors.danger }}>
                      {emp.status === "active" ? "Faol" : "Nofaol"}
                    </Text>
                  </View>
                </View>
              ))
            )
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  loadingCenter: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#ECFDF5", alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 16, fontFamily: "Inter_700Bold", color: Colors.text },
  headerSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textSecondary },
  logoutBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.background, alignItems: "center", justifyContent: "center" },
  statsRow: { flexDirection: "row", gap: 12, padding: 16, paddingBottom: 4 },
  statCard: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: 16, padding: 14,
    alignItems: "center", gap: 4, borderWidth: 1, borderColor: Colors.border,
  },
  statValue: { fontSize: 24, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textSecondary, textAlign: "center" },
  tabs: {
    flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingVertical: 8,
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  tab: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 10, backgroundColor: Colors.background },
  tabActive: { backgroundColor: Colors.primary + "15" },
  tabText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary },
  tabTextActive: { color: Colors.primary },
  list: { flex: 1 },
  listContent: { padding: 16, gap: 8 },
  emptyState: { alignItems: "center", justifyContent: "center", paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.textMuted },
  attendanceItem: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: Colors.surface, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: Colors.border,
  },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.text },
  itemSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textSecondary },
  itemTime: { alignItems: "flex-end", gap: 2 },
  timeIn: { fontSize: 14, fontFamily: "Inter_700Bold", color: Colors.success },
  lateBadge: { fontSize: 10, fontFamily: "Inter_600SemiBold", color: Colors.warning },
  timeOut: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textMuted },
  employeeItem: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: Colors.surface, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: Colors.border,
  },
  empAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#EEF2FF", alignItems: "center", justifyContent: "center" },
  empInfo: { flex: 1 },
  empName: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.text },
  empSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textSecondary },
  empMethod: { backgroundColor: Colors.background, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  methodTag: { fontSize: 11, fontFamily: "Inter_700Bold", color: Colors.primary },
  empStatus: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
});
