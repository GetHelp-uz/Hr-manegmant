import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  TextInput, ActivityIndicator, RefreshControl, Modal, Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { API } from "@/context/AppContext";
import Colors from "@/constants/colors";
import * as Haptics from "expo-haptics";

const METHOD_LABELS: Record<string, string> = {
  qr: "QR", nfc: "NFC", timepad: "PIN", face: "Yuz", skud: "СКУД",
};
const METHOD_COLORS: Record<string, string> = {
  qr: "#2563EB", nfc: "#059669", timepad: "#7C3AED", face: "#DC2626", skud: "#EA580C",
};

function EmployeeCard({ emp, onPress }: { emp: any; onPress: () => void }) {
  const method = emp.attendanceMethod || emp.attendance_method || "qr";
  return (
    <Pressable
      style={({ pressed }) => [styles.empCard, pressed && { opacity: 0.85 }]}
      onPress={onPress}
    >
      <View style={styles.empAvatar}>
        <Text style={styles.empAvatarText}>{(emp.fullName || emp.full_name || "?")[0]}</Text>
      </View>
      <View style={styles.empInfo}>
        <Text style={styles.empName}>{emp.fullName || emp.full_name}</Text>
        <Text style={styles.empPos}>{emp.position}</Text>
        <Text style={styles.empDept}>{emp.departmentName || emp.department_name || ""}</Text>
      </View>
      <View style={styles.empRight}>
        <View style={[styles.methodBadge, { backgroundColor: METHOD_COLORS[method] + "18" }]}>
          <Text style={[styles.methodText, { color: METHOD_COLORS[method] }]}>{METHOD_LABELS[method] || "QR"}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: emp.status === "active" ? Colors.successLight : Colors.dangerLight }]}>
          <Text style={[styles.statusText, { color: emp.status === "active" ? Colors.success : Colors.danger }]}>
            {emp.status === "active" ? "Faol" : "Nofaol"}
          </Text>
        </View>
        <Feather name="chevron-right" size={16} color={Colors.textMuted} />
      </View>
    </Pressable>
  );
}

