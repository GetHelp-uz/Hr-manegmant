import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useRegister } from "@workspace/api-client-react";
import { useAppStore } from "@/store/use-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, Lock, Mail, User, Phone, AtSign, MapPin, ArrowRight, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const BENEFITS = [
  { icon: "🤖", text: "Telegram bot — xodimlar ma'lumotlari" },
  { icon: "📱", text: "QR + Selfie davomat tizimi" },
  { icon: "💰", text: "Oylik, soatlik, kunlik, ishbay maosh" },
  { icon: "📊", text: "AI tahlil va aqlli hisobotlar" },
  { icon: "🌐", text: "O'zbek, Rus tillarida ishlaydi" },
  { icon: "🔐", text: "Xavfsiz multi-tenant arxitektura" },
];

export default function Register() {
  const [, setLocation] = useLocation();
  const { setUserRole } = useAppStore();
  const { toast } = useToast();
  const [showPass, setShowPass] = useState(false);
  const [step, setStep] = useState(1);

  const [formData, setFormData] = useState({
    companyName: "",
    phone: "",
    address: "",
    adminName: "",
    email: "",
    login: "",
    password: "",
  });

  const registerMutation = useRegister({
    mutation: {
      onSuccess: (data: any) => {
        if (data?.user?.role) setUserRole(data.user.role);
        toast({ title: "Muvaffaqiyatli!", description: "Kompaniya hisobi yaratildi" });
        setLocation("/dashboard");
      },
      onError: (err: any) => {
        toast({
          variant: "destructive",
          title: "Xatolik",
          description: err?.response?.data?.message || "Ro'yxatdan o'tishda xatolik",
        });
      }
    }
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) { setStep(2); return; }
    registerMutation.mutate({ data: formData });
  };

  const loginHint = formData.companyName
    ? formData.companyName.toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 20)
    : "";

  return (
    <div className="min-h-screen w-full flex bg-background">
      {/* Left: Form */}
      <div className="w-full lg:w-[55%] flex items-start justify-center p-6 sm:p-10 overflow-y-auto">
        <div className="w-full max-w-lg bg-card p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-border/50 my-6">

          <div className="text-center mb-7">
            <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/25">
              <Building2 className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-display font-bold tracking-tight">Kompaniya ro'yxatdan o'tkazish</h1>
            <p className="mt-1 text-sm text-muted-foreground">Bir necha daqiqada tayyor</p>

            {/* Steps */}
            <div className="flex items-center justify-center gap-3 mt-5">
              {[1, 2].map(s => (
                <div key={s} className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${step >= s ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>
                    {step > s ? <CheckCircle2 className="w-4 h-4" /> : s}
                  </div>
                  <span className={`text-xs ${step === s ? "font-medium text-foreground" : "text-muted-foreground"}`}>
                    {s === 1 ? "Kompaniya" : "Admin"}
                  </span>
                  {s < 2 && <div className={`w-8 h-0.5 ${step > s ? "bg-primary" : "bg-muted"}`} />}
                </div>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {step === 1 ? (
              <>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Kompaniya nomi *</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                    <Input id="companyName" value={formData.companyName} onChange={handleChange}
                      required className="pl-10 h-11 rounded-xl" placeholder="TechUz LLC" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Telefon raqam *</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                    <Input id="phone" value={formData.phone} onChange={handleChange}
                      required className="pl-10 h-11 rounded-xl" placeholder="+998 90 123 45 67" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Kompaniya manzili</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                    <Input id="address" value={formData.address} onChange={handleChange}
                      className="pl-10 h-11 rounded-xl" placeholder="Toshkent sh., Chilonzor tumani, ..." />
                  </div>
                </div>
                <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200/50 rounded-xl p-3 text-xs text-blue-700 dark:text-blue-300">
                  <p className="font-semibold mb-1">✅ Bu ma'lumotlar uchun kerak:</p>
                  <p>Hisobotlar, eksport fayllari va Telegram bot bildirishnomalari</p>
                </div>
                <Button type="submit" className="w-full h-12 rounded-xl text-base font-semibold gap-2">
                  Davom etish <ArrowRight className="w-5 h-5" />
                </Button>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Admin ismi *</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                    <Input id="adminName" value={formData.adminName} onChange={handleChange}
                      required className="pl-10 h-11 rounded-xl" placeholder="Ism Familya" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Login (username) *</Label>
                  <div className="relative">
                    <AtSign className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                    <Input id="login" value={formData.login} onChange={handleChange}
                      required minLength={3} maxLength={30}
                      pattern="[a-zA-Z0-9_]+"
                      className="pl-10 h-11 rounded-xl" placeholder="masalan: admin_techuz" />
                  </div>
                  {loginHint && !formData.login && (
                    <button type="button" className="text-xs text-primary hover:underline ml-1"
                      onClick={() => setFormData(p => ({ ...p, login: loginHint }))}>
                      Tavsiya: <strong>{loginHint}</strong> — ishlatish
                    </button>
                  )}
                  <p className="text-xs text-muted-foreground">Faqat lotin harflari, raqamlar va _ belgisi</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Email *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                    <Input id="email" type="email" value={formData.email} onChange={handleChange}
                      required className="pl-10 h-11 rounded-xl" placeholder="admin@kompaniya.uz" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Parol *</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                    <Input id="password" type={showPass ? "text" : "password"}
                      value={formData.password} onChange={handleChange}
                      required minLength={6}
                      className="pl-10 pr-10 h-11 rounded-xl" placeholder="••••••••" />
                    <button type="button" onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors">
                      {showPass ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">Kamida 6 ta belgi</p>
                </div>

                <div className="flex gap-3 mt-2">
                  <Button type="button" variant="outline" className="flex-1 h-12 rounded-xl"
                    onClick={() => setStep(1)}>
                    Orqaga
                  </Button>
                  <Button type="submit" disabled={registerMutation.isPending}
                    className="flex-2 h-12 rounded-xl font-semibold gap-2" style={{ flex: 2 }}>
                    {registerMutation.isPending ? "Yaratilmoqda..." : <>Hisob yaratish <ArrowRight className="w-5 h-5" /></>}
                  </Button>
                </div>
              </>
            )}
          </form>

          <p className="text-center text-sm text-muted-foreground mt-5">
            Hisobingiz bor?{" "}
            <Link href="/login" className="font-semibold text-primary hover:underline">Kirish</Link>
          </p>
        </div>
      </div>

      {/* Right: Benefits */}
      <div className="hidden lg:flex lg:w-[45%] relative bg-sidebar overflow-hidden flex-col items-center justify-center p-12">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-800 to-blue-700" />
        <div className="relative z-10 text-white w-full max-w-sm">
          <h2 className="text-3xl font-display font-bold mb-2 text-white">
            O'rta Osiyo HR tizimi
          </h2>
          <p className="text-white/60 mb-8 text-sm leading-relaxed">
            Kichik korxonadan korporatsiyagacha — barcha ehtiyojlar uchun
          </p>
          <div className="space-y-3">
            {BENEFITS.map((b, i) => (
              <div key={i} className="flex items-center gap-4 bg-white/10 backdrop-blur-sm rounded-2xl px-5 py-3">
                <span className="text-2xl">{b.icon}</span>
                <p className="text-sm text-white/80">{b.text}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 p-4 bg-white/10 rounded-2xl">
            <p className="text-xs text-white/50 text-center">
              🇺🇿 O'zbekiston • 🇰🇿 Qozog'iston • 🇰🇬 Qirg'iziston
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
