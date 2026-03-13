import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { apiClient } from "@/lib/api-client";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft, ScanFace, Eye, EyeOff, Save, Loader2, ToggleLeft, ToggleRight,
  CheckCircle, AlertCircle, ExternalLink, Zap, Shield, Settings,
} from "lucide-react";
import { format } from "date-fns";

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

const PROVIDERS = [
  {
    key: "browser",
    name: "Browser (face-api.js)",
    nameUz: "Brauzer rejimi",
    icon: "🌐",
    color: "from-blue-600/20 to-indigo-600/10 border-blue-700/40",
    badge: "bg-blue-500/20 text-blue-400",
    desc: "Client-side yuz tanish. Server kerak emas. Aniqlik: O'rtacha (~75-85%)",
    models: ["TinyFaceDetector"],
    needsUrl: false,
    needsKey: false,
  },
  {
    key: "deepface",
    name: "DeepFace Server",
    nameUz: "DeepFace (Python)",
    icon: "🐍",
    color: "from-emerald-600/20 to-green-600/10 border-emerald-700/40",
    badge: "bg-emerald-500/20 text-emerald-400",
    desc: "Python DeepFace FastAPI server. Aniqlik: Yuqori (~95-99%)",
    models: ["VGG-Face", "Facenet", "Facenet512", "OpenFace", "DeepFace", "DeepID", "ArcFace", "Dlib", "SFace"],
    needsUrl: true,
    needsKey: false,
    docUrl: "https://github.com/serengil/deepface",
  },
  {
    key: "aws",
    name: "AWS Rekognition",
    nameUz: "Amazon AWS Rekognition",
    icon: "☁️",
    color: "from-orange-600/20 to-amber-600/10 border-orange-700/40",
    badge: "bg-orange-500/20 text-orange-400",
    desc: "Amazon AWS bulut yuz tanish. Aniqlik: Juda yuqori (~99%+)",
    models: ["CompareFaces"],
    needsUrl: true,
    needsKey: true,
    docUrl: "https://aws.amazon.com/rekognition/",
  },
  {
    key: "azure",
    name: "Azure Face API",
    nameUz: "Microsoft Azure Face",
    icon: "🔷",
    color: "from-sky-600/20 to-cyan-600/10 border-sky-700/40",
    badge: "bg-sky-500/20 text-sky-400",
    desc: "Microsoft Azure yuz tanish API. Aniqlik: Juda yuqori (~99%+)",
    models: ["Face API"],
    needsUrl: true,
    needsKey: true,
    docUrl: "https://azure.microsoft.com/en-us/products/cognitive-services/face/",
  },
];

