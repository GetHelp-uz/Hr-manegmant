import { useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppStore } from "@/store/use-store";
import { UserPlus, Trash2, KeyRound, Users, Shield, Calculator } from "lucide-react";
import { format } from "date-fns";

interface StaffMember {
  id: number;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

const ROLE_LABELS: Record<string, { label: string; color: string; icon: any }> = {
  admin: { label: "Boshliq (Admin)", color: "bg-purple-100 text-purple-700", icon: Shield },
  accountant: { label: "Buxgalter", color: "bg-blue-100 text-blue-700", icon: Calculator },
  hr: { label: "HR Xodim", color: "bg-green-100 text-green-700", icon: Users },
  observer: { label: "Nazoratchi", color: "bg-amber-100 text-amber-700", icon: Users },
  viewer: { label: "Ko'ruvchi", color: "bg-gray-100 text-gray-700", icon: Users },
};

export default function Staff() {
  const { userRole } = useAppStore();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editingPassword, setEditingPassword] = useState<StaffMember | null>(null);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "accountant" });
  const [newPassword, setNewPassword] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<StaffMember | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["/api/staff"],
    queryFn: () => apiClient.get("/api/staff").then(r => r.data as { data: StaffMember[] }),
  });

  const createMutation = useMutation({
    mutationFn: (body: any) => apiClient.post("/api/staff", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff"] });
      setShowCreate(false);
      setForm({ name: "", email: "", password: "", role: "accountant" });
    },
  });

  const updatePasswordMutation = useMutation({
    mutationFn: ({ id, password }: { id: number; password: string }) =>
      apiClient.patch(`/api/staff/${id}`, { password }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff"] });
      setEditingPassword(null);
      setNewPassword("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiClient.delete(`/api/staff/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff"] });
      setDeleteConfirm(null);
    },
  });

  if (userRole !== "admin") {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-lg font-medium">Ruxsat yo'q</p>
            <p className="text-sm text-muted-foreground">Bu sahifaga faqat admin kira oladi</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  const staff = data?.data || [];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold">Xodimlar Boshqaruvi</h1>
              <p className="text-sm text-muted-foreground">Buxgalter va boshqa foydalanuvchilarni boshqaring</p>
            </div>
          </div>
          <Button onClick={() => setShowCreate(true)} className="rounded-xl gap-2">
            <UserPlus className="w-4 h-4" />
            Yangi foydalanuvchi
          </Button>
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1,2,3].map(i => <Card key={i} className="p-5 animate-pulse h-32" />)}
          </div>
        ) : staff.length === 0 ? (
          <Card className="p-12 text-center">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="font-medium text-lg">Foydalanuvchilar yo'q</p>
            <p className="text-sm text-muted-foreground mt-1">Buxgalter yaratish uchun tugmani bosing</p>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {staff.map((member) => {
              const roleInfo = ROLE_LABELS[member.role] || ROLE_LABELS.viewer;
              const RoleIcon = roleInfo.icon;
              return (
                <Card key={member.id} className="p-5 flex flex-col gap-4 border-border/60">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <RoleIcon className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold">{member.name}</p>
                        <p className="text-xs text-muted-foreground">{member.email}</p>
                      </div>
                    </div>
                    <Badge className={`text-xs ${roleInfo.color} border-0`}>{roleInfo.label}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Qo'shilgan: {format(new Date(member.createdAt), "dd.MM.yyyy")}
                  </p>
                  {member.role !== "admin" && (
                    <div className="flex gap-2 mt-auto">
                      <Button size="sm" variant="outline" className="flex-1 gap-1.5 rounded-lg"
                        onClick={() => { setEditingPassword(member); setNewPassword(""); }}>
                        <KeyRound className="w-3.5 h-3.5" />
                        Parol
                      </Button>
                      <Button size="sm" variant="destructive" className="gap-1.5 rounded-lg"
                        onClick={() => setDeleteConfirm(member)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Yangi foydalanuvchi yaratish</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Ism *</Label>
              <Input placeholder="Buxgalter ismi" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Email *</Label>
              <Input type="email" placeholder="email@kompaniya.com" value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Parol *</Label>
              <Input type="password" placeholder="••••••••" value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Lavozim</Label>
              <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v }))}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hr">HR Xodim (xodim qo'shish, QR, davomat)</SelectItem>
                  <SelectItem value="accountant">Buxgalter (maosh, hisobotlar)</SelectItem>
                  <SelectItem value="observer">Nazoratchi (faqat kuzatish)</SelectItem>
                  <SelectItem value="viewer">Ko'ruvchi (faqat ko'rish)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Bekor</Button>
            <Button disabled={createMutation.isPending || !form.name || !form.email || !form.password}
              onClick={() => createMutation.mutate(form)}>
              {createMutation.isPending ? "Saqlanmoqda..." : "Yaratish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingPassword} onOpenChange={() => setEditingPassword(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Parolni o'zgartirish</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">{editingPassword?.name} uchun yangi parol:</p>
            <Input type="password" placeholder="Yangi parol" value={newPassword}
              onChange={e => setNewPassword(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingPassword(null)}>Bekor</Button>
            <Button disabled={updatePasswordMutation.isPending || newPassword.length < 4}
              onClick={() => editingPassword && updatePasswordMutation.mutate({ id: editingPassword.id, password: newPassword })}>
              {updatePasswordMutation.isPending ? "Saqlanmoqda..." : "O'zgartirish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>O'chirishni tasdiqlang</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            <strong>{deleteConfirm?.name}</strong> hisobini o'chirasizmi? Bu amalni qaytarib bo'lmaydi.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Bekor</Button>
            <Button variant="destructive" disabled={deleteMutation.isPending}
              onClick={() => deleteConfirm && deleteMutation.mutate(deleteConfirm.id)}>
              {deleteMutation.isPending ? "O'chirilmoqda..." : "O'chirish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
