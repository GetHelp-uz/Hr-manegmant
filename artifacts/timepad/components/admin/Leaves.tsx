import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  ActivityIndicator, RefreshControl, Modal, TextInput, Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { API } from "@/context/AppContext";
import Colors from "@/constants/colors";
import * as Haptics from "expo-haptics";

const LEAVE_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: "Kutilmoqda", color: "#D97706", bg: "#FEF3C7" },
  approved: { label: "Tasdiqlandi", color: "#059669", bg: "#D1FAE5" },
  rejected: { label: "Rad etildi", color: "#DC2626", bg: "#FEE2E2" },
};
const LEAVE_TYPES: Record<string, string> = {
  sick: "Kasal ta'tili", annual: "Yillik ta'til", personal: "Shaxsiy sabab",
  unpaid: "Haqsiz ta'til", maternity: "Tug'ruq ta'tili", other: "Boshqa",
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("uz-UZ", { day: "2-digit", month: "short", year: "numeric" });
}

export default function AdminLeaves() {
  const [leaves, setLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<"pending" | "approved" | "all">("pending");
  const [actioningId, setActioningId] = useState<number | null>(null);

  const load = async () => {
    try {
      const params = filter !== "all" ? `?status=${filter}&limit=100` : "?limit=100";
      const r = await fetch(`${API}/api/leaves${params}`, { credentials: "include" });
      if (r.ok) { const d = await r.json(); setLeaves(d.data || d || []); }
    } catch {}
    setLoading(false);
  };

  useEffect(() => { setLoading(true); load(); }, [filter]);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const handleAction = async (id: number, action: "approve" | "reject") => {
    setActioningId(id);
    try {
      const r = await fetch(`${API}/api/leaves/${id}/${action}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (!r.ok) throw new Error((await r.json())?.message || "Xato");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await load();
    } catch (e: any) {
      Alert.alert("Xato", e.message);
    } finally { setActioningId(null); }
  };

  return (
    <View style={styles.root}>
      {/* Filter tabs */}
      <View style={styles.topBar}>
        {(["pending", "approved", "all"] as const).map(f => (
          <Pressable key={f} style={[styles.tab, filter === f && styles.tabActive]} onPress={() => { Haptics.selectionAsync(); setFilter(f); }}>
            <Text style={[styles.tabText, filter === f && styles.tabTextActive]}>
              {f === "pending" ? "Kutilmoqda" : f === "approved" ? "Tasdiqlangan" : "Barchasi"}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View style={styles.loadingBox}><ActivityIndicator color={Colors.primary} /></View>
      ) : (
        <ScrollView
          style={styles.list}
          contentContainerStyle={{ padding: 12, gap: 10, paddingBottom: 24 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
          showsVerticalScrollIndicator={false}
        >
          {leaves.length === 0 ? (
            <View style={styles.emptyBox}>
              <Feather name="calendar" size={36} color={Colors.textMuted} />
              <Text style={styles.emptyText}>Ta'til so'rovlari topilmadi</Text>
            </View>
          ) : leaves.map((leave, i) => {
            const st = LEAVE_STATUS[leave.status] || LEAVE_STATUS.pending;
            const isActioning = actioningId === leave.id;
            return (
              <View key={i} style={styles.leaveCard}>
                {/* Header */}
                <View style={styles.leaveHeader}>
                  <View style={styles.leaveEmployee}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{(leave.fullName || leave.full_name || "?")[0]}</Text>
                    </View>
                    <View>
                      <Text style={styles.leaveName}>{leave.fullName || leave.full_name}</Text>
                      <Text style={styles.leavePos}>{leave.position}</Text>
                    </View>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
                    <Text style={[styles.statusText, { color: st.color }]}>{st.label}</Text>
                  </View>
                </View>

                {/* Details */}
                <View style={styles.leaveDetails}>
                  <View style={styles.detailRow}>
                    <Feather name="tag" size={13} color={Colors.textMuted} />
                    <Text style={styles.detailText}>{LEAVE_TYPES[leave.leaveType || leave.leave_type] || leave.leaveType || "—"}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Feather name="calendar" size={13} color={Colors.textMuted} />
                    <Text style={styles.detailText}>
                      {fmtDate(leave.startDate || leave.start_date)} — {fmtDate(leave.endDate || leave.end_date)}
                      <Text style={styles.daysText}> ({leave.days || leave.totalDays || "?"} kun)</Text>
                    </Text>
                  </View>
                  {(leave.reason) && (
                    <View style={styles.detailRow}>
                      <Feather name="message-square" size={13} color={Colors.textMuted} />
                      <Text style={styles.detailText} numberOfLines={2}>{leave.reason}</Text>
                    </View>
                  )}
                </View>

                {/* Action buttons for pending */}
                {leave.status === "pending" && (
                  <View style={styles.actionRow}>
                    <Pressable
                      style={[styles.rejectBtn, isActioning && { opacity: 0.6 }]}
                      onPress={() => handleAction(leave.id, "reject")}
                      disabled={isActioning}
                    >
                      <Feather name="x" size={16} color={Colors.danger} />
                      <Text style={styles.rejectBtnText}>Rad etish</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.approveBtn, isActioning && { opacity: 0.6 }]}
                      onPress={() => handleAction(leave.id, "approve")}
                      disabled={isActioning}
                    >
                      {isActioning
                        ? <ActivityIndicator size="small" color="#fff" />
                        : <>
                          <Feather name="check" size={16} color="#fff" />
                          <Text style={styles.approveBtnText}>Tasdiqlash</Text>
                        </>
                      }
                    </Pressable>
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  topBar: { flexDirection: "row", gap: 6, padding: 12, paddingBottom: 8 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 10, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, alignItems: "center" },
  tabActive: { backgroundColor: "#7C3AED", borderColor: "#7C3AED" },
  tabText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary },
  tabTextActive: { color: "#fff" },
  loadingBox: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { flex: 1 },
  emptyBox: { alignItems: "center", justifyContent: "center", paddingVertical: 48, gap: 12 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.textMuted },
  leaveCard: {
    backgroundColor: Colors.surface, borderRadius: 18, borderWidth: 1, borderColor: Colors.border,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
    overflow: "hidden",
  },
  leaveHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14, paddingBottom: 10 },
  leaveEmployee: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#7C3AED18", alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#7C3AED" },
  leaveName: { fontSize: 14, fontFamily: "Inter_700Bold", color: Colors.text },
  leavePos: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textSecondary },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  leaveDetails: { paddingHorizontal: 14, paddingBottom: 12, gap: 6, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 10 },
  detailRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  detailText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.text },
  daysText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#7C3AED" },
  actionRow: { flexDirection: "row", gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: Colors.border },
  rejectBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    borderRadius: 12, paddingVertical: 11, borderWidth: 1.5, borderColor: Colors.danger + "40", backgroundColor: Colors.danger + "08",
  },
  rejectBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.danger },
  approveBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    borderRadius: 12, paddingVertical: 11, backgroundColor: Colors.success,
  },
  approveBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#fff" },
});
