import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Building2, Users, QrCode, Bot, Rocket,
  CheckCircle2, ChevronRight, ChevronLeft
} from "lucide-react";

const STEPS = [
  { id: 1, icon: Building2, title: "Korxona ma'lumotlari", color: "bg-blue-500" },
  { id: 2, icon: Users, title: "Birinchi xodim", color: "bg-emerald-500" },
  { id: 3, icon: QrCode, title: "QR sozlamalari", color: "bg-violet-500" },
  { id: 4, icon: Bot, title: "Telegram bot", color: "bg-amber-500" },
  { id: 5, icon: Rocket, title: "Tayyorlik!", color: "bg-primary" },
];

export default function OnboardingPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [company, setCompany] = useState({ address: "", workStartTime: "09:00", workEndTime: "18:00", lateThresholdMinutes: "15" });
  const [employee, setEmployee] = useState({ fullName: "", phone: "", position: "" });

  const saveSettings = useMutation({
    mutationFn: () => apiClient.put("/api/settings", {
      address: company.address,
      workStartTime: company.workStartTime,
      workEndTime: company.workEndTime,
      lateThresholdMinutes: parseInt(company.lateThresholdMinutes),
    }),
    onSuccess: () => setStep(3),
    onError: () => toast({ title: "Xatolik", variant: "destructive" }),
  });

  const addEmployee = useMutation({
    mutationFn: () => apiClient.post("/api/employees", {
      fullName: employee.fullName,
      phone: employee.phone,
      position: employee.position,
      salaryType: "monthly",
    }),
    onSuccess: () => setStep(4),
    onError: () => {
      toast({ title: "Xatolik", variant: "destructive" });
      setStep(4);
    },
  });

  const percent = ((step - 1) / (STEPS.length - 1)) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mx-auto mb-3 shadow-md">
            <span className="text-white font-bold text-lg">HR</span>
          </div>
          <h1 className="text-2xl font-display font-bold">Platformaga xush kelibsiz!</h1>
          <p className="text-muted-foreground text-sm mt-1">Tizimni sozlash uchun {STEPS.length} qadam bajaramiz</p>
        </div>

        <div className="relative mb-8">
          <div className="flex justify-between relative z-10">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const done = step > s.id;
              const active = step === s.id;
              return (
                <div key={s.id} className="flex flex-col items-center gap-1">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${done ? "bg-green-500 text-white" : active ? `${s.color} text-white shadow-lg scale-110` : "bg-white border-2 border-border text-muted-foreground"}`}>
                    {done ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-4 h-4" />}
                  </div>
                  <span className={`text-[10px] font-medium hidden md:block ${active ? "text-foreground" : "text-muted-foreground"}`}>{s.id}</span>
                </div>
              );
            })}
          </div>
          <div className="absolute top-5 left-5 right-5 h-0.5 bg-border -z-0">
            <div className="h-full bg-primary transition-all duration-500" style={{ width: `${percent}%` }} />
          </div>
        </div>

        <div className="bg-white border border-border rounded-2xl p-7 shadow-sm">
          {step === 1 && (
            <div className="space-y-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Building2 className="w-4.5 h-4.5 text-blue-600" />
                </div>
                <div>
                  <h2 className="font-display font-bold text-lg">Korxona ma'lumotlari</h2>
                  <p className="text-xs text-muted-foreground">Ish vaqtlari va manzilni kiriting</p>
                </div>
              </div>
              <div>
                <Label>Korxona manzili</Label>
                <Input className="mt-1" placeholder="Toshkent, Chilonzor tumani..." value={company.address} onChange={e => setCompany(c => ({ ...c, address: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Ish boshlanishi</Label>
                  <Input type="time" className="mt-1" value={company.workStartTime} onChange={e => setCompany(c => ({ ...c, workStartTime: e.target.value }))} />
                </div>
                <div>
                  <Label>Ish tugashi</Label>
                  <Input type="time" className="mt-1" value={company.workEndTime} onChange={e => setCompany(c => ({ ...c, workEndTime: e.target.value }))} />
                </div>
              </div>
              <div>
                <Label>Kechikish chegarasi (daqiqa)</Label>
                <Input type="number" className="mt-1" value={company.lateThresholdMinutes} onChange={e => setCompany(c => ({ ...c, lateThresholdMinutes: e.target.value }))} min={0} max={60} />
                <p className="text-xs text-muted-foreground mt-1">Bu daqiqadan keyin kechikkan deb hisoblanadi</p>
              </div>
              <Button className="w-full" onClick={() => saveSettings.mutate()} disabled={saveSettings.isPending}>
                {saveSettings.isPending ? "Saqlanmoqda..." : "Saqlash va davom etish"} <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
              <button className="w-full text-sm text-muted-foreground hover:text-foreground" onClick={() => setStep(2)}>O'tkazib yuborish →</button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <Users className="w-4.5 h-4.5 text-emerald-600" />
                </div>
                <div>
                  <h2 className="font-display font-bold text-lg">Birinchi xodim qo'shish</h2>
                  <p className="text-xs text-muted-foreground">Ixtiyoriy — keyinroq ham qo'shish mumkin</p>
                </div>
              </div>
              <div>
                <Label>To'liq ism</Label>
                <Input className="mt-1" placeholder="Alisher Karimov" value={employee.fullName} onChange={e => setEmployee(em => ({ ...em, fullName: e.target.value }))} />
              </div>
              <div>
                <Label>Telefon</Label>
                <Input className="mt-1" placeholder="+998901234567" value={employee.phone} onChange={e => setEmployee(em => ({ ...em, phone: e.target.value }))} />
              </div>
              <div>
                <Label>Lavozim</Label>
                <Input className="mt-1" placeholder="Dasturchi" value={employee.position} onChange={e => setEmployee(em => ({ ...em, position: e.target.value }))} />
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(1)}><ChevronLeft className="w-4 h-4 mr-1" /> Orqaga</Button>
                <Button className="flex-1" onClick={() => { if (employee.fullName && employee.phone) addEmployee.mutate(); else setStep(3); }} disabled={addEmployee.isPending}>
                  {addEmployee.isPending ? "..." : employee.fullName ? "Qo'shish" : "O'tkazib yuborish"} <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-lg bg-violet-100 flex items-center justify-center">
                  <QrCode className="w-4.5 h-4.5 text-violet-600" />
                </div>
                <div>
                  <h2 className="font-display font-bold text-lg">QR Davomat</h2>
                  <p className="text-xs text-muted-foreground">Xodimlar uchun QR kod bilan davomat</p>
                </div>
              </div>
              <div className="bg-violet-50 border border-violet-100 rounded-xl p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-violet-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm">Xodimlar → QR ko'rish → Xodim QR kodini ko'radi</p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-violet-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm">Kiosk rejimi yoki QR skanerlash orqali davomat qaydlanadi</p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-violet-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm">Selfie bilan avtomatik kirishni ham yoqish mumkin</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(2)}><ChevronLeft className="w-4 h-4 mr-1" /> Orqaga</Button>
                <Button className="flex-1" onClick={() => setStep(4)}>
                  Tushundim <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center">
                  <Bot className="w-4.5 h-4.5 text-amber-600" />
                </div>
                <div>
                  <h2 className="font-display font-bold text-lg">Telegram Bot</h2>
                  <p className="text-xs text-muted-foreground">Xodimlar Telegram orqali davomat qiladi</p>
                </div>
              </div>
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 space-y-2">
                <p className="text-sm font-medium text-amber-800">Telegram botni ulash uchun:</p>
                <ol className="text-sm text-amber-700 space-y-1.5 list-decimal list-inside">
                  <li>Sozlamalar → Telegram Bot tokenini kiriting</li>
                  <li>Xodim @botusername ga yozadi</li>
                  <li>O'z xodim kodini yoki QR kodni yuboradi</li>
                  <li>Bot avtomatik ulaydi!</li>
                </ol>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(3)}><ChevronLeft className="w-4 h-4 mr-1" /> Orqaga</Button>
                <Button className="flex-1" onClick={() => setStep(5)}>
                  Davom etish <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="text-center space-y-5">
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                <Rocket className="w-10 h-10 text-green-500" />
              </div>
              <div>
                <h2 className="text-2xl font-display font-bold text-foreground">Tayyor!</h2>
                <p className="text-muted-foreground mt-2">Platforma muvaffaqiyatli sozlandi. Boshqaruv paneliga o'ting.</p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-green-50 border border-green-100 rounded-lg p-3 text-left">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mb-1" />
                  <p className="font-medium text-green-800">Ish vaqtlari</p>
                  <p className="text-green-600 text-xs">Sozlandi</p>
                </div>
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-left">
                  <CheckCircle2 className="w-4 h-4 text-blue-500 mb-1" />
                  <p className="font-medium text-blue-800">QR tizimi</p>
                  <p className="text-blue-600 text-xs">Tayyor</p>
                </div>
              </div>
              <Button className="w-full" size="lg" onClick={() => navigate("/dashboard")}>
                Boshqaruv paneliga o'tish <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          {step}/{STEPS.length} qadam · Istalgan vaqt o'tkazib yuborishingiz mumkin
        </p>
      </div>
    </div>
  );
}
