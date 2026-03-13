import { useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Clock, Plus, Pencil, Trash2, CheckCircle2, Calendar } from "lucide-react";

const DAY_NAMES = ["Du", "Se", "Cho", "Pa", "Ju", "Sha", "Ya"];
const DAY_FULL = ["Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba", "Yakshanba"];

const COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"
];

interface Shift {
  id: number;
  name: string;
  start_time: string;
  end_time: string;
  days: string;
  is_default: boolean;
  color: string;
}

const emptyForm = { name: "", startTime: "09:00", endTime: "18:00", days: "1,2,3,4,5", isDefault: false, color: "#3b82f6" };

export default function ShiftsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: shifts = [], isLoading } = useQuery<Shift[]>({
    queryKey: ["/api/shifts"],
    queryFn: async () => { const r = await apiClient.get("/api/shifts"); return Array.isArray(r) ? r : []; },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (editId) return apiClient.put(`/api/shifts/${editId}`, form);
      return apiClient.post("/api/shifts", form);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/shifts"] });
      setShowForm(false);
      setEditId(null);
      setForm(emptyForm);
      toast({ title: editId ? "Smena yangilandi" : "Smena qo'shildi" });
    },
    onError: () => toast({ title: "Xatolik", variant: "destructive" }),
  });

  const del = useMutation({
    mutationFn: (id: number) => apiClient.delete(`/api/shifts/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/shifts"] }); toast({ title: "O'chirildi" }); },
  });

  function openEdit(s: Shift) {
    setEditId(s.id);
    setForm({ name: s.name, startTime: s.start_time, endTime: s.end_time, days: s.days, isDefault: s.is_default, color: s.color || "#3b82f6" });
    setShowForm(true);
  }

  function toggleDay(dayNum: number) {
    const days = form.days.split(",").filter(Boolean).map(Number);
    const next = days.includes(dayNum) ? days.filter(d => d !== dayNum) : [...days, dayNum].sort();
    setForm(f => ({ ...f, days: next.join(",") }));
  }

  const selectedDays = form.days.split(",").filter(Boolean).map(Number);

  function calcDuration(start: string, end: string) {
    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);
    const mins = (eh * 60 + em) - (sh * 60 + sm);
    if (mins <= 0) return "";
    return `${Math.floor(mins / 60)}s ${mins % 60 > 0 ? (mins % 60) + "d" : ""}`.trim();
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Smena jadvali</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Ish smenalarini boshqarish</p>
          </div>
          <Button onClick={() => { setShowForm(true); setEditId(null); setForm(emptyForm); }} className="gap-2">
            <Plus className="w-4 h-4" /> Smena qo'shish
          </Button>
        </div>

        {showForm && (
          <div className="bg-white border border-border rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-display font-bold mb-4">{editId ? "Smenani tahrirlash" : "Yangi smena"}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label>Smena nomi</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ertalabki smena" className="mt-1" />
              </div>
              <div>
                <Label>Boshlanish vaqti</Label>
                <Input type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label>Tugash vaqti</Label>
                <Input type="time" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} className="mt-1" />
              </div>
              <div className="md:col-span-2">
                <Label>Ish kunlari</Label>
                <div className="flex gap-2 mt-2">
                  {DAY_NAMES.map((d, i) => (
                    <button
                      key={i}
                      onClick={() => toggleDay(i + 1)}
                      className={`w-10 h-10 rounded-full text-xs font-bold transition-all ${selectedDays.includes(i + 1) ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label>Rang</Label>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {COLORS.map(c => (
                    <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                      className={`w-7 h-7 rounded-full transition-all ${form.color === c ? "ring-2 ring-offset-2 ring-foreground scale-110" : ""}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.isDefault} onChange={e => setForm(f => ({ ...f, isDefault: e.target.checked }))} className="w-4 h-4" />
                  <span className="text-sm font-medium">Asosiy smena</span>
                </label>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <Button onClick={() => save.mutate()} disabled={!form.name || save.isPending}>
                {save.isPending ? "Saqlanmoqda..." : editId ? "Yangilash" : "Saqlash"}
              </Button>
              <Button variant="outline" onClick={() => { setShowForm(false); setEditId(null); setForm(emptyForm); }}>Bekor qilish</Button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Yuklanmoqda...</div>
        ) : shifts.length === 0 ? (
          <div className="text-center py-16 bg-white border border-border rounded-xl">
            <Calendar className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">Hali smena qo'shilmagan</p>
            <p className="text-sm text-muted-foreground/60 mt-1">Yangi smena qo'shish uchun yuqoridagi tugmani bosing</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {shifts.map(s => {
              const days = s.days.split(",").filter(Boolean).map(Number);
              const duration = calcDuration(s.start_time, s.end_time);
              return (
                <div key={s.id} className="bg-white border border-border rounded-xl p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: s.color || "#3b82f6" }} />
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-display font-bold text-foreground">{s.name}</h3>
                          {s.is_default && (
                            <span className="text-[10px] bg-green-100 text-green-700 rounded-full px-2 py-0.5 font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-2.5 h-2.5" /> Asosiy
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">{s.start_time} – {s.end_time}</span>
                          {duration && <span className="text-xs text-muted-foreground/60">({duration})</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="w-8 h-8" onClick={() => openEdit(s)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="w-8 h-8 text-destructive hover:text-destructive" onClick={() => del.mutate(s.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex gap-1.5 mt-3">
                    {[1,2,3,4,5,6,7].map((d, i) => (
                      <div key={d} className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold ${days.includes(d) ? "text-white" : "bg-muted text-muted-foreground/40"}`}
                        style={days.includes(d) ? { backgroundColor: s.color || "#3b82f6" } : {}}>
                        {DAY_NAMES[i]}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
