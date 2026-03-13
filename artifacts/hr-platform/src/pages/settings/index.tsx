import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { useAppStore } from "@/store/use-store";
import { useTranslation } from "@/lib/i18n";
import { useGetMyCompany, useUpdateMyCompany } from "@workspace/api-client-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Building2, Save, QrCode, Clock, RefreshCw, Copy, MessageCircle, Download, Globe } from "lucide-react";
import { apiClient } from "@/lib/api-client";

async function fetchSettings() {
  const r = await apiClient.get("/api/settings");
  return r.data as any;
}
async function updateSettings(data: any) {
  const r = await apiClient.put("/api/settings", data);
  return r.data;
}
async function fetchQrCode() {
  const r = await apiClient.get("/api/settings/qr-code");
  return r.data as { joinCode: string; deepLink: string; qrCode: string };
}
async function regenerateCode() {
  const r = await apiClient.post("/api/settings/regenerate-code");
  return r.data as { joinCode: string };
}

export default function Settings() {
  const { language } = useAppStore();
  const t = useTranslation(language);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: company, isLoading: companyLoading } = useGetMyCompany();
  const { data: settings, isLoading: settingsLoading } = useQuery({ queryKey: ["/api/settings"], queryFn: fetchSettings });
  const { data: qrData, isLoading: qrLoading, refetch: refetchQr } = useQuery({ queryKey: ["/api/settings/qr-code"], queryFn: fetchQrCode });

  const [companyForm, setCompanyForm] = useState({ name: "", phone: "", logo: "" });
  const [workForm, setWorkForm] = useState({ workStartTime: "09:00", workEndTime: "18:00", lateThresholdMinutes: "15", telegramAdminId: "" });

  useEffect(() => {
    if (company) setCompanyForm({ name: company.name, phone: company.phone, logo: company.logo || "" });
  }, [company]);

  useEffect(() => {
    if (settings) {
      setWorkForm({
        workStartTime: settings.workStartTime || "09:00",
        workEndTime: settings.workEndTime || "18:00",
        lateThresholdMinutes: settings.lateThresholdMinutes || "15",
        telegramAdminId: settings.telegramAdminId || "",
      });
    }
  }, [settings]);

  const updateCompanyM = useUpdateMyCompany({
    mutation: {
      onSuccess: () => {
        toast({ title: "Kompaniya profili yangilandi" });
        queryClient.invalidateQueries({ queryKey: ["/api/companies/me"] });
      }
    }
  });

  const updateSettingsM = useMutation({
    mutationFn: updateSettings,
    onSuccess: () => {
      toast({ title: "Sozlamalar saqlandi" });
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
    },
    onError: () => toast({ variant: "destructive", title: "Xatolik" }),
  });

  const regenerateM = useMutation({
    mutationFn: regenerateCode,
    onSuccess: () => {
      toast({ title: "Yangi kod yaratildi" });
      queryClient.invalidateQueries({ queryKey: ["/api/settings/qr-code"] });
    },
  });

  function downloadQr() {
    if (!qrData?.qrCode) return;
    const a = document.createElement("a");
    a.href = qrData.qrCode;
    a.download = "company-telegram-qr.png";
    a.click();
  }

  function copyCode() {
    if (!qrData?.joinCode) return;
    navigator.clipboard.writeText(qrData.joinCode);
    toast({ title: `Kod nusxalandi: ${qrData.joinCode}` });
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl space-y-8">
        <div>
          <h1 className="text-2xl font-bold">{t('settings')}</h1>
          <p className="text-muted-foreground text-sm mt-1">Kompaniya sozlamalari va integratsiyalar</p>
        </div>

        {/* Company Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg"><Building2 className="w-5 h-5 text-blue-500" /> {t('company_profile')}</CardTitle>
          </CardHeader>
          <CardContent>
            {companyLoading ? <p className="text-muted-foreground text-sm">Yuklanmoqda...</p> : (
              <form onSubmit={(e) => { e.preventDefault(); updateCompanyM.mutate({ data: companyForm }); }} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <Label>{t('company_name')}</Label>
                    <Input value={companyForm.name} onChange={e => setCompanyForm(p => ({ ...p, name: e.target.value }))} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t('phone')}</Label>
                    <Input value={companyForm.phone} onChange={e => setCompanyForm(p => ({ ...p, phone: e.target.value }))} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t('email')}</Label>
                    <Input value={company?.email || ""} disabled className="bg-muted/50 cursor-not-allowed" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Tarif rejasi</Label>
                    <div className="h-10 px-3 rounded-md bg-primary/10 border border-primary/20 text-primary font-semibold flex items-center uppercase text-sm">
                      {company?.subscriptionPlan || "Free"}
                    </div>
                  </div>
                </div>
                <Button type="submit" disabled={updateCompanyM.isPending} className="gap-2">
                  <Save className="w-4 h-4" /> Saqlash
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Work Hours & Lateness */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg"><Clock className="w-5 h-5 text-orange-500" /> Ish vaqti va kechikish sozlamalari</CardTitle>
          </CardHeader>
          <CardContent>
            {settingsLoading ? <p className="text-muted-foreground text-sm">Yuklanmoqda...</p> : (
              <form onSubmit={(e) => { e.preventDefault(); updateSettingsM.mutate(workForm); }} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="space-y-1.5">
                    <Label>Ish boshlanish vaqti</Label>
                    <Input type="time" value={workForm.workStartTime} onChange={e => setWorkForm(p => ({ ...p, workStartTime: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Ish tugash vaqti</Label>
                    <Input type="time" value={workForm.workEndTime} onChange={e => setWorkForm(p => ({ ...p, workEndTime: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Kechikish chegarasi (daqiqa)</Label>
                    <Input type="number" value={workForm.lateThresholdMinutes} onChange={e => setWorkForm(p => ({ ...p, lateThresholdMinutes: e.target.value }))} min="0" max="60" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-2"><MessageCircle className="w-4 h-4 text-blue-500" /> Admin Telegram ID</Label>
                  <Input value={workForm.telegramAdminId} onChange={e => setWorkForm(p => ({ ...p, telegramAdminId: e.target.value }))} placeholder="123456789 — botdan /start bosib oling" />
                  <p className="text-xs text-muted-foreground">Xodimlar ta'til so'rov yuborganida shu Telegram'ga bildirishnoma boradi</p>
                </div>
                <Button type="submit" disabled={updateSettingsM.isPending} className="gap-2">
                  <Save className="w-4 h-4" /> Saqlash
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Join Code & QR Codes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg"><QrCode className="w-5 h-5 text-green-500" /> Xodim Ulanish QR Kodlari</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {qrLoading ? (
              <div className="h-48 bg-muted rounded-xl animate-pulse" />
            ) : qrData ? (
              <>
                {/* Join Code */}
                <div className="space-y-1.5">
                  <Label>Ulanish kodi</Label>
                  <div className="flex gap-2">
                    <Input value={(qrData as any).joinCode} readOnly className="font-mono text-lg font-bold tracking-widest" />
                    <Button variant="outline" size="icon" onClick={copyCode}><Copy className="w-4 h-4" /></Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Bu kodni xodimlarga yuboring — ular quyidagi usullardan birini ishlatishi mumkin</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Web QR Code */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-blue-500" />
                      <Label className="font-semibold">Web Sahifa QR (Tavsiya etiladi)</Label>
                    </div>
                    <div className="bg-white p-4 rounded-2xl shadow-md border inline-block">
                      {(qrData as any).webQrCode ? (
                        <img src={(qrData as any).webQrCode} alt="Web Join QR" className="w-44 h-44" />
                      ) : (
                        <div className="w-44 h-44 bg-muted rounded-xl flex items-center justify-center text-sm text-muted-foreground">Mavjud emas</div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Skanerlash → Web sahifa ochiladi → Telefon kiritadi → Tasdiqlaydi
                    </p>
                    {(qrData as any).webJoinUrl && (
                      <div className="space-y-1">
                        <Label className="text-xs">Havola</Label>
                        <Input value={(qrData as any).webJoinUrl} readOnly className="text-xs" />
                      </div>
                    )}
                    {(qrData as any).webQrCode && (
                      <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => {
                        const a = document.createElement("a"); a.href = (qrData as any).webQrCode; a.download = "web-join-qr.png"; a.click();
                      }}>
                        <Download className="w-3.5 h-3.5" /> Yuklab olish
                      </Button>
                    )}
                  </div>

                  {/* Telegram QR Code */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <MessageCircle className="w-4 h-4 text-blue-500" />
                      <Label className="font-semibold">Telegram Bot QR</Label>
                    </div>
                    <div className="bg-white p-4 rounded-2xl shadow-md border inline-block">
                      <img src={(qrData as any).qrCode} alt="Telegram QR Code" className="w-44 h-44" />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Skanerlash → Telegram ochilib botga ulanadi → Telefon kiritadi
                    </p>
                    <div className="space-y-1">
                      <Label className="text-xs">Telegram havolasi</Label>
                      <Input value={(qrData as any).deepLink} readOnly className="text-xs" />
                    </div>
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={downloadQr}>
                      <Download className="w-3.5 h-3.5" /> Yuklab olish
                    </Button>
                  </div>
                </div>

                <div className="flex gap-2 pt-2 border-t">
                  <Button variant="outline" onClick={() => regenerateM.mutate()} disabled={regenerateM.isPending} className="gap-2 text-sm">
                    <RefreshCw className={`w-4 h-4 ${regenerateM.isPending ? "animate-spin" : ""}`} />
                    Yangi kod yaratish
                  </Button>
                </div>
              </>
            ) : (
              <Button onClick={() => refetchQr()} className="gap-2">
                <QrCode className="w-4 h-4" /> QR Kodlarni Yaratish
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
