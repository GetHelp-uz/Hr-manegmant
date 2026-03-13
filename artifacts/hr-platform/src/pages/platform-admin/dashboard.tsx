import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { apiClient } from "@/lib/api-client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Shield, Building2, Users, CalendarCheck, LogOut, Search, ChevronRight,
  Server, Activity, Database, Cpu, RefreshCw, Trash2, Settings, HardDrive,
  TrendingUp, Clock, Globe, Phone, Mail, UserCheck, Plus, X, Lock,
  ToggleLeft, ToggleRight, Megaphone, ClipboardList, Eye, AlertCircle,
  CheckCircle, Ban, BarChart3, FileText, Send, History, Brain,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";

// ── PLAN COLORS ───────────────────────────────────────────────────────────────
const PLAN_COLORS: Record<string, string> = {
  free: "bg-slate-700 text-slate-300",
  starter: "bg-cyan-500/20 text-cyan-400",
  business: "bg-purple-500/20 text-purple-400",
  enterprise: "bg-amber-500/20 text-amber-400",
};
const PLANS = ["free", "starter", "business", "enterprise"];

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  active: { label: "Faol", color: "bg-green-500/20 text-green-400", icon: CheckCircle },
  suspended: { label: "To'xtatilgan", color: "bg-amber-500/20 text-amber-400", icon: AlertCircle },
  blocked: { label: "Bloklangan", color: "bg-red-500/20 text-red-400", icon: Ban },
};

const INTEGRATIONS = [
  { key: "1c", label: "1C", desc: "1C:Enterprise buxgalteriya", color: "bg-yellow-500/20 text-yellow-400", badge: "bg-yellow-400" },
  { key: "uzasbo", label: "UZASBO", desc: "Davlat byudjet hisobi", color: "bg-blue-500/20 text-blue-400", badge: "bg-blue-400" },
  { key: "mybuh", label: "MyBuh", desc: "MyBuh.uz integratsiya", color: "bg-green-500/20 text-green-400", badge: "bg-green-400" },
  { key: "soliq", label: "Soliq", desc: "Soliq.uz portali", color: "bg-orange-500/20 text-orange-400", badge: "bg-orange-400" },
  { key: "telegram", label: "Telegram", desc: "Telegram bot ulanishi", color: "bg-sky-500/20 text-sky-400", badge: "bg-sky-400" },
  { key: "sms", label: "SMS", desc: "SMS xabar xizmati", color: "bg-purple-500/20 text-purple-400", badge: "bg-purple-400" },
];

const PIE_COLORS = ["#6366f1", "#0ea5e9", "#a855f7", "#f59e0b"];

type Tab = "overview" | "companies" | "employees" | "broadcast" | "logs";

// ── AUTH HOOK ─────────────────────────────────────────────────────────────────
function usePlatformAuth() {
  const [, setLocation] = useLocation();
  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/platform-admin/me"],
    queryFn: () => apiClient.get("/api/platform-admin/me"),
    retry: false,
  });
  useEffect(() => { if (!isLoading && error) setLocation("/platform-admin/login"); }, [isLoading, error]);
  return { data, isLoading };
}

