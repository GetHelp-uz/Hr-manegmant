import { useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { useAppStore } from "@/store/use-store";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, ShoppingCart, TrendingUp, Building2, User, BarChart3, Brain } from "lucide-react";
import { Link } from "wouter";

const fmt = (n: number) => new Intl.NumberFormat("uz-UZ").format(Math.round(n));

export default function Sales() {
  const { language } = useAppStore();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const { data: kpi, isLoading: kpiLoading } = useQuery({
    queryKey: ["/api/sales/kpi", month, year],
    queryFn: () => apiClient.get(`/api/sales/kpi?month=${month}&year=${year}`) as Promise<any>,
  });

  const { data: sales = [], isLoading } = useQuery({
    queryKey: ["/api/sales", month, year],
    queryFn: async () => {
      const from = `${year}-${String(month).padStart(2, "0")}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const to = `${year}-${String(month).padStart(2, "0")}-${lastDay}`;
      return apiClient.get(`/api/sales?from=${from}&to=${to}&limit=200`) as Promise<any[]>;
    },
  });

  const { data: branches = [] } = useQuery({ queryKey: ["/api/branches"], queryFn: () => apiClient.get("/api/branches") as Promise<any[]> });
  const { data: employees = [] } = useQuery({ queryKey: ["/api/employees"], queryFn: async () => { const r: any = await apiClient.get("/api/employees"); return Array.isArray(r) ? r : r?.data ?? []; } });

  const [isOpen, setIsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ branch_id: "", employee_id: "", amount: "", items: "", source: "manual", notes: "" });

  const handleSave = async () => {
    if (!form.amount) { toast({ title: "Summa kiriting", variant: "destructive" }); return; }
    setSaving(true);
    try {
      await apiClient.post("/api/sales/import", { ...form, amount: parseFloat(form.amount), items: form.items ? parseInt(form.items) : 0 });
      toast({ title: "Sotuv kiritildi" });
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sales/kpi"] });
      setIsOpen(false);
      setForm({ branch_id: "", employee_id: "", amount: "", items: "", source: "manual", notes: "" });
    } catch { toast({ title: "Xatolik", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const months = ["Yanvar","Fevral","Mart","Aprel","May","Iyun","Iyul","Avgust","Sentabr","Oktabr","Noyabr","Dekabr"];

  return (
    <AppLayout>
      <div className="p-6 space-y-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-display font-bold flex items-center gap-2">
              <ShoppingCart className="w-6 h-6 text-emerald-500" />
              Sotuvlar (POS)
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Kassadan tushgan sotuv ma'lumotlari va tahlil</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={String(month)} onValueChange={v => setMonth(parseInt(v))}>
              <SelectTrigger className="w-36 rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>{months.map((m, i) => <SelectItem key={i+1} value={String(i+1)}>{m}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={String(year)} onValueChange={v => setYear(parseInt(v))}>
              <SelectTrigger className="w-24 rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>{[2024,2025,2026].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
            </Select>
            <Link href="/sales/forecast">
              <Button variant="outline" className="gap-2 rounded-xl">
                <Brain className="w-4 h-4 text-violet-500" /> AI Bashorat
              </Button>
            </Link>
            <Button onClick={() => setIsOpen(true)} className="gap-2 rounded-xl">
              <Plus className="w-4 h-4" /> Sotuv qo'shish
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: "Jami daromad",
              value: kpi ? `${fmt(kpi.totalRevenue)} so'm` : "—",
              sub: `${kpi?.totalTransactions || 0} tranzaksiya`,
              icon: TrendingUp, color: "text-emerald-500", bg: "bg-emerald-50",
            },
            {
              label: "Xodim boshiga daromad",
              value: kpi ? `${fmt(kpi.revenuePerEmployee)} so'm` : "—",
              sub: "Avg / xodim",
              icon: User, color: "text-blue-500", bg: "bg-blue-50",
            },
            {
              label: "Filiallar soni",
              value: kpi?.byBranch?.length || 0,
              sub: "Faol filiallar",
              icon: Building2, color: "text-purple-500", bg: "bg-purple-50",
            },
            {
              label: "Eng yaxshi xodim",
              value: kpi?.byEmployee?.[0]?.employeeName || "—",
              sub: kpi?.byEmployee?.[0] ? `${fmt(parseFloat(kpi.byEmployee[0].total))} so'm` : "Ma'lumot yo'q",
              icon: BarChart3, color: "text-orange-500", bg: "bg-orange-50",
            },
          ].map((card, i) => (
            <div key={i} className="bg-card border rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground font-medium">{card.label}</p>
                <div className={`w-8 h-8 rounded-lg ${card.bg} flex items-center justify-center`}>
                  <card.icon className={`w-4 h-4 ${card.color}`} />
                </div>
              </div>
              <p className="text-lg font-bold">{kpiLoading ? "..." : String(card.value)}</p>
              <p className="text-xs text-muted-foreground">{kpiLoading ? "" : card.sub}</p>
            </div>
          ))}
        </div>

        {/* By Branch */}
        {kpi?.byBranch?.length > 0 && (
          <div className="bg-card border rounded-2xl p-5">
            <h2 className="font-semibold mb-4 flex items-center gap-2"><Building2 className="w-4 h-4" /> Filiallar bo'yicha sotuv</h2>
            <div className="space-y-3">
              {kpi.byBranch.map((b: any) => {
                const pct = kpi.totalRevenue > 0 ? (parseFloat(b.total) / kpi.totalRevenue * 100) : 0;
                return (
                  <div key={b.branchId || "null"} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{b.branchName}</span>
                      <span className="text-muted-foreground">{fmt(parseFloat(b.total))} so'm · {b.count} trz</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* By Employee */}
        {kpi?.byEmployee?.length > 0 && (
          <div className="bg-card border rounded-2xl p-5">
            <h2 className="font-semibold mb-4 flex items-center gap-2"><User className="w-4 h-4" /> Xodimlar bo'yicha sotuv</h2>
            <div className="space-y-2">
              {kpi.byEmployee.slice(0, 10).map((e: any, i: number) => (
                <div key={e.employeeId} className="flex items-center gap-3 py-1.5">
                  <span className={`text-xs font-bold w-5 text-center ${i === 0 ? "text-yellow-500" : i === 1 ? "text-gray-400" : i === 2 ? "text-orange-400" : "text-muted-foreground"}`}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{e.employeeName}</p>
                    <p className="text-xs text-muted-foreground">{e.position} · {e.count} tranzaksiya</p>
                  </div>
                  <span className="text-sm font-semibold text-emerald-600">{fmt(parseFloat(e.total))} so'm</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Sales */}
        <div className="bg-card border rounded-2xl p-5">
          <h2 className="font-semibold mb-4 flex items-center gap-2"><ShoppingCart className="w-4 h-4" /> So'nggi sotuvlar</h2>
          {isLoading ? (
            <div className="space-y-2">{[1,2,3,4].map(i => <div key={i} className="h-10 bg-muted rounded-lg animate-pulse" />)}</div>
          ) : (sales as any[]).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Bu oyda sotuv ma'lumoti yo'q</p>
          ) : (
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {(sales as any[]).map((s: any) => (
                <div key={s.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-muted/50 text-sm">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-xs">{s.source || "manual"}</Badge>
                    <span className="text-muted-foreground">{new Date(s.saleTime).toLocaleDateString("uz-UZ")}</span>
                    {s.itemsCount > 0 && <span className="text-muted-foreground">{s.itemsCount} dona</span>}
                  </div>
                  <span className="font-semibold text-emerald-600">{fmt(parseFloat(s.amount))} so'm</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Sotuv qo'shish</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Summa (so'm) *</Label>
              <Input type="number" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} className="rounded-xl text-lg font-semibold" placeholder="85000" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tovarlar soni</Label>
                <Input type="number" value={form.items} onChange={e => setForm(p => ({ ...p, items: e.target.value }))} className="rounded-xl" placeholder="3" />
              </div>
              <div className="space-y-1.5">
                <Label>Manba</Label>
                <Select value={form.source} onValueChange={v => setForm(p => ({ ...p, source: v }))}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Qo'lda</SelectItem>
                    <SelectItem value="pos">POS kassa</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="telegram">Telegram</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {(branches as any[]).length > 0 && (
              <div className="space-y-1.5">
                <Label>Filial</Label>
                <Select value={form.branch_id} onValueChange={v => setForm(p => ({ ...p, branch_id: v }))}>
                  <SelectTrigger className="rounded-xl"><SelectValue placeholder="Filial tanlang" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Belgilanmagan</SelectItem>
                    {(branches as any[]).map((b: any) => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {(employees as any[]).length > 0 && (
              <div className="space-y-1.5">
                <Label>Xodim</Label>
                <Select value={form.employee_id} onValueChange={v => setForm(p => ({ ...p, employee_id: v }))}>
                  <SelectTrigger className="rounded-xl"><SelectValue placeholder="Xodim tanlang (ixtiyoriy)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Belgilanmagan</SelectItem>
                    {(employees as any[]).map((e: any) => <SelectItem key={e.id} value={String(e.id)}>{e.fullName}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Izoh</Label>
              <Input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} className="rounded-xl" placeholder="Ixtiyoriy..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)} className="rounded-xl">Bekor</Button>
            <Button onClick={handleSave} disabled={saving || !form.amount} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white">
              {saving ? "Saqlanmoqda..." : "Kiritish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
