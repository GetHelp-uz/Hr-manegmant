import { useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { useAppStore } from "@/store/use-store";
import { useTranslation } from "@/lib/i18n";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, MapPin, Phone, Users, Pencil, Trash2, Building2, Clock } from "lucide-react";

export default function Branches() {
  const { language } = useAppStore();
  const t = useTranslation(language);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: branches = [], isLoading } = useQuery({
    queryKey: ["/api/branches"],
    queryFn: () => apiClient.get("/api/branches") as Promise<any[]>,
  });

  const { data: shifts = [] } = useQuery({
    queryKey: ["/api/shifts"],
    queryFn: () => apiClient.get("/api/shifts") as Promise<any[]>,
  });

  const [isOpen, setIsOpen] = useState(false);
  const [editBranch, setEditBranch] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "", address: "", phone: "",
    timezone: "Asia/Tashkent", notes: "", shiftId: "",
  });

  const openAdd = () => {
    setEditBranch(null);
    setForm({ name: "", address: "", phone: "", timezone: "Asia/Tashkent", notes: "", shiftId: "" });
    setIsOpen(true);
  };
  const openEdit = (b: any) => {
    setEditBranch(b);
    setForm({
      name: b.name, address: b.address || "", phone: b.phone || "",
      timezone: b.timezone || "Asia/Tashkent", notes: b.notes || "",
      shiftId: b.shift_id ? String(b.shift_id) : "",
    });
    setIsOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name, address: form.address, phone: form.phone,
        timezone: form.timezone, notes: form.notes,
        shiftId: form.shiftId ? parseInt(form.shiftId) : null,
      };
      if (editBranch) {
        await apiClient.put(`/api/branches/${editBranch.id}`, payload);
        toast({ title: "Filial yangilandi" });
      } else {
        await apiClient.post("/api/branches", payload);
        toast({ title: "Filial qo'shildi" });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/branches"] });
      setIsOpen(false);
    } catch {
      toast({ title: "Xatolik", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Filialni o'chirishni tasdiqlaysizmi?")) return;
    try {
      await apiClient.delete(`/api/branches/${id}`);
      queryClient.invalidateQueries({ queryKey: ["/api/branches"] });
      toast({ title: "Filial o'chirildi" });
    } catch {
      toast({ title: "Xatolik", variant: "destructive" });
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold flex items-center gap-2">
              <Building2 className="w-6 h-6 text-blue-500" />
              Filiallar
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Kompaniya filiallari va ofislari</p>
          </div>
          <Button onClick={openAdd} className="gap-2 rounded-xl">
            <Plus className="w-4 h-4" /> Filial qo'shish
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3].map(i => <div key={i} className="h-44 rounded-2xl bg-muted animate-pulse" />)}
          </div>
        ) : (branches as any[]).length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium">Hali filial yo'q</p>
            <p className="text-sm mt-1">Birinchi filialni qo'shing</p>
            <Button onClick={openAdd} className="mt-4 gap-2 rounded-xl">
              <Plus className="w-4 h-4" /> Filial qo'shish
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(branches as any[]).map((b: any) => (
              <div key={b.id} className="bg-white rounded-2xl border border-border p-5 shadow-sm hover:shadow-md transition-all group">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-blue-500" />
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      className="w-8 h-8 rounded-lg border border-border hover:bg-muted flex items-center justify-center transition-colors"
                      onClick={() => openEdit(b)}
                    >
                      <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                    <button
                      className="w-8 h-8 rounded-lg border border-border hover:bg-red-50 hover:border-red-200 flex items-center justify-center transition-colors"
                      onClick={() => handleDelete(b.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                  </div>
                </div>

                <h3 className="font-display font-bold text-[15px] text-foreground">{b.name}</h3>

                <div className="mt-3 space-y-1.5 text-[12px] text-muted-foreground">
                  {b.address && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{b.address}</span>
                    </div>
                  )}
                  {b.phone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 shrink-0" />
                      <span>{b.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 shrink-0" />
                    <span><b className="text-foreground">{b.employee_count || b.employeeCount || 0}</b> xodim</span>
                  </div>
                </div>

                {/* Smena ko'rsatgichi */}
                <div className="mt-3 pt-3 border-t border-border/60">
                  {b.shiftInfo ? (
                    <div
                      className="flex items-center gap-2 cursor-pointer hover:opacity-80"
                      onClick={() => openEdit(b)}
                    >
                      <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: b.shiftInfo.color || "#3b82f6" }}
                      />
                      <span className="text-[12px] font-semibold text-foreground">{b.shiftInfo.name}</span>
                      <span className="text-[11px] text-muted-foreground ml-auto font-mono">
                        {b.shiftInfo.startTime?.slice(0,5)}–{b.shiftInfo.endTime?.slice(0,5)}
                      </span>
                    </div>
                  ) : (
                    <button
                      onClick={() => openEdit(b)}
                      className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-primary transition-colors"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      Smena belgilanmagan — belgilash
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editBranch ? "Filialni tahrirlash" : "Yangi filial"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Filial nomi *</Label>
              <Input
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                className="rounded-xl" placeholder="Asosiy ofis, Toshkent filiali..."
              />
            </div>
            <div className="space-y-1.5">
              <Label>Manzil</Label>
              <Input
                value={form.address}
                onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
                className="rounded-xl" placeholder="Toshkent sh., Chilonzor t., 1-uy"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Telefon</Label>
              <Input
                value={form.phone}
                onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                className="rounded-xl" placeholder="+998712345678"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Vaqt zonasi</Label>
              <Input
                value={form.timezone}
                onChange={e => setForm(p => ({ ...p, timezone: e.target.value }))}
                className="rounded-xl" placeholder="Asia/Tashkent"
              />
            </div>

            {/* ===== SMENA ===== */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-primary" />
                Ish smenasi
              </Label>
              <Select
                value={form.shiftId || "__none__"}
                onValueChange={v => setForm(p => ({ ...p, shiftId: v === "__none__" ? "" : v }))}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Smena tanlang..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Smena belgilanmagan</SelectItem>
                  {(shifts as any[]).map((s: any) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.name}  ({s.start_time?.slice(0,5)}–{s.end_time?.slice(0,5)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(shifts as any[]).length === 0 && (
                <p className="text-[11px] text-amber-600">
                  ⚠ Hali smena yaratilmagan. "Ish Smenalari" bo'limiga o'ting.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Izoh</Label>
              <Input
                value={form.notes}
                onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                className="rounded-xl" placeholder="Ixtiyoriy..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)} className="rounded-xl">Bekor</Button>
            <Button onClick={handleSave} disabled={saving || !form.name.trim()} className="rounded-xl">
              {saving ? "Saqlanmoqda..." : "Saqlash"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
