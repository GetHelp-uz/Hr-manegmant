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
  ChevronLeft, Package, CheckCircle, X, Save, Loader2, Edit2, ToggleLeft, ToggleRight,
  Users, Cpu, QrCode, ScanFace, Brain, Radio, BarChart3, Key, Building2,
} from "lucide-react";

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

const PLAN_COLORS: Record<string, string> = {
  free: "from-slate-600/20 to-slate-800/20 border-slate-700/40",
  starter: "from-blue-600/20 to-indigo-800/20 border-blue-700/40",
  pro: "from-purple-600/20 to-violet-800/20 border-purple-700/40",
  enterprise: "from-amber-600/20 to-yellow-800/20 border-amber-700/40",
};
const PLAN_BADGES: Record<string, string> = {
  free: "bg-slate-700 text-slate-300",
  starter: "bg-blue-500/20 text-blue-400",
  pro: "bg-purple-500/20 text-purple-400",
  enterprise: "bg-amber-500/20 text-amber-400",
};
const PLAN_ICONS: Record<string, string> = { free: "🎁", starter: "🚀", pro: "💎", enterprise: "🏆" };

function formatPrice(price: number) {
  if (price === 0) return "Bepul";
  return `${price.toLocaleString("uz-UZ")} so'm/oy`;
}

function FeatureRow({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: boolean | string | number; hint?: string }) {
  const isNum = typeof value === "number";
  const isBool = typeof value === "boolean";
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0">
      <div className="flex items-center gap-2">
        <span className="text-slate-500">{icon}</span>
        <div>
          <p className="text-sm text-slate-300">{label}</p>
          {hint && <p className="text-xs text-slate-600">{hint}</p>}
        </div>
      </div>
      <div>
        {isBool ? (
          value ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <X className="w-4 h-4 text-slate-600" />
        ) : isNum ? (
          <span className="text-sm font-semibold text-white">{value === -1 ? "∞" : value}</span>
        ) : (
          <span className="text-sm text-slate-300">{value}</span>
        )}
      </div>
    </div>
  );
}

