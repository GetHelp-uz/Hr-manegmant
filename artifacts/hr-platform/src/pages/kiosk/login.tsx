import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Monitor, User, Lock, Eye, EyeOff, Tablet, CheckCircle2 } from "lucide-react";

const KIOSK_STORAGE_KEY = "hr_kiosk_config";

export interface KioskConfig {
  login: string;
  password: string;
  deviceId: number;
  deviceName: string;
  companyName: string;
  companyId: number;
}

export default function KioskLogin() {
  const [, setLocation] = useLocation();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [devices, setDevices] = useState<any[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<number | null>(null);
  const [companyInfo, setCompanyInfo] = useState<any>(null);
  const [step, setStep] = useState<"login" | "device">("login");
  const [remember, setRemember] = useState(true);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KIOSK_STORAGE_KEY);
      if (saved) {
        const cfg: KioskConfig = JSON.parse(saved);
        setLogin(cfg.login);
        setPassword(cfg.password);
        setRemember(true);
      }
    } catch {}
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result: any = await apiClient.post("/api/auth/login", { login, password });
      setCompanyInfo(result.company);
      const devResult: any = await apiClient.get("/api/devices");
      const devList = devResult?.data || [];
      setDevices(devList);
      if (devList.length > 0) setSelectedDevice(devList[0].id);
      setStep("device");
    } catch (err: any) {
      setError(err?.message || "Login yoki parol noto'g'ri");
    } finally {
      setLoading(false);
    }
  };

  const handleStart = () => {
    if (!selectedDevice || !companyInfo) return;
    const dev = devices.find((d) => d.id === selectedDevice);
    const config: KioskConfig = {
      login,
      password,
      deviceId: selectedDevice,
      deviceName: dev?.deviceName || "Qurilma",
      companyName: companyInfo.name,
      companyId: companyInfo.id,
    };
    if (remember) {
      localStorage.setItem(KIOSK_STORAGE_KEY, JSON.stringify(config));
    } else {
      localStorage.removeItem(KIOSK_STORAGE_KEY);
    }
    setLocation("/kiosk/scan");
  };

  return (
    <div className="min-h-screen w-full flex bg-slate-950">
      <div className="hidden lg:flex flex-1 flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(16,185,129,0.12),transparent_60%)]" />
        <div className="relative z-10 max-w-md text-center">
          <div className="w-24 h-24 bg-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-emerald-600/40">
            <Tablet className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">Kiosk Rejimi</h1>
          <p className="text-slate-400 text-lg leading-relaxed">
            Planshet yoki monitor uchun mo'ljallangan 24/7 QR davomat skaneri
          </p>
          <div className="grid grid-cols-1 gap-4 mt-10">
            {[
              { icon: "📷", title: "Orqa kamera", desc: "QR kodni skaner qiladi" },
              { icon: "🤳", title: "Old kamera", desc: "Selfie avtomatik olinadi" },
              { icon: "🔄", title: "24/7 ishlaydi", desc: "Avtomatik tiklanadi, o'chmaydi" },
              { icon: "📊", title: "Real-time", desc: "Telegram va admin panelga yuboriladi" },
            ].map((f) => (
              <div key={f.title} className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl px-5 py-3">
                <span className="text-2xl">{f.icon}</span>
                <div className="text-left">
                  <p className="font-semibold text-white text-sm">{f.title}</p>
                  <p className="text-slate-500 text-xs">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 lg:max-w-md flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-emerald-600/30">
              <Monitor className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white">
              {step === "login" ? "Kiosk kirish" : "Qurilmani tanlang"}
            </h2>
            <p className="text-slate-400 mt-1 text-sm">
              {step === "login" ? "Korxona admin hisobini kiriting" : `${companyInfo?.name} — Qaysi qurilma?`}
            </p>
          </div>

          {step === "login" ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-slate-300 font-medium text-sm">Login</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3.5 h-4 w-4 text-slate-500" />
                  <Input
                    value={login}
                    onChange={(e) => setLogin(e.target.value)}
                    placeholder="admin_login"
                    className="pl-10 h-12 bg-slate-800 border-slate-700 text-white placeholder:text-slate-600 rounded-xl focus:border-emerald-500"
                    required autoComplete="username"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300 font-medium text-sm">Parol</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3.5 h-4 w-4 text-slate-500" />
                  <Input
                    type={showPwd ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-10 pr-10 h-12 bg-slate-800 border-slate-700 text-white placeholder:text-slate-600 rounded-xl focus:border-emerald-500"
                    required autoComplete="current-password"
                  />
                  <button type="button" onClick={() => setShowPwd((s) => !s)}
                    className="absolute right-3 top-3.5 text-slate-500 hover:text-slate-300">
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-400">
                  {error}
                </div>
              )}

              <Button type="submit" disabled={loading}
                className="w-full h-12 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold shadow-lg shadow-emerald-600/25">
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Tekshirilmoqda...
                  </span>
                ) : "Davom etish"}
              </Button>
            </form>
          ) : (
            <div className="space-y-4">
              {devices.length === 0 ? (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-4 py-4 text-sm text-yellow-400 text-center">
                  Hech qanday qurilma topilmadi.<br />
                  <span className="text-slate-400">Admin panelda "Qurilmalar" bo'limida qo'shing.</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {devices.map((dev: any) => (
                    <button
                      key={dev.id}
                      onClick={() => setSelectedDevice(dev.id)}
                      className={`w-full flex items-center gap-4 px-5 py-4 rounded-xl border transition-all text-left ${
                        selectedDevice === dev.id
                          ? "border-emerald-500 bg-emerald-500/10"
                          : "border-slate-700 bg-slate-800/50 hover:border-slate-600"
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${selectedDevice === dev.id ? "bg-emerald-600" : "bg-slate-700"}`}>
                        <Monitor className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-white text-sm">{dev.deviceName}</p>
                        <p className="text-slate-500 text-xs">{dev.location || "Joylashuv ko'rsatilmagan"}</p>
                      </div>
                      {selectedDevice === dev.id && (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      )}
                    </button>
                  ))}
                </div>
              )}

              <label className="flex items-center gap-3 cursor-pointer px-1">
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-600 text-emerald-600 bg-slate-800" />
                <span className="text-sm text-slate-400">Ushbu qurilmada eslab qol (avtomatik kirish)</span>
              </label>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep("login")}
                  className="flex-1 h-12 border-slate-700 text-slate-300 hover:bg-slate-800 rounded-xl">
                  Orqaga
                </Button>
                <Button onClick={handleStart} disabled={!selectedDevice || devices.length === 0}
                  className="flex-2 flex-1 h-12 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold shadow-lg shadow-emerald-600/25">
                  Kiosk boshlash
                </Button>
              </div>
            </div>
          )}

          <p className="text-center text-slate-600 text-xs mt-8">
            Kiosk rejimida sahifa 24 soat ochiq qoladi
          </p>
        </div>
      </div>
    </div>
  );
}
