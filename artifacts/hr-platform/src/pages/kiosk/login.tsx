import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Monitor, Eye, EyeOff, Tablet, KeyRound, AlertCircle } from "lucide-react";

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
  const [remember, setRemember] = useState(true);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KIOSK_STORAGE_KEY);
      if (saved) {
        const cfg: KioskConfig = JSON.parse(saved);
        if (cfg.login && cfg.password) {
          setLogin(cfg.login);
          setPassword(cfg.password);
          setRemember(true);
        }
      }
    } catch {}
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result: any = await apiClient.post("/api/devices/auth", { login: login.trim(), password: password.trim() });

      if (!result.success) {
        setError("Login yoki parol noto'g'ri");
        setLoading(false);
        return;
      }

      const config: KioskConfig = {
        login: login.trim(),
        password: password.trim(),
        deviceId: result.device.id,
        deviceName: result.device.deviceName,
        companyName: result.company.name,
        companyId: result.company.id,
      };

      if (remember) {
        localStorage.setItem(KIOSK_STORAGE_KEY, JSON.stringify(config));
      } else {
        localStorage.removeItem(KIOSK_STORAGE_KEY);
      }

      setLocation("/kiosk/scan");
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "Login yoki parol noto'g'ri";
      setError(msg);
    } finally {
      setLoading(false);
    }
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
              <div key={f.title} className="flex items-center gap-4 bg-white/5 rounded-2xl px-5 py-3 text-left">
                <span className="text-2xl">{f.icon}</span>
                <div>
                  <p className="text-white font-semibold text-sm">{f.title}</p>
                  <p className="text-slate-500 text-xs">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-sm space-y-8">
          <div className="lg:hidden flex flex-col items-center mb-2">
            <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
              <Tablet className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">Kiosk Rejimi</h1>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-white">Qurilmaga kirish</h2>
            <p className="text-slate-400 mt-2 text-sm">
              Qurilma login va parolini kiriting. Bu ma'lumotlarni admin panelning{" "}
              <strong className="text-slate-300">Qurilmalar</strong> bo'limidan oling.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label className="text-slate-300 text-sm font-medium flex items-center gap-2">
                <Monitor className="w-4 h-4" /> Qurilma logini
              </Label>
              <Input
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                placeholder="kiosk_1_2"
                required
                autoComplete="username"
                className="h-12 bg-slate-900 border-slate-700 text-white placeholder:text-slate-600 rounded-xl focus:border-emerald-500 font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300 text-sm font-medium flex items-center gap-2">
                <KeyRound className="w-4 h-4" /> Parol
              </Label>
              <div className="relative">
                <Input
                  type={showPwd ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Parolni kiriting"
                  required
                  autoComplete="current-password"
                  className="h-12 bg-slate-900 border-slate-700 text-white placeholder:text-slate-600 rounded-xl focus:border-emerald-500 pr-12 font-mono tracking-widest"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <label className="flex items-center gap-3 cursor-pointer px-1">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="w-4 h-4 rounded border-slate-600 text-emerald-600 bg-slate-800"
              />
              <span className="text-sm text-slate-400">Ushbu qurilmada eslab qol (avtomatik kirish)</span>
            </label>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold text-base shadow-lg shadow-emerald-600/25 transition-all"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Tekshirilmoqda...
                </span>
              ) : (
                "Kirishni boshlash"
              )}
            </Button>
          </form>

          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4">
            <p className="text-slate-500 text-xs font-medium uppercase tracking-wide mb-2">Yordam</p>
            <p className="text-slate-400 text-sm">
              Login va parolni olish uchun: Admin paneli →{" "}
              <strong className="text-slate-300">Qurilmalar</strong> → qurilma kartasini oching.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
