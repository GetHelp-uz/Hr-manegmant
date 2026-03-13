import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { apiClient } from "@/lib/api-client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Shield, ChevronLeft, Plus, X, Trash2, ToggleLeft, ToggleRight,
  Brain, Zap, CheckCircle, AlertCircle, Key, Loader2, Eye, EyeOff,
  Play, Building2, Settings, RefreshCw,
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

const AI_PROVIDERS = [
  { key: "openai", name: "OpenAI", logo: "🤖", color: "from-green-600/20 to-emerald-600/10 border-green-700/40", badge: "bg-green-500/20 text-green-400", models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"] },
  { key: "anthropic", name: "Anthropic Claude", logo: "🎭", color: "from-orange-600/20 to-amber-600/10 border-orange-700/40", badge: "bg-orange-500/20 text-orange-400", models: ["claude-3-5-sonnet-20241022", "claude-3-haiku-20240307", "claude-3-opus-20240229"] },
  { key: "gemini", name: "Google Gemini", logo: "✨", color: "from-blue-600/20 to-indigo-600/10 border-blue-700/40", badge: "bg-blue-500/20 text-blue-400", models: ["gemini-1.5-pro", "gemini-1.5-flash", "gemini-2.0-flash"] },
  { key: "deepseek", name: "DeepSeek", logo: "🔍", color: "from-purple-600/20 to-violet-600/10 border-purple-700/40", badge: "bg-purple-500/20 text-purple-400", models: ["deepseek-chat", "deepseek-coder", "deepseek-reasoner"] },
  { key: "mistral", name: "Mistral AI", logo: "🌪️", color: "from-rose-600/20 to-pink-600/10 border-rose-700/40", badge: "bg-rose-500/20 text-rose-400", models: ["mistral-large-latest", "mistral-small-latest", "open-mistral-7b"] },
  { key: "yandexgpt", name: "YandexGPT", logo: "🇷🇺", color: "from-red-600/20 to-rose-600/10 border-red-700/40", badge: "bg-red-500/20 text-red-400", models: ["yandexgpt-lite", "yandexgpt"] },
];

function AddProviderModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({ provider: "openai", apiKey: "", model: "", enabled: true, notes: "" });
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedProv = AI_PROVIDERS.find(p => p.key === form.provider) || AI_PROVIDERS[0];
  const f = (key: string) => (e: any) => setForm(s => ({ ...s, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      await apiClient.post("/api/platform-admin/ai-settings", form);
      onSuccess();
    } catch (err: any) { setError(err?.message || "Xatolik yuz berdi"); }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="bg-slate-900 border-slate-700 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-400" />
            <h2 className="font-semibold text-white">AI Provider Qo'shish</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0 text-slate-500 rounded-lg"><X className="w-4 h-4" /></Button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <Label className="text-xs text-slate-400 mb-2 block">Provider</Label>
            <div className="grid grid-cols-3 gap-2">
              {AI_PROVIDERS.map(p => (
                <button key={p.key} type="button" onClick={() => setForm(s => ({ ...s, provider: p.key, model: p.models[0] }))}
                  className={`p-3 rounded-xl border text-center transition-all ${form.provider === p.key ? "bg-purple-600/20 border-purple-500/50" : "bg-slate-800 border-slate-700 hover:border-slate-600"}`}>
                  <div className="text-xl mb-1">{p.logo}</div>
                  <div className="text-xs text-slate-300 leading-tight">{p.name.split(" ")[0]}</div>
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-xs text-slate-400 mb-1 block">Model</Label>
            <select value={form.model} onChange={f("model")} className="w-full h-9 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm px-3">
              {selectedProv.models.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <Label className="text-xs text-slate-400 mb-1 block">API Kalit *</Label>
            <div className="relative">
              <Input type={showKey ? "text" : "password"} value={form.apiKey} onChange={f("apiKey")}
                placeholder="sk-... yoki API key" required
                className="bg-slate-800 border-slate-700 text-white rounded-xl pr-10" />
              <button type="button" onClick={() => setShowKey(s => !s)} className="absolute right-3 top-2.5 text-slate-500 hover:text-white">
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-slate-600 mt-1">API kalit bazada xavfsiz saqlanadi, frontend'ga qaytarilmaydi</p>
          </div>
          <div>
            <Label className="text-xs text-slate-400 mb-1 block">Eslatma (ixtiyoriy)</Label>
            <Input value={form.notes} onChange={f("notes")} placeholder="Bu provider haqida..." className="bg-slate-800 border-slate-700 text-white rounded-xl" />
          </div>
          <div className="flex items-center justify-between py-2 px-3 bg-slate-800 rounded-xl">
            <span className="text-sm text-slate-300">Darhol faollashtirish</span>
            <button type="button" onClick={() => setForm(s => ({ ...s, enabled: !s.enabled }))}
              className="transition-all">
              {form.enabled ? <ToggleRight className="w-9 h-9 text-green-400" /> : <ToggleLeft className="w-9 h-9 text-slate-600" />}
            </button>
          </div>
          {error && <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-400">{error}</div>}
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="ghost" onClick={onClose} className="flex-1 border border-slate-700 text-slate-400 rounded-xl">Bekor</Button>
            <Button type="submit" disabled={loading} className="flex-1 bg-purple-600 hover:bg-purple-500 text-white rounded-xl">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Qo'shish"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

function TestResultModal({ result, onClose }: { result: any; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="bg-slate-900 border-slate-700 w-full max-w-sm">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {result.success ? <CheckCircle className="w-5 h-5 text-green-400" /> : <AlertCircle className="w-5 h-5 text-red-400" />}
            <h2 className="font-semibold text-white">Test Natijasi</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0 text-slate-500 rounded-lg"><X className="w-4 h-4" /></Button>
        </div>
        <div className="p-5 space-y-3">
          <div className={`p-4 rounded-2xl border ${result.success ? "bg-green-500/10 border-green-700/30" : "bg-red-500/10 border-red-700/30"}`}>
            <p className={`text-sm font-medium ${result.success ? "text-green-400" : "text-red-400"}`}>
              {result.success ? "✅ Ulanish muvaffaqiyatli!" : "❌ Ulanish xatosi"}
            </p>
            <p className="text-slate-300 text-sm mt-2">{result.result || result.error}</p>
            <p className="text-slate-600 text-xs mt-2">Kechikish: {result.latencyMs}ms</p>
          </div>
          <Button onClick={onClose} className="w-full bg-slate-800 hover:bg-slate-700 text-white rounded-xl">Yopish</Button>
        </div>
      </Card>
    </div>
  );
}

export default function PlatformAdminAiSettings() {
  const { isLoading: authLoading } = usePlatformAuth();
  const [showAdd, setShowAdd] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [testing, setTesting] = useState<number | null>(null);
  const [toggling, setToggling] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const qc = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["/api/platform-admin/ai-settings"],
    queryFn: () => apiClient.get("/api/platform-admin/ai-settings"),
    enabled: !authLoading,
  });

  const { data: companiesData } = useQuery({
    queryKey: ["/api/platform-admin/companies"],
    queryFn: () => apiClient.get("/api/platform-admin/companies"),
    enabled: !authLoading,
  });

  const providers: any[] = (data as any)?.providers || [];
  const companyAccess: any[] = (data as any)?.companyAccess || [];
  const companies: any[] = (companiesData as any)?.data || [];

  const handleToggle = async (id: number) => {
    setToggling(id);
    try {
      await apiClient.patch(`/api/platform-admin/ai-settings/${id}/toggle`, {});
      refetch();
    } catch {}
    setToggling(null);
  };

  const handleDelete = async (id: number) => {
    if (deleting === id) {
      try {
        await apiClient.delete(`/api/platform-admin/ai-settings/${id}`);
        refetch();
      } catch {}
      setDeleting(null);
    } else {
      setDeleting(id);
    }
  };

  const handleTest = async (id: number) => {
    setTesting(id);
    try {
      const result = await apiClient.post("/api/platform-admin/ai-test", { settingsId: id });
      setTestResult(result);
    } catch (err: any) {
      setTestResult({ success: false, error: err?.message || "Test xatolik", latencyMs: 0 });
    }
    setTesting(null);
  };

  const handleCompanyAccess = async (companyId: number, enabled: boolean) => {
    try {
      await apiClient.patch(`/api/platform-admin/ai-access/${companyId}`, { enabled, monthlyLimit: 500 });
      refetch();
    } catch {}
  };

  if (authLoading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {showAdd && <AddProviderModal onClose={() => setShowAdd(false)} onSuccess={() => { setShowAdd(false); refetch(); }} />}
      {testResult && <TestResultModal result={testResult} onClose={() => setTestResult(null)} />}

      {/* HEADER */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur px-6 py-4 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <Link href="/platform-admin/dashboard">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg">
              <ChevronLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="w-9 h-9 bg-purple-600/20 border border-purple-700/30 rounded-xl flex items-center justify-center">
            <Brain className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h1 className="font-bold text-white leading-none">AI API Sozlamalar</h1>
            <p className="text-xs text-slate-500 mt-0.5">{providers.length} ta provider • {providers.filter(p => p.enabled).length} ta faol</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => refetch()} className="h-8 w-8 p-0 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg">
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button onClick={() => setShowAdd(true)} className="bg-purple-600 hover:bg-purple-500 text-white gap-2 rounded-xl h-9 px-4">
            <Plus className="w-4 h-4" />
            Provider Qo'shish
          </Button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* INFO BANNER */}
        <Card className="bg-gradient-to-r from-purple-900/30 to-indigo-900/20 border-purple-700/30 p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-purple-600/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <Brain className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="font-semibold text-white">Suniy Intellekt Integratsiyasi</h2>
              <p className="text-sm text-slate-400 mt-1">
                Bu yerda OpenAI, Anthropic, Gemini va boshqa AI providerlarning API kalitlarini qo'shishingiz mumkin.
                HR Risk Detector, Smart Hiring va AI Analytics funksiyalari uchun ishlatiladi.
                API kalitlar bazada xavfsiz saqlanadi va hech qachon frontend'ga qaytarilmaydi.
              </p>
              <div className="flex gap-3 mt-3 flex-wrap">
                {["HR Risk Detector", "Smart Hiring", "AI Analytics", "Xodim Tahlili", "Davomat Prognoz"].map(f => (
                  <span key={f} className="text-xs bg-purple-500/20 text-purple-400 px-2.5 py-1 rounded-lg">{f}</span>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* PROVIDERS LIST */}
        <div>
          <h2 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wider">Qo'shilgan Providerlar</h2>
          {isLoading ? (
            <div className="space-y-3">{[1, 2].map(i => <Card key={i} className="bg-slate-900 border-slate-800 p-5 animate-pulse h-28" />)}</div>
          ) : providers.length === 0 ? (
            <Card className="bg-slate-900 border-slate-800 p-12 text-center">
              <Brain className="w-12 h-12 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-500">Hali provider qo'shilmagan</p>
              <Button onClick={() => setShowAdd(true)} className="mt-4 bg-purple-600 hover:bg-purple-500 text-white rounded-xl gap-2">
                <Plus className="w-4 h-4" />Birinchi providerni qo'shing
              </Button>
            </Card>
          ) : (
            <div className="space-y-3">
              {providers.map((prov: any) => {
                const provConfig = AI_PROVIDERS.find(p => p.key === prov.provider);
                return (
                  <Card key={prov.id} className={`bg-gradient-to-r ${provConfig?.color || "from-slate-800 to-slate-900 border-slate-700"} border p-5`}>
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-4">
                        <div className="text-3xl">{provConfig?.logo || "🤖"}</div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-white">{provConfig?.name || prov.provider}</h3>
                            <Badge className={`border-0 text-xs ${prov.enabled ? "bg-green-500/20 text-green-400" : "bg-slate-700 text-slate-400"}`}>
                              {prov.enabled ? "Faol" : "O'chirilgan"}
                            </Badge>
                            {prov.model && <Badge className={`border-0 text-xs ${provConfig?.badge || "bg-slate-700 text-slate-300"}`}>{prov.model}</Badge>}
                          </div>
                          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                            <div className="flex items-center gap-1.5 bg-slate-900/50 rounded-lg px-2.5 py-1">
                              <Key className="w-3 h-3 text-amber-400" />
                              <span className="text-xs text-amber-300 font-mono">{prov.api_key_hint || "•••"}</span>
                            </div>
                            {prov.notes && <span className="text-xs text-slate-400 italic">{prov.notes}</span>}
                            <span className="text-xs text-slate-600">{prov.created_at ? format(new Date(prov.created_at), "dd.MM.yy HH:mm") : ""}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="ghost" onClick={() => handleTest(prov.id)} disabled={testing === prov.id}
                          className="h-8 px-3 text-xs text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg gap-1.5">
                          {testing === prov.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                          Test
                        </Button>

                        <button onClick={() => handleToggle(prov.id)} disabled={toggling === prov.id} className="transition-all">
                          {toggling === prov.id ? (
                            <Loader2 className="w-8 h-8 text-slate-500 animate-spin" />
                          ) : prov.enabled ? (
                            <ToggleRight className="w-9 h-9 text-green-400" />
                          ) : (
                            <ToggleLeft className="w-9 h-9 text-slate-600" />
                          )}
                        </button>

                        {deleting === prov.id ? (
                          <div className="flex items-center gap-1">
                            <Button size="sm" onClick={() => handleDelete(prov.id)} className="h-7 px-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs">
                              Ha, o'chir
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setDeleting(null)} className="h-7 px-2 text-slate-400 rounded-lg text-xs">Yo'q</Button>
                          </div>
                        ) : (
                          <Button size="sm" variant="ghost" onClick={() => handleDelete(prov.id)}
                            className="h-8 w-8 p-0 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* PROVIDER CARDS (add) */}
        <div>
          <h2 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wider">Qo'llab-quvvatlanadigan Providerlar</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {AI_PROVIDERS.map(p => {
              const added = providers.find(pr => pr.provider === p.key);
              return (
                <button key={p.key} onClick={() => !added && setShowAdd(true)}
                  className={`relative p-4 rounded-2xl border text-left transition-all ${added ? "bg-slate-800/50 border-slate-700" : `bg-gradient-to-br ${p.color} hover:opacity-90`}`}>
                  {added && (
                    <div className="absolute top-2 right-2">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                    </div>
                  )}
                  <div className="text-2xl mb-2">{p.logo}</div>
                  <p className="font-medium text-white text-sm">{p.name}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {p.models.slice(0, 2).map(m => (
                      <span key={m} className="text-xs bg-slate-900/50 text-slate-400 px-1.5 py-0.5 rounded">{m}</span>
                    ))}
                    {p.models.length > 2 && <span className="text-xs text-slate-600">+{p.models.length - 2}</span>}
                  </div>
                  {added ? (
                    <p className="text-xs text-green-400 mt-2">✓ Qo'shilgan</p>
                  ) : (
                    <p className="text-xs text-slate-500 mt-2">Qo'shish uchun bosing</p>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* COMPANY AI ACCESS */}
        <div>
          <h2 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wider">Korxonalarga AI Ruxsat</h2>
          <Card className="bg-slate-900 border-slate-800">
            {companies.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">Korxona mavjud emas</div>
            ) : (
              <div className="divide-y divide-slate-800">
                {companies.map((c: any) => {
                  const access = companyAccess.find((a: any) => a.company_id === c.id);
                  const isEnabled = access?.enabled || false;
                  return (
                    <div key={c.id} className="flex items-center justify-between px-4 py-3.5 hover:bg-slate-800/30">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-600/20 flex items-center justify-center text-blue-400 font-bold text-sm">
                          {c.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{c.name}</p>
                          <p className="text-xs text-slate-500">{c.employeeCount} xodim • {c.subscriptionPlan}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {isEnabled && <Badge className="bg-green-500/20 text-green-400 border-0 text-xs">Ruxsat berilgan</Badge>}
                        <button onClick={() => handleCompanyAccess(c.id, !isEnabled)}>
                          {isEnabled ? <ToggleRight className="w-8 h-8 text-green-400" /> : <ToggleLeft className="w-8 h-8 text-slate-600" />}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* HOW TO USE */}
        <Card className="bg-slate-900 border-slate-800 p-5">
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Settings className="w-4 h-4 text-slate-400" />
            Qanday ishlaydi?
          </h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { icon: "1️⃣", title: "API Kalit Qo'shing", desc: "Provider tanlang, API kalit kiriting va saqlang. Kalit bazada xavfsiz saqlanadi." },
              { icon: "2️⃣", title: "Test Qiling", desc: "\"Test\" tugmasini bosib, API kalitning to'g'ri ishlashini tekshiring." },
              { icon: "3️⃣", title: "Ruxsat Bering", desc: "Qaysi korxonalar AI funksiyalaridan foydalanishini pastda belgilang." },
            ].map(s => (
              <div key={s.title} className="bg-slate-800/50 rounded-2xl p-4">
                <div className="text-2xl mb-2">{s.icon}</div>
                <p className="text-sm font-semibold text-white">{s.title}</p>
                <p className="text-xs text-slate-400 mt-1">{s.desc}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
