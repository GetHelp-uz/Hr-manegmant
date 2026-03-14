import { useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { useAppStore } from "@/store/use-store";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, CalendarDays, Trash2, Clock, User } from "lucide-react";

const DAYS = [
  { id: 1, short: "Du", name: "Dushanba" },
  { id: 2, short: "Se", name: "Seshanba" },
  { id: 3, short: "Ch", name: "Chorshanba" },
  { id: 4, short: "Pa", name: "Payshanba" },
  { id: 5, short: "Ju", name: "Juma" },
  { id: 6, short: "Sh", name: "Shanba" },
  { id: 0, short: "Ya", name: "Yakshanba" },
];

const DAY_COLORS: Record<number, string> = {
  1: "bg-blue-100 text-blue-700",
  2: "bg-purple-100 text-purple-700",
  3: "bg-green-100 text-green-700",
  4: "bg-orange-100 text-orange-700",
  5: "bg-red-100 text-red-700",
  6: "bg-yellow-100 text-yellow-700",
  0: "bg-gray-100 text-gray-500",
};

export default function Schedules() {
  const { language } = useAppStore();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ["/api/schedules"],
    queryFn: () => apiClient.get("/api/schedules") as Promise<any[]>,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["/api/employees"],
    queryFn: async () => { const r: any = await apiClient.get("/api/employees"); return Array.isArray(r) ? r : r?.data ?? []; },
  });

  const { data: branches = [] } = useQuery({
    queryKey: ["/api/branches"],
    queryFn: () => apiClient.get("/api/branches") as Promise<any[]>,
  });

  const [isOpen, setIsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    employeeId: "",
    branchId: "",
    days: [] as number[],
    shiftStart: "09:00",
    shiftEnd: "18:00",
  });

  const toggleDay = (d: number) => {
    setForm(p => ({ ...p, days: p.days.includes(d) ? p.days.filter(x => x !== d) : [...p.days, d] }));
  };

  const handleSave = async () => {
    if (!form.employeeId || !form.days.length || !form.shiftStart || !form.shiftEnd) {
      toast({ title: "Xodim va kunlarni tanlang", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await apiClient.post("/api/schedules/bulk", {
        employeeId: parseInt(form.employeeId),
        branchId: form.branchId ? parseInt(form.branchId) : null,
        days: form.days,
        shiftStart: form.shiftStart,
        shiftEnd: form.shiftEnd,
      });
      toast({ title: "Jadval saqlandi" });
      queryClient.invalidateQueries({ queryKey: ["/api/schedules"] });
      setIsOpen(false);
      setForm({ employeeId: "", branchId: "", days: [], shiftStart: "09:00", shiftEnd: "18:00" });
    } catch {
      toast({ title: "Xatolik yuz berdi", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("O'chirishni tasdiqlaysizmi?")) return;
    await apiClient.delete(`/api/schedules/${id}`);
    queryClient.invalidateQueries({ queryKey: ["/api/schedules"] });
    toast({ title: "O'chirildi" });
  };

  const grouped = (schedules as any[]).reduce((acc: any, s: any) => {
    const key = s.employeeId;
    if (!acc[key]) acc[key] = { employee: s.employee, items: [] };
    acc[key].items.push(s);
    return acc;
  }, {});

  return (
    <AppLayout>
      <div className="p-6 space-y-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold flex items-center gap-2">
              <CalendarDays className="w-6 h-6 text-green-500" />
              Ish Jadvali
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Xodimlarning haftalik ish jadvali</p>
          </div>
          <Button onClick={() => setIsOpen(true)} className="gap-2 rounded-xl">
            <Plus className="w-4 h-4" /> Jadval qo'shish
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-20 rounded-2xl bg-muted animate-pulse" />)}
          </div>
        ) : Object.keys(grouped).length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium">Jadval belgilanmagan</p>
            <p className="text-sm mt-1">Xodimlarga ish jadvalini belgilang</p>
            <Button onClick={() => setIsOpen(true)} className="mt-4 gap-2 rounded-xl">
              <Plus className="w-4 h-4" /> Jadval qo'shish
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {Object.values(grouped).map((g: any) => (
              <div key={g.employee?.id} className="bg-card border rounded-2xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <User className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{g.employee?.fullName}</p>
                    <p className="text-xs text-muted-foreground">{g.employee?.position}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {g.items.map((s: any) => (
                    <div key={s.id} className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-medium ${DAY_COLORS[s.dayOfWeek]}`}>
                      <span>{DAYS.find(d => d.id === s.dayOfWeek)?.name || "?"}</span>
                      <span className="flex items-center gap-0.5 opacity-75">
                        <Clock className="w-3 h-3" />
                        {s.shiftStart?.slice(0,5)} – {s.shiftEnd?.slice(0,5)}
                      </span>
                      {s.branch && <span className="opacity-60">· {s.branch.name}</span>}
                      <button onClick={() => handleDelete(s.id)} className="ml-1 opacity-50 hover:opacity-100">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Ish jadvali qo'shish</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Xodim *</Label>
              <Select value={form.employeeId} onValueChange={v => setForm(p => ({ ...p, employeeId: v }))}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Xodimni tanlang" /></SelectTrigger>
                <SelectContent>
                  {(employees as any[]).map((e: any) => (
                    <SelectItem key={e.id} value={String(e.id)}>{e.fullName} — {e.position}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {(branches as any[]).length > 0 && (
              <div className="space-y-1.5">
                <Label>Filial</Label>
                <Select value={form.branchId} onValueChange={v => setForm(p => ({ ...p, branchId: v }))}>
                  <SelectTrigger className="rounded-xl"><SelectValue placeholder="Filial tanlang (ixtiyoriy)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Belgilanmagan</SelectItem>
                    {(branches as any[]).map((b: any) => (
                      <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Ish kunlari *</Label>
              <div className="flex flex-wrap gap-2">
                {DAYS.map(d => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => toggleDay(d.id)}
                    className={`w-10 h-10 rounded-full text-sm font-medium transition-all ${form.days.includes(d.id) ? "bg-blue-500 text-white shadow-md" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                  >
                    {d.short}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {form.days.length > 0 ? `${form.days.length} kun tanlandi` : "Kunlarni tanlang"}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Boshlanish</Label>
                <Input type="time" value={form.shiftStart} onChange={e => setForm(p => ({ ...p, shiftStart: e.target.value }))} className="rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Tugash</Label>
                <Input type="time" value={form.shiftEnd} onChange={e => setForm(p => ({ ...p, shiftEnd: e.target.value }))} className="rounded-xl" />
              </div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
              ⚠️ Yangi jadval qo'shilganda, tanlangan xodimning barcha oldingi jadvali o'chirib almashtiriladi.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)} className="rounded-xl">Bekor</Button>
            <Button onClick={handleSave} disabled={saving} className="rounded-xl">
              {saving ? "Saqlanmoqda..." : "Saqlash"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
