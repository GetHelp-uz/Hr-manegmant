import { useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { useAppStore } from "@/store/use-store";
import { useTranslation } from "@/lib/i18n";
import { useListEmployees, useCreateEmployee, useDeleteEmployee, useGetEmployeeQr } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Trash2, Edit, QrCode } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import QRCode from "react-qr-code";

export default function Employees() {
  const { language } = useAppStore();
  const t = useTranslation(language);
  const queryClient = useQueryClient();
  
  const [search, setSearch] = useState("");
  const { data: employees, isLoading } = useListEmployees({ search });
  
  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [selectedEmpId, setSelectedEmpId] = useState<number | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    fullName: "", phone: "", position: "", salaryType: "monthly" as "hourly"|"monthly", 
    hourlyRate: 0, monthlySalary: 0, telegramId: ""
  });

  const createMutation = useCreateEmployee({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
        setIsAddOpen(false);
      }
    }
  });

  const deleteMutation = useDeleteEmployee({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/employees"] })
    }
  });

  const { data: qrData } = useGetEmployeeQr(selectedEmpId || 0, {
    query: { enabled: !!selectedEmpId && isQrOpen }
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({ data: formData });
  };

  const openQr = (id: number) => {
    setSelectedEmpId(id);
    setIsQrOpen(true);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold">{t('employees')}</h1>
            <p className="text-muted-foreground mt-1">Manage your workforce and generate QR codes.</p>
          </div>
          <Button 
            onClick={() => setIsAddOpen(true)}
            className="rounded-xl font-semibold shadow-md hover:shadow-lg transition-all"
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('add_employee')}
          </Button>
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
                  <th className="px-6 py-4">{t('position')}</th>
                  <th className="px-6 py-4">{t('phone')}</th>
                  <th className="px-6 py-4">{t('salary_type')}</th>
                  <th className="px-6 py-4 text-right">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {isLoading ? (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">{t('loading')}</td></tr>
                ) : employees?.data.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">{t('no_data')}</td></tr>
                ) : (
                  employees?.data.map((emp) => (
                    <tr key={emp.id} className="hover:bg-muted/30 transition-colors group">
                      <td className="px-6 py-4 font-semibold text-foreground">{emp.fullName}</td>
                      <td className="px-6 py-4 text-muted-foreground">{emp.position}</td>
                      <td className="px-6 py-4 text-muted-foreground">{emp.phone}</td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground text-xs font-medium uppercase">
                          {emp.salaryType}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="outline" size="sm" className="h-8 w-8 p-0 rounded-lg" onClick={() => openQr(emp.id)}>
                            <QrCode className="w-4 h-4 text-primary" />
                          </Button>
                          <Button variant="outline" size="sm" className="h-8 w-8 p-0 rounded-lg text-destructive hover:bg-destructive/10 hover:text-destructive border-transparent hover:border-destructive/20" onClick={() => {
                            if(confirm('Are you sure?')) deleteMutation.mutate({ id: emp.id });
                          }}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
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
                <Input required value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>{t('phone')}</Label>
                <Input required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>{t('position')}</Label>
                <Input required value={formData.position} onChange={e => setFormData({...formData, position: e.target.value})} className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>{t('salary_type')}</Label>
                <Select value={formData.salaryType} onValueChange={(v: any) => setFormData({...formData, salaryType: v})}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">{t('monthly')}</SelectItem>
                    <SelectItem value="hourly">{t('hourly')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {formData.salaryType === 'monthly' ? (
                <div className="space-y-2">
                  <Label>Monthly Salary</Label>
                  <Input type="number" required value={formData.monthlySalary} onChange={e => setFormData({...formData, monthlySalary: Number(e.target.value)})} className="rounded-xl" />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Hourly Rate</Label>
                  <Input type="number" required value={formData.hourlyRate} onChange={e => setFormData({...formData, hourlyRate: Number(e.target.value)})} className="rounded-xl" />
                </div>
              )}
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)} className="rounded-xl">{t('cancel')}</Button>
              <Button type="submit" disabled={createMutation.isPending} className="rounded-xl">{t('save')}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* QR Code Dialog */}
      <Dialog open={isQrOpen} onOpenChange={setIsQrOpen}>
        <DialogContent className="sm:max-w-sm rounded-3xl p-8 flex flex-col items-center justify-center text-center">
          <DialogHeader>
            <DialogTitle className="text-xl font-display mb-4">Employee QR Code</DialogTitle>
          </DialogHeader>
          <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
            {qrData?.qrCode ? (
              <QRCode value={qrData.qrCode} size={200} level="H" />
            ) : (
              <div className="w-[200px] h-[200px] bg-muted animate-pulse rounded-xl"></div>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-6">Scan this code using the Scanner app to check-in/out.</p>
          <Button className="w-full rounded-xl mt-6 font-semibold shadow-md" onClick={() => window.print()}>
            Print QR Code
          </Button>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
