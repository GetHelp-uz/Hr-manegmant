import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useRegister } from "@workspace/api-client-react";
import { useAppStore } from "@/store/use-store";
import { useTranslation } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, Lock, Mail, User, Phone, ArrowRight, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Register() {
  const [, setLocation] = useLocation();
  const { language } = useAppStore();
  const t = useTranslation(language);
  const { toast } = useToast();
  const [showPass, setShowPass] = useState(false);

  const [formData, setFormData] = useState({
    companyName: "",
    adminName: "",
    phone: "",
    email: "",
    password: ""
  });

  const registerMutation = useRegister({
    mutation: {
      onSuccess: () => {
        toast({ title: "Muvaffaqiyatli!", description: "Kompaniya hisobi muvaffaqiyatli yaratildi" });
        setLocation("/dashboard");
      },
      onError: (err: any) => {
        toast({
          variant: "destructive",
          title: "Xatolik",
          description: err.message || "Ro'yxatdan o'tishda xatolik yuz berdi",
        });
      }
    }
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.id]: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    registerMutation.mutate({ data: formData });
  };

  return (
    <div className="min-h-screen w-full flex bg-background">
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12">
        <div className="w-full max-w-md space-y-6 bg-card p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-border/50">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/25">
              <Building2 className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-3xl font-display font-bold text-foreground tracking-tight">Kompaniya ro'yxatdan o'tkazish</h1>
            <p className="mt-2 text-muted-foreground">Bir necha daqiqada tizimni sozlang</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="companyName" className="text-sm font-semibold">Kompaniya nomi</Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input
                  id="companyName"
                  value={formData.companyName}
                  onChange={handleChange}
                  required
                  className="pl-10 h-11 rounded-xl"
                  placeholder="Masalan: TechUz LLC"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="adminName" className="text-sm font-semibold">Admin ismi</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input
                  id="adminName"
                  value={formData.adminName}
                  onChange={handleChange}
                  required
                  className="pl-10 h-11 rounded-xl"
                  placeholder="Ism Familya"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-semibold">Telefon raqam</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  className="pl-10 h-11 rounded-xl"
                  placeholder="+998 90 123 45 67"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-semibold">Elektron pochta</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="pl-10 h-11 rounded-xl"
                  placeholder="admin@kompaniya.uz"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-semibold">Parol</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPass ? "text" : "password"}
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="pl-10 pr-10 h-11 rounded-xl"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPass ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">Kamida 6 ta belgi bo'lishi kerak</p>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 rounded-xl p-3 text-xs text-blue-700 dark:text-blue-300 space-y-1">
              <p className="font-semibold">✅ Siz olasiz:</p>
              <p>• QR davomat tizimi • Maosh hisoblash • Telegram bot • Hisobotlar</p>
            </div>

            <Button
              type="submit"
              className="w-full h-12 mt-4 rounded-xl text-base font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:-translate-y-0.5 transition-all"
              disabled={registerMutation.isPending}
            >
              {registerMutation.isPending ? "Yaratilmoqda..." : "Hisob yaratish"}
              {!registerMutation.isPending && <ArrowRight className="w-5 h-5 ml-2" />}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Hisobingiz bor?{" "}
            <Link href="/login" className="font-semibold text-primary hover:underline">
              Kirish
            </Link>
          </p>
        </div>
      </div>

      <div className="hidden lg:block lg:w-1/2 relative bg-sidebar overflow-hidden">
        <img
          src={`${import.meta.env.BASE_URL}images/auth-bg.png`}
          alt="Dashboard"
          className="absolute inset-0 w-full h-full object-cover opacity-80 mix-blend-overlay scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-sidebar to-transparent opacity-90"></div>
        <div className="absolute inset-0 flex items-center justify-center p-12">
          <div className="text-center text-white max-w-lg">
            <h2 className="text-4xl font-display font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-white to-blue-200">
              Ishchi kuchingizni samarali boshqaring
            </h2>
            <div className="space-y-4 text-left">
              {[
                { icon: "📱", text: "QR kod orqali davomat — planshet yoki telefon" },
                { icon: "💰", text: "Oylik va soatlik maoshni avtomatik hisoblash" },
                { icon: "📊", text: "Real vaqtda hisobotlar va statistikalar" },
                { icon: "🤖", text: "Telegram bot — xodimlar o'z ma'lumotini ko'radi" },
                { icon: "🔐", text: "100% xavfsiz, ma'lumotlar izolyatsiyalangan" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 bg-white/10 rounded-xl px-4 py-3">
                  <span className="text-xl">{item.icon}</span>
                  <p className="text-sm text-blue-100">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
