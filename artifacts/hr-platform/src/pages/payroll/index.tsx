import { useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { useAppStore } from "@/store/use-store";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calculator, CheckCircle2, Banknote, Clock, CircleDollarSign, Users, CheckCheck } from "lucide-react";
import { format } from "date-fns";

interface PayrollRecord {
  id: number;
  employeeId: number;
  month: number;
  year: number;
  totalHours: number;
  totalDays: number;
  grossSalary: number;
  status: "draft" | "approved" | "paid";
  approvedBy: { id: number; name: string } | null;
  approvedAt: string | null;
  paidBy: { id: number; name: string } | null;
  paidAt: string | null;
  notes: string | null;
  employee: {
    fullName: string;
    position: string;
    salaryType: string;
    monthlySalary: number | null;
    hourlyRate: number | null;
  } | null;
  createdAt: string;
}

const STATUS_CONFIG = {
  draft: { label: "Qoralama", color: "bg-gray-100 text-gray-700", icon: Clock },
  approved: { label: "Tasdiqlangan", color: "bg-blue-100 text-blue-700", icon: CheckCircle2 },
  paid: { label: "To'langan", color: "bg-green-100 text-green-700", icon: CheckCheck },
};

const MONTHS_UZ = [
  "", "Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun",
  "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr",
];

