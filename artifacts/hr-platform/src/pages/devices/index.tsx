import { useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { useAppStore } from "@/store/use-store";
import { useTranslation } from "@/lib/i18n";
import { useListDevices, useCreateDevice, useDeleteDevice } from "@workspace/api-client-react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Plus, Trash2, SmartphoneNfc, Copy, RefreshCw, Eye, EyeOff, KeyRound, Monitor, MapPin, ExternalLink
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Devices() {
  const { language } = useAppStore();
  const t = useTranslation(language);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: devices, isLoading } = useListDevices();
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({ deviceName: "", location: "" });
  const [showPwd, setShowPwd] = useState<Record<number, boolean>>({});
  const [newDevice, setNewDevice] = useState<any>(null);

  const createMutation = useCreateDevice({
    mutation: {
      onSuccess: (data: any) => {
        queryClient.invalidateQueries({ queryKey: ["/api/devices"] });
        setIsOpen(false);
        setFormData({ deviceName: "", location: "" });
        setNewDevice(data);
      }
    }
  });

  const deleteMutation = useDeleteDevice({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/devices"] });
        toast({ title: "Qurilma o'chirildi" });
      }
    }
  });

  const regenMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiClient.post(`/api/devices/${id}/regenerate-password`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/devices"] });
      toast({ title: "Yangi parol yaratildi" });
    },
    onError: () => toast({ variant: "destructive", title: "Xatolik" }),
  });

  function copyText(text: string, label: string) {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} nusxalandi` });
  }

  function togglePwd(id: number) {
    setShowPwd(prev => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold">{t('devices')}</h1>
            <p className="text-muted-foreground mt-1">Kiosk qurilmalarini boshqarish. Har bir qurilma o'z login va paroliga ega.</p>
          </div>
          <Button onClick={() => setIsOpen(true)} className="rounded-xl gap-2">
            <Plus className="w-4 h-4" /> {t('add_device')}
          </Button>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground">Yuklanmoqda...</p>
        ) : !devices?.data?.length ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mb-4">
              <SmartphoneNfc className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-xl font-semibold mb-2">Qurilmalar yo'q</p>
            <p className="text-muted-foreground text-sm mb-6">Kiosk rejimi uchun qurilma qo'shing</p>
            <Button onClick={() => setIsOpen(true)} className="rounded-xl gap-2">
              <Plus className="w-4 h-4" /> Qurilma qo'shish
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {devices.data.map((device: any) => (
              <Card key={device.id} className="rounded-2xl border-border/50">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 bg-primary/10 rounded-xl flex items-center justify-center text-primary shrink-0">
                        <Monitor className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-base">{device.deviceName}</p>
                        <p className="text-muted-foreground text-xs flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3" /> {device.location || "Joylashuv ko'rsatilmagan"}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost" size="icon"
                      className="text-destructive/50 hover:text-destructive hover:bg-destructive/10 rounded-lg h-8 w-8"
                      onClick={() => {
                        if (confirm("Qurilmani o'chirmoqchimisiz?")) {
                          deleteMutation.mutate({ id: device.id });
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="bg-muted/50 rounded-xl p-4 space-y-3 border border-border/50">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5" /> Kiosk kirish ma'lumotlari
                    </p>

                    <div className="space-y-2">
                      <div className="flex items-end gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground mb-1">Login</p>
                          <p className="font-mono text-sm font-semibold bg-background rounded-lg px-3 py-1.5 border truncate">
                            {device.deviceLogin || "—"}
                          </p>
                        </div>
                        <Button
                          variant="outline" size="icon"
                          className="h-9 w-9 rounded-lg shrink-0"
                          onClick={() => copyText(device.deviceLogin, "Login")}
                          disabled={!device.deviceLogin}
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </Button>
                      </div>

                      <div className="flex items-end gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground mb-1">Parol</p>
                          <p className="font-mono text-sm font-semibold bg-background rounded-lg px-3 py-1.5 border tracking-widest">
                            {showPwd[device.id] ? (device.devicePassword || "—") : "••••••••"}
                          </p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button
                            variant="outline" size="icon"
                            className="h-9 w-9 rounded-lg"
                            onClick={() => togglePwd(device.id)}
                          >
                            {showPwd[device.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </Button>
                          <Button
                            variant="outline" size="icon"
                            className="h-9 w-9 rounded-lg"
                            onClick={() => copyText(device.devicePassword, "Parol")}
                            disabled={!device.devicePassword}
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-1">
                      <Button
                        variant="outline" size="sm"
                        className="rounded-lg h-8 gap-1.5 text-xs flex-1"
                        onClick={() => regenMutation.mutate(device.id)}
                        disabled={regenMutation.isPending}
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Yangi parol
                      </Button>
                      <Button
                        variant="outline" size="sm"
                        className="rounded-lg h-8 gap-1.5 text-xs flex-1"
                        onClick={() => window.open("/kiosk/login", "_blank")}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Kiosk ochish
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[400px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-display">{t('add_device')}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate({ data: formData });
            }}
            className="space-y-4 mt-4"
          >
            <div className="space-y-2">
              <Label>{t('device_name')}</Label>
              <Input
                required
                value={formData.deviceName}
                onChange={e => setFormData({ ...formData, deviceName: e.target.value })}
                className="rounded-xl"
                placeholder="Kirish Kioski №1"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('location')}</Label>
              <Input
                required
                value={formData.location}
                onChange={e => setFormData({ ...formData, location: e.target.value })}
                className="rounded-xl"
                placeholder="1-qavat, kirish"
              />
            </div>
            <DialogFooter className="mt-6">
              <Button type="submit" disabled={createMutation.isPending} className="w-full rounded-xl h-11">
                {createMutation.isPending ? "Qo'shilmoqda..." : "Qurilma qo'shish"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {newDevice && (
        <Dialog open={!!newDevice} onOpenChange={() => setNewDevice(null)}>
          <DialogContent className="sm:max-w-[420px] rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-display flex items-center gap-2">
                <span className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <SmartphoneNfc className="w-4 h-4 text-green-600" />
                </span>
                Qurilma qo'shildi!
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <p className="text-sm text-muted-foreground">
                Qurilmaga kirish uchun quyidagi ma'lumotlarni saqlang. Parolni keyinroq ham ko'rish mumkin.
              </p>
              <div className="bg-muted rounded-xl p-4 space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Qurilma nomi</p>
                  <p className="font-semibold">{newDevice.deviceName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Login</p>
                  <div className="flex items-center gap-2">
                    <p className="font-mono font-bold text-lg flex-1">{newDevice.deviceLogin}</p>
                    <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg" onClick={() => copyText(newDevice.deviceLogin, "Login")}>
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Parol</p>
                  <div className="flex items-center gap-2">
                    <p className="font-mono font-bold text-2xl flex-1 tracking-widest text-primary">{newDevice.devicePassword}</p>
                    <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg" onClick={() => copyText(newDevice.devicePassword, "Parol")}>
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Kiosk sahifasiga kirish: <strong>/kiosk/login</strong>
              </p>
            </div>
            <DialogFooter className="mt-2">
              <Button onClick={() => setNewDevice(null)} className="w-full rounded-xl">
                Tushunarli, yopish
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </AppLayout>
  );
}