function EmployeeDetail({ emp, visible, onClose }: { emp: any; visible: boolean; onClose: () => void }) {
  const [attHistory, setAttHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && emp) {
      setLoading(true);
      fetch(`${API}/api/attendance?employeeId=${emp.id}&limit=10`, { credentials: "include" })
        .then(r => r.json()).then(d => setAttHistory(Array.isArray(d) ? d : d.data || []))
        .catch(() => {}).finally(() => setLoading(false));
    }
  }, [visible, emp?.id]);

  if (!emp) return null;

  const sal = emp.salaryType || emp.salary_type;
  const salLabel = sal === "monthly" ? `${(emp.monthlySalary || emp.monthly_salary || 0).toLocaleString()} so'm/oy`
    : sal === "hourly" ? `${(emp.hourlyRate || emp.hourly_rate || 0).toLocaleString()} so'm/soat`
    : sal === "daily" ? `${(emp.dailyRate || emp.daily_rate || 0).toLocaleString()} so'm/kun`
    : "Belgilanmagan";

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.modalRoot}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Xodim ma'lumotlari</Text>
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <Feather name="x" size={22} color={Colors.text} />
          </Pressable>
        </View>
        <ScrollView style={styles.modalScroll} contentContainerStyle={{ padding: 20, gap: 16 }}>
          {/* Profile */}
          <View style={styles.profileCard}>
            <View style={styles.bigAvatar}>
              <Text style={styles.bigAvatarText}>{(emp.fullName || emp.full_name || "?")[0]}</Text>
            </View>
            <Text style={styles.profileName}>{emp.fullName || emp.full_name}</Text>
            <Text style={styles.profilePos}>{emp.position}</Text>
            {emp.departmentName && <Text style={styles.profileDept}>{emp.departmentName}</Text>}
          </View>

          {/* Info rows */}
          {[
            { icon: "phone", label: "Telefon", value: emp.phone || "—" },
            { icon: "hash", label: "Xodim kodi", value: emp.employeeCode || emp.employee_code || "—" },
            { icon: "dollar-sign", label: "Maosh", value: salLabel },
            { icon: "maximize", label: "Kirish usuli", value: METHOD_LABELS[emp.attendanceMethod || emp.attendance_method || "qr"] || "QR" },
            { icon: "user", label: "App Login", value: emp.appLogin || emp.app_login || "Berilmagan" },
          ].map((row, i) => (
            <View key={i} style={styles.infoRow}>
              <View style={styles.infoIcon}><Feather name={row.icon as any} size={16} color={Colors.primary} /></View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>{row.label}</Text>
                <Text style={styles.infoValue}>{row.value}</Text>
              </View>
            </View>
          ))}

          {/* Attendance history */}
          <Text style={styles.sectionTitle}>So'nggi davomatlar</Text>
          {loading ? <ActivityIndicator color={Colors.primary} /> : (
            attHistory.length === 0 ? (
              <Text style={styles.noData}>Davomat ma'lumotlari yo'q</Text>
            ) : attHistory.map((a, i) => (
              <View key={i} style={styles.attRow}>
                <View style={[styles.attDot, { backgroundColor: a.status === "late" ? Colors.warning : Colors.success }]} />
                <Text style={styles.attDate}>
                  {new Date(a.date || a.checkIn || a.check_in).toLocaleDateString("uz-UZ", { day: "2-digit", month: "short" })}
                </Text>
                <Text style={styles.attIn}>
                  {a.checkIn || a.check_in ? new Date(a.checkIn || a.check_in).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" }) : "—"}
                </Text>
                <Text style={styles.attOut}>
                  {a.checkOut || a.check_out ? new Date(a.checkOut || a.check_out).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" }) : "—"}
                </Text>
                {(a.lateMinutes || a.late_minutes) > 0 && (
                  <View style={styles.lateChip}>
                    <Text style={styles.lateChipText}>+{a.lateMinutes || a.late_minutes}d</Text>
                  </View>
                )}
              </View>
            ))
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

export default function AdminEmployees() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("active");

  const load = async () => {
    try {
      const r = await fetch(`${API}/api/employees?limit=200`, { credentials: "include" });
      if (r.ok) { const d = await r.json(); setEmployees(d.data || d || []); }
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const filtered = employees.filter(e => {
    const name = (e.fullName || e.full_name || "").toLowerCase();
    const pos = (e.position || "").toLowerCase();
    const q = search.toLowerCase();
    const matchSearch = !q || name.includes(q) || pos.includes(q);
    const matchStatus = statusFilter === "all" || e.status === statusFilter || (statusFilter === "inactive" && e.status !== "active");
    return matchSearch && matchStatus;
  });

  return (
    <View style={styles.root}>
      {/* Search bar */}
      <View style={styles.searchBar}>
        <View style={styles.searchInput}>
          <Feather name="search" size={16} color={Colors.textMuted} />
          <TextInput
            style={styles.searchText}
            placeholder="Xodim qidirish..."
            placeholderTextColor={Colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
          {search ? <Pressable onPress={() => setSearch("")}><Feather name="x" size={16} color={Colors.textMuted} /></Pressable> : null}
        </View>
      </View>

      {/* Status filter */}
      <View style={styles.filterRow}>
        {(["all", "active", "inactive"] as const).map(f => (
          <Pressable key={f} style={[styles.filterChip, statusFilter === f && styles.filterChipActive]} onPress={() => setStatusFilter(f)}>
            <Text style={[styles.filterText, statusFilter === f && styles.filterTextActive]}>
              {f === "all" ? `Barchasi (${employees.length})` : f === "active" ? `Faol (${employees.filter(e => e.status === "active").length})` : `Nofaol (${employees.filter(e => e.status !== "active").length})`}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View style={styles.loadingBox}><ActivityIndicator color={Colors.primary} /></View>
      ) : (
        <ScrollView
          style={styles.list}
          contentContainerStyle={{ padding: 12, gap: 8, paddingBottom: 24 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
          showsVerticalScrollIndicator={false}
        >
          {filtered.length === 0 ? (
            <View style={styles.emptyBox}>
              <Feather name="users" size={36} color={Colors.textMuted} />
              <Text style={styles.emptyText}>Xodim topilmadi</Text>
            </View>
          ) : filtered.map((emp, i) => (
            <EmployeeCard key={i} emp={emp} onPress={() => { Haptics.selectionAsync(); setSelected(emp); }} />
          ))}
        </ScrollView>
      )}

      <EmployeeDetail emp={selected} visible={!!selected} onClose={() => setSelected(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  searchBar: { padding: 12, paddingBottom: 6 },
  searchInput: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: Colors.surface, borderRadius: 14, paddingHorizontal: 14, height: 44,
    borderWidth: 1, borderColor: Colors.border,
  },
  searchText: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", color: Colors.text },
  filterRow: { flexDirection: "row", gap: 6, paddingHorizontal: 12, paddingBottom: 8 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary },
  filterTextActive: { color: "#fff" },
  loadingBox: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { flex: 1 },
  empCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: Colors.surface, borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: Colors.border,
  },
  empAvatar: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: Colors.primary + "18", alignItems: "center", justifyContent: "center",
  },
  empAvatarText: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.primary },
  empInfo: { flex: 1 },
  empName: { fontSize: 14, fontFamily: "Inter_700Bold", color: Colors.text },
  empPos: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textSecondary },
  empDept: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textMuted },
  empRight: { alignItems: "flex-end", gap: 4 },
  methodBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  methodText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  emptyBox: { alignItems: "center", justifyContent: "center", paddingVertical: 48, gap: 12 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.textMuted },
  // Modal
  modalRoot: { flex: 1, backgroundColor: Colors.background },
  modalHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    padding: 20, paddingTop: 60, borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.surface,
  },
  modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.text },
  closeBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.background, alignItems: "center", justifyContent: "center" },
  modalScroll: { flex: 1 },
  profileCard: { alignItems: "center", gap: 6, padding: 8 },
  bigAvatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: Colors.primary + "18", alignItems: "center", justifyContent: "center" },
  bigAvatarText: { fontSize: 28, fontFamily: "Inter_700Bold", color: Colors.primary },
  profileName: { fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.text },
  profilePos: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.textSecondary },
  profileDept: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textMuted },
  infoRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: Colors.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: Colors.border,
  },
  infoIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.primary + "12", alignItems: "center", justifyContent: "center" },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textMuted },
  infoValue: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.text },
  sectionTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary, textTransform: "uppercase" },
  noData: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textMuted, textAlign: "center", paddingVertical: 12 },
  attRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  attDot: { width: 8, height: 8, borderRadius: 4 },
  attDate: { width: 56, fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.text },
  attIn: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.success },
  attOut: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textSecondary },
  lateChip: { backgroundColor: Colors.warning + "20", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  lateChipText: { fontSize: 10, fontFamily: "Inter_600SemiBold", color: Colors.warning },
});
