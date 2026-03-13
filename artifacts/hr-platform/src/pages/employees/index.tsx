import { useState } from "react";
import { useLocation } from "wouter";
import { AppLayout } from "@/components/layout/app-layout";
import { useAppStore } from "@/store/use-store";
import { useTranslation } from "@/lib/i18n";
import { useListEmployees, useCreateEmployee, useDeleteEmployee } from "@workspace/api-client-react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Trash2, QrCode, Building2, Printer, Download, RefreshCw, MessageCircle, ScanFace } from "lucide-react";
import FaceEnrollModal from "@/components/FaceEnrollModal";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiClient } from "@/lib/api-client";

export default function Employees() {
  const { language, userRole } = useAppStore();
  const t = useTranslation(language);
  const isHrOnly = userRole === "hr";
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const [search, setSearch] = useState("");
  const { data: employees, isLoading } = useListEmployees({ search });

  const { toast } = useToast();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [isTgQrOpen, setIsTgQrOpen] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState<any | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [tgQrData, setTgQrData] = useState<{ qrCode: string; deepLink: string } | null>(null);
  const [tgQrLoading, setTgQrLoading] = useState(false);
  const [faceEnrollEmp, setFaceEnrollEmp] = useState<any | null>(null);

  const { data: departments = [] } = useQuery({
    queryKey: ["/api/departments"],
    queryFn: async () => { const r = await apiClient.get("/api/departments"); return r.data as any[]; },
  });

  const [formData, setFormData] = useState({
    fullName: "", phone: "", position: "",
    salaryType: "monthly" as "hourly" | "monthly" | "daily" | "piecerate",
    hourlyRate: 0, monthlySalary: 0, dailyRate: 0,
    pieceRate: 0, pieceRatePlan: 0, bonusPercent: 0,
    telegramId: "", departmentId: ""
  });

  const createMutation = useCreateEmployee({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
        setIsAddOpen(false);
        setFormData({ fullName: "", phone: "", position: "", salaryType: "monthly", hourlyRate: 0, monthlySalary: 0, telegramId: "", departmentId: "" });
      }
    }
  });

  const deleteMutation = useDeleteEmployee({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/employees"] })
    }
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const data: any = { ...formData };
    if (!data.departmentId) delete data.departmentId;
    else data.departmentId = parseInt(data.departmentId);
    if (data.salaryType !== "hourly") { data.hourlyRate = 0; }
    if (data.salaryType !== "monthly") { data.monthlySalary = 0; }
    if (data.salaryType !== "daily") { data.dailyRate = 0; }
    if (data.salaryType !== "piecerate") { data.pieceRate = 0; data.pieceRatePlan = 0; data.bonusPercent = 0; }
    createMutation.mutate({ data });
  };

  const loadQr = async (emp: any) => {
    setQrLoading(true);
    setQrDataUrl(null);
    try {
      const r = await apiClient.get(`/api/employees/${emp.id}/qr`);
      setQrDataUrl((r as any).qrCode || null);
    } catch {
      setQrDataUrl(emp.qrCode || null);
    } finally {
      setQrLoading(false);
    }
  };

  const openQr = async (emp: any) => {
    setSelectedEmp(emp);
    setIsQrOpen(true);
    if (emp.qrCode) {
      setQrDataUrl(emp.qrCode);
      setQrLoading(false);
    } else {
      setQrLoading(true);
      await loadQr(emp);
    }
  };

  const openTgQr = async (emp: any) => {
    setSelectedEmp(emp);
    setIsTgQrOpen(true);
    setTgQrLoading(true);
    setTgQrData(null);
    try {
      const r = await apiClient.get(`/api/employees/${emp.id}/telegram-qr`);
      setTgQrData({ qrCode: (r as any).qrCode, deepLink: (r as any).deepLink });
    } catch {
      toast({ variant: "destructive", title: "Xatolik", description: "Telegram QR yaratilmadi" });
      setIsTgQrOpen(false);
    } finally {
      setTgQrLoading(false);
    }
  };

  const regenerateQr = async () => {
    if (!selectedEmp) return;
    setQrLoading(true);
    setQrDataUrl(null);
    try {
      const r = await apiClient.post(`/api/employees/${selectedEmp.id}/regenerate-qr`);
      setQrDataUrl((r as any).qrCode || null);
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
    } catch {
      await loadQr(selectedEmp);
    }
  };

  const downloadQr = () => {
    if (!qrDataUrl || !selectedEmp) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `${selectedEmp.fullName.replace(/ /g, "_")}_QR.png`;
    a.click();
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold">{t('employees')}</h1>
            <p className="text-muted-foreground mt-1">Xodimlar ro'yxati va QR kodlarni boshqarish</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={() => setLocation("/employees/print-qr")}
              className="rounded-xl font-semibold"
            >
              <Printer className="w-4 h-4 mr-2" />
              Barchasi QR chop etish
            </Button>
            <Button
              onClick={() => setIsAddOpen(true)}
              className="rounded-xl font-semibold shadow-md hover:shadow-lg transition-all"
            >
              <Plus className="w-4 h-4 mr-2" />
              {t('add_employee')}
            </Button>
          </div>
        </div>

        <div className="flex items-center relative max-w-md">
          <Search className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder={t('search')}
            className="pl-10 rounded-xl bg-card border-border/50 h-11"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-semibold">
                <tr>
                  <th className="px-6 py-4">{t('name')}</th>
                  <th className="px-6 py-4 text-center">Kod</th>
                  <th className="px-6 py-4">{t('position')}</th>
                  <th className="px-6 py-4">{t('phone')}</th>
                  <th className="px-6 py-4">{t('salary_type')}</th>
                  <th className="px-6 py-4 text-center">QR</th>
                  <th className="px-6 py-4 text-center">Yuz</th>
                  <th className="px-6 py-4 text-right">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {isLoading ? (
                  <tr><td colSpan={8} className="px-6 py-8 text-center text-muted-foreground">{t('loading')}</td></tr>
                ) : (employees?.data?.length ?? 0) === 0 ? (
                  <tr><td colSpan={8} className="px-6 py-8 text-center text-muted-foreground">{t('no_data')}</td></tr>
                ) : (
                  employees?.data.map((emp) => (
                    <tr key={emp.id} className="hover:bg-muted/30 transition-colors group">
                      <td className="px-6 py-4 font-semibold text-foreground">{emp.fullName}</td>
                      <td className="px-6 py-4 text-center">
                        {(emp as any).employeeCode ? (
                          <button
                            className="font-mono text-xs bg-primary/10 text-primary border border-primary/20 rounded px-2 py-0.5 cursor-pointer hover:bg-primary/20 transition-colors"
                            onClick={() => { navigator.clipboard.writeText((emp as any).employeeCode); }}
                            title="Nusxalash uchun bosing"
                          >
                            {(emp as any).employeeCode}
                          </button>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">{emp.position}</td>
                      <td className="px-6 py-4 text-muted-foreground">{emp.phone}</td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground text-xs font-medium uppercase">
                          {emp.salaryType}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {emp.qrCode ? (
                          <span className="inline-block w-2 h-2 rounded-full bg-green-500" title="QR mavjud" />
                        ) : (
                          <span className="inline-block w-2 h-2 rounded-full bg-red-400" title="QR yo'q" />
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {(emp as any).hasFace ? (
                          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" title="Yuz ro'yxatdan o'tgan" />
                        ) : (
                          <span className="inline-block w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600" title="Yuz yo'q" />
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="outline" size="sm" className="h-8 px-3 rounded-lg gap-1.5 text-xs" onClick={() => openQr(emp)}>
                            <QrCode className="w-3.5 h-3.5 text-primary" />
                            QR
                          </Button>
                          <Button variant="outline" size="sm"
                            className={`h-8 px-3 rounded-lg gap-1.5 text-xs ${(emp as any).hasFace ? "text-emerald-600 border-emerald-200 hover:bg-emerald-50" : "text-slate-500 hover:text-emerald-600"}`}
                            onClick={() => setFaceEnrollEmp(emp)}>
                            <ScanFace className="w-3.5 h-3.5" />
                            {(emp as any).hasFace ? "Yuz ✓" : "Yuz"}
                          </Button>
                          <Button variant="outline" size="sm" className="h-8 px-3 rounded-lg gap-1.5 text-xs text-blue-600 border-blue-200 hover:bg-blue-50" onClick={() => openTgQr(emp)}>
                            <MessageCircle className="w-3.5 h-3.5" />
                            Telegram
                          </Button>
                          {!isHrOnly && (
                            <Button
                              variant="outline" size="sm"
                              className="h-8 w-8 p-0 rounded-lg text-destructive hover:bg-destructive/10 hover:text-destructive border-transparent hover:border-destructive/20"
                              onClick={() => { if (confirm('O\'chirishni tasdiqlaysizmi?')) deleteMutation.mutate({ id: emp.id }); }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add Employee Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-2xl font-display">{t('add_employee')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label>{t('name')}</Label>
                <Input required value={formData.fullName} onChange={e => setFormData({ ...formData, fullName: e.target.value })} className="rounded-xl" placeholder="Ism Familya" />
              </div>
              <div className="space-y-2">
                <Label>{t('phone')}</Label>
                <Input required value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="rounded-xl" placeholder="+998901234567" />
              </div>
              <div className="space-y-2">
                <Label>{t('position')}</Label>
                <Input required value={formData.position} onChange={e => setFormData({ ...formData, position: e.target.value })} className="rounded-xl" placeholder="Lavozim" />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>{t('salary_type')}</Label>
                <Select value={formData.salaryType} onValueChange={(v: any) => setFormData({ ...formData, salaryType: v })}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">📅 Oylik maosh</SelectItem>
                    <SelectItem value="hourly">⏱ Soatlik stavka</SelectItem>
                    <SelectItem value="daily">☀️ Kunlik stavka</SelectItem>
                    <SelectItem value="piecerate">🎯 Ishbay (dona bo'yicha)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {formData.salaryType === 'monthly' && (
                <div className="space-y-2 col-span-2">
                  <Label>Oylik maosh (so'm)</Label>
                  <Input type="number" value={formData.monthlySalary} onChange={e => setFormData({ ...formData, monthlySalary: Number(e.target.value) })} className="rounded-xl" placeholder="3000000" />
                </div>
              )}
              {formData.salaryType === 'hourly' && (
                <div className="space-y-2 col-span-2">
                  <Label>Soatlik stavka (so'm)</Label>
                  <Input type="number" value={formData.hourlyRate} onChange={e => setFormData({ ...formData, hourlyRate: Number(e.target.value) })} className="rounded-xl" placeholder="25000" />
                </div>
              )}
              {formData.salaryType === 'daily' && (
                <div className="space-y-2 col-span-2">
                  <Label>Kunlik stavka (so'm)</Label>
                  <Input type="number" value={formData.dailyRate} onChange={e => setFormData({ ...formData, dailyRate: Number(e.target.value) })} className="rounded-xl" placeholder="150000" />
                </div>
              )}
              {formData.salaryType === 'piecerate' && (
                <>
                  <div className="space-y-2">
                    <Label>1 dona narxi (so'm)</Label>
                    <Input type="number" value={formData.pieceRate} onChange={e => setFormData({ ...formData, pieceRate: Number(e.target.value) })} className="rounded-xl" placeholder="5000" />
                  </div>
                  <div className="space-y-2">
                    <Label>Oylik plan (dona)</Label>
                    <Input type="number" value={formData.pieceRatePlan} onChange={e => setFormData({ ...formData, pieceRatePlan: Number(e.target.value) })} className="rounded-xl" placeholder="100" />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Bonus foizi (plan oshganda, %)</Label>
                    <Input type="number" value={formData.bonusPercent} onChange={e => setFormData({ ...formData, bonusPercent: Number(e.target.value) })} className="rounded-xl" placeholder="20" />
                    <p className="text-xs text-muted-foreground">Misol: Plan 100 dona, hodim 150 dona qilsa — 50 dona uchun {formData.bonusPercent}% qo'shimcha bonus</p>
                  </div>
                </>
              )}
              {(departments as any[]).length > 0 && (
                <div className="space-y-2 col-span-2">
                  <Label className="flex items-center gap-1.5"><Building2 className="w-4 h-4" /> Bo'lim</Label>
                  <Select value={formData.departmentId} onValueChange={v => setFormData({ ...formData, departmentId: v })}>
                    <SelectTrigger className="rounded-xl"><SelectValue placeholder="Bo'lim tanlang (ixtiyoriy)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Belgilanmagan</SelectItem>
                      {(departments as any[]).map((d: any) => (
                        <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)} className="rounded-xl">{t('cancel')}</Button>
              <Button type="submit" disabled={createMutation.isPending} className="rounded-xl">
                {createMutation.isPending ? "Saqlanmoqda..." : t('save')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* QR Code Dialog */}
      <Dialog open={isQrOpen} onOpenChange={setIsQrOpen}>
        <DialogContent className="sm:max-w-xs rounded-3xl p-8 flex flex-col items-center text-center">
          <DialogHeader>
            <DialogTitle className="text-xl font-display">{selectedEmp?.fullName}</DialogTitle>
            <p className="text-sm text-muted-foreground">Davomat uchun QR Kod</p>
          </DialogHeader>
          <div className="mt-4 bg-white p-5 rounded-2xl shadow-lg border border-gray-100">
            {qrLoading ? (
              <div className="w-[200px] h-[200px] bg-muted animate-pulse rounded-xl flex items-center justify-center">
                <span className="text-sm text-muted-foreground">Yuklanmoqda...</span>
              </div>
            ) : qrDataUrl ? (
              <img src={qrDataUrl} alt="QR Code" className="w-[200px] h-[200px]" />
            ) : (
              <div className="w-[200px] h-[200px] bg-muted rounded-xl flex flex-col items-center justify-center gap-3">
                <span className="text-sm text-red-500">QR kodi topilmadi</span>
                <Button size="sm" variant="outline" onClick={() => selectedEmp && loadQr(selectedEmp)} className="text-xs">
                  Qayta urinish
                </Button>
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-3">Skanerlash orqali kirish/chiqishni qayd eting</p>
          <div className="flex gap-2 w-full mt-4">
            <Button variant="outline" className="flex-1 rounded-xl text-xs" onClick={downloadQr} disabled={!qrDataUrl || qrLoading}>
              <Download className="w-3.5 h-3.5 mr-1.5" /> Yuklab olish
            </Button>
            <Button variant="outline" className="flex-1 rounded-xl text-xs" onClick={regenerateQr} disabled={qrLoading}>
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${qrLoading ? "animate-spin" : ""}`} /> Yangilash
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Telegram QR Dialog */}
      <Dialog open={isTgQrOpen} onOpenChange={setIsTgQrOpen}>
        <DialogContent className="sm:max-w-sm rounded-3xl p-8 flex flex-col items-center text-center">
          <DialogHeader>
            <DialogTitle className="text-xl font-display flex items-center gap-2 justify-center">
              <MessageCircle className="w-5 h-5 text-blue-500" />
              Telegram QR Kodi
            </DialogTitle>
            <p className="text-sm text-muted-foreground">{selectedEmp?.fullName}</p>
          </DialogHeader>
          <div className="mt-4 bg-white p-5 rounded-2xl shadow-lg border border-gray-100">
            {tgQrLoading ? (
              <div className="w-[200px] h-[200px] bg-muted animate-pulse rounded-xl flex items-center justify-center">
                <span className="text-sm text-muted-foreground">Yuklanmoqda...</span>
              </div>
            ) : tgQrData?.qrCode ? (
              <img src={tgQrData.qrCode} alt="Telegram QR" className="w-[200px] h-[200px]" />
            ) : (
              <div className="w-[200px] h-[200px] bg-muted rounded-xl flex items-center justify-center">
                <span className="text-sm text-red-500">Yaratilmadi</span>
              </div>
            )}
          </div>
          <div className="mt-4 text-center space-y-2">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Bu QR kodni xodimga bering. Telefon kamerasi bilan skanerlasa, 
              <strong> Telegram bot</strong> avtomatik ochiladi va xodim ulandi.
            </p>
            <div className="flex items-center gap-1 justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
              <span className="text-xs text-green-700 font-medium">Bir marta skanerlash kifoya</span>
            </div>
          </div>
          {tgQrData?.qrCode && (
            <Button variant="outline" className="w-full mt-4 rounded-xl text-sm gap-2"
              onClick={() => {
                const a = document.createElement("a");
                a.href = tgQrData.qrCode;
                a.download = `telegram_qr_${selectedEmp?.fullName?.replace(/\s/g, "_")}.png`;
                a.click();
              }}>
              <Download className="w-4 h-4" /> Yuklab olish
            </Button>
          )}
          {tgQrData?.deepLink && (
            <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground gap-2 mt-1"
              onClick={() => {
                navigator.clipboard.writeText(tgQrData.deepLink);
                toast({ title: "Nusxalandi!", description: "Telegram havolasi nusxalandi" });
              }}>
              📋 Havolani nusxalash
            </Button>
          )}
        </DialogContent>
      </Dialog>
      {faceEnrollEmp && (
        <FaceEnrollModal
          employee={faceEnrollEmp}
          open={!!faceEnrollEmp}
          onClose={() => setFaceEnrollEmp(null)}
          onSuccess={() => {
            setFaceEnrollEmp(null);
            queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
            toast({ title: "Yuz ro'yxatdan o'tkazildi!", description: `${faceEnrollEmp?.fullName} uchun yuz muvaffaqiyatli saqlandi.` });
          }}
        />
      )}
    </AppLayout>
  );
}
