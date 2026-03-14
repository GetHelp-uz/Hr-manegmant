import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  ActivityIndicator, RefreshControl, Modal, TextInput, Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { API } from "@/context/AppContext";
import Colors from "@/constants/colors";
import * as Haptics from "expo-haptics";

function fmtTime(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" });
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("uz-UZ", { day: "2-digit", month: "short" });
}

export default function AdminAttendance() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dateFilter, setDateFilter] = useState<"today" | "week" | "month">("today");
  const [search, setSearch] = useState("");
  const [manualOpen, setManualOpen] = useState(false);
  const [manualData, setManualData] = useState({ employeeCode: "", direction: "in" as "in" | "out", note: "" });
  const [manualSaving, setManualSaving] = useState(false);

  const load = async () => {
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (dateFilter === "today") {
        const today = new Date().toISOString().split("T")[0];
        params.set("startDate", today);
        params.set("endDate", today);
      } else if (dateFilter === "week") {
        const d = new Date(); d.setDate(d.getDate() - 7);
        params.set("startDate", d.toISOString().split("T")[0]);
      } else {
        const d = new Date(); d.setDate(1);
        params.set("startDate", d.toISOString().split("T")[0]);
      }
      const r = await fetch(`${API}/api/attendance?${params}`, { credentials: "include" });
      if (r.ok) { const d = await r.json(); setRecords(Array.isArray(d) ? d : d.data || []); }
    } catch {}
    setLoading(false);
  };

  useEffect(() => { setLoading(true); load(); }, [dateFilter]);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const filtered = records.filter(a => {
    const name = (a.fullName || a.full_name || "").toLowerCase();
    return !search || name.includes(search.toLowerCase());
  });

  const present = filtered.filter(a => a.status === "present" || a.status === "late").length;
  const late = filtered.filter(a => a.status === "late").length;

  const handleManualEntry = async () => {
    if (!manualData.employeeCode.trim()) { Alert.alert("Xato", "Xodim kodini kiriting"); return; }
    setManualSaving(true);
    try {
      const r = await fetch(`${API}/api/attendance/manual`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(manualData),
      });
      if (!r.ok) { const e = await r.json(); throw new Error(e.message || "Xato"); }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Saqlandi", "Davomat qo'lda qo'shildi");
      setManualOpen(false);
      setManualData({ employeeCode: "", direction: "in", note: "" });
      await load();
    } catch (e: any) {
      Alert.alert("Xato", e.message);
    } finally { setManualSaving(false); }
  };

  return (
    <View style={styles.root}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <View style={styles.filterTabs}>
          {(["today", "week", "month"] as const).map(f => (
            <Pressable key={f} style={[styles.filterTab, dateFilter === f && styles.filterTabActive]} onPress={() => { Haptics.selectionAsync(); setDateFilter(f); }}>
              <Text style={[styles.filterTabText, dateFilter === f && styles.filterTabTextActive]}>
                {f === "today" ? "Bugun" : f === "week" ? "Hafta" : "Oy"}
              </Text>
            </Pressable>
          ))}
        </View>
        <Pressable style={styles.manualBtn} onPress={() => setManualOpen(true)}>
          <Feather name="plus" size={16} color={Colors.primary} />
          <Text style={styles.manualBtnText}>Qo'lda</Text>
        </Pressable>
      </View>

      {/* Summary */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryNum, { color: Colors.success }]}>{present}</Text>
          <Text style={styles.summaryLabel}>Keldi</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryNum, { color: Colors.warning }]}>{late}</Text>
          <Text style={styles.summaryLabel}>Kechikdi</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryNum, { color: Colors.textSecondary }]}>{filtered.length}</Text>
          <Text style={styles.summaryLabel}>Jami yozuv</Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <Feather name="search" size={14} color={Colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Xodim qidirish..."
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {loading ? (
        <View style={styles.loadingBox}><ActivityIndicator color={Colors.primary} /></View>
      ) : (
        <ScrollView
          style={styles.list}
          contentContainerStyle={{ paddingHorizontal: 12, gap: 6, paddingBottom: 24, paddingTop: 6 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
          showsVerticalScrollIndicator={false}
        >
          {filtered.length === 0 ? (
            <View style={styles.emptyBox}>
              <Feather name="clock" size={36} color={Colors.textMuted} />
              <Text style={styles.emptyText}>Davomat yozuvlari topilmadi</Text>
            </View>
          ) : filtered.map((a, i) => (
            <View key={i} style={styles.attCard}>
              <View style={[styles.statusBar, {
                backgroundColor: a.status === "late" ? Colors.warning : a.status === "absent" ? Colors.danger : Colors.success
              }]} />
              <View style={styles.attInfo}>
                <View style={styles.attNameRow}>
                  <Text style={styles.attName}>{a.fullName || a.full_name}</Text>
                  {dateFilter !== "today" && (
                    <Text style={styles.attDate}>{fmtDate(a.checkIn || a.check_in || a.date)}</Text>
                  )}
                </View>
                <Text style={styles.attPos}>{a.position}</Text>
              </View>
              <View style={styles.attTimes}>
                <View style={styles.timeRow}>
                  <Feather name="log-in" size={11} color={Colors.success} />
                  <Text style={styles.timeIn}>{fmtTime(a.checkIn || a.check_in)}</Text>
                </View>
                <View style={styles.timeRow}>
                  <Feather name="log-out" size={11} color={Colors.textMuted} />
                  <Text style={styles.timeOut}>{fmtTime(a.checkOut || a.check_out)}</Text>
                </View>
                {(a.lateMinutes || a.late_minutes) > 0 && (
                  <View style={styles.lateChip}>
                    <Text style={styles.lateText}>+{a.lateMinutes || a.late_minutes}d kech</Text>
                  </View>
                )}
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Manual entry modal */}
      <Modal visible={manualOpen} animationType="slide" presentationStyle="formSheet">
        <View style={styles.modalRoot}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Qo'lda davomat kiritish</Text>
            <Pressable onPress={() => setManualOpen(false)} style={styles.closeBtn}>
              <Feather name="x" size={20} color={Colors.text} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Xodim kodi / Telefon</Text>
              <TextInput
                style={styles.formInput}
                value={manualData.employeeCode}
                onChangeText={v => setManualData(p => ({ ...p, employeeCode: v }))}
                placeholder="EMP-001 yoki telefon"
                placeholderTextColor={Colors.textMuted}
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Yo'nalish</Text>
              <View style={styles.dirRow}>
                {(["in", "out"] as const).map(d => (
                  <Pressable
                    key={d}
                    style={[styles.dirBtn, manualData.direction === d && styles.dirBtnActive]}
                    onPress={() => setManualData(p => ({ ...p, direction: d }))}
                  >
                    <Feather name={d === "in" ? "log-in" : "log-out"} size={18} color={manualData.direction === d ? "#fff" : Colors.textSecondary} />
                    <Text style={[styles.dirText, manualData.direction === d && { color: "#fff" }]}>
                      {d === "in" ? "Kirish" : "Chiqish"}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Izoh (ixtiyoriy)</Text>
              <TextInput
                style={[styles.formInput, { height: 80 }]}
                value={manualData.note}
                onChangeText={v => setManualData(p => ({ ...p, note: v }))}
                placeholder="Sabab yoki izoh..."
                placeholderTextColor={Colors.textMuted}
                multiline
              />
            </View>
            <Pressable
              style={[styles.saveBtn, manualSaving && { opacity: 0.6 }]}
              onPress={handleManualEntry}
              disabled={manualSaving}
            >
              {manualSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Saqlash</Text>}
            </Pressable>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 12 },
  filterTabs: { flexDirection: "row", gap: 4, backgroundColor: Colors.surface, borderRadius: 12, padding: 3, borderWidth: 1, borderColor: Colors.border },
  filterTab: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 9 },
  filterTabActive: { backgroundColor: Colors.primary },
  filterTabText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary },
  filterTabTextActive: { color: "#fff" },
  manualBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: Colors.primary + "40", backgroundColor: Colors.primary + "08" },
  manualBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.primary },
  summaryRow: { flexDirection: "row", gap: 8, paddingHorizontal: 12, marginBottom: 6 },
  summaryItem: { flex: 1, backgroundColor: Colors.surface, borderRadius: 14, padding: 12, alignItems: "center", borderWidth: 1, borderColor: Colors.border },
  summaryNum: { fontSize: 24, fontFamily: "Inter_700Bold" },
  summaryLabel: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textSecondary },
  searchWrap: { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: 12, marginBottom: 6, backgroundColor: Colors.surface, borderRadius: 12, paddingHorizontal: 12, height: 40, borderWidth: 1, borderColor: Colors.border },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.text },
  loadingBox: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { flex: 1 },
  attCard: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, overflow: "hidden" },
  statusBar: { width: 4, alignSelf: "stretch" },
  attInfo: { flex: 1, padding: 12 },
  attNameRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  attName: { fontSize: 14, fontFamily: "Inter_700Bold", color: Colors.text },
  attDate: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textMuted },
  attPos: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textSecondary },
  attTimes: { paddingRight: 12, gap: 3, alignItems: "flex-end" },
  timeRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  timeIn: { fontSize: 13, fontFamily: "Inter_700Bold", color: Colors.success },
  timeOut: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textMuted },
  lateChip: { backgroundColor: Colors.warning + "20", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  lateText: { fontSize: 10, fontFamily: "Inter_600SemiBold", color: Colors.warning },
  emptyBox: { alignItems: "center", justifyContent: "center", paddingVertical: 48, gap: 12 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.textMuted },
  modalRoot: { flex: 1, backgroundColor: Colors.background },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 20, paddingTop: 24, borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.surface },
  modalTitle: { fontSize: 17, fontFamily: "Inter_700Bold", color: Colors.text },
  closeBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.background, alignItems: "center", justifyContent: "center" },
  formGroup: { gap: 6 },
  formLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary },
  formInput: { backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: "Inter_400Regular", color: Colors.text },
  dirRow: { flexDirection: "row", gap: 10 },
  dirBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 14, backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.border },
  dirBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  dirText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: 14, height: 52, alignItems: "center", justifyContent: "center", marginTop: 8 },
  saveBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
});
