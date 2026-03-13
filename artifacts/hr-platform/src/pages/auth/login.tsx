import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useLogin } from "@workspace/api-client-react";
import { useAppStore } from "@/store/use-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, Lock, AtSign, ArrowRight, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const STORAGE_KEY = "hr_saved_credentials";

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
          description: err?.response?.data?.message || "Login yoki parol noto'g'ri",
        });
      }
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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
    <div className="min-h-screen w-full flex bg-background">
      {/* Left: Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative z-10">
        <div className="w-full max-w-md bg-card p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-border/50 space-y-8">

          <div className="text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-inner">
              <Building2 className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl font-display font-bold tracking-tight">Tizimga kirish</h1>
            <p className="mt-2 text-muted-foreground text-sm">Login va parolingizni kiriting</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Login yoki Email</Label>
              <div className="relative">
                <AtSign className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="sizning_loginiz"
                  autoComplete="username"
                  className="pl-10 h-12 rounded-xl bg-background border-border focus:ring-2 focus:ring-primary/20"
                  value={loginVal}
                  onChange={(e) => setLoginVal(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">Parol</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="pl-10 pr-10 h-12 rounded-xl bg-background border-border focus:ring-2 focus:ring-primary/20"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3.5 text-muted-foreground hover:text-foreground transition-colors"
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
              className="w-full h-12 rounded-xl text-base font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 gap-2"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? "Kirilmoqda..." : <>Kirish <ArrowRight className="w-5 h-5" /></>}
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
      <div className="hidden lg:flex lg:w-1/2 relative bg-sidebar overflow-hidden flex-col items-center justify-center p-14">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/90 to-violet-700" />
        <div className="relative z-10 text-white max-w-lg w-full">
          <h2 className="text-4xl font-display font-bold mb-3 text-white">HR Workforce</h2>
          <p className="text-white/70 text-lg mb-10 leading-relaxed">
            O'rta Osiyo uchun yaratilgan zamonaviy HR boshqaruv tizimi
          </p>
          <div className="space-y-3">
            {[
              { icon: "📱", title: "QR Davomat", desc: "Selfie + QR orqali avtomatik ro'yxat" },
              { icon: "🤖", title: "Telegram Bot", desc: "Xodimlar ma'lumotlarini botdan ko'radi" },
              { icon: "💰", title: "Maosh hisoblash", desc: "Oylik, soatlik, kunlik, ishbay" },
              { icon: "📊", title: "AI Tahlil", desc: "Aqlli hisobotlar va tavsiyalar" },
              { icon: "🌐", title: "Ko'p tilli", desc: "O'zbek, Rus tili" },
            ].map((f, i) => (
              <div key={i} className="flex items-start gap-4 bg-white/10 backdrop-blur-sm rounded-2xl px-5 py-3.5">
                <span className="text-2xl mt-0.5">{f.icon}</span>
                <div>
                  <p className="font-bold text-white">{f.title}</p>
                  <p className="text-white/60 text-sm">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
