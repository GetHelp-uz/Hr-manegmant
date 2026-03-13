import { useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { useAppStore } from "@/store/use-store";
import { useTranslation } from "@/lib/i18n";
import { useListDevices, useCreateDevice, useDeleteDevice } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, SmartphoneNfc } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

export default function Devices() {
  const { language } = useAppStore();
  const t = useTranslation(language);
  const queryClient = useQueryClient();
  
  const { data: devices, isLoading } = useListDevices();
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({ deviceName: "", location: "" });

  const createMutation = useCreateDevice({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/devices"] });
        setIsOpen(false);
        setFormData({ deviceName: "", location: "" });
      }
    }
  });

  const deleteMutation = useDeleteDevice({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/devices"] })
    }
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold">{t('devices')}</h1>
            <p className="text-muted-foreground mt-1">Manage physical entry points and scanners.</p>
          </div>
          <Button onClick={() => setIsOpen(true)} className="rounded-xl">
            <Plus className="w-4 h-4 mr-2" />
            {t('add_device')}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : devices?.data.map((device) => (
            <Card key={device.id} className="rounded-2xl border-border/50 hover:shadow-md transition-shadow group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-10 -mt-10 transition-transform group-hover:scale-150"></div>
              <CardContent className="p-6 relative z-10">
                <div className="flex justify-between items-start">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-4">
                    <SmartphoneNfc className="w-6 h-6" />
                  </div>
                  <Button variant="ghost" size="icon" className="text-destructive/50 hover:text-destructive hover:bg-destructive/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => { if(confirm('Delete device?')) deleteMutation.mutate({ id: device.id }); }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <h3 className="text-xl font-bold">{device.deviceName}</h3>
                <p className="text-muted-foreground flex items-center gap-2 mt-2 text-sm">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  {device.location}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[400px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-display">{t('add_device')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate({ data: formData }); }} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>{t('device_name')}</Label>
              <Input required value={formData.deviceName} onChange={e => setFormData({...formData, deviceName: e.target.value})} className="rounded-xl" placeholder="Main Entrance Scanner" />
            </div>
            <div className="space-y-2">
              <Label>{t('location')}</Label>
              <Input required value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} className="rounded-xl" placeholder="Lobby" />
            </div>
            <DialogFooter className="mt-6">
              <Button type="submit" disabled={createMutation.isPending} className="w-full rounded-xl h-11">
                {t('save')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
