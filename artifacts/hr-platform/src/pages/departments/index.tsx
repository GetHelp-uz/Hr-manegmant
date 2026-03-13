import { useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { useAppStore } from "@/store/use-store";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Building2, Plus, Trash2, Edit, Users, Wallet, ChevronRight, Zap } from "lucide-react";
import { apiClient } from "@/lib/api-client";

async function fetchDepts() {
  const r = await apiClient.get("/api/departments");
  return r.data as any[];
}
async function createDept(data: any) {
  const r = await apiClient.post("/api/departments", data);
  return r.data;
}
async function updateDept(id: number, data: any) {
  const r = await apiClient.put(`/api/departments/${id}`, data);
  return r.data;
}
async function deleteDept(id: number) {
  await apiClient.delete(`/api/departments/${id}`);
}
async function applySalary(id: number) {
  const r = await apiClient.post(`/api/departments/${id}/apply-salary`);
  return r.data;
}

const emptyForm = { name: "", description: "", baseSalaryType: "monthly", baseMonthlySalary: "", baseHourlyRate: "" };

export default function Departments() {
  const { language } = useAppStore();
  const qc = useQueryClient();
  const { toast } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [applyId, setApplyId] = useState<number | null>(null);

  const { data: departments = [], isLoading } = useQuery({ queryKey: ["/api/departments"], queryFn: fetchDepts });

  const createM = useMutation({
    mutationFn: createDept,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/departments"] }); setIsOpen(false); toast({ title: "Bo'lim yaratildi" }); },
    onError: () => toast({ variant: "destructive", title: "Xatolik" }),
  });
  const updateM = useMutation({
    mutationFn: ({ id, data }: any) => updateDept(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/departments"] }); setIsOpen(false); setEditing(null); toast({ title: "Bo'lim yangilandi" }); },
  });
  const deleteM = useMutation({
    mutationFn: deleteDept,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/departments"] }); toast({ title: "Bo'lim o'chirildi" }); },
  });
  const applyM = useMutation({
    mutationFn: applySalary,
    onSuccess: (data) => { qc.invalidateQueries({ queryKey: ["/api/employees"] }); setApplyId(null); toast({ title: `${data.updated} xodimga maosh qo'llanildi` }); },
    onError: () => toast({ variant: "destructive", title: "Xatolik yuz berdi" }),
  });

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm });
    setIsOpen(true);
  }
  function openEdit(dept: any) {
    setEditing(dept);
    setForm({
      name: dept.name,
      description: dept.description || "",
      baseSalaryType: dept.baseSalaryType || "monthly",
      baseMonthlySalary: dept.baseMonthlySalary || "",
      baseHourlyRate: dept.baseHourlyRate || "",
    });
    setIsOpen(true);
  }
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const data = {
      name: form.name,
      description: form.description || null,
      baseSalaryType: form.baseSalaryType,
      baseMonthlySalary: form.baseMonthlySalary ? parseFloat(form.baseMonthlySalary) : null,
      baseHourlyRate: form.baseHourlyRate ? parseFloat(form.baseHourlyRate) : null,
    };
    if (editing) updateM.mutate({ id: editing.id, data });
    else createM.mutate(data);
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Building2 className="w-6 h-6 text-blue-500" /> Bo'limlar</h1>
            <p className="text-muted-foreground text-sm mt-1">Kompaniya bo'limlarini boshqaring va maosh belgilang</p>
          </div>
          <Button onClick={openCreate} className="gap-2"><Plus className="w-4 h-4" /> Yangi Bo'lim</Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3].map(i => <div key={i} className="h-40 bg-muted rounded-xl animate-pulse" />)}
          </div>
        ) : departments.length === 0 ? (
          <div className="text-center py-20 border border-dashed rounded-xl text-muted-foreground">
            <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Hali bo'lim yo'q</p>
            <p className="text-sm mt-1">Birinchi bo'limni yarating</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {departments.map((dept: any) => (
              <div key={dept.id} className="bg-card border border-border rounded-xl p-5 hover:border-primary/30 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-blue-500" />
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(dept)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => deleteM.mutate(dept.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <h3 className="font-bold text-lg">{dept.name}</h3>
                {dept.description && <p className="text-muted-foreground text-sm mt-1">{dept.description}</p>}
                <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {dept.employeeCount} xodim</span>
                  {dept.baseMonthlySalary && (
                    <span className="flex items-center gap-1"><Wallet className="w-3.5 h-3.5" /> {parseFloat(dept.baseMonthlySalary).toLocaleString()} so'm</span>
                  )}
                  {dept.baseHourlyRate && (
                    <span className="flex items-center gap-1"><Wallet className="w-3.5 h-3.5" /> {parseFloat(dept.baseHourlyRate).toLocaleString()}/soat</span>
                  )}
                </div>
                {(dept.baseMonthlySalary || dept.baseHourlyRate) && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full mt-3 gap-2 text-xs"
                    onClick={() => setApplyId(dept.id)}
                  >
                    <Zap className="w-3.5 h-3.5 text-yellow-500" />
                    Maoshni barcha xodimlarga qo'llash
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={isOpen} onOpenChange={(v) => { setIsOpen(v); if (!v) setEditing(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Bo'limni tahrirlash" : "Yangi bo'lim"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Bo'lim nomi *</Label>
              <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required placeholder="Dasturlash bo'limi" />
            </div>
            <div className="space-y-1.5">
              <Label>Tavsif</Label>
              <Input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Ixtiyoriy tavsif" />
            </div>
            <div className="space-y-1.5">
              <Label>Maosh turi</Label>
              <Select value={form.baseSalaryType} onValueChange={v => setForm(p => ({ ...p, baseSalaryType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Oylik</SelectItem>
                  <SelectItem value="hourly">Soatlik</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.baseSalaryType === "monthly" ? (
              <div className="space-y-1.5">
                <Label>Oylik maosh (so'm)</Label>
                <Input type="number" value={form.baseMonthlySalary} onChange={e => setForm(p => ({ ...p, baseMonthlySalary: e.target.value }))} placeholder="3000000" />
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label>Soatlik stavka (so'm)</Label>
                <Input type="number" value={form.baseHourlyRate} onChange={e => setForm(p => ({ ...p, baseHourlyRate: e.target.value }))} placeholder="25000" />
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Bekor</Button>
              <Button type="submit" disabled={createM.isPending || updateM.isPending}>
                {editing ? "Saqlash" : "Yaratish"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={applyId !== null} onOpenChange={(v) => { if (!v) setApplyId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Maoshni qo'llash</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">
            Bu bo'limdagi <b>barcha xodimlar</b> maoshi yangi summaga o'zgartiriladi. Davom etasizmi?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApplyId(null)}>Bekor</Button>
            <Button onClick={() => applyM.mutate(applyId!)} disabled={applyM.isPending}>
              {applyM.isPending ? "Qo'llanmoqda..." : "Tasdiqlash"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