function EditPlanModal({ plan, onClose, onSuccess }: { plan: any; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    name: plan.name || "",
    nameUz: plan.name_uz || plan.nameUz || "",
    price: plan.price || 0,
    maxEmployees: plan.max_employees ?? plan.maxEmployees ?? 10,
    maxDevices: plan.max_devices ?? plan.maxDevices ?? 1,
    hasQr: plan.has_qr ?? plan.hasQr ?? true,
    hasFace: plan.has_face ?? plan.hasFace ?? false,
    hasAi: plan.has_ai ?? plan.hasAi ?? false,
    hasDeepFace: plan.has_deep_face ?? plan.hasDeepFace ?? false,
    hasBroadcasting: plan.has_broadcasting ?? plan.hasBroadcasting ?? false,
    hasAdvancedReports: plan.has_advanced_reports ?? plan.hasAdvancedReports ?? false,
    hasApiAccess: plan.has_api_access ?? plan.hasApiAccess ?? false,
    isActive: plan.is_active ?? plan.isActive ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const n = (k: string) => (e: any) => setForm(s => ({ ...s, [k]: e.target.type === "number" ? parseInt(e.target.value) : e.target.value }));
  const t = (k: string) => () => setForm(s => ({ ...s, [k]: !(s as any)[k] }));

  const handleSave = async () => {
    setSaving(true); setError("");
    try {
      await apiClient.put(`/api/platform-admin/plans/${plan.key}`, form);
      onSuccess();
    } catch (err: any) { setError(err?.message || "Xatolik"); }
    setSaving(false);
  };

  const toggleFeatures = [
    { key: "hasQr", icon: <QrCode className="w-4 h-4" />, label: "QR Kod davomati" },
    { key: "hasFace", icon: <ScanFace className="w-4 h-4" />, label: "Yuz tanish" },
    { key: "hasAi", icon: <Brain className="w-4 h-4" />, label: "AI Analitika" },
    { key: "hasDeepFace", icon: <Cpu className="w-4 h-4" />, label: "DeepFace (server-side)" },
    { key: "hasBroadcasting", icon: <Radio className="w-4 h-4" />, label: "Ommaviy xabar yuborish" },
    { key: "hasAdvancedReports", icon: <BarChart3 className="w-4 h-4" />, label: "Kengaytirilgan hisobotlar" },
    { key: "hasApiAccess", icon: <Key className="w-4 h-4" />, label: "API kirish (REST)" },
  ];

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="bg-slate-900 border-slate-700 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-slate-900 z-10">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{PLAN_ICONS[plan.key] || "📦"}</span>
            <div>
              <h2 className="font-bold text-white">{plan.name} tarifini tahrirlash</h2>
              <Badge className={`border-0 text-xs ${PLAN_BADGES[plan.key]}`}>{plan.key}</Badge>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0 text-slate-500 rounded-lg"><X className="w-4 h-4" /></Button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-slate-400 mb-1 block">Nomi (EN)</Label>
              <Input value={form.name} onChange={n("name")} className="bg-slate-800 border-slate-700 text-white rounded-xl" />
            </div>
            <div>
              <Label className="text-xs text-slate-400 mb-1 block">Nomi (UZ)</Label>
              <Input value={form.nameUz} onChange={n("nameUz")} className="bg-slate-800 border-slate-700 text-white rounded-xl" />
            </div>
          </div>

          <div>
            <Label className="text-xs text-slate-400 mb-1 block">Narx (so'm/oy) — 0 = Bepul</Label>
            <Input type="number" value={form.price} onChange={n("price")} className="bg-slate-800 border-slate-700 text-white rounded-xl" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-slate-400 mb-1 block">Maks. xodimlar (-1 = ∞)</Label>
              <Input type="number" value={form.maxEmployees} onChange={n("maxEmployees")} className="bg-slate-800 border-slate-700 text-white rounded-xl" />
            </div>
            <div>
              <Label className="text-xs text-slate-400 mb-1 block">Maks. qurilmalar (-1 = ∞)</Label>
              <Input type="number" value={form.maxDevices} onChange={n("maxDevices")} className="bg-slate-800 border-slate-700 text-white rounded-xl" />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-slate-400 mb-2 block">Imkoniyatlar</Label>
            {toggleFeatures.map(f => (
              <div key={f.key} className="flex items-center justify-between px-3 py-2.5 bg-slate-800/60 rounded-xl">
                <div className="flex items-center gap-2 text-slate-300">
                  <span className="text-slate-500">{f.icon}</span>
                  <span className="text-sm">{f.label}</span>
                </div>
                <button onClick={t(f.key)}>
                  {(form as any)[f.key] ? <ToggleRight className="w-8 h-8 text-emerald-400" /> : <ToggleLeft className="w-8 h-8 text-slate-600" />}
                </button>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between px-3 py-2.5 bg-slate-800/60 rounded-xl">
            <div>
              <p className="text-sm text-slate-300">Tarif faol</p>
              <p className="text-xs text-slate-500">O'chirilsa, yangi korxonalar bu tarifni tanlolmaydi</p>
            </div>
            <button onClick={t("isActive")}>
              {form.isActive ? <ToggleRight className="w-8 h-8 text-emerald-400" /> : <ToggleLeft className="w-8 h-8 text-slate-600" />}
            </button>
          </div>

          {error && <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-400">{error}</div>}

          <div className="flex gap-3 pt-1">
            <Button variant="ghost" onClick={onClose} className="flex-1 border border-slate-700 text-slate-400 rounded-xl">Bekor</Button>
            <Button onClick={handleSave} disabled={saving} className="flex-1 bg-purple-600 hover:bg-purple-500 text-white rounded-xl gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Saqlash
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default function PlatformAdminPlans() {
  const { isLoading: authLoading } = usePlatformAuth();
  const [editingPlan, setEditingPlan] = useState<any>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["/api/platform-admin/plans"],
    queryFn: () => apiClient.get("/api/platform-admin/plans"),
    enabled: !authLoading,
  });

  const { data: companiesData } = useQuery({
    queryKey: ["/api/platform-admin/companies"],
    queryFn: () => apiClient.get("/api/platform-admin/companies"),
    enabled: !authLoading,
  });

  const plans: any[] = (data as any)?.plans || [];
  const companies: any[] = (companiesData as any)?.data || [];

  if (authLoading || isLoading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {editingPlan && <EditPlanModal plan={editingPlan} onClose={() => setEditingPlan(null)} onSuccess={() => { setEditingPlan(null); refetch(); }} />}

      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur px-6 py-4 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <Link href="/platform-admin/dashboard">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg">
              <ChevronLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="w-9 h-9 bg-amber-600/20 border border-amber-700/30 rounded-xl flex items-center justify-center">
            <Package className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h1 className="font-bold text-white leading-none">Tarif Rejalari</h1>
            <p className="text-xs text-slate-500 mt-0.5">{plans.length} ta tarif • {companies.length} ta korxona</p>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* PLAN CARDS */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map((plan: any) => (
            <Card key={plan.key} className={`bg-gradient-to-b ${PLAN_COLORS[plan.key] || "from-slate-800 to-slate-900 border-slate-700"} border p-5 relative`}>
              <div className="absolute top-3 right-3 flex items-center gap-1.5">
                {plan.is_active === false && <Badge className="bg-red-500/20 text-red-400 border-0 text-xs">Nofaol</Badge>}
                <Badge className={`border-0 text-xs ${PLAN_BADGES[plan.key]}`}>{plan.companyCount || 0} ta</Badge>
              </div>

              <div className="mb-4">
                <div className="text-3xl mb-2">{PLAN_ICONS[plan.key] || "📦"}</div>
                <h3 className="font-bold text-white text-lg">{plan.name_uz || plan.nameUz || plan.name}</h3>
                <p className="text-emerald-400 font-semibold text-sm mt-1">{formatPrice(plan.price)}</p>
              </div>

              <div className="space-y-0">
                <FeatureRow icon={<Users className="w-3.5 h-3.5" />} label="Xodimlar" value={plan.max_employees ?? plan.maxEmployees ?? 10} />
                <FeatureRow icon={<Cpu className="w-3.5 h-3.5" />} label="Qurilmalar" value={plan.max_devices ?? plan.maxDevices ?? 1} />
                <FeatureRow icon={<QrCode className="w-3.5 h-3.5" />} label="QR davomati" value={!!(plan.has_qr ?? plan.hasQr)} />
                <FeatureRow icon={<ScanFace className="w-3.5 h-3.5" />} label="Yuz tanish" value={!!(plan.has_face ?? plan.hasFace)} />
                <FeatureRow icon={<Brain className="w-3.5 h-3.5" />} label="AI analitika" value={!!(plan.has_ai ?? plan.hasAi)} />
                <FeatureRow icon={<Cpu className="w-3.5 h-3.5" />} label="DeepFace" value={!!(plan.has_deep_face ?? plan.hasDeepFace)} />
                <FeatureRow icon={<Radio className="w-3.5 h-3.5" />} label="Broadcasting" value={!!(plan.has_broadcasting ?? plan.hasBroadcasting)} />
                <FeatureRow icon={<BarChart3 className="w-3.5 h-3.5" />} label="Kengaytirilgan" value={!!(plan.has_advanced_reports ?? plan.hasAdvancedReports)} />
                <FeatureRow icon={<Key className="w-3.5 h-3.5" />} label="API kirish" value={!!(plan.has_api_access ?? plan.hasApiAccess)} />
              </div>

              <Button onClick={() => setEditingPlan(plan)}
                className="mt-4 w-full h-9 bg-slate-800 hover:bg-slate-700 text-white rounded-xl gap-2 text-sm border border-slate-700">
                <Edit2 className="w-3.5 h-3.5" />
                Tahrirlash
              </Button>
            </Card>
          ))}
        </div>

        {/* COMPARISON TABLE */}
        <div>
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">Batafsil Taqqoslash</h2>
          <Card className="bg-slate-900 border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider w-48">Xususiyat</th>
                    {plans.map((p: any) => (
                      <th key={p.key} className="text-center px-4 py-3">
                        <div className="text-lg mb-0.5">{PLAN_ICONS[p.key] || "📦"}</div>
                        <p className="text-xs font-bold text-white">{p.name_uz || p.name}</p>
                        <p className="text-xs text-emerald-400">{formatPrice(p.price)}</p>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: "Maks. xodimlar", keys: ["max_employees", "maxEmployees"], type: "num" },
                    { label: "Maks. qurilmalar", keys: ["max_devices", "maxDevices"], type: "num" },
                    { label: "QR davomati", keys: ["has_qr", "hasQr"], type: "bool" },
                    { label: "Selfie foto", keys: ["has_qr", "hasQr"], type: "bool" },
                    { label: "Yuz tanish", keys: ["has_face", "hasFace"], type: "bool" },
                    { label: "AI analitika", keys: ["has_ai", "hasAi"], type: "bool" },
                    { label: "DeepFace (server)", keys: ["has_deep_face", "hasDeepFace"], type: "bool" },
                    { label: "Telegram bot", keys: ["has_qr", "hasQr"], type: "bool" },
                    { label: "Ommaviy xabar", keys: ["has_broadcasting", "hasBroadcasting"], type: "bool" },
                    { label: "Kengaytirilgan hisobotlar", keys: ["has_advanced_reports", "hasAdvancedReports"], type: "bool" },
                    { label: "API kirish", keys: ["has_api_access", "hasApiAccess"], type: "bool" },
                  ].map((row, i) => (
                    <tr key={i} className={`border-b border-slate-800/50 ${i % 2 === 0 ? "bg-slate-900/50" : "bg-slate-900/20"}`}>
                      <td className="px-4 py-2.5 text-sm text-slate-400">{row.label}</td>
                      {plans.map((p: any) => {
                        const val = p[row.keys[0]] ?? p[row.keys[1]];
                        return (
                          <td key={p.key} className="text-center px-4 py-2.5">
                            {row.type === "bool" ? (
                              val ? <CheckCircle className="w-4 h-4 text-emerald-400 mx-auto" /> : <X className="w-4 h-4 text-slate-700 mx-auto" />
                            ) : (
                              <span className="text-sm font-semibold text-white">{val === -1 ? "∞" : val}</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* COMPANIES BY PLAN */}
        <div>
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">Korxonalar Tariflar Bo'yicha</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {plans.map((plan: any) => {
              const planCompanies = companies.filter((c: any) => c.subscriptionPlan === plan.key);
              return (
                <Card key={plan.key} className="bg-slate-900 border-slate-800 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl">{PLAN_ICONS[plan.key] || "📦"}</span>
                    <div>
                      <p className="text-sm font-semibold text-white">{plan.name_uz || plan.name}</p>
                      <p className="text-xs text-slate-500">{planCompanies.length} ta korxona</p>
                    </div>
                  </div>
                  {planCompanies.length === 0 ? (
                    <p className="text-xs text-slate-600 text-center py-3">Korxona yo'q</p>
                  ) : (
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {planCompanies.map((c: any) => (
                        <div key={c.id} className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-blue-600/20 flex items-center justify-center text-blue-400 text-xs font-bold flex-shrink-0">
                            {c.name?.charAt(0)}
                          </div>
                          <span className="text-xs text-slate-300 truncate">{c.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