// ── SYSTEM MINI CARD ──────────────────────────────────────────────────────────
function SystemMiniCard() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["/api/platform-admin/system"],
    queryFn: () => apiClient.get("/api/platform-admin/system"),
    refetchInterval: 30000,
  });
  const d = data as any;
  const getColor = (v: number, w: number, dk: number) => v >= dk ? "text-red-400" : v >= w ? "text-amber-400" : "text-green-400";
  const getBar = (v: number, w: number, dk: number) => v >= dk ? "bg-red-500" : v >= w ? "bg-amber-500" : "bg-green-500";
  if (isLoading) return <Card className="bg-slate-900 border-slate-800 p-5 animate-pulse h-32" />;
  const metrics = [
    { label: "CPU", value: d?.cpu?.loadPercent || 0, unit: "%", w: 50, dk: 80 },
    { label: "RAM", value: d?.memory?.systemUsedPercent || 0, unit: "%", w: 70, dk: 85 },
    { label: "DB ping", value: d?.database?.latencyMs || 0, unit: "ms", w: 150, dk: 500 },
    { label: "Disk", value: d?.disk?.usedPercent || 0, unit: "%", w: 75, dk: 90 },
  ];
  return (
    <Card className="bg-slate-900 border-slate-800 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-blue-600/20 rounded-lg flex items-center justify-center">
            <Server className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white leading-none">Server holati</p>
            <p className="text-xs text-slate-500">Uptime: {d?.server?.uptime}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Link href="/platform-admin/system">
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg">Batafsil</Button>
          </Link>
          <Button size="sm" variant="ghost" onClick={() => refetch()} className="h-7 w-7 p-0 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg">
            <RefreshCw className="w-3 h-3" />
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {metrics.map(m => (
          <div key={m.label} className="bg-slate-950/50 rounded-xl p-2.5">
            <p className="text-xs text-slate-500 mb-1">{m.label}</p>
            <p className={`text-base font-bold ${getColor(m.value, m.w, m.dk)}`}>{m.value}{m.unit}</p>
            <div className="w-full bg-slate-700 rounded-full h-1 mt-1.5">
              <div className={`h-1 rounded-full ${getBar(m.value, m.w, m.dk)}`} style={{ width: `${Math.min(m.value, 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ── CREATE COMPANY MODAL ───────────────────────────────────────────────────────
function CreateCompanyModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", address: "", plan: "free", adminName: "", adminLogin: "", adminPassword: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      await apiClient.post("/api/platform-admin/companies", form);
      onSuccess();
    } catch (err: any) {
      setError(err?.message || "Xatolik yuz berdi");
    } finally { setLoading(false); }
  };

  const f = (key: string) => (e: any) => setForm(s => ({ ...s, [key]: e.target.value }));

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="bg-slate-900 border-slate-700 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-400" />
            <h2 className="font-semibold text-white">Yangi Korxona Qo'shish</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0 text-slate-500 hover:text-white rounded-lg"><X className="w-4 h-4" /></Button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Korxona ma'lumotlari</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-slate-400 mb-1 block">Korxona nomi *</Label>
                <Input value={form.name} onChange={f("name")} placeholder="Korxona nomi" required className="bg-slate-800 border-slate-700 text-white text-sm rounded-xl h-9" />
              </div>
              <div>
                <Label className="text-xs text-slate-400 mb-1 block">Email *</Label>
                <Input type="email" value={form.email} onChange={f("email")} placeholder="email@domain.uz" required className="bg-slate-800 border-slate-700 text-white text-sm rounded-xl h-9" />
              </div>
              <div>
                <Label className="text-xs text-slate-400 mb-1 block">Telefon</Label>
                <Input value={form.phone} onChange={f("phone")} placeholder="+998901234567" className="bg-slate-800 border-slate-700 text-white text-sm rounded-xl h-9" />
              </div>
              <div>
                <Label className="text-xs text-slate-400 mb-1 block">Tarif</Label>
                <select value={form.plan} onChange={f("plan")} className="w-full h-9 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm px-3">
                  {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <Label className="text-xs text-slate-400 mb-1 block">Manzil</Label>
                <Input value={form.address} onChange={f("address")} placeholder="Shahar, ko'cha" className="bg-slate-800 border-slate-700 text-white text-sm rounded-xl h-9" />
              </div>
            </div>
          </div>
          <div className="space-y-1.5 pt-2 border-t border-slate-800">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Admin (ixtiyoriy)</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-slate-400 mb-1 block">Admin ismi</Label>
                <Input value={form.adminName} onChange={f("adminName")} placeholder="To'liq ism" className="bg-slate-800 border-slate-700 text-white text-sm rounded-xl h-9" />
              </div>
              <div>
                <Label className="text-xs text-slate-400 mb-1 block">Login</Label>
                <Input value={form.adminLogin} onChange={f("adminLogin")} placeholder="admin_login" className="bg-slate-800 border-slate-700 text-white text-sm rounded-xl h-9" />
              </div>
              <div className="col-span-2">
                <Label className="text-xs text-slate-400 mb-1 block">Parol</Label>
                <Input type="password" value={form.adminPassword} onChange={f("adminPassword")} placeholder="kamida 6 belgi" className="bg-slate-800 border-slate-700 text-white text-sm rounded-xl h-9" />
              </div>
            </div>
          </div>
          {error && <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-400">{error}</div>}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={onClose} className="flex-1 text-slate-400 hover:text-white border border-slate-700 rounded-xl">Bekor</Button>
            <Button type="submit" disabled={loading} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white rounded-xl">
              {loading ? "Yaratilmoqda..." : "Yaratish"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

// ── INTEGRATIONS MODAL ────────────────────────────────────────────────────────
function IntegrationsModal({ company, onClose, onSuccess }: { company: any; onClose: () => void; onSuccess: () => void }) {
  const [saving, setSaving] = useState<string | null>(null);

  const toggle = async (type: string, enabled: boolean) => {
    setSaving(type);
    try {
      await apiClient.patch(`/api/platform-admin/companies/${company.id}/integrations/${type}`, { enabled });
      onSuccess();
    } catch {}
    setSaving(null);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="bg-slate-900 border-slate-700 w-full max-w-md">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-400" />
            <h2 className="font-semibold text-white">Integratsiyalar — {company.name}</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0 text-slate-500 hover:text-white rounded-lg"><X className="w-4 h-4" /></Button>
        </div>
        <div className="p-5 space-y-3">
          {INTEGRATIONS.map(int => {
            const isEnabled = company.integrations?.[int.key]?.enabled;
            const connectedAt = company.integrations?.[int.key]?.connectedAt;
            return (
              <div key={int.key} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${isEnabled ? "bg-slate-800 border-slate-600" : "bg-slate-950/50 border-slate-800"}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${int.color}`}>
                    {int.label}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{int.label}</p>
                    <p className="text-xs text-slate-500">{int.desc}</p>
                    {isEnabled && connectedAt && (
                      <p className="text-xs text-green-500 mt-0.5">Ulangan: {format(new Date(connectedAt), "dd.MM.yy HH:mm")}</p>
                    )}
                  </div>
                </div>
                <button onClick={() => toggle(int.key, !isEnabled)} disabled={saving === int.key}
                  className={`transition-all ${saving === int.key ? "opacity-50" : ""}`}>
                  {isEnabled
                    ? <ToggleRight className="w-9 h-9 text-green-400" />
                    : <ToggleLeft className="w-9 h-9 text-slate-600" />}
                </button>
              </div>
            );
          })}
        </div>
        <div className="px-5 pb-5">
          <Button onClick={onClose} className="w-full bg-slate-800 hover:bg-slate-700 text-white rounded-xl">Yopish</Button>
        </div>
      </Card>
    </div>
  );
}

