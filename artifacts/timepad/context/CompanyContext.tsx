import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API = process.env.EXPO_PUBLIC_API_URL || "";

type Company = {
  id: number;
  name: string;
  login: string;
  logo?: string;
  workStartTime: string;
  attendanceMethods?: string[];
};

type CompanyContextType = {
  company: Company | null;
  login: (login: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
};

const CompanyContext = createContext<CompanyContextType>({
  company: null,
  login: async () => {},
  logout: () => {},
  loading: true,
});

export function CompanyProvider({ children }: { children: React.ReactNode }) {
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem("timepad_company").then((val) => {
      if (val) setCompany(JSON.parse(val));
      setLoading(false);
    });
  }, []);

  const login = async (loginVal: string, password: string) => {
    const res = await fetch(`${API}/api/mobile/kiosk-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ login: loginVal, password }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || "Login xatosi");
    }
    const data = await res.json();
    setCompany(data.company);
    await AsyncStorage.setItem("timepad_company", JSON.stringify(data.company));
  };

  const logout = async () => {
    setCompany(null);
    await AsyncStorage.removeItem("timepad_company");
  };

  return (
    <CompanyContext.Provider value={{ company, login, logout, loading }}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  return useContext(CompanyContext);
}
