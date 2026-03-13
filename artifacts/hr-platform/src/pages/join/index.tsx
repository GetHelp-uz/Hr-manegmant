import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiClient } from "@/lib/api-client";
import { QrCode, Building2, User, Phone, CheckCircle2, AlertCircle } from "lucide-react";

export default function Join() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<"form" | "success" | "error">("form");
  const [joinCode, setJoinCode] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [result, setResult] = useState<{ employee: any; company: any } | null>(null);
  const [companyName, setCompanyName] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (code) {
      setJoinCode(code.toUpperCase());
      apiClient.get(`/api/join/company/${code}`).then((r: any) => {
        if (r?.name) setCompanyName(r.name);
      }).catch(() => {});
    }
  }, []);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim() || !phone.trim()) return;
    setLoading(true);
    setErrorMsg("");
    try {
      const data = await apiClient.post("/api/join", { joinCode: joinCode.toUpperCase(), phone }) as any;
      setResult(data);
      setStep("success");
    } catch (err: any) {
      const msg = err?.message || "Xatolik yuz berdi. Qayta urinib ko'ring.";
      setErrorMsg(msg.replace(/^HTTP \d+ \w+: /, ""));
      setStep("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl mb-4 shadow-lg">
            <QrCode className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">HR Tizimiga Ulanish</h1>
          <p className="text-gray-500 mt-2 text-sm">Kompaniya kodi va telefon raqamingizni kiriting</p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl p-8">
          {step === "form" && (
            <form onSubmit={handleJoin} className="space-y-5">
              {companyName && (
                <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-2xl border border-blue-100">
                  <Building2 className="w-5 h-5 text-blue-600 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-blue-500 font-medium">Kompaniya</p>
                    <p className="text-blue-900 font-bold">{companyName}</p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700">
                  Kompaniya Kodi
                </Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    required
                    value={joinCode}
                    onChange={e => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="Masalan: 2F33AF8A"
                    className="pl-10 rounded-xl h-12 font-mono tracking-widest text-center text-lg font-bold uppercase"
                    maxLength={12}
                  />
                </div>
                <p className="text-xs text-gray-400">Admin bergan 8 belgili kodni kiriting</p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700">
                  Telefon Raqam
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    required
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+998 90 123 45 67"
                    className="pl-10 rounded-xl h-12"
                  />
                </div>
                <p className="text-xs text-gray-400">Tizimda ro'yxatdan o'tgan telefon raqamingiz</p>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-xl text-base font-semibold shadow-md mt-2"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Tekshirilmoqda...
                  </span>
                ) : "Ulanish"}
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setLocation("/login")}
                  className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                >
                  Admin sifatida kirish →
                </button>
              </div>
            </form>
          )}

          {step === "success" && result && (
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-10 h-10 text-green-600" />
                </div>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">Muvaffaqiyatli Tasdiqlandi!</h2>
                <p className="text-gray-500 text-sm">Siz tizimda ro'yxatdan o'tganingiz tasdiqlandi</p>
              </div>
              <div className="bg-gray-50 rounded-2xl p-5 text-left space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Xodim</p>
                    <p className="font-bold text-gray-900">{result.employee?.fullName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Kompaniya</p>
                    <p className="font-bold text-gray-900">{result.company?.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <QrCode className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Lavozim</p>
                    <p className="font-bold text-gray-900">{result.employee?.position}</p>
                  </div>
                </div>
              </div>
              <div className="bg-blue-50 rounded-2xl p-4">
                <p className="text-sm text-blue-700 font-medium">📱 Telegram Botga Ulaning</p>
                <p className="text-xs text-blue-600 mt-1">
                  Davomat kuzatish va bildirishnomalar uchun Telegram botga ham ulaning.
                  Admin sizga Telegram havola beradi.
                </p>
              </div>
              <Button
                onClick={() => { setStep("form"); setResult(null); }}
                variant="outline"
                className="w-full rounded-xl"
              >
                Boshqa xodimni tekshirish
              </Button>
            </div>
          )}

          {step === "error" && (
            <div className="text-center space-y-5">
              <div className="flex justify-center">
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-10 h-10 text-red-500" />
                </div>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">Topilmadi</h2>
                <p className="text-gray-500 text-sm">{errorMsg}</p>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-left">
                <p className="text-sm font-semibold text-amber-800 mb-2">Nima qilish kerak?</p>
                <ul className="text-xs text-amber-700 space-y-1 list-disc list-inside">
                  <li>Kompaniya kodini to'g'ri kiritdingizmi tekshiring</li>
                  <li>Telefon raqami +998 formatida to'g'ri ekanini tekshiring</li>
                  <li>Administratoringizga murojaat qiling — u sizni tizimga qo'shishi kerak</li>
                </ul>
              </div>
              <Button
                onClick={() => { setStep("form"); setErrorMsg(""); }}
                className="w-full rounded-xl"
              >
                Qayta urinish
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
