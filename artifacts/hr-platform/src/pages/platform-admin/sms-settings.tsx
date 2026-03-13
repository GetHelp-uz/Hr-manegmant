import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { apiClient } from "@/lib/api-client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Smartphone, ChevronLeft, CheckCircle, AlertCircle, Loader2,
  Eye, EyeOff, RefreshCw, ToggleLeft, ToggleRight, Play,
  MessageSquare, Shield, Info,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

function usePlatformAuth() {
  const [, setLocation] = useLocation();
  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/platform-admin/me"],
    queryFn: () => apiClient.get("/api/platform-admin/me"),
    retry: false,
  });
  useEffect(() => { if (!isLoading && error) setLocation("/platform-admin/login"); }, [isLoading, error]);
  return { isLoading };
}

export default function PlatformAdminSmsSettings() {
  const { isLoading: authLoading } = usePlatformAuth();
  const qc = useQueryClient();

  const [form, setForm] = useState({
    email: "",
    password: "",
    senderId: "4546",
    enabled: false,
    testMode: true,
    notes: "",
  });
  const [showPass, setShowPass] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [saveErr, setSaveErr] = useState("");
  const [testResult, setTestResult] = useState<{ success: boolean; balance?: string; error?: string } | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["/api/platform-admin/sms-settings"],
    queryFn: () => apiClient.get("/api/platform-admin/sms-settings"),
    enabled: !authLoading,
  });

  useEffect(() => {
    const s = (data as any)?.settings;
    if (s) {
      setForm(f => ({
        ...f,
        email: s.email || "",
        senderId: s.sender_id || "4546",
        enabled: s.enabled || false,
        testMode: s.test_mode !== false,
        notes: s.notes || "",
      }));
    }
  }, [data]);

  const f = (key: string) => (e: any) => setForm(s => ({ ...s, [key]: e.target.value }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveMsg("");
    setSaveErr("");
    try {
      await apiClient.put("/api/platform-admin/sms-settings", form);
      setSaveMsg("Muvaffaqiyatli saqlandi!");
      refetch();
    } catch (err: any) {
      setSaveErr(err?.message || "Xatolik yuz berdi");
    }
    setSaving(false);
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await apiClient.post("/api/platform-admin/sms-test", {});
      setTestResult(result as any);
    } catch (err: any) {
      setTestResult({ success: false, error: err?.message || "Ulanish xatosi" });
    }
    setTesting(false);
  };

  if (authLoading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full" />
    </div>
  );

  const settings = (data as any)?.settings;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur px-6 py-4 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <Link href="/platform-admin/dashboard">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg">
              <ChevronLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="w-9 h-9 bg-green-600/20 border border-green-700/30 rounded-xl flex items-center justify-center">
            <Smartphone className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <h1 className="font-bold text-white leading-none">SMS Eskiz Integratsiya</h1>
            <p className="text-xs text-slate-500 mt-0.5">Ommaviy SMS xabar yuborish sozlamalari</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => refetch()} className="h-8 w-8 p-0 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg">
            <RefreshCw className="w-4 h-4" />
          </Button>
          {settings && (
            <Badge className={`border-0 ${settings.enabled ? "bg-green-500/20 text-green-400" : "bg-slate-700 text-slate-400"}`}>
              {settings.enabled ? "Faol" : "O'chirilgan"}
            </Badge>
          )}
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-5">

        {/* INFO BANNER */}
        <Card className="bg-gradient-to-r from-green-900/30 to-emerald-900/20 border-green-700/30 p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-green-600/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <MessageSquare className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <h2 className="font-semibold text-white">Eskiz.uz SMS Integratsiyasi</h2>
              <p className="text-sm text-slate-400 mt-1">
                Eskiz.uz Markaziy Osiyoning yetakchi SMS xizmat provayderi. Har qanday O'zbekiston raqamiga SMS yuborish imkoniyati.
                Test rejimida SMS xarajat qilmaydi.
              </p>
              <div className="flex gap-2 mt-3 flex-wrap">
                {["O'zbekiston raqamlari", "Mass SMS", "Test rejimi", "Kredit hisobi"].map(t => (
                  <span key={t} className="text-xs bg-green-500/20 text-green-400 px-2.5 py-1 rounded-lg">{t}</span>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* FORM */}
        <Card className="bg-slate-900 border-slate-800 p-5">
          <h2 className="text-sm font-semibold text-slate-300 mb-4 uppercase tracking-wider">Eskiz Hisob Ma'lumotlari</h2>

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <Label className="text-xs text-slate-400 mb-1.5 block">Eskiz Email *</Label>
              <Input
                type="email"
                value={form.email}
                onChange={f("email")}
                placeholder="login@eskiz.uz"
                required
                className="bg-slate-800 border-slate-700 text-white rounded-xl"
              />
            </div>

            <div>
              <Label className="text-xs text-slate-400 mb-1.5 block">
                Parol {settings?.email ? "(bo'sh qoldirsangiz o'zgarmaydi)" : "*"}
              </Label>
              <div className="relative">
                <Input
                  type={showPass ? "text" : "password"}
                  value={form.password}
                  onChange={f("password")}
                  placeholder={settings?.email ? "••••••••" : "Eskiz parolingiz"}
                  required={!settings?.email}
                  className="bg-slate-800 border-slate-700 text-white rounded-xl pr-10"
                />
                <button type="button" onClick={() => setShowPass(s => !s)} className="absolute right-3 top-2.5 text-slate-500 hover:text-white">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <Label className="text-xs text-slate-400 mb-1.5 block">Sender ID (Jo'natuvchi nomi)</Label>
              <Input
                value={form.senderId}
                onChange={f("senderId")}
                placeholder="4546"
                className="bg-slate-800 border-slate-700 text-white rounded-xl"
              />
              <p className="text-xs text-slate-600 mt-1">Standart: 4546 (Eskiz test ID). O'z brandingiz bo'lsa kiriting.</p>
            </div>

            <div>
              <Label className="text-xs text-slate-400 mb-1.5 block">Eslatma (ixtiyoriy)</Label>
              <Input
                value={form.notes}
                onChange={f("notes")}
                placeholder="Bu sozlama haqida..."
                className="bg-slate-800 border-slate-700 text-white rounded-xl"
              />
            </div>

            <div className="flex flex-col gap-2 pt-1">
              <div className="flex items-center justify-between py-3 px-4 bg-slate-800 rounded-xl">
                <div>
                  <p className="text-sm text-slate-300">Test rejimi</p>
                  <p className="text-xs text-slate-500 mt-0.5">Test rejimida SMS yuborilmaydi, kredit sarflanmaydi</p>
                </div>
                <button type="button" onClick={() => setForm(s => ({ ...s, testMode: !s.testMode }))} className="transition-all">
                  {form.testMode ? <ToggleRight className="w-9 h-9 text-amber-400" /> : <ToggleLeft className="w-9 h-9 text-slate-600" />}
                </button>
              </div>

              <div className="flex items-center justify-between py-3 px-4 bg-slate-800 rounded-xl">
                <div>
                  <p className="text-sm text-slate-300">SMS xizmatini yoqish</p>
                  <p className="text-xs text-slate-500 mt-0.5">Korxonalar ommaviy SMS yuborishini ruxsat beradi</p>
                </div>
                <button type="button" onClick={() => setForm(s => ({ ...s, enabled: !s.enabled }))} className="transition-all">
                  {form.enabled ? <ToggleRight className="w-9 h-9 text-green-400" /> : <ToggleLeft className="w-9 h-9 text-slate-600" />}
                </button>
              </div>
            </div>

            {saveMsg && (
              <div className="flex items-center gap-2 bg-green-500/10 border border-green-700/30 rounded-xl px-4 py-3 text-sm text-green-400">
                <CheckCircle className="w-4 h-4" />{saveMsg}
              </div>
            )}
            {saveErr && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-700/30 rounded-xl px-4 py-3 text-sm text-red-400">
                <AlertCircle className="w-4 h-4" />{saveErr}
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <Button type="button" onClick={handleTest} disabled={testing || !settings?.email} variant="ghost"
                className="flex-1 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl gap-2">
                {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                Ulanishni Test Qilish
              </Button>
              <Button type="submit" disabled={saving} className="flex-1 bg-green-600 hover:bg-green-500 text-white rounded-xl gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                Saqlash
              </Button>
            </div>
          </form>
        </Card>

        {/* TEST RESULT */}
        {testResult && (
          <Card className={`border p-5 ${testResult.success ? "bg-green-900/20 border-green-700/30" : "bg-red-900/20 border-red-700/30"}`}>
            <div className="flex items-center gap-2 mb-2">
              {testResult.success
                ? <CheckCircle className="w-5 h-5 text-green-400" />
                : <AlertCircle className="w-5 h-5 text-red-400" />}
              <h3 className="font-semibold text-white">
                {testResult.success ? "Ulanish muvaffaqiyatli!" : "Ulanish xatosi"}
              </h3>
            </div>
            {testResult.success && testResult.balance !== undefined && (
              <p className="text-sm text-slate-300">Balans: <span className="text-green-400 font-medium">{testResult.balance} so'm</span></p>
            )}
            {testResult.error && <p className="text-sm text-red-400">{testResult.error}</p>}
          </Card>
        )}

        {/* HOW IT WORKS */}
        <Card className="bg-slate-900 border-slate-800 p-5">
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Info className="w-4 h-4 text-slate-400" />
            Qanday ishlaydi?
          </h2>
          <div className="space-y-3">
            {[
              { n: "1", title: "Eskiz hisobingizga kiring", desc: "my.eskiz.uz saytiga kiring → API → Login va parolni nusxalang" },
              { n: "2", title: "Ma'lumotlarni kiriting", desc: "Email va parolni yuqoridagi formaga kiriting, saqlang" },
              { n: "3", title: "Test qiling", desc: "\"Ulanishni Test Qilish\" tugmasini bosib, ulanishni tekshiring va balansni ko'ring" },
              { n: "4", title: "Korxonalar uchun yoqing", desc: "\"SMS xizmatini yoqish\" ni faollashtiring — barcha korxonalar ommaviy SMS yubora oladi" },
            ].map(s => (
              <div key={s.n} className="flex gap-3 p-3 rounded-xl bg-slate-800/50">
                <div className="w-7 h-7 rounded-lg bg-green-600/20 text-green-400 flex items-center justify-center text-sm font-bold flex-shrink-0">{s.n}</div>
                <div>
                  <p className="text-sm font-medium text-white">{s.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

      </div>
    </div>
  );
}
