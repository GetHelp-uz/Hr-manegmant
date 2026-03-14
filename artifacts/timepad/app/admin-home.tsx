import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useApp } from "@/context/AppContext";
import { router } from "expo-router";
import Colors from "@/constants/colors";
import AdminDashboard from "@/components/admin/Dashboard";
import AdminEmployees from "@/components/admin/Employees";
import AdminAttendance from "@/components/admin/Attendance";
import AdminLeaves from "@/components/admin/Leaves";
import AdminPayroll from "@/components/admin/Payroll";
import AdminMore from "@/components/admin/More";
import * as Haptics from "expo-haptics";

const TABS = [
  { key: "dashboard", icon: "home" as const, label: "Asosiy" },
  { key: "employees", icon: "users" as const, label: "Xodimlar" },
  { key: "attendance", icon: "clock" as const, label: "Davomat" },
  { key: "leaves", icon: "calendar" as const, label: "Ta'til" },
  { key: "payroll", icon: "dollar-sign" as const, label: "Maosh" },
  { key: "more", icon: "grid" as const, label: "Ko'proq" },
] as const;

type TabKey = typeof TABS[number]["key"];

export default function AdminHome() {
  const { logout } = useApp();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<TabKey>("dashboard");

  const handleTabPress = (key: TabKey) => {
    Haptics.selectionAsync();
    setActiveTab(key);
  };

  const handleLogout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    logout();
    router.replace("/");
  };

  const renderScreen = () => {
    switch (activeTab) {
      case "dashboard":  return <AdminDashboard onNavigate={setActiveTab} />;
      case "employees":  return <AdminEmployees />;
      case "attendance": return <AdminAttendance />;
      case "leaves":     return <AdminLeaves />;
      case "payroll":    return <AdminPayroll />;
      case "more":       return <AdminMore onLogout={handleLogout} onNavigate={setActiveTab} />;
      default:           return null;
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) }]}>
      <View style={styles.content}>{renderScreen()}</View>

      {/* Bottom Tab Bar */}
      <View style={[styles.tabBar, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 10 : 0) }]}>
        {TABS.map(tab => {
          const active = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              style={styles.tabItem}
              onPress={() => handleTabPress(tab.key)}
            >
              <View style={[styles.tabIcon, active && styles.tabIconActive]}>
                <Feather name={tab.icon} size={20} color={active ? Colors.primary : Colors.textMuted} />
              </View>
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  content: { flex: 1 },
  tabBar: {
    flexDirection: "row",
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 12,
  },
  tabItem: { flex: 1, alignItems: "center", gap: 3, paddingBottom: 4 },
  tabIcon: {
    width: 40, height: 32, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
  },
  tabIconActive: { backgroundColor: Colors.primary + "18" },
  tabLabel: { fontSize: 10, fontFamily: "Inter_400Regular", color: Colors.textMuted },
  tabLabelActive: { color: Colors.primary, fontFamily: "Inter_600SemiBold" },
});