export default function PlatformAdminFaceSettings() {
  const { isLoading: authLoading } = usePlatformAuth();
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    provider: "browser",
    apiUrl: "",
    apiKey: "",
    model: "VGG-Face",
    threshold: 0.6,
    enabled: false,
    livenessEnabled: false,
    notes: "",
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["/api/platform-admin/face-settings"],
    queryFn: () => apiClient.get("/api/platform-admin/face-settings"),
    enabled: !authLoading,
  });

  useEffect(() => {
    const s = (data as any)?.settings;
    if (s) {
      setForm({
        provider: s.provider || "browser",
        apiUrl: s.api_url || "",
        apiKey: "",
        model: s.model || "VGG-Face",
        threshold: parseFloat(s.threshold || "0.6"),
        enabled: s.enabled || false,
        livenessEnabled: s.liveness_enabled || false,
        notes: s.notes || "",
      });
    }
  }, [data]);

  const selectedProv = PROVIDERS.find(p => p.key === form.provider) || PROVIDERS[0];
  const settings = (data as any)?.settings;

  const f = (k: string) => (e: any) => setForm(s => ({ ...s, [k]: e.target.value }));
  const ft = (k: string) => () => setForm(s => ({ ...s, [k]: !(s as any)[k] }));

  const handleSave = async () => {
    setSaving(true); setError(""); setSaved(false);
    try {
      await apiClient.post("/api/platform-admin/face-settings", form);
      setSaved(true);
      refetch();
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) { setError(err?.message || "Xatolik yuz berdi"); }
    setSaving(false);
  };

  const handleTest = async () => {
    setTesting(true); setTestResult(null);
    try {
      const dummy = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AJQAB/9k=";
      const result = await apiClient.post("/api/platform-admin/face-verify", { img1Base64: dummy, img2Base64: dummy });
      setTestResult(result);
    } catch (err: any) {
      setTestResult({ error: err?.message || "Ulanib bo'lmadi" });
    }
    setTesting(false);
  };

  if (authLoading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur px-6 py-4 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <Link href="/platform-admin/dashboard">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg">
              <ChevronLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="w-9 h-9 bg-emerald-600/20 border border-emerald-700/30 rounded-xl flex items-center justify-center">
            <ScanFace className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="font-bold text-white leading-none">Yuz Tanish Sozlamalari</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {settings ? `${settings.provider} · ${settings.enabled ? "Faol" : "O'chirilgan"}` : "Sozlanmagan"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleTest} disabled={testing} variant="ghost"
            className="h-9 px-4 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-xl gap-2">
            {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            Test
          </Button>
          <Button onClick={handleSave} disabled={saving}
            className="h-9 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saved ? "Saqlandi!" : "Saqlash"}
          </Button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* INFO */}
        <Card className="bg-gradient-to-r from-emerald-900/30 to-teal-900/20 border-emerald-700/30 p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-emerald-600/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <ScanFace className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="font-semibold text-white">Yuz Tanish Integratsiyasi</h2>
              <p className="text-sm text-slate-400 mt-1">
                Bu yerda yuz tanish tizimini sozlashingiz mumkin. Browser rejimida face-api.js ishlatiladi.
                Yuqori aniqlik uchun DeepFace server, AWS yoki Azure ulang. Barcha korxonalar sozlamadan foydalanadi.
              </p>
              <div className="flex gap-2 mt-3 flex-wrap">
                {["face-api.js", "DeepFace", "AWS Rekognition", "Azure Face", "Liveness Detection"].map(f => (
                  <span key={f} className="text-xs bg-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded-lg">{f}</span>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {testResult && (
          <Card className={`border p-4 ${testResult.error ? "bg-red-500/10 border-red-700/30" : "bg-emerald-500/10 border-emerald-700/30"}`}>
            <div className="flex items-center gap-2 mb-2">
              {testResult.error ? <AlertCircle className="w-4 h-4 text-red-400" /> : <CheckCircle className="w-4 h-4 text-emerald-400" />}
              <span className={`text-sm font-medium ${testResult.error ? "text-red-400" : "text-emerald-400"}`}>
                {testResult.error ? "Ulanish xatosi" : `Test muvaffaqiyatli · Provider: ${testResult.provider}`}
              </span>
            </div>
            {testResult.browserMode && <p className="text-xs text-slate-400">Browser rejimi ishlatiladi (server-side o'chirilgan)</p>}
            {testResult.error && <p className="text-xs text-red-300 mt-1">{testResult.error}</p>}
          </Card>
        )}

        <div className="grid lg:grid-cols-2 gap-6">
          {/* PROVIDER SELECTION */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Provider Tanlash</h2>
            <div className="space-y-3">
              {PROVIDERS.map(p => (
                <button key={p.key} onClick={() => setForm(s => ({ ...s, provider: p.key, model: p.models[0] }))}
                  className={`w-full text-left p-4 rounded-2xl border transition-all ${form.provider === p.key ? `bg-gradient-to-r ${p.color}` : "bg-slate-900 border-slate-800 hover:border-slate-700"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{p.icon}</span>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-white text-sm">{p.name}</p>
                          {form.provider === p.key && <Badge className={`border-0 text-xs ${p.badge}`}>Tanlangan</Badge>}
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">{p.desc}</p>
                      </div>
                    </div>
                    {form.provider === p.key && <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />}
                  </div>
                  {p.docUrl && (
                    <a href={p.docUrl} target="_blank" rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="mt-2 inline-flex items-center gap-1 text-xs text-slate-500 hover:text-blue-400 transition-colors">
                      <ExternalLink className="w-3 h-3" />Dokumentatsiya
                    </a>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* SETTINGS FORM */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Sozlamalar</h2>

            <Card className="bg-slate-900 border-slate-800 p-5 space-y-5">
              {/* Enable toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white">Server-side Yuz Tanish</p>
                  <p className="text-xs text-slate-500 mt-0.5">O'chirilsa, browser'da face-api.js ishlatiladi</p>
                </div>
                <button onClick={ft("enabled")}>
                  {form.enabled ? <ToggleRight className="w-10 h-10 text-emerald-400" /> : <ToggleLeft className="w-10 h-10 text-slate-600" />}
                </button>
              </div>

              {/* API URL */}
              {selectedProv.needsUrl && (
                <div>
                  <Label className="text-xs text-slate-400 mb-1 block">API Endpoint URL</Label>
                  <Input value={form.apiUrl} onChange={f("apiUrl")}
                    placeholder={form.provider === "deepface" ? "http://your-server:5000" : "https://api.provider.com"}
                    className="bg-slate-800 border-slate-700 text-white rounded-xl font-mono text-sm" />
                  {form.provider === "deepface" && (
                    <p className="text-xs text-slate-600 mt-1">DeepFace FastAPI server manzili. Port odatda 5000.</p>
                  )}
                </div>
              )}

              {/* API Key */}
              {selectedProv.needsKey && (
                <div>
                  <Label className="text-xs text-slate-400 mb-1 block">API Kalit</Label>
                  <div className="relative">
                    <Input type={showKey ? "text" : "password"} value={form.apiKey} onChange={f("apiKey")}
                      placeholder={settings?.api_key_hint ? `Mavjud: ${settings.api_key_hint}...` : "API kalitni kiriting"}
                      className="bg-slate-800 border-slate-700 text-white rounded-xl pr-10" />
                    <button type="button" onClick={() => setShowKey(s => !s)} className="absolute right-3 top-2.5 text-slate-500 hover:text-white">
                      {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Model */}
              <div>
                <Label className="text-xs text-slate-400 mb-1 block">Model</Label>
                <select value={form.model} onChange={f("model")} className="w-full h-9 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm px-3">
                  {selectedProv.models.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>

              {/* Threshold */}
              <div>
                <Label className="text-xs text-slate-400 mb-1 block">
                  Moslik chegarasi: <span className="text-emerald-400 font-mono">{form.threshold.toFixed(2)}</span>
                  <span className="ml-2 text-slate-600">({((1 - form.threshold) * 100).toFixed(0)}% aniqlik)</span>
                </Label>
                <input type="range" min="0.3" max="0.9" step="0.05" value={form.threshold}
                  onChange={e => setForm(s => ({ ...s, threshold: parseFloat(e.target.value) }))}
                  className="w-full accent-emerald-500" />
                <div className="flex justify-between text-xs text-slate-600 mt-1">
                  <span>0.3 (qat'iy)</span>
                  <span>0.6 (standart)</span>
                  <span>0.9 (yumshoq)</span>
                </div>
              </div>

              {/* Liveness */}
              <div className="flex items-center justify-between py-2.5 px-3 bg-slate-800 rounded-xl">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-amber-400" />
                  <div>
                    <p className="text-sm text-white">Liveness Detection</p>
                    <p className="text-xs text-slate-500">Rasm/video orqali aldashni oldini olish</p>
                  </div>
                </div>
                <button onClick={ft("livenessEnabled")}>
                  {form.livenessEnabled ? <ToggleRight className="w-9 h-9 text-amber-400" /> : <ToggleLeft className="w-9 h-9 text-slate-600" />}
                </button>
              </div>

              {/* Notes */}
              <div>
                <Label className="text-xs text-slate-400 mb-1 block">Eslatma</Label>
                <Input value={form.notes} onChange={f("notes")} placeholder="Bu sozlama haqida..." className="bg-slate-800 border-slate-700 text-white rounded-xl" />
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
                </div>
              )}
            </Card>

            {/* Current status */}
            {settings && (
              <Card className="bg-slate-900 border-slate-800 p-4">
                <p className="text-xs text-slate-500 mb-2 flex items-center gap-1"><Settings className="w-3 h-3" /> Hozirgi sozlama</p>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Provider</span>
                    <Badge className="bg-slate-800 text-slate-300 border-0 text-xs">{settings.provider}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Holat</span>
                    <Badge className={`border-0 text-xs ${settings.enabled ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-700 text-slate-500"}`}>
                      {settings.enabled ? "Faol" : "O'chirilgan"}
                    </Badge>
                  </div>
                  {settings.model && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">Model</span>
                      <span className="text-xs text-slate-300 font-mono">{settings.model}</span>
                    </div>
                  )}
                  {settings.api_key_hint && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">API kalit</span>
                      <span className="text-xs text-amber-400 font-mono">{settings.api_key_hint}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Yangilangan</span>
                    <span className="text-xs text-slate-500">{settings.updated_at ? format(new Date(settings.updated_at), "dd.MM HH:mm") : "—"}</span>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>

        {/* DEPLOYMENT GUIDE */}
        <Card className="bg-slate-900 border-slate-800 p-5">
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <span>🐍</span> DeepFace Server o'rnatish qo'llanmasi
          </h2>
          <div className="grid sm:grid-cols-3 gap-3">
            {[
              { step: "1", title: "Python o'rnating", code: "pip install deepface fastapi uvicorn" },
              { step: "2", title: "Server ishga tushiring", code: "uvicorn main:app --host 0.0.0.0 --port 5000" },
              { step: "3", title: "URL sozlamada kiriting", code: "http://your-server-ip:5000" },
            ].map(s => (
              <div key={s.step} className="bg-slate-800/50 rounded-2xl p-4">
                <div className="w-7 h-7 bg-emerald-600/20 rounded-lg flex items-center justify-center text-emerald-400 text-sm font-bold mb-2">{s.step}</div>
                <p className="text-sm font-medium text-white mb-2">{s.title}</p>
                <code className="text-xs text-emerald-400 font-mono bg-slate-900 px-2.5 py-1.5 rounded-lg block">{s.code}</code>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 bg-amber-500/10 border border-amber-700/30 rounded-xl">
            <p className="text-xs text-amber-400">
              ⚠️ DeepFace modellari birinchi marta yuklanishi bir necha daqiqa olishi mumkin.
              Server lokal tarmoqda yoki VPN orqali ulanishi kerak. Public internet uchun API kalitni o'rnating.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
