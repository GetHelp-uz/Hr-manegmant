import { useState } from "react";
import { useLocation } from "wouter";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, User, Lock, Eye, EyeOff } from "lucide-react";

export default function PlatformAdminLogin() {
  const [, setLocation] = useLocation();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await apiClient.post("/api/platform-admin/login", { login, password });
      setLocation("/platform-admin/dashboard");
    } catch (err: any) {
      setError(err?.message || "Login yoki parol noto'g'ri");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-slate-950">
      <div className="hidden lg:flex flex-1 flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(59,130,246,0.15),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(99,102,241,0.1),transparent_60%)]" />
        <div className="relative z-10 max-w-md text-center">
          <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-blue-600/40">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">Superadmin Panel</h1>
          <p className="text-slate-400 text-lg leading-relaxed">
            Barcha korxonalar, xodimlar va server infratuzilmasini bir joydan boshqaring
          </p>
          <div className="grid grid-cols-3 gap-4 mt-10">
            {[
              { label: "Korxonalar", desc: "To'liq nazorat" },
              { label: "Xodimlar", desc: "Barcha bazalar" },
              { label: "Server", desc: "Real-time holat" },
            ].map(item => (
              <div key={item.label} className="bg-white/5 border border-white/10 rounded-2xl p-4">
                <p className="font-semibold text-white text-sm">{item.label}</p>
                <p className="text-slate-500 text-xs mt-1">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 lg:max-w-md flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="lg:hidden text-center mb-8">
            <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">Superadmin Panel</h1>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white">Tizimga kirish</h2>
            <p className="text-slate-400 mt-1 text-sm">Platform admin hisob ma'lumotlarini kiriting</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label className="text-slate-300 font-medium text-sm">Login</Label>
              <div className="relative">
                <User className="absolute left-3 top-3.5 h-4 w-4 text-slate-500" />
                <Input
                  value={login}
                  onChange={e => setLogin(e.target.value)}
                  placeholder="login nomingiz"
                  className="pl-10 h-12 bg-slate-800 border-slate-700 text-white placeholder:text-slate-600 rounded-xl focus:border-blue-500"
                  required
                  autoComplete="username"
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
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-10 pr-10 h-12 bg-slate-800 border-slate-700 text-white placeholder:text-slate-600 rounded-xl focus:border-blue-500"
                  required
                  autoComplete="current-password"
                />
                <button type="button" onClick={() => setShowPwd(s => !s)}
                  className="absolute right-3 top-3.5 text-slate-500 hover:text-slate-300">
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-400 flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-red-500/20 flex items-center justify-center text-xs">!</span>
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold shadow-lg shadow-blue-600/25 transition-all"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Tekshirilmoqda...
                </span>
              ) : "Kirish"}
            </Button>
          </form>

          <p className="text-center text-slate-600 text-xs mt-8">
            Bu sahifa faqat platform administratorlari uchun
          </p>
        </div>
      </div>
    </div>
  );
}
