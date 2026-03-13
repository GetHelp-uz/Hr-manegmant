import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useLogin } from "@workspace/api-client-react";
import { useAppStore } from "@/store/use-store";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, Lock, AtSign, ArrowRight, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const PLATFORM_ADMIN_LOGIN = "im_yakuboff98";
const STORAGE_KEY = "hr_saved_credentials";

const FEATURES = [
  { icon: "📱", title: "QR Davomat", desc: "Selfie + QR orqali avtomatik ro'yxat" },
  { icon: "🤖", title: "Telegram Bot", desc: "Xodimlar ma'lumotlarini botdan ko'radi" },
  { icon: "💰", title: "Maosh hisoblash", desc: "Oylik, soatlik, kunlik, ishbay" },
  { icon: "📊", title: "AI Tahlil", desc: "Aqlli hisobotlar va tavsiyalar" },
  { icon: "🌐", title: "Ko'p tilli", desc: "O'zbek, Rus tili" },
];

export default function Login() {
  const [, setLocation] = useLocation();
  const { setUserRole } = useAppStore();
  const { toast } = useToast();

  const [loginVal, setLoginVal] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const { login: savedLogin, password: savedPw } = JSON.parse(saved);
        if (savedLogin) { setLoginVal(savedLogin); setHasSaved(true); }
        if (savedPw) { setPassword(savedPw); setRememberMe(true); }
      }
    } catch {}
  }, []);

  const loginMutation = useLogin({
    mutation: {
      onSuccess: (data: any) => {
        if (data?.user?.role) setUserRole(data.user.role);
        if (rememberMe) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ login: loginVal, password }));
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
        setLocation("/dashboard");
      },
      onError: (err: any) => {
        toast({
          variant: "destructive",
          title: "Xatolik",
          description: err?.data?.message || err?.message || "Login yoki parol noto'g'ri",
        });
      }
    }
  });

  const [platformLoading, setPlatformLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loginVal.trim() === PLATFORM_ADMIN_LOGIN) {
      setPlatformLoading(true);
      try {
        await apiClient.post("/api/platform-admin/login", { login: loginVal.trim(), password });
        setLocation("/platform-admin/dashboard");
      } catch (err: any) {
        toast({
          variant: "destructive",
          title: "Xatolik",
          description: err?.message || "Login yoki parol noto'g'ri",
        });
      } finally {
        setPlatformLoading(false);
      }
      return;
    }
    loginMutation.mutate({ data: { login: loginVal, password } });
  };

  const handleSave = () => {
    if (loginVal && password) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ login: loginVal, password }));
      setHasSaved(true); setRememberMe(true);
      toast({ title: "Saqlandi", description: "Login va parol qurilmada saqlandi" });
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-muted/30">
      {/* Left: Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md bg-card p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-border/50 space-y-7">

          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/30">
              <Building2 className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-display font-bold tracking-tight">Tizimga kirish</h1>
            <p className="mt-1.5 text-muted-foreground text-sm">Login va parolingizni kiriting</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Login yoki Email</Label>
              <div className="relative">
                <AtSign className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="sizning_loginiz"
                  autoComplete="username"
                  className="pl-10 h-11 rounded-xl bg-background border-border focus:ring-2 focus:ring-primary/20"
                  value={loginVal}
                  onChange={(e) => setLoginVal(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">Parol</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="pl-10 pr-10 h-11 rounded-xl bg-background border-border focus:ring-2 focus:ring-primary/20"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-border text-primary"
                />
                <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                  Eslab qol
                </span>
              </label>
              <div className="flex gap-3">
                {loginVal && password && (
                  <button type="button" onClick={handleSave}
                    className="text-xs text-primary hover:text-primary/80 font-medium transition-colors">
                    Saqlash
                  </button>
                )}
                {hasSaved && (
                  <button type="button"
                    onClick={() => { localStorage.removeItem(STORAGE_KEY); setHasSaved(false); setRememberMe(false); }}
                    className="text-xs text-muted-foreground hover:text-destructive transition-colors">
                    O'chirish
                  </button>
                )}
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 rounded-xl text-base font-semibold shadow-md shadow-primary/20 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 gap-2"
              disabled={loginMutation.isPending || platformLoading}
            >
              {(loginMutation.isPending || platformLoading) ? "Kirilmoqda..." : <>Kirish <ArrowRight className="w-5 h-5" /></>}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Hisobingiz yo'qmi?{" "}
            <Link href="/register" className="font-semibold text-primary hover:underline">
              Korxona ro'yxatdan o'tkazish
            </Link>
          </p>
        </div>
      </div>

      {/* Right: Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col items-center justify-center p-12">
        <div className="absolute inset-0 bg-gradient-to-br from-primary to-violet-700" />
        <div className="relative z-10 text-white max-w-sm w-full">
          <h2 className="text-3xl font-display font-bold mb-2 text-white">HR Workforce</h2>
          <p className="text-white/60 text-sm mb-8 leading-relaxed">
            O'rta Osiyo uchun yaratilgan zamonaviy HR boshqaruv tizimi
          </p>
          <div className="space-y-3">
            {FEATURES.map((f, i) => (
              <div key={i} className="flex items-center gap-4 bg-white/10 backdrop-blur-sm rounded-2xl px-5 py-3">
                <span className="text-xl">{f.icon}</span>
                <div>
                  <p className="font-semibold text-white text-sm">{f.title}</p>
                  <p className="text-white/60 text-xs">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 p-4 bg-white/10 rounded-2xl">
            <p className="text-xs text-white/50 text-center">
              🇺🇿 O'zbekiston • 🇰🇿 Qozog'iston • 🇰🇬 Qirg'iziston
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