export default function Payroll() {
  const { userRole } = useAppStore();
  const queryClient = useQueryClient();

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const [month, setMonth] = useState(currentMonth);
  const [year, setYear] = useState(currentYear);
  const [approveTarget, setApproveTarget] = useState<PayrollRecord | null>(null);
  const [payTarget, setPayTarget] = useState<PayrollRecord | null>(null);
  const [notes, setNotes] = useState("");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["/api/payroll", month, year],
    queryFn: () => apiClient.get(`/api/payroll?month=${month}&year=${year}`)
      .then(r => r.data as { data: PayrollRecord[]; total: number; totalAmount: number }),
  });

  const calculateMutation = useMutation({
    mutationFn: () => apiClient.post("/api/payroll/calculate", { month, year }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/payroll"] }),
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, notes }: { id: number; notes: string }) =>
      apiClient.patch(`/api/payroll/${id}/approve`, { notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payroll"] });
      setApproveTarget(null);
      setNotes("");
    },
  });

  const payMutation = useMutation({
    mutationFn: ({ id, notes }: { id: number; notes: string }) =>
      apiClient.patch(`/api/payroll/${id}/pay`, { notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payroll"] });
      setPayTarget(null);
      setNotes("");
    },
  });

  const records = data?.data || [];
  const totalAmount = data?.totalAmount || 0;
  const draftCount = records.filter(r => r.status === "draft").length;
  const approvedCount = records.filter(r => r.status === "approved").length;
  const paidCount = records.filter(r => r.status === "paid").length;
  const isAdmin = userRole === "admin";
  const isAccountant = userRole === "accountant" || userRole === "admin";

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold">Oylik Hisob-Kitob</h1>
            <p className="text-muted-foreground mt-1">Xodimlar oyliklarini hisoblash va tasdiqlash</p>
          </div>

          <div className="flex items-center gap-3 bg-card p-2 rounded-2xl border border-border/50 shadow-sm">
            <Select value={month.toString()} onValueChange={(v) => setMonth(Number(v))}>
              <SelectTrigger className="w-[120px] rounded-xl border-none focus:ring-0 bg-transparent font-medium">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                  <SelectItem key={m} value={m.toString()}>{MONTHS_UZ[m]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={year.toString()} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger className="w-[100px] rounded-xl border-none focus:ring-0 bg-transparent font-medium">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[currentYear - 1, currentYear, currentYear + 1].map(y => (
                  <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isAdmin && (
              <Button onClick={() => calculateMutation.mutate()} disabled={calculateMutation.isPending}
                className="rounded-xl gap-2">
                <Calculator className="w-4 h-4" />
                {calculateMutation.isPending ? "Hisoblanmoqda..." : "Hisoblash"}
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Jami xodim", value: records.length, icon: Users, color: "text-blue-600 bg-blue-50" },
            { label: "Qoralama", value: draftCount, icon: Clock, color: "text-gray-600 bg-gray-50" },
            { label: "Tasdiqlangan", value: approvedCount, icon: CheckCircle2, color: "text-blue-600 bg-blue-50" },
            { label: "To'langan", value: paidCount, icon: CheckCheck, color: "text-green-600 bg-green-50" },
          ].map(stat => (
            <Card key={stat.label} className="p-4">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${stat.color}`}>
                <stat.icon className="w-4 h-4" />
              </div>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
            </Card>
          ))}
        </div>

        {records.length > 0 && (
          <Card className="p-4 bg-primary/5 border-primary/20 flex items-center gap-3">
            <CircleDollarSign className="w-6 h-6 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Jami oylik ({MONTHS_UZ[month]} {year})</p>
              <p className="text-xl font-bold text-primary">
                {totalAmount.toLocaleString("uz-UZ")} so'm
              </p>
            </div>
          </Card>
        )}

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Card key={i} className="p-4 h-20 animate-pulse" />)}
          </div>
        ) : records.length === 0 ? (
          <Card className="p-12 text-center">
            <Calculator className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="font-medium text-lg">Hisob-kitob yo'q</p>
            <p className="text-sm text-muted-foreground mt-1">
              {isAdmin ? '"Hisoblash" tugmasini bosib oylikni hisoblang' : 'Admin hali oylikni hisob-kitob qilmagan'}
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {records.map(record => {
              const statusConf = STATUS_CONFIG[record.status] || STATUS_CONFIG.draft;
              const StatusIcon = statusConf.icon;
              return (
                <Card key={record.id} className="p-4">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                        {record.employee?.fullName?.charAt(0) || "?"}
                      </div>
                      <div>
                        <p className="font-semibold">{record.employee?.fullName || "—"}</p>
                        <p className="text-xs text-muted-foreground">{record.employee?.position || "—"}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 flex-wrap">
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Ish kunlari</p>
                        <p className="font-medium">{record.totalDays} kun</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Ish soatlari</p>
                        <p className="font-medium">{record.totalHours.toFixed(1)} soat</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Oylik</p>
                        <p className="font-bold text-primary">{record.grossSalary.toLocaleString("uz-UZ")} so'm</p>
                      </div>
                      <Badge className={`${statusConf.color} border-0 gap-1`}>
                        <StatusIcon className="w-3 h-3" />
                        {statusConf.label}
                      </Badge>

                      <div className="flex gap-2">
                        {isAdmin && record.status === "draft" && (
                          <Button size="sm" variant="outline"
                            className="gap-1.5 rounded-lg border-blue-200 text-blue-700 hover:bg-blue-50"
                            onClick={() => { setApproveTarget(record); setNotes(""); }}>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Tasdiqlash
                          </Button>
                        )}
                        {isAccountant && record.status === "approved" && (
                          <Button size="sm"
                            className="gap-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => { setPayTarget(record); setNotes(""); }}>
                            <Banknote className="w-3.5 h-3.5" />
                            Berildi
                          </Button>
                        )}
                        {record.status === "paid" && record.paidAt && (
                          <span className="text-xs text-muted-foreground self-center">
                            {format(new Date(record.paidAt), "dd.MM.yyyy")} — {record.paidBy?.name}
                          </span>
                        )}
                        {record.status === "approved" && record.approvedAt && (
                          <span className="text-xs text-muted-foreground self-center">
                            {format(new Date(record.approvedAt), "dd.MM")} — {record.approvedBy?.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {record.notes && (
                    <p className="mt-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-1.5">
                      📝 {record.notes}
                    </p>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={!!approveTarget} onOpenChange={() => setApproveTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-blue-600" />
              Oylikni tasdiqlash
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {approveTarget && (
              <Card className="p-4 bg-blue-50 border-blue-200">
                <p className="font-semibold">{approveTarget.employee?.fullName}</p>
                <p className="text-sm text-muted-foreground mt-1">{approveTarget.employee?.position}</p>
                <p className="text-xl font-bold text-blue-700 mt-2">
                  {approveTarget.grossSalary.toLocaleString("uz-UZ")} so'm
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {approveTarget.totalDays} kun · {approveTarget.totalHours.toFixed(1)} soat
                </p>
              </Card>
            )}
            <div className="space-y-1.5">
              <Label>Izoh (ixtiyoriy)</Label>
              <Textarea placeholder="Tasdiq izohi..." value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveTarget(null)}>Bekor</Button>
            <Button disabled={approveMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() => approveTarget && approveMutation.mutate({ id: approveTarget.id, notes })}>
              {approveMutation.isPending ? "Tasdiqlanmoqda..." : "Tasdiqlash"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!payTarget} onOpenChange={() => setPayTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Banknote className="w-5 h-5 text-green-600" />
              Oylik berilganligini tasdiqlash
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {payTarget && (
              <Card className="p-4 bg-green-50 border-green-200">
                <p className="font-semibold">{payTarget.employee?.fullName}</p>
                <p className="text-sm text-muted-foreground mt-1">{payTarget.employee?.position}</p>
                <p className="text-xl font-bold text-green-700 mt-2">
                  {payTarget.grossSalary.toLocaleString("uz-UZ")} so'm
                </p>
                {payTarget.approvedBy && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Tasdiqlagan: {payTarget.approvedBy.name}
                  </p>
                )}
              </Card>
            )}
            <div className="space-y-1.5">
              <Label>To'lov izohi (ixtiyoriy)</Label>
              <Textarea placeholder="Naqd / bank o'tkazma..." value={notes}
                onChange={e => setNotes(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayTarget(null)}>Bekor</Button>
            <Button disabled={payMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
              onClick={() => payTarget && payMutation.mutate({ id: payTarget.id, notes })}>
              {payMutation.isPending ? "Saqlanmoqda..." : "✓ Berildi"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
