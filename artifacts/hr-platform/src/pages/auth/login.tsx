import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useLogin } from "@workspace/api-client-react";
import { useAppStore } from "@/store/use-store";
import { useTranslation } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, Lock, Mail, ArrowRight, Eye, EyeOff, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const STORAGE_KEY = "hr_saved_credentials";

export default function Login() {
  const [, setLocation] = useLocation();
  const { language, setUserRole } = useAppStore();
  const t = useTranslation(language);
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const { email: savedEmail, password: savedPw } = JSON.parse(saved);
        if (savedEmail) { setEmail(savedEmail); setHasSaved(true); }
        if (savedPw) { setPassword(savedPw); setRememberMe(true); }
      }
    } catch {}
  }, []);

  const loginMutation = useLogin({
    mutation: {
      onSuccess: (data: any) => {
        if (data?.user?.role) setUserRole(data.user.role);
        if (rememberMe) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ email, password }));
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
        setLocation("/dashboard");
      },
      onError: (err: any) => {
        toast({
          variant: "destructive",
          title: t('error'),
          description: err.message || "Login yoki parol noto'g'ri",
        });
      }
    }
  });

  const handleSaveCredentials = () => {
    if (email && password) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ email, password }));
      setHasSaved(true);
      setRememberMe(true);
      toast({ title: "Saqlandi", description: "Login va parol qurilmada saqlandi" });
    }
  };

  const handleClearSaved = () => {
    localStorage.removeItem(STORAGE_KEY);
    setHasSaved(false);
    setRememberMe(false);
    toast({ title: "O'chirildi", description: "Saqlangan ma'lumotlar o'chirildi" });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({ data: { email, password } });
  };

  return (
    <div className="min-h-screen w-full flex bg-background">
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 relative z-10">
        <div className="w-full max-w-md space-y-8 bg-card p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-border/50">
          <div className="text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
              <Building2 className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl font-display font-bold text-foreground tracking-tight">{t('login_title')}</h1>
            <p className="mt-2 text-muted-foreground">Tizimga kirish uchun ma'lumotlaringizni kiriting</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 mt-8">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-semibold">{t('email')}</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@korxona.uz"
                  className="pl-10 h-12 rounded-xl bg-background border-border focus:ring-2 focus:ring-primary/20 transition-all"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-semibold">Parol</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="pl-10 pr-10 h-12 rounded-xl bg-background border-border focus:ring-2 focus:ring-primary/20 transition-all"
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
                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary/30"
                />
                <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                  Meni eslab qol
                </span>
              </label>
              <div className="flex gap-2">
                {email && password && (
                  <button
                    type="button"
                    onClick={handleSaveCredentials}
                    className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors font-medium"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Saqlash
                  </button>
                )}
                {hasSaved && (
                  <button
                    type="button"
                    onClick={handleClearSaved}
                    className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                  >
                    O'chirish
                  </button>
                )}
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 rounded-xl text-base font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? "Kirilmoqda..." : "Kirish"}
              {!loginMutation.isPending && <ArrowRight className="w-5 h-5 ml-2" />}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-8">
            Hisobingiz yo'qmi?{" "}
            <Link href="/register" className="font-semibold text-primary hover:underline hover:text-primary/80 transition-colors">
              Korxona ro'yxatdan o'tkazish
            </Link>
          </p>
        </div>
      </div>

      <div className="hidden lg:block lg:w-1/2 relative bg-sidebar overflow-hidden">
        <img
          src={`${import.meta.env.BASE_URL}images/auth-bg.png`}
          alt="Dashboard"
          className="absolute inset-0 w-full h-full object-cover opacity-80 mix-blend-overlay"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-sidebar to-transparent opacity-90"></div>
        <div className="absolute inset-0 flex items-center justify-center p-12">
          <div className="text-center text-white max-w-lg">
            <h2 className="text-4xl font-display font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-white to-blue-200">
              Ishchi kuchini zamonaviylashtiring
            </h2>
            <p className="text-lg text-blue-100/80 leading-relaxed font-light">
              Davomatni boshqaring, oyliklarni hisoblang va xodimlarni real vaqtda kuzating.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
