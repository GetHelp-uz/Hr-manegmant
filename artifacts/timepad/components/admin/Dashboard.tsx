import React, { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  ActivityIndicator, RefreshControl,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useApp, API } from "@/context/AppContext";
import Colors from "@/constants/colors";
import * as Haptics from "expo-haptics";

type Props = { onNavigate: (tab: any) => void };

function StatCard({ icon, label, value, color, bg, onPress }: any) {
  return (
    <Pressable style={[styles.statCard, { borderColor: color + "25" }]} onPress={onPress}>
      <View style={[styles.statIcon, { backgroundColor: bg }]}>
        <Feather name={icon} size={20} color={color} />
      </View>
      <Text style={[styles.statValue, { color }]}>{value ?? "—"}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Pressable>
  );
}

export default function AdminDashboard({ onNavigate }: Props) {
  const { logout } = useApp();
  const [stats, setStats] = useState<any>(null);
  const [today, setToday] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const load = async () => {
    try {
      const [oRes, aRes] = await Promise.all([
        fetch(`${API}/api/attendance/overview`, { credentials: "include" }),
        fetch(`${API}/api/attendance/today`, { credentials: "include" }),
      ]);
      if (oRes.ok) setStats(await oRes.json());
      if (aRes.ok) { const d = await aRes.json(); setToday(Array.isArray(d) ? d : d.data || []); }
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const present = today.filter(a => a.status === "present" || a.status === "late").length;
  const late = today.filter(a => a.status === "late").length;
  const absent = (stats?.totalEmployees || 0) - present;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>
            {now.getHours() < 12 ? "Xayrli tong" : now.getHours() < 17 ? "Xayrli kun" : "Xayrli kech"} 👋
          </Text>
          <Text style={styles.dateText}>
            {now.toLocaleDateString("uz-UZ", { weekday: "long", day: "numeric", month: "long" })}
          </Text>
        </View>
        <View style={styles.timePill}>
          <Feather name="clock" size={13} color={Colors.primary} />
          <Text style={styles.timeText}>
            {now.toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })}
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : (
        <>
          {/* Today overview banner */}
          <View style={styles.overviewBanner}>
            <View style={styles.bannerItem}>
              <Text style={styles.bannerNum}>{present}</Text>
              <Text style={styles.bannerLabel}>Keldi</Text>
            </View>
            <View style={styles.bannerDivider} />
            <View style={styles.bannerItem}>
              <Text style={[styles.bannerNum, { color: Colors.warning }]}>{late}</Text>
              <Text style={styles.bannerLabel}>Kechikdi</Text>
            </View>
            <View style={styles.bannerDivider} />
            <View style={styles.bannerItem}>
              <Text style={[styles.bannerNum, { color: Colors.danger }]}>{absent < 0 ? 0 : absent}</Text>
              <Text style={styles.bannerLabel}>Kelmadi</Text>
            </View>
            <View style={styles.bannerDivider} />
            <View style={styles.bannerItem}>
              <Text style={styles.bannerNum}>{stats?.totalEmployees || 0}</Text>
              <Text style={styles.bannerLabel}>Jami</Text>
            </View>
          </View>

          {/* Stats grid */}
          <Text style={styles.sectionTitle}>Tezkor o'tish</Text>
          <View style={styles.statsGrid}>
            <StatCard icon="users" label="Xodimlar" value={stats?.totalEmployees || 0} color="#2563EB" bg="#EEF2FF" onPress={() => onNavigate("employees")} />
            <StatCard icon="clock" label="Bugun davomat" value={present} color="#059669" bg="#ECFDF5" onPress={() => onNavigate("attendance")} />
            <StatCard icon="calendar" label="Ta'til so'rovlar" value={stats?.pendingLeaves || 0} color="#7C3AED" bg="#F5F3FF" onPress={() => onNavigate("leaves")} />
            <StatCard icon="dollar-sign" label="Bu oy maosh" value={stats?.pendingPayroll || 0} color="#DC2626" bg="#FEF2F2" onPress={() => onNavigate("payroll")} />
          </View>

          {/* Recent attendance */}
          <Text style={styles.sectionTitle}>Bugungi so'nggi kirishlar</Text>
          {today.length === 0 ? (
            <View style={styles.emptyBox}>
              <Feather name="clock" size={32} color={Colors.textMuted} />
              <Text style={styles.emptyText}>Hali hech kim kelmagan</Text>
            </View>
          ) : (
            today.slice(0, 8).map((a, i) => (
              <View key={i} style={styles.recentItem}>
                <View style={[
                  styles.statusDot,
                  { backgroundColor: a.status === "late" ? Colors.warning : a.status === "present" ? Colors.success : Colors.textMuted }
                ]} />
                <View style={styles.recentInfo}>
                  <Text style={styles.recentName}>{a.fullName || a.full_name}</Text>
                  <Text style={styles.recentPosition}>{a.position}</Text>
                </View>
                <View style={styles.recentTime}>
                  <Text style={styles.recentIn}>
                    {(a.checkIn || a.check_in)
                      ? new Date(a.checkIn || a.check_in).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })
                      : "—"}
                  </Text>
                  {(a.lateMinutes || a.late_minutes) > 0 && (
                    <Text style={styles.lateTag}>+{a.lateMinutes || a.late_minutes}d</Text>
                  )}
                </View>
              </View>
            ))
          )}
          {today.length > 8 && (
            <Pressable style={styles.viewAll} onPress={() => onNavigate("attendance")}>
              <Text style={styles.viewAllText}>Hammasini ko'rish ({today.length})</Text>
              <Feather name="chevron-right" size={14} color={Colors.primary} />
            </Pressable>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, gap: 12, paddingBottom: 24 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 4 },
  greeting: { fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.text },
  dateText: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textSecondary, marginTop: 2 },
  timePill: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: Colors.surface, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: Colors.border },
  timeText: { fontSize: 14, fontFamily: "Inter_700Bold", color: Colors.primary },
  loadingBox: { paddingVertical: 60, alignItems: "center" },
  overviewBanner: {
    flexDirection: "row", backgroundColor: Colors.primary, borderRadius: 20,
    padding: 18, alignItems: "center",
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 8,
  },
  bannerItem: { flex: 1, alignItems: "center" },
  bannerNum: { fontSize: 26, fontFamily: "Inter_700Bold", color: "#fff" },
  bannerLabel: { fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.75)", marginTop: 2 },
  bannerDivider: { width: 1, height: 40, backgroundColor: "rgba(255,255,255,0.2)" },
  sectionTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary, textTransform: "uppercase", letterSpacing: 0.4 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statCard: {
    width: "47%", backgroundColor: Colors.surface, borderRadius: 18, padding: 16,
    alignItems: "center", gap: 6, borderWidth: 1.5,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  statIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  statValue: { fontSize: 28, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textSecondary, textAlign: "center" },
  recentItem: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: Colors.surface, borderRadius: 14, padding: 12,
    borderWidth: 1, borderColor: Colors.border,
  },
  statusDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  recentInfo: { flex: 1 },
  recentName: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.text },
  recentPosition: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textSecondary },
  recentTime: { alignItems: "flex-end", gap: 2 },
  recentIn: { fontSize: 14, fontFamily: "Inter_700Bold", color: Colors.success },
  lateTag: { fontSize: 10, fontFamily: "Inter_600SemiBold", color: Colors.warning },
  emptyBox: { alignItems: "center", justifyContent: "center", paddingVertical: 32, gap: 10 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.textMuted },
  viewAll: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, paddingVertical: 10 },
  viewAllText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.primary },
});
