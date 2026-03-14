import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const domain = process.env.EXPO_PUBLIC_DOMAIN || "";
export const API = domain ? `https://${domain}` : "";

export type AppMode = "select" | "kiosk" | "employee" | "admin";

export type Company = {
  id: number;
  name: string;
  login: string;
  logo?: string;
  workStartTime: string;
  attendanceMethods: string[];
};

export type Employee = {
  id: number;
  fullName: string;
  position: string;
  companyId: number;
  companyName: string;
  attendanceMethod: string;
  nfcCardId?: string | null;
  timepadCode?: string | null;
  qrCode?: string | null;
  photo?: string | null;
  todayAttendance?: any;
};

type AppContextType = {
  mode: AppMode;
  setMode: (m: AppMode) => void;
  company: Company | null;
  employee: Employee | null;
  adminCompany: Company | null;
  kioskLogin: (login: string, password: string) => Promise<void>;
  employeeLogin: (login: string, password: string) => Promise<void>;
  adminLogin: (login: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
  refreshEmployee: () => Promise<void>;
};

const AppContext = createContext<AppContextType>({} as AppContextType);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<AppMode>("select");
  const [company, setCompany] = useState<Company | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [adminCompany, setAdminCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [savedCompany, savedEmployee, savedMode] = await Promise.all([
        AsyncStorage.getItem("hrc_company"),
        AsyncStorage.getItem("hrc_employee"),
        AsyncStorage.getItem("hrc_mode"),
      ]);
      if (savedCompany) setCompany(JSON.parse(savedCompany));
      if (savedEmployee) setEmployee(JSON.parse(savedEmployee));
      if (savedMode) setMode(savedMode as AppMode);
      setLoading(false);
    })();
  }, []);

  const kioskLogin = async (login: string, password: string) => {
    const res = await fetch(`${API}/api/mobile/kiosk-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ login, password }),
    });
    if (!res.ok) { const e = await res.json(); throw new Error(e.message || "Login xatosi"); }
    const data = await res.json();
    setCompany(data.company);
    await AsyncStorage.setItem("hrc_company", JSON.stringify(data.company));
    await AsyncStorage.setItem("hrc_mode", "kiosk");
    setMode("kiosk");
  };

  const employeeLogin = async (login: string, password: string) => {
    const res = await fetch(`${API}/api/mobile/employee-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ login, password }),
    });
    if (!res.ok) { const e = await res.json(); throw new Error(e.message || "Login xatosi"); }
    const data = await res.json();
    setEmployee(data.employee);
    await AsyncStorage.setItem("hrc_employee", JSON.stringify(data.employee));
    await AsyncStorage.setItem("hrc_mode", "employee");
    setMode("employee");
  };

  const adminLogin = async (login: string, password: string) => {
    const res = await fetch(`${API}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ login, password }),
    });
    if (!res.ok) { const e = await res.json(); throw new Error(e.message || "Login xatosi"); }
    const data = await res.json();
    setAdminCompany(data.company);
    await AsyncStorage.setItem("hrc_mode", "admin");
    setMode("admin");
  };

  const refreshEmployee = async () => {
    try {
      const res = await fetch(`${API}/api/mobile/employee-me`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setEmployee(data);
        await AsyncStorage.setItem("hrc_employee", JSON.stringify(data));
      }
    } catch {}
  };

  const logout = async () => {
    setCompany(null);
    setEmployee(null);
    setAdminCompany(null);
    setMode("select");
    await AsyncStorage.multiRemove(["hrc_company", "hrc_employee", "hrc_mode"]);
    try { await fetch(`${API}/api/mobile/employee-logout`, { method: "POST", credentials: "include" }); } catch {}
  };

  return (
    <AppContext.Provider value={{
      mode, setMode, company, employee, adminCompany,
      kioskLogin, employeeLogin, adminLogin, logout,
      loading, refreshEmployee,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() { return useContext(AppContext); }
