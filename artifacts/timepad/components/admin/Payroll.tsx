import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  ActivityIndicator, RefreshControl, Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { API } from "@/context/AppContext";
import Colors from "@/constants/colors";
import * as Haptics from "expo-haptics";

function fmtMoney(n: number | null | undefined) {
  if (!n) return "0";
  return n.toLocaleString("uz-UZ");
}

const MONTHS_UZ = [
  "Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun",
  "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr"
];

export default function AdminPayroll() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [payrolls, setPayrolls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [summary, setSummary] = useState({ total: 0, paid: 0, pending: 0 });

  const load = async () => {
    try {
      const r = await fetch(`${API}/api/payroll?year=${year}&month=${month}&limit=100`, { credentials: "include" });
      if (r.ok) {
        const d = await r.json();
        const arr = d.data || d || [];
        setPayrolls(arr);
        const total = arr.reduce((s: number, p: any) => s + (p.netSalary || p.net_salary || 0), 0);
        const paid = arr.filter((p: any) => p.status === "paid").reduce((s: number, p: any) => s + (p.netSalary || p.net_salary || 0), 0);
        setSummary({ total, paid, pending: total - paid });
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => { setLoading(true); load(); }, [year, month]);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const handleProcess = async (id: number) => {
    setProcessingId(id);
    try {
      const r = await fetch(`${API}/api/payroll/${id}/pay`, { method: "PUT", credentials: "include" });
      if (!r.ok) throw new Error((await r.json())?.message || "Xato");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await load();
    } catch (e: any) {
      Alert.alert("Xato", e.message);
    } finally { setProcessingId(null); }
  };

  const changeMonth = (delta: number) => {
    let m = month + delta; let y = year;
    if (m > 12) { m = 1; y++; } if (m < 1) { m = 12; y--; }
    setMonth(m); setYear(y);
    Haptics.selectionAsync();
  };

  return (
    <View style={styles.root}>
      {/* Month selector */}
      <View style={styles.monthSelector}>
        <Pressable style={styles.arrowBtn} onPress={() => changeMonth(-1)}>
          <Feather name="chevron-left" size={20} color={Colors.text} />
        </Pressable>
        <Text style={styles.monthLabel}>{MONTHS_UZ[month - 1]} {year}</Text>
        <Pressable style={styles.arrowBtn} onPress={() => changeMonth(1)}>
          <Feather name="chevron-right" size={20} color={Colors.text} />
        </Pressable>
      </View>

      {/* Summary banner */}
      <View style={styles.summaryBanner}>
        <View style={styles.sumItem}>
          <Text style={styles.sumValue}>{fmtMoney(summary.total)}</Text>
          <Text style={styles.sumLabel}>Jami maosh</Text>
        </View>
        <View style={styles.sumDivider} />
        <View style={styles.sumItem}>
          <Text style={[styles.sumValue, { color: Colors.success }]}>{fmtMoney(summary.paid)}</Text>
          <Text style={styles.sumLabel}>To'langan</Text>
        </View>
        <View style={styles.sumDivider} />
        <View style={styles.sumItem}>
          <Text style={[styles.sumValue, { color: Colors.warning }]}>{fmtMoney(summary.pending)}</Text>
          <Text style={styles.sumLabel}>Kutilmoqda</Text>
        </View>
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
          {payrolls.length === 0 ? (
            <View style={styles.emptyBox}>
              <Feather name="dollar-sign" size={36} color={Colors.textMuted} />
              <Text style={styles.emptyText}>Bu oy maosh hisob-kitobi yo'q</Text>
              <Text style={styles.emptyHint}>Maosh hisoblash HR platforma veb panelidan amalga oshiriladi</Text>
            </View>
          ) : payrolls.map((p, i) => {
            const isPaid = p.status === "paid";
            const isProcessing = processingId === p.id;
            const net = p.netSalary || p.net_salary || 0;
            const gross = p.grossSalary || p.gross_salary || net;
            const bonus = p.bonusAmount || p.bonus_amount || 0;
            const penalty = p.penaltyAmount || p.penalty_amount || 0;
            const advance = p.advanceAmount || p.advance_amount || 0;
            return (
              <View key={i} style={[styles.payCard, isPaid && styles.payCardPaid]}>
                <View style={styles.payHeader}>
                  <View style={styles.payEmployee}>
                    <View style={[styles.payAvatar, isPaid && { backgroundColor: Colors.success + "18" }]}>
                      <Text style={[styles.payAvatarText, isPaid && { color: Colors.success }]}>
                        {(p.fullName || p.full_name || "?")[0]}
                      </Text>
                    </View>
                    <View>
                      <Text style={styles.payName}>{p.fullName || p.full_name}</Text>
                      <Text style={styles.payPos}>{p.position}</Text>
                    </View>
                  </View>
                  <View style={[styles.payStatusBadge, { backgroundColor: isPaid ? Colors.success + "15" : Colors.warning + "15" }]}>
                    <Text style={[styles.payStatusText, { color: isPaid ? Colors.success : Colors.warning }]}>
                      {isPaid ? "To'landi" : "Kutilmoqda"}
                    </Text>
                  </View>
                </View>

                <View style={styles.payDetails}>
                  {[
                    { label: "Asosiy maosh", value: gross, color: Colors.text },
                    bonus > 0 && { label: "Bonus", value: bonus, color: Colors.success },
                    penalty > 0 && { label: "Jarima", value: -penalty, color: Colors.danger },
                    advance > 0 && { label: "Avans", value: -advance, color: Colors.warning },
                  ].filter(Boolean).map((row: any, j) => (
                    <View key={j} style={styles.payRow}>
                      <Text style={styles.payRowLabel}>{row.label}</Text>
                      <Text style={[styles.payRowValue, { color: row.color }]}>
                        {row.value < 0 ? "-" : ""}{fmtMoney(Math.abs(row.value))} so'm
                      </Text>
                    </View>
                  ))}
                  <View style={styles.payTotal}>
                    <Text style={styles.payTotalLabel}>Jami to'lov</Text>
                    <Text style={styles.payTotalValue}>{fmtMoney(net)} so'm</Text>
                  </View>
                </View>

                {!isPaid && (
                  <Pressable
                    style={[styles.payBtn, isProcessing && { opacity: 0.6 }]}
                    onPress={() => handleProcess(p.id)}
                    disabled={isProcessing}
                  >
                    {isProcessing
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <>
                        <Feather name="check-circle" size={16} color="#fff" />
                        <Text style={styles.payBtnText}>To'langan deb belgilash</Text>
                      </>
                    }
                  </Pressable>
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
  monthSelector: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 20, padding: 12, paddingBottom: 8 },
  arrowBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.surface, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: Colors.border },
  monthLabel: { fontSize: 17, fontFamily: "Inter_700Bold", color: Colors.text, width: 160, textAlign: "center" },
  summaryBanner: { flexDirection: "row", backgroundColor: Colors.primary, marginHorizontal: 12, borderRadius: 18, padding: 16, marginBottom: 4 },
  sumItem: { flex: 1, alignItems: "center", gap: 2 },
  sumValue: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#fff" },
  sumLabel: { fontSize: 10, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.7)" },
  sumDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.2)" },
  loadingBox: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { flex: 1 },
  emptyBox: { alignItems: "center", justifyContent: "center", paddingVertical: 48, gap: 8 },
  emptyText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.textMuted },
  emptyHint: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textMuted, textAlign: "center", paddingHorizontal: 24 },
  payCard: { backgroundColor: Colors.surface, borderRadius: 18, borderWidth: 1, borderColor: Colors.border, overflow: "hidden" },
  payCardPaid: { borderColor: Colors.success + "40" },
  payHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14, paddingBottom: 10 },
  payEmployee: { flexDirection: "row", alignItems: "center", gap: 10 },
  payAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primary + "18", alignItems: "center", justifyContent: "center" },
  payAvatarText: { fontSize: 16, fontFamily: "Inter_700Bold", color: Colors.primary },
  payName: { fontSize: 14, fontFamily: "Inter_700Bold", color: Colors.text },
  payPos: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textSecondary },
  payStatusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  payStatusText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  payDetails: { paddingHorizontal: 14, paddingBottom: 12, gap: 6, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 10 },
  payRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  payRowLabel: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textSecondary },
  payRowValue: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  payTotal: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 8, borderTopWidth: 1, borderTopColor: Colors.border, marginTop: 4 },
  payTotalLabel: { fontSize: 14, fontFamily: "Inter_700Bold", color: Colors.text },
  payTotalValue: { fontSize: 16, fontFamily: "Inter_700Bold", color: Colors.primary },
  payBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: Colors.success, paddingVertical: 12, borderTopWidth: 1, borderTopColor: Colors.border },
  payBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#fff" },
});