// ── RESET PASSWORD MODAL ──────────────────────────────────────────────────────
function ResetPasswordModal({ company, onClose }: { company: any; onClose: () => void }) {
  const [pwd, setPwd] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      await apiClient.post(`/api/platform-admin/companies/${company.id}/reset-password`, { newPassword: pwd });
      setDone(true);
    } catch (err: any) { setError(err?.message || "Xatolik"); }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="bg-slate-900 border-slate-700 w-full max-w-sm">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-amber-400" />
            <h2 className="font-semibold text-white">Parolni Tiklash</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0 text-slate-500 hover:text-white rounded-lg"><X className="w-4 h-4" /></Button>
        </div>
        <div className="p-5">
          {done ? (
            <div className="text-center py-4">
              <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
              <p className="text-white font-medium">Parol muvaffaqiyatli yangilandi!</p>
              <p className="text-slate-400 text-sm mt-1">Admin keyingi kirishda yangi paroldan foydalanadi</p>
              <Button onClick={onClose} className="mt-4 w-full bg-slate-800 hover:bg-slate-700 text-white rounded-xl">Yopish</Button>
            </div>
          ) : (
            <form onSubmit={handleReset} className="space-y-4">
              <p className="text-slate-400 text-sm"><span className="text-white font-medium">{company.name}</span> korxonasi admin parolini yangilang</p>
              <div>
                <Label className="text-xs text-slate-400 mb-1 block">Yangi parol</Label>
                <Input type="password" value={pwd} onChange={e => setPwd(e.target.value)} placeholder="kamida 6 belgi" required minLength={6} className="bg-slate-800 border-slate-700 text-white rounded-xl" />
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <div className="flex gap-3">
                <Button type="button" variant="ghost" onClick={onClose} className="flex-1 border border-slate-700 text-slate-400 hover:text-white rounded-xl">Bekor</Button>
                <Button type="submit" disabled={loading || pwd.length < 6} className="flex-1 bg-amber-600 hover:bg-amber-500 text-white rounded-xl">
                  {loading ? "..." : "Yangilash"}
                </Button>
              </div>
            </form>
          )}
        </div>
      </Card>
    </div>
  );
}

