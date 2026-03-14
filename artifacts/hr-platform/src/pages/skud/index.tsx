import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { useAppStore } from "@/store/use-store";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import {
  ShieldCheck, Plus, Pencil, Trash2, RefreshCw, KeyRound,
  DoorOpen, DoorClosed, Wifi, WifiOff, Users, XCircle,
  CheckCircle2, CreditCard, Smartphone, Copy, Clock, MapPin,
  ArrowUp, ArrowDown, Search, Nfc
} from "lucide-react";

const fmt = (d: string) => {
  const date = new Date(d);
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 60) return `${diff}s oldin`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m oldin`;
  return date.toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" });
};

export default function Skud() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [activeTab, setActiveTab] = useState<"events" | "devices" | "nfc">("events");
  const [deviceDialog, setDeviceDialog] = useState(false);
  const [editDevice, setEditDevice] = useState<any>(null);
  const [deviceForm, setDeviceForm] = useState({ name: "", location: "", ipAddress: "", deviceType: "entry" });
  const [saving, setSaving] = useState(false);
  const [nfcSearch, setNfcSearch] = useState("");
  const [nfcModal, setNfcModal] = useState<any>(null);
  const [nfcCardValue, setNfcCardValue] = useState("");
  const [nfcSaving, setNfcSaving] = useState(false);
  const [tokenModal, setTokenModal] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  // ── Data fetching ──
  const { data: stats } = useQuery({
    queryKey: ["/api/skud/stats"],
    queryFn: () => apiClient.get("/api/skud/stats") as Promise<any>,
    refetchInterval: autoRefresh ? 5000 : false,
  });

  const { data: events = [], isLoading: eventsLoading } = useQuery({
    queryKey: ["/api/skud/events"],
    queryFn: () => apiClient.get("/api/skud/events?limit=60") as Promise<any[]>,
    refetchInterval: autoRefresh ? 5000 : false,
  });

  const { data: devices = [], isLoading: devicesLoading } = useQuery({
    queryKey: ["/api/skud/devices"],
    queryFn: () => apiClient.get("/api/skud/devices") as Promise<any[]>,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["/api/employees/all-for-nfc"],
    queryFn: async () => {
      const r: any = await apiClient.get("/api/employees?limit=500");
      return (r?.data || r || []) as any[];
    },
  });

  const filteredEmployees = (employees as any[]).filter(e =>
    !nfcSearch || e.fullName?.toLowerCase().includes(nfcSearch.toLowerCase()) ||
    e.position?.toLowerCase().includes(nfcSearch.toLowerCase())
  );

  // ── Device CRUD ──
  const openAddDevice = () => {
    setEditDevice(null);
    setDeviceForm({ name: "", location: "", ipAddress: "", deviceType: "entry" });
    setDeviceDialog(true);
  };
  const openEditDevice = (d: any) => {
    setEditDevice(d);
    setDeviceForm({ name: d.name, location: d.location || "", ipAddress: d.ip_address || "", deviceType: d.device_type || "entry" });
    setDeviceDialog(true);
  };

  const saveDevice = async () => {
    if (!deviceForm.name.trim()) return;
    setSaving(true);
    try {
      if (editDevice) {
        await apiClient.put(`/api/skud/devices/${editDevice.id}`, deviceForm);
        toast({ title: "Qurilma yangilandi" });
      } else {
        const created: any = await apiClient.post("/api/skud/devices", deviceForm);
        setTokenModal(created);
        toast({ title: "Qurilma qo'shildi" });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/skud/devices"] });
      setDeviceDialog(false);
    } catch {
      toast({ title: "Xatolik", variant: "destructive" });
    } finally { setSaving(false); }
  };

  const deleteDevice = async (id: number) => {
    if (!confirm("Qurilmani o'chirishni tasdiqlaysizmi?")) return;
    await apiClient.delete(`/api/skud/devices/${id}`);
    queryClient.invalidateQueries({ queryKey: ["/api/skud/devices"] });
    toast({ title: "O'chirildi" });
  };

  const regenToken = async (d: any) => {
    if (!confirm("Tokenni yangilash qurilmani uzib qo'yadi. Davom etasizmi?")) return;
    const updated: any = await apiClient.post(`/api/skud/devices/${d.id}/regen-token`, {});
    setTokenModal(updated);
    queryClient.invalidateQueries({ queryKey: ["/api/skud/devices"] });
    toast({ title: "Token yangilandi" });
  };

  // ── NFC card assign ──
  const openNfc = (emp: any) => {
    setNfcModal(emp);
    setNfcCardValue(emp.nfcCardId || "");
  };

  const saveNfc = async () => {
    if (!nfcModal) return;
    setNfcSaving(true);
    try {
      await apiClient.put(`/api/skud/nfc/${nfcModal.id}`, { nfcCardId: nfcCardValue || null });
      queryClient.invalidateQueries({ queryKey: ["/api/employees/all-for-nfc"] });
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      toast({ title: nfcCardValue ? "NFC karta biriktirildi" : "NFC karta o'chirildi" });
      setNfcModal(null);
    } catch (e: any) {
      const msg = e?.message || "Xatolik";
      toast({ title: msg.includes("card_taken") ? "Bu karta boshqa xodimga biriktirilgan" : "Xatolik", variant: "destructive" });
    } finally { setNfcSaving(false); }
  };

  const copyToken = (token: string) => {
    navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const TABS = [
    { key: "events", label: "Hodisalar", icon: Clock },
    { key: "devices", label: "Qurilmalar", icon: Wifi },
    { key: "nfc", label: "NFC Kartalar", icon: Nfc },
  ] as const;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-primary" />
              СКУД — Kirish Nazorati
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              NFC/RF karta, telefon NFC va avtomatik davomat boshqaruvi
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/skud/nfc-scan">
              <Button variant="outline" className="gap-2 rounded-xl">
                <Smartphone className="w-4 h-4 text-primary" />
                Telefon NFC
              </Button>
            </Link>
            <button
              onClick={() => setAutoRefresh(p => !p)}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors ${
                autoRefresh ? "bg-primary/10 border-primary/30 text-primary" : "border-border text-muted-foreground"
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${autoRefresh ? "animate-spin" : ""}`} />
              {autoRefresh ? "Auto 5s" : "Pause"}
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Bugungi kirish", value: stats?.today_checkins ?? "—", icon: DoorOpen, color: "text-blue-600", bg: "bg-blue-50 border-blue-100" },
            { label: "Jami hodisalar", value: stats?.today_total ?? "—", icon: Clock, color: "text-slate-600", bg: "bg-slate-50 border-slate-100" },
            { label: "Ruxsat berildi", value: stats?.today_granted ?? "—", icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-100" },
            { label: "Rad etildi", value: stats?.today_denied ?? "—", icon: XCircle, color: "text-red-600", bg: "bg-red-50 border-red-100" },
          ].map((s, i) => (
            <div key={i} className={`rounded-2xl border ${s.bg} p-4 flex items-center gap-3`}>
              <div className={`w-10 h-10 rounded-xl bg-white/80 flex items-center justify-center flex-shrink-0`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <div>
                <p className="text-2xl font-display font-bold text-foreground">{s.value}</p>
                <p className="text-[11px] text-muted-foreground">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 bg-muted p-1 rounded-xl w-fit">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.key ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── TAB: EVENTS ── */}
        {activeTab === "events" && (
          <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
              <p className="font-semibold text-sm">So'nggi hodisalar</p>
              <button
                onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/skud/events"] })}
                className="text-xs text-primary flex items-center gap-1 hover:underline"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Yangilash
              </button>
            </div>
            <div className="divide-y divide-border/60 max-h-[520px] overflow-y-auto">
              {eventsLoading ? (
                <div className="py-10 text-center text-muted-foreground text-sm">Yuklanmoqda...</div>
              ) : (events as any[]).length === 0 ? (
                <div className="py-10 text-center text-muted-foreground text-sm">
                  <ShieldCheck className="w-10 h-10 mx-auto mb-2 opacity-20" />
                  Hali hodisa yo'q
                </div>
              ) : (events as any[]).map((ev: any) => (
                <div key={ev.id} className={`flex items-center gap-3 px-5 py-3.5 hover:bg-muted/30 transition-colors ${!ev.access_granted ? "bg-red-50/40" : ""}`}>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    !ev.access_granted ? "bg-red-100 text-red-600" :
                    ev.direction === "out" ? "bg-slate-100 text-slate-600" : "bg-emerald-100 text-emerald-600"
                  }`}>
                    {!ev.access_granted ? <XCircle className="w-4.5 h-4.5" /> :
                     ev.direction === "out" ? <ArrowUp className="w-4 h-4" /> :
                     <ArrowDown className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-foreground truncate">
                      {ev.employee_name || <span className="text-red-500 font-mono text-xs">{ev.card_id}</span>}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] text-muted-foreground">{ev.device_name || "—"}</span>
                      {ev.device_location && (
                        <span className="text-[11px] text-muted-foreground flex items-center gap-0.5">
                          <MapPin className="w-3 h-3" />{ev.device_location}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="flex items-center gap-1.5 justify-end">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                        !ev.access_granted ? "bg-red-100 text-red-700" :
                        ev.direction === "out" ? "bg-slate-100 text-slate-700" : "bg-emerald-100 text-emerald-700"
                      }`}>
                        {!ev.access_granted ? "Rad etildi" : ev.direction === "out" ? "Chiqish" : "Kirish"}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">{fmt(ev.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── TAB: DEVICES ── */}
        {activeTab === "devices" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">СКУД qurilmalarini boshqarish. Har bir qurilma noyob API token oladi.</p>
              <Button onClick={openAddDevice} className="gap-2 rounded-xl">
                <Plus className="w-4 h-4" /> Qurilma qo'shish
              </Button>
            </div>

            {devicesLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1,2].map(i => <div key={i} className="h-36 rounded-2xl bg-muted animate-pulse" />)}
              </div>
            ) : (devices as any[]).length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Wifi className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="text-lg font-medium">Qurilma yo'q</p>
                <p className="text-sm mt-1">СКУД qurilmasini qo'shing</p>
                <Button onClick={openAddDevice} className="mt-4 gap-2 rounded-xl"><Plus className="w-4 h-4" /> Qo'shish</Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(devices as any[]).map((d: any) => (
                  <div key={d.id} className="bg-white rounded-2xl border border-border p-5 shadow-sm">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${d.status === "active" ? "bg-emerald-50 border border-emerald-100" : "bg-slate-100"}`}>
                          {d.device_type === "exit" ? <DoorClosed className="w-4 h-4 text-slate-500" /> : <DoorOpen className="w-4 h-4 text-emerald-600" />}
                        </div>
                        <div>
                          <p className="font-semibold text-[14px] text-foreground">{d.name}</p>
                          <p className="text-[11px] text-muted-foreground">{d.device_type === "exit" ? "Chiqish" : d.device_type === "both" ? "Kirish/Chiqish" : "Kirish"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEditDevice(d)} className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></button>
                        <button onClick={() => regenToken(d)} className="w-7 h-7 rounded-lg hover:bg-amber-50 flex items-center justify-center" title="Tokenni yangilash"><KeyRound className="w-3.5 h-3.5 text-amber-500" /></button>
                        <button onClick={() => deleteDevice(d.id)} className="w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-[12px] text-muted-foreground">
                      {d.location && <p className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{d.location}</p>}
                      {d.ip_address && <p className="flex items-center gap-1.5"><Wifi className="w-3.5 h-3.5" />{d.ip_address}</p>}
                      <p className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />Bugun: <b className="text-foreground">{d.events_today || 0}</b> hodisa</p>
                    </div>

                    <div className="mt-3 pt-3 border-t border-border/60">
                      <p className="text-[10px] font-mono text-muted-foreground mb-1">API Token (maxfiy)</p>
                      <div className="flex items-center gap-2">
                        <code className="text-[11px] bg-muted rounded px-2 py-1 flex-1 truncate text-muted-foreground">
                          {d.api_token?.slice(0,16)}••••••••
                        </code>
                        <button
                          onClick={() => copyToken(d.api_token)}
                          className="flex items-center gap-1 text-[11px] text-primary hover:underline flex-shrink-0"
                        >
                          <Copy className="w-3 h-3" />
                          Nusxalash
                        </button>
                      </div>
                    </div>

                    {d.status !== "active" && (
                      <div className="mt-2 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
                        ⚠ Qurilma nofaol
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* API Integration Help */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
              <p className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-primary" />
                СКУД Qurilmasi integratsiya
              </p>
              <div className="space-y-2 text-[12px] text-muted-foreground font-mono">
                <p className="text-[11px] text-slate-500 font-sans mb-1">Qurilmadan HTTP so'rov:</p>
                <div className="bg-slate-900 text-emerald-400 rounded-xl p-3 space-y-1">
                  <p>POST /api/skud/check</p>
                  <p className="text-slate-400">Header: x-device-token: &lt;token&gt;</p>
                  <p className="text-slate-400">Body: {'{ "cardId": "A4BC1234", "direction": "in" }'}</p>
                </div>
                <p className="text-[11px] font-sans text-muted-foreground mt-2">
                  Javob: <code>{'{ "granted": true, "employee": {...}, "action": "check_in" }'}</code>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB: NFC CARDS ── */}
        {activeTab === "nfc" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Har bir xodimga NFC/RF karta UID biriktiring</p>
              <Link href="/skud/nfc-scan">
                <Button variant="outline" className="gap-2 rounded-xl text-sm">
                  <Smartphone className="w-4 h-4" /> Telefon NFC bilan kirish
                </Button>
              </Link>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={nfcSearch}
                onChange={e => setNfcSearch(e.target.value)}
                placeholder="Xodim nomi yoki lavozim bo'yicha qidirish..."
                className="pl-10 rounded-xl"
              />
            </div>

            <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-muted-foreground text-xs uppercase">
                  <tr>
                    <th className="px-5 py-3 text-left">Xodim</th>
                    <th className="px-5 py-3 text-left">Lavozim</th>
                    <th className="px-5 py-3 text-left">NFC Karta UID</th>
                    <th className="px-5 py-3 text-right">Amal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredEmployees.slice(0, 50).map((emp: any) => (
                    <tr key={emp.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-5 py-3.5 font-semibold text-foreground">{emp.fullName}</td>
                      <td className="px-5 py-3.5 text-muted-foreground text-xs">{emp.position}</td>
                      <td className="px-5 py-3.5">
                        {emp.nfcCardId ? (
                          <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-2.5 py-0.5 text-xs font-mono font-semibold">
                            <CreditCard className="w-3 h-3" />
                            {emp.nfcCardId}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">— biriktirilmagan</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-3 text-xs rounded-lg gap-1.5"
                          onClick={() => openNfc(emp)}
                        >
                          <CreditCard className="w-3 h-3" />
                          {emp.nfcCardId ? "O'zgartirish" : "Biriktirish"}
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {filteredEmployees.length === 0 && (
                    <tr><td colSpan={4} className="px-5 py-8 text-center text-muted-foreground">Xodim topilmadi</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── Device Add/Edit Dialog ── */}
      <Dialog open={deviceDialog} onOpenChange={setDeviceDialog}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editDevice ? "Qurilmani tahrirlash" : "Yangi СКУД qurilmasi"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Qurilma nomi *</Label>
              <Input value={deviceForm.name} onChange={e => setDeviceForm(p => ({ ...p, name: e.target.value }))} className="rounded-xl" placeholder="Asosiy eshik, 1-qavat kirish..." />
            </div>
            <div className="space-y-1.5">
              <Label>Joylashuv</Label>
              <Input value={deviceForm.location} onChange={e => setDeviceForm(p => ({ ...p, location: e.target.value }))} className="rounded-xl" placeholder="1-qavat, ofis kirishi..." />
            </div>
            <div className="space-y-1.5">
              <Label>IP manzil</Label>
              <Input value={deviceForm.ipAddress} onChange={e => setDeviceForm(p => ({ ...p, ipAddress: e.target.value }))} className="rounded-xl" placeholder="192.168.1.100" />
            </div>
            <div className="space-y-1.5">
              <Label>Tur</Label>
              <Select value={deviceForm.deviceType} onValueChange={v => setDeviceForm(p => ({ ...p, deviceType: v }))}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="entry">Kirish</SelectItem>
                  <SelectItem value="exit">Chiqish</SelectItem>
                  <SelectItem value="both">Kirish / Chiqish</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {!editDevice && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-[12px] text-blue-700">
                ℹ️ Qurilma qo'shilgandan so'ng avtomatik API token yaratiladi. Uni СКУД qurilmasiga kiriting.
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeviceDialog(false)} className="rounded-xl">Bekor</Button>
            <Button onClick={saveDevice} disabled={saving || !deviceForm.name.trim()} className="rounded-xl">
              {saving ? "Saqlanmoqda..." : "Saqlash"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Token Show Dialog ── */}
      <Dialog open={!!tokenModal} onOpenChange={v => { if (!v) setTokenModal(null); }}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-700">
              <KeyRound className="w-5 h-5" /> API Token tayyor
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Bu tokenni СКУД qurilmasiga kiriting. Xavfsiz saqlang — keyinchalik to'liq ko'rsatilmaydi.
            </p>
            <div className="bg-muted rounded-xl p-3 font-mono text-[12px] break-all text-foreground">
              {tokenModal?.api_token}
            </div>
            <Button
              variant="outline"
              className="w-full rounded-xl gap-2"
              onClick={() => copyToken(tokenModal?.api_token)}
            >
              <Copy className="w-4 h-4" />
              {copied ? "Nusxalandi ✓" : "Nusxalash"}
            </Button>
            <div className="bg-slate-900 text-emerald-400 rounded-xl p-3 font-mono text-[11px] space-y-1">
              <p className="text-slate-400"># СКУД qurilma sozlamasi:</p>
              <p>API_URL=https://your-domain/api/skud/check</p>
              <p>API_TOKEN={tokenModal?.api_token?.slice(0,8)}...</p>
              <p className="text-slate-400"># So'rov: POST, Header: x-device-token</p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setTokenModal(null)} className="rounded-xl w-full">Yopish</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── NFC Card Assign Dialog ── */}
      <Dialog open={!!nfcModal} onOpenChange={v => { if (!v) setNfcModal(null); }}>
        <DialogContent className="sm:max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-primary" />
              NFC Karta biriktirish
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              <b className="text-foreground">{nfcModal?.fullName}</b> uchun NFC/RF karta UID kiriting:
            </p>
            <div className="space-y-1.5">
              <Label>Karta UID</Label>
              <Input
                value={nfcCardValue}
                onChange={e => setNfcCardValue(e.target.value.toUpperCase())}
                className="rounded-xl font-mono"
                placeholder="A4BC1234 yoki A4:BC:12:34"
              />
              <p className="text-[11px] text-muted-foreground">
                Kartani СКУД kartrideri yoniga qo'yib UID oling, yoki kartada yozilgan bo'lsa kiriting.
              </p>
            </div>
            {nfcCardValue && (
              <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
                <CreditCard className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span className="text-[12px] font-mono text-emerald-700 font-semibold">{nfcCardValue}</span>
              </div>
            )}
            {!nfcCardValue && nfcModal?.nfcCardId && (
              <button
                onClick={() => setNfcCardValue("")}
                className="text-[12px] text-red-500 hover:underline"
              >
                Kartani o'chirish
              </button>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNfcModal(null)} className="rounded-xl">Bekor</Button>
            <Button onClick={saveNfc} disabled={nfcSaving} className="rounded-xl">
              {nfcSaving ? "Saqlanmoqda..." : nfcCardValue ? "Biriktirish" : "O'chirish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