// ── BROADCAST MODAL ───────────────────────────────────────────────────────────
function BroadcastModal({ onClose, companies }: { onClose: () => void; companies: any[] }) {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [target, setTarget] = useState("all");
  const [targetId, setTargetId] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiClient.post("/api/platform-admin/broadcast", { title, message, targetCompanyId: target === "company" ? parseInt(targetId) : undefined });
      setDone(true);
    } catch {}
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="bg-slate-900 border-slate-700 w-full max-w-md">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-purple-400" />
            <h2 className="font-semibold text-white">Xabar Yuborish</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0 text-slate-500 hover:text-white rounded-lg"><X className="w-4 h-4" /></Button>
        </div>
        <div className="p-5">
          {done ? (
            <div className="text-center py-4">
              <Send className="w-12 h-12 text-green-400 mx-auto mb-3" />
              <p className="text-white font-medium">Xabar muvaffaqiyatli saqlandi!</p>
              <Button onClick={onClose} className="mt-4 w-full bg-slate-800 hover:bg-slate-700 text-white rounded-xl">Yopish</Button>
            </div>
          ) : (
            <form onSubmit={handleSend} className="space-y-4">
              <div className="flex gap-2">
                {[["all", "Barcha korxonalar"], ["company", "Bitta korxona"]].map(([v, l]) => (
                  <button key={v} type="button" onClick={() => setTarget(v)}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${target === v ? "bg-purple-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white"}`}>
                    {l}
                  </button>
                ))}
              </div>
              {target === "company" && (
                <select value={targetId} onChange={e => setTargetId(e.target.value)} required
                  className="w-full h-10 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm px-3">
                  <option value="">Korxona tanlang...</option>
                  {companies.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              )}
              <div>
                <Label className="text-xs text-slate-400 mb-1 block">Sarlavha</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} required placeholder="Xabar sarlavhasi" className="bg-slate-800 border-slate-700 text-white rounded-xl" />
              </div>
              <div>
                <Label className="text-xs text-slate-400 mb-1 block">Matn</Label>
                <Textarea value={message} onChange={e => setMessage(e.target.value)} required rows={4} placeholder="Xabar matni..." className="bg-slate-800 border-slate-700 text-white rounded-xl resize-none" />
              </div>
              <div className="flex gap-3">
                <Button type="button" variant="ghost" onClick={onClose} className="flex-1 border border-slate-700 text-slate-400 hover:text-white rounded-xl">Bekor</Button>
                <Button type="submit" disabled={loading} className="flex-1 bg-purple-600 hover:bg-purple-500 text-white rounded-xl gap-2">
                  <Send className="w-4 h-4" />
                  {loading ? "..." : "Yuborish"}
                </Button>
              </div>
            </form>
          )}
        </div>
      </Card>
    </div>
  );
}

// ── MAIN DASHBOARD ────────────────────────────────────────────────────────────
export default function PlatformAdminDashboard() {
  const [, setLocation] = useLocation();
  const { isLoading: authLoading } = usePlatformAuth();
  const [tab, setTab] = useState<Tab>("overview");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [integrationsFor, setIntegrationsFor] = useState<any>(null);
  const [resetPwdFor, setResetPwdFor] = useState<any>(null);
  const [changePlanId, setChangePlanId] = useState<number | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [notesFor, setNotesFor] = useState<any>(null);
  const [notesText, setNotesText] = useState("");
  const qc = useQueryClient();

  const { data: companiesData, isLoading: companiesLoading } = useQuery({
    queryKey: ["/api/platform-admin/companies", search],
    queryFn: () => apiClient.get(`/api/platform-admin/companies${search ? `?search=${encodeURIComponent(search)}` : ""}`),
    enabled: !authLoading,
  });

  const { data: statsData } = useQuery({
    queryKey: ["/api/platform-admin/stats"],
    queryFn: () => apiClient.get("/api/platform-admin/stats"),
    enabled: !authLoading && tab === "overview",
  });

  const { data: employeesData, isLoading: employeesLoading } = useQuery({
    queryKey: ["/api/platform-admin/employees", search],
    queryFn: () => apiClient.get(`/api/platform-admin/employees${search ? `?search=${encodeURIComponent(search)}` : ""}`),
    enabled: tab === "employees" && !authLoading,
  });

  const { data: activityData } = useQuery({
    queryKey: ["/api/platform-admin/activity"],
    queryFn: () => apiClient.get("/api/platform-admin/activity"),
    enabled: (tab === "overview" || tab === "logs") && !authLoading,
    refetchInterval: 30000,
  });

  const { data: announcementsData } = useQuery({
    queryKey: ["/api/platform-admin/announcements"],
    queryFn: () => apiClient.get("/api/platform-admin/announcements"),
    enabled: tab === "broadcast" && !authLoading,
  });

  const { data: actionLogData } = useQuery({
    queryKey: ["/api/platform-admin/action-log"],
    queryFn: () => apiClient.get("/api/platform-admin/action-log"),
    enabled: tab === "logs" && !authLoading,
  });

  const planMutation = useMutation({
    mutationFn: ({ id, plan }: { id: number; plan: string }) => apiClient.patch(`/api/platform-admin/companies/${id}/plan`, { plan }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/platform-admin/companies"] }); setChangePlanId(null); },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => apiClient.patch(`/api/platform-admin/companies/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/platform-admin/companies"] }),
  });

  const deleteCompanyMutation = useMutation({
    mutationFn: (id: number) => apiClient.delete(`/api/platform-admin/companies/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/platform-admin/companies"] }); setDeleteConfirm(null); },
  });

  const deleteEmpMutation = useMutation({
    mutationFn: (id: number) => apiClient.delete(`/api/platform-admin/employees/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/platform-admin/employees"] }),
  });

  const notesMutation = useMutation({
    mutationFn: ({ id, notes }: { id: number; notes: string }) => apiClient.patch(`/api/platform-admin/companies/${id}/notes`, { notes }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/platform-admin/companies"] }); setNotesFor(null); },
  });

  const handleLogout = async () => { await apiClient.post("/api/platform-admin/logout", {}); setLocation("/platform-admin/login"); };

  const companies: any[] = (companiesData as any)?.data || [];
  const employees: any[] = (employeesData as any)?.data || [];
  const activity: any[] = (activityData as any)?.feed || [];
  const announcements: any[] = (announcementsData as any)?.data || [];
  const actionLog: any[] = (actionLogData as any)?.data || [];
  const stats = (statsData as any)?.totals || {};
  const planDist: any[] = ((statsData as any)?.planDistribution || []).map((p: any) => ({ name: p.plan, value: Number(p.cnt) }));
  const compGrowth = (statsData as any)?.companyGrowth || [];
  const empGrowth = (statsData as any)?.employeeGrowth || [];
  const attByDay = (statsData as any)?.attendanceByDay || [];

  const totalEmployees = companies.reduce((s: number, c: any) => s + (c.employeeCount || 0), 0);
  const todayAttendance = companies.reduce((s: number, c: any) => s + (c.todayAttendance || 0), 0);
  const paidPlans = companies.filter((c: any) => c.subscriptionPlan !== "free").length;

  if (authLoading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* MODALS */}
      {showCreate && <CreateCompanyModal onClose={() => setShowCreate(false)} onSuccess={() => { setShowCreate(false); qc.invalidateQueries({ queryKey: ["/api/platform-admin/companies"] }); }} />}
      {showBroadcast && <BroadcastModal onClose={() => setShowBroadcast(false)} companies={companies} />}
      {integrationsFor && <IntegrationsModal company={integrationsFor} onClose={() => setIntegrationsFor(null)} onSuccess={() => { qc.invalidateQueries({ queryKey: ["/api/platform-admin/companies"] }); }} />}
      {resetPwdFor && <ResetPasswordModal company={resetPwdFor} onClose={() => setResetPwdFor(null)} />}
      {notesFor && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="bg-slate-900 border-slate-700 w-full max-w-sm">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-400" />
                <h2 className="font-semibold text-white text-sm">Eslatma — {notesFor.name}</h2>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setNotesFor(null)} className="h-7 w-7 p-0 text-slate-500 rounded-lg"><X className="w-4 h-4" /></Button>
            </div>
            <div className="p-5 space-y-3">
              <Textarea value={notesText} onChange={e => setNotesText(e.target.value)} rows={4} placeholder="Admin eslatmasi..." className="bg-slate-800 border-slate-700 text-white rounded-xl resize-none text-sm" />
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setNotesFor(null)} className="flex-1 border border-slate-700 text-slate-400 rounded-xl text-sm">Bekor</Button>
                <Button onClick={() => notesMutation.mutate({ id: notesFor.id, notes: notesText })} disabled={notesMutation.isPending} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm">
                  {notesMutation.isPending ? "..." : "Saqlash"}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* HEADER */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur px-6 py-4 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/30">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-white leading-none">Platform Admin</h1>
            <p className="text-xs text-slate-500 mt-0.5">{(companiesData as any)?.allTotal || 0} korxona · {totalEmployees} xodim</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={() => setShowBroadcast(true)}
            className="text-slate-400 hover:text-purple-400 hover:bg-purple-500/10 gap-2 rounded-xl h-8 px-3">
            <Megaphone className="w-4 h-4" />
            <span className="hidden sm:inline text-xs">Xabar</span>
          </Button>
          <Button size="sm" onClick={() => setShowCreate(true)}
            className="bg-blue-600 hover:bg-blue-500 text-white gap-2 rounded-xl h-8 px-3">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline text-xs">Korxona</span>
          </Button>
          <Link href="/platform-admin/ai-settings">
            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-purple-400 hover:bg-purple-500/10 gap-2 rounded-xl h-8 px-3">
              <Brain className="w-4 h-4" />
              <span className="hidden sm:inline text-xs">AI</span>
            </Button>
          </Link>
          <Link href="/platform-admin/system">
            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white hover:bg-slate-800 gap-2 rounded-xl h-8 px-3">
              <Server className="w-4 h-4" />
              <span className="hidden sm:inline text-xs">Server</span>
            </Button>
          </Link>
          <Button variant="ghost" size="sm" onClick={handleLogout}
            className="text-slate-400 hover:text-red-400 hover:bg-red-500/10 gap-2 rounded-xl h-8 px-3">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 space-y-5">
        {/* TOP STATS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Korxonalar", value: (companiesData as any)?.allTotal || 0, icon: Building2, color: "text-blue-400 bg-blue-500/10", sub: `${paidPlans} ta pullik` },
            { label: "Xodimlar", value: totalEmployees, icon: Users, color: "text-green-400 bg-green-500/10", sub: "Barcha korxona" },
            { label: "Bugungi davomat", value: todayAttendance, icon: CalendarCheck, color: "text-amber-400 bg-amber-500/10", sub: "Bugun kelganlar" },
            { label: "Jami to'langan", value: stats.totalPayroll ? (stats.totalPayroll / 1_000_000).toFixed(1) + "M" : "0", icon: TrendingUp, color: "text-purple-400 bg-purple-500/10", sub: "so'm (barcha vaqt)" },
          ].map(s => (
            <Card key={s.label} className="bg-slate-900 border-slate-800 p-4">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-2.5 ${s.color}`}>
                <s.icon className="w-4 h-4" />
              </div>
              <p className="text-2xl font-bold text-white">{s.value}</p>
              <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
              <p className="text-xs text-slate-600">{s.sub}</p>
            </Card>
          ))}
        </div>

        <SystemMiniCard />

        {/* TABS */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1 overflow-x-auto">
            {([
              ["overview", "Umumiy", BarChart3],
              ["companies", "Korxonalar", Building2],
              ["employees", "Xodimlar", Users],
              ["broadcast", "Xabarlar", Megaphone],
              ["logs", "Jurnal", History],
            ] as const).map(([key, label, Icon]) => (
              <button key={key} onClick={() => { setTab(key); setSearch(""); }}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  tab === key ? "bg-blue-600 text-white shadow" : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}>
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>
          {(tab === "companies" || tab === "employees") && (
            <div className="relative">
              <Search className="absolute left-3 top-2 h-4 w-4 text-slate-500" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Qidirish..."
                className="pl-9 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 rounded-xl w-56 h-8 text-sm" />
            </div>
          )}
        </div>

        {/* ── OVERVIEW TAB ── */}
        {tab === "overview" && (
          <div className="space-y-5">
            <div className="grid sm:grid-cols-2 gap-5">
              <Card className="bg-slate-900 border-slate-800 p-5">
                <h3 className="text-sm font-semibold text-white mb-4">Korxona o'sishi (6 oy)</h3>
                {compGrowth.length > 0 ? (
                  <ResponsiveContainer width="100%" height={180}>
                    <AreaChart data={compGrowth.map((d: any) => ({ month: d.month?.slice(5), count: Number(d.cnt) }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="month" tick={{ fill: "#64748b", fontSize: 11 }} />
                      <YAxis tick={{ fill: "#64748b", fontSize: 11 }} />
                      <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#fff" }} />
                      <Area type="monotone" dataKey="count" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} strokeWidth={2} name="Korxona" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : <div className="h-44 flex items-center justify-center text-slate-600 text-sm">Ma'lumot yo'q</div>}
              </Card>
              <Card className="bg-slate-900 border-slate-800 p-5">
                <h3 className="text-sm font-semibold text-white mb-4">Xodimlar o'sishi (6 oy)</h3>
                {empGrowth.length > 0 ? (
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={empGrowth.map((d: any) => ({ month: d.month?.slice(5), count: Number(d.cnt) }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="month" tick={{ fill: "#64748b", fontSize: 11 }} />
                      <YAxis tick={{ fill: "#64748b", fontSize: 11 }} />
                      <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#fff" }} />
                      <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} name="Xodim" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <div className="h-44 flex items-center justify-center text-slate-600 text-sm">Ma'lumot yo'q</div>}
              </Card>
              <Card className="bg-slate-900 border-slate-800 p-5">
                <h3 className="text-sm font-semibold text-white mb-4">Davomat (14 kun)</h3>
                {attByDay.length > 0 ? (
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={attByDay.map((d: any) => ({ day: d.day?.slice(5), count: Number(d.cnt) }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="day" tick={{ fill: "#64748b", fontSize: 10 }} />
                      <YAxis tick={{ fill: "#64748b", fontSize: 11 }} />
                      <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#fff" }} />
                      <Line type="monotone" dataKey="count" stroke="#f59e0b" strokeWidth={2} dot={false} name="Davomat" />
                    </LineChart>
                  </ResponsiveContainer>
                ) : <div className="h-44 flex items-center justify-center text-slate-600 text-sm">Ma'lumot yo'q</div>}
              </Card>
              <Card className="bg-slate-900 border-slate-800 p-5">
                <h3 className="text-sm font-semibold text-white mb-4">Tarif taqsimoti</h3>
                {planDist.length > 0 ? (
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={planDist} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" nameKey="name">
                        {planDist.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#fff" }} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: 12, color: "#94a3b8" }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <div className="h-44 flex items-center justify-center text-slate-600 text-sm">Ma'lumot yo'q</div>}
              </Card>
            </div>
            <Card className="bg-slate-900 border-slate-800">
              <div className="p-4 border-b border-slate-800">
                <h3 className="text-sm font-semibold text-white">So'nggi Faollik</h3>
              </div>
              <div className="divide-y divide-slate-800/60 max-h-72 overflow-y-auto">
                {activity.slice(0, 15).map((item: any, i: number) => {
                  const iconMap: Record<string, string> = { building: "🏢", user: "👤", clock: "🕐" };
                  return (
                    <div key={i} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-800/30">
                      <span className="text-base">{iconMap[item.icon] || "📌"}</span>
                      <p className="text-sm text-slate-300 flex-1 truncate">{item.text}</p>
                      <p className="text-xs text-slate-600 flex-shrink-0">{item.time ? formatDistanceToNow(new Date(item.time), { addSuffix: true }) : ""}</p>
                    </div>
                  );
                })}
                {activity.length === 0 && <div className="text-center py-8 text-slate-500 text-sm">Faollik yo'q</div>}
              </div>
            </Card>
          </div>
        )}

        {/* ── COMPANIES TAB ── */}
        {tab === "companies" && (
          <div className="space-y-3">
            {companiesLoading ? [1,2,3].map(i => <Card key={i} className="bg-slate-900 border-slate-800 p-5 animate-pulse h-24" />) :
            companies.length === 0 ? (
              <Card className="bg-slate-900 border-slate-800 p-12 text-center text-slate-500">Korxona topilmadi</Card>
            ) : companies.map((company: any) => {
              const st = STATUS_CONFIG[company.status] || STATUS_CONFIG.active;
              const activeInts = INTEGRATIONS.filter(int => company.integrations?.[int.key]?.enabled);
              return (
                <Card key={company.id} className={`border transition-all ${company.status === "blocked" ? "bg-red-950/20 border-red-900/40" : company.status === "suspended" ? "bg-amber-950/10 border-amber-900/30" : "bg-slate-900 border-slate-800 hover:border-slate-700"}`}>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600/30 to-indigo-600/20 flex items-center justify-center text-blue-400 font-bold text-lg flex-shrink-0">
                          {company.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-white">{company.name}</p>
                            <Badge className={`${PLAN_COLORS[company.subscriptionPlan] || "bg-slate-700 text-slate-300"} border-0 text-xs`}>{company.subscriptionPlan}</Badge>
                            <Badge className={`${st.color} border-0 text-xs`}>{st.label}</Badge>
                          </div>
                          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                            {company.email && <span className="flex items-center gap-1 text-xs text-slate-500"><Mail className="w-3 h-3" />{company.email}</span>}
                            {company.phone && <span className="flex items-center gap-1 text-xs text-slate-500"><Phone className="w-3 h-3" />{company.phone}</span>}
                            {company.adminLogin && <span className="flex items-center gap-1 text-xs text-slate-500"><UserCheck className="w-3 h-3" />{company.adminLogin}</span>}
                          </div>
                          {company.notes && <p className="text-xs text-amber-400/80 mt-1 italic">📝 {company.notes}</p>}
                          {activeInts.length > 0 && (
                            <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                              {activeInts.map(int => (
                                <span key={int.key} className={`text-xs px-2 py-0.5 rounded-lg font-medium ${int.color}`}>{int.label}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-3">
                          <div className="text-center">
                            <p className="text-base font-bold text-white">{company.employeeCount}</p>
                            <p className="text-xs text-slate-500">Xodim</p>
                          </div>
                          <div className="text-center">
                            <p className="text-base font-bold text-green-400">{company.todayAttendance}</p>
                            <p className="text-xs text-slate-500">Bugun</p>
                          </div>
                          <p className="text-xs text-slate-600">{company.createdAt ? format(new Date(company.createdAt), "dd.MM.yy") : "—"}</p>
                        </div>

                        <div className="flex items-center gap-1">
                          {/* Status change */}
                          <div className="relative group">
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-500 hover:text-white hover:bg-slate-700 rounded-lg" title="Holat">
                              <st.icon className="w-3.5 h-3.5" />
                            </Button>
                            <div className="absolute right-0 top-8 hidden group-hover:flex flex-col gap-1 bg-slate-800 border border-slate-700 rounded-xl p-2 z-10 min-w-36 shadow-xl">
                              {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                                <button key={k} onClick={() => statusMutation.mutate({ id: company.id, status: k })}
                                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all hover:bg-slate-700 ${company.status === k ? "text-white" : "text-slate-400"}`}>
                                  <v.icon className="w-3.5 h-3.5" />
                                  {v.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Integrations */}
                          <Button size="sm" variant="ghost" onClick={() => setIntegrationsFor(company)}
                            className="h-7 w-7 p-0 text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg" title="Integratsiyalar">
                            <Globe className="w-3.5 h-3.5" />
                          </Button>

                          {/* Notes */}
                          <Button size="sm" variant="ghost"
                            onClick={() => { setNotesFor(company); setNotesText(company.notes || ""); }}
                            className="h-7 w-7 p-0 text-slate-500 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg" title="Eslatma">
                            <FileText className="w-3.5 h-3.5" />
                          </Button>

                          {/* Reset password */}
                          <Button size="sm" variant="ghost" onClick={() => setResetPwdFor(company)}
                            className="h-7 w-7 p-0 text-slate-500 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg" title="Parolni tiklash">
                            <Lock className="w-3.5 h-3.5" />
                          </Button>

                          {/* Plan change */}
                          {changePlanId === company.id ? (
                            <div className="flex items-center gap-1 bg-slate-800 border border-slate-700 rounded-xl p-1">
                              {PLANS.map(plan => (
                                <button key={plan} onClick={() => planMutation.mutate({ id: company.id, plan })}
                                  disabled={planMutation.isPending}
                                  className={`px-2 py-0.5 rounded-lg text-xs font-medium transition-all ${company.subscriptionPlan === plan ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white hover:bg-slate-700"}`}>
                                  {plan}
                                </button>
                              ))}
                              <button onClick={() => setChangePlanId(null)} className="px-1.5 text-slate-600 hover:text-white text-xs">✕</button>
                            </div>
                          ) : (
                            <Button size="sm" variant="ghost" onClick={() => setChangePlanId(company.id)}
                              className="h-7 w-7 p-0 text-slate-500 hover:text-white hover:bg-slate-700 rounded-lg" title="Tarif o'zgartirish">
                              <Settings className="w-3.5 h-3.5" />
                            </Button>
                          )}

                          {/* View */}
                          <Link href={`/platform-admin/companies/${company.id}`}>
                            <Button size="sm" variant="ghost"
                              className="h-7 w-7 p-0 text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg" title="Batafsil">
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                          </Link>

                          {/* Delete */}
                          {deleteConfirm === company.id ? (
                            <div className="flex items-center gap-1">
                              <Button size="sm" variant="ghost" onClick={() => deleteCompanyMutation.mutate(company.id)} disabled={deleteCompanyMutation.isPending}
                                className="h-7 px-2 text-red-400 hover:bg-red-500/10 rounded-lg text-xs">
                                {deleteCompanyMutation.isPending ? "..." : "Ha"}
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setDeleteConfirm(null)}
                                className="h-7 px-2 text-slate-500 hover:text-white rounded-lg text-xs">Yo'q</Button>
                            </div>
                          ) : (
                            <Button size="sm" variant="ghost" onClick={() => setDeleteConfirm(company.id)}
                              className="h-7 w-7 p-0 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg" title="O'chirish">
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* ── EMPLOYEES TAB ── */}
        {tab === "employees" && (
          <Card className="bg-slate-900 border-slate-800 overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-white text-sm">Barcha Xodimlar</h2>
                <p className="text-xs text-slate-500 mt-0.5">{(employeesData as any)?.total || 0} ta xodim</p>
              </div>
              <Badge className="bg-green-500/20 text-green-400 border-0 text-xs">Bugun faol: {(employeesData as any)?.todayActive || 0}</Badge>
            </div>
            {employeesLoading ? (
              <div className="p-12 flex justify-center"><div className="animate-spin w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full" /></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-950/50">
                      {["Ism", "Lavozim", "Korxona", "Telefon", "Oylik turi", "Maosh", "Qo'shilgan", ""].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs text-slate-500 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {employees.map((emp: any) => (
                      <tr key={emp.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-blue-600/20 flex items-center justify-center text-blue-400 text-xs font-bold flex-shrink-0">{emp.fullName?.charAt(0)}</div>
                            <span className="text-white font-medium whitespace-nowrap">{emp.fullName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-slate-300 text-xs">{emp.position || "—"}</td>
                        <td className="px-4 py-3.5"><span className="text-blue-400 text-xs bg-blue-500/10 px-2 py-0.5 rounded-lg whitespace-nowrap">{emp.companyName}</span></td>
                        <td className="px-4 py-3.5 text-slate-400 text-xs">{emp.phone || "—"}</td>
                        <td className="px-4 py-3.5"><Badge className="bg-slate-800 text-slate-300 border-0 text-xs">{emp.salaryType === "monthly" ? "Oylik" : emp.salaryType === "hourly" ? "Soatbay" : emp.salaryType || "—"}</Badge></td>
                        <td className="px-4 py-3.5 text-amber-400 text-xs font-medium whitespace-nowrap">{emp.monthlySalary ? emp.monthlySalary.toLocaleString() + " so'm" : "—"}</td>
                        <td className="px-4 py-3.5 text-slate-500 text-xs">{emp.createdAt ? format(new Date(emp.createdAt), "dd.MM.yy") : "—"}</td>
                        <td className="px-4 py-3.5">
                          <Button size="sm" variant="ghost" onClick={() => deleteEmpMutation.mutate(emp.id)} disabled={deleteEmpMutation.isPending}
                            className="h-7 w-7 p-0 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg">
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {employees.length === 0 && <tr><td colSpan={8} className="text-center py-12 text-slate-500">Xodim topilmadi</td></tr>}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}

        {/* ── BROADCAST TAB ── */}
        {tab === "broadcast" && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setShowBroadcast(true)} className="bg-purple-600 hover:bg-purple-500 text-white gap-2 rounded-xl">
                <Plus className="w-4 h-4" />Yangi xabar
              </Button>
            </div>
            <Card className="bg-slate-900 border-slate-800">
              <div className="p-4 border-b border-slate-800">
                <h2 className="font-semibold text-white text-sm">Yuborilgan Xabarlar</h2>
              </div>
              <div className="divide-y divide-slate-800">
                {announcements.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">Hali xabar yuborilmagan</div>
                ) : announcements.map((a: any) => (
                  <div key={a.id} className="p-4 hover:bg-slate-800/30">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-white text-sm">{a.title}</p>
                        <p className="text-slate-400 text-xs mt-1">{a.message}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <Badge className={`border-0 text-xs ${a.target === "all" ? "bg-blue-500/20 text-blue-400" : "bg-purple-500/20 text-purple-400"}`}>
                          {a.target === "all" ? "Barcha" : "Aniq"}
                        </Badge>
                        <p className="text-xs text-slate-600 mt-1">{a.created_at ? format(new Date(a.created_at), "dd.MM.yy HH:mm") : "—"}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* ── LOGS TAB ── */}
        {tab === "logs" && (
          <div className="space-y-4">
            <Card className="bg-slate-900 border-slate-800">
              <div className="p-4 border-b border-slate-800">
                <h2 className="font-semibold text-white text-sm">Admin Harakatlari Jurnali</h2>
                <p className="text-xs text-slate-500 mt-0.5">So'nggi 100 ta harakat</p>
              </div>
              <div className="divide-y divide-slate-800 max-h-96 overflow-y-auto">
                {actionLog.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">Jurnal bo'sh</div>
                ) : actionLog.map((log: any) => {
                  const actionColors: Record<string, string> = {
                    login: "text-green-400", create_company: "text-blue-400",
                    delete_company: "text-red-400", change_plan: "text-purple-400",
                    set_status_blocked: "text-red-400", set_status_suspended: "text-amber-400",
                    set_status_active: "text-green-400", reset_password: "text-amber-400",
                  };
                  const color = actionColors[log.action] || "text-slate-300";
                  return (
                    <div key={log.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-800/30">
                      <div className="w-2 h-2 rounded-full bg-slate-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className={`text-sm font-medium ${color}`}>{log.action}</span>
                        {log.target_type && <span className="text-slate-500 text-xs ml-2">→ {log.target_type} #{log.target_id}</span>}
                        {log.details && Object.keys(log.details).length > 0 && (
                          <span className="text-slate-600 text-xs ml-2">{JSON.stringify(log.details)}</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 flex-shrink-0">{log.created_at ? format(new Date(log.created_at), "dd.MM.yy HH:mm") : "—"}</p>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
