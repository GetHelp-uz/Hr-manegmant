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
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Calculator, CheckCircle2, Banknote, Clock, CircleDollarSign, Users,
  CheckCheck, Download, Package, TrendingUp, Minus
} from "lucide-react";
import { format } from "date-fns";
import { useLocation } from "wouter";

interface PayrollRecord {
  id: number;
  employeeId: number;
  month: number;
  year: number;
  totalHours: number;
  totalDays: number;
  totalPieces: number;
  grossSalary: number;
  bonusAmount: number;
  deductions: number;
  netSalary: number;
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
    dailyRate: number | null;
    pieceRate: number | null;
    pieceRatePlan: number;
    bonusPercent: number;
  } | null;
  createdAt: string;
}

const STATUS_CONFIG = {
  draft: { label: "Qoralama", color: "bg-gray-100 text-gray-700", icon: Clock },
  approved: { label: "Tasdiqlangan", color: "bg-blue-100 text-blue-700", icon: CheckCircle2 },
  paid: { label: "To'langan", color: "bg-green-100 text-green-700", icon: CheckCheck },
};

const SALARY_TYPE_LABELS: Record<string, string> = {
  monthly: "📅 Oylik",
  hourly: "⏱ Soatlik",
  daily: "☀️ Kunlik",
  piecerate: "🎯 Ishbay",
};

const MONTHS_UZ = [
  "", "Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun",
  "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr",
];

export default function Payroll() {
  const { userRole } = useAppStore();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const [month, setMonth] = useState(currentMonth);
  const [year, setYear] = useState(currentYear);
  const [approveTarget, setApproveTarget] = useState<PayrollRecord | null>(null);
  const [payTarget, setPayTarget] = useState<PayrollRecord | null>(null);
  const [piecesTarget, setPiecesTarget] = useState<PayrollRecord | null>(null);
  const [notes, setNotes] = useState("");
  const [piecesForm, setPiecesForm] = useState({ totalPieces: 0, bonusAmount: 0, deductions: 0 });

  const { data, isLoading } = useQuery({
    queryKey: ["/api/payroll", month, year],
    queryFn: () => apiClient.get(`/api/payroll?month=${month}&year=${year}`)
      .then(r => r.data as { data: PayrollRecord[]; total: number; totalAmount: number }),
  });

  const calculateMutation = useMutation({
    mutationFn: () => apiClient.post("/api/payroll/calculate", { month, year }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payroll"] });
      toast({ title: "Hisoblab chiqildi!", description: `${MONTHS_UZ[month]} ${year} uchun oyliklar hisoblandi` });
    },
    onError: () => toast({ variant: "destructive", title: "Xatolik", description: "Hisoblashda muammo yuz berdi" }),
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, notes }: { id: number; notes: string }) =>
      apiClient.patch(`/api/payroll/${id}/approve`, { notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payroll"] });
      setApproveTarget(null); setNotes("");
      toast({ title: "Tasdiqlandi!" });
    },
  });

  const payMutation = useMutation({
    mutationFn: ({ id, notes }: { id: number; notes: string }) =>
      apiClient.patch(`/api/payroll/${id}/pay`, { notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payroll"] });
      setPayTarget(null); setNotes("");
      toast({ title: "To'lov qayd etildi!" });
    },
  });

  const piecesMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiClient.patch(`/api/payroll/${id}/pieces`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payroll"] });
      setPiecesTarget(null);
      toast({ title: "Dona va bonus saqlandi!" });
    },
    onError: () => toast({ variant: "destructive", title: "Xatolik" }),
  });

  const records = data?.data || [];
  const totalAmount = data?.totalAmount || 0;
  const draftCount = records.filter(r => r.status === "draft").length;
  const approvedCount = records.filter(r => r.status === "approved").length;
  const paidCount = records.filter(r => r.status === "paid").length;
  const isAdmin = userRole === "admin";
  const isAccountant = userRole === "accountant" || userRole === "admin";

  function openPieces(record: PayrollRecord) {
    setPiecesForm({
      totalPieces: record.totalPieces || 0,
      bonusAmount: record.bonusAmount || 0,
      deductions: record.deductions || 0,
    });
    setPiecesTarget(record);
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold">Oylik Hisob-Kitob</h1>
            <p className="text-muted-foreground mt-1">Xodimlar oyliklarini hisoblash va tasdiqlash</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 bg-card p-2 rounded-2xl border border-border/50 shadow-sm">
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
            </div>
            {isAdmin && (
              <Button onClick={() => calculateMutation.mutate()} disabled={calculateMutation.isPending}
                className="rounded-xl gap-2">
                <Calculator className="w-4 h-4" />
                {calculateMutation.isPending ? "Hisoblanmoqda..." : "Hisoblash"}
              </Button>
            )}
            {isAccountant && (
              <Button variant="outline" className="rounded-xl gap-2" onClick={() => navigate("/export")}>
                <Download className="w-4 h-4" />
                Eksport
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
              <p className="text-sm text-muted-foreground">Jami to'lov ({MONTHS_UZ[month]} {year})</p>
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
              const isPiecerate = record.employee?.salaryType === "piecerate";
              const netSalary = record.netSalary || record.grossSalary || 0;
              const hasBonus = (record.bonusAmount || 0) > 0;
              const hasDeductions = (record.deductions || 0) > 0;

              return (
                <Card key={record.id} className="p-4">
                  <div className="flex items-start justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                        {record.employee?.fullName?.charAt(0) || "?"}
                      </div>
                      <div>
                        <p className="font-semibold">{record.employee?.fullName || "—"}</p>
                        <p className="text-xs text-muted-foreground">{record.employee?.position || "—"}</p>
                        <span className="text-[11px] text-muted-foreground">
                          {SALARY_TYPE_LABELS[record.employee?.salaryType || "monthly"]}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Kun</p>
                        <p className="font-medium text-sm">{record.totalDays}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Soat</p>
                        <p className="font-medium text-sm">{record.totalHours.toFixed(1)}</p>
                      </div>
                      {isPiecerate && (
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Dona</p>
                          <p className="font-medium text-sm">{record.totalPieces || 0}</p>
                        </div>
                      )}
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Hisoblangan</p>
                        <p className="font-medium text-sm">{(record.grossSalary || 0).toLocaleString("uz-UZ")}</p>
                      </div>
                      {hasBonus && (
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground flex items-center justify-end gap-0.5"><TrendingUp className="w-3 h-3 text-green-500" />Bonus</p>
                          <p className="font-medium text-sm text-green-600">+{(record.bonusAmount || 0).toLocaleString("uz-UZ")}</p>
                        </div>
                      )}
                      {hasDeductions && (
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground flex items-center justify-end gap-0.5"><Minus className="w-3 h-3 text-red-500" />Ushlab qolish</p>
                          <p className="font-medium text-sm text-red-600">-{(record.deductions || 0).toLocaleString("uz-UZ")}</p>
                        </div>
                      )}
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground font-medium">Toza to'lov</p>
                        <p className="font-bold text-primary">{netSalary.toLocaleString("uz-UZ")} so'm</p>
                      </div>
                      <Badge className={`${statusConf.color} border-0 gap-1`}>
                        <StatusIcon className="w-3 h-3" />
                        {statusConf.label}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-3 flex-wrap">
                    {isAdmin && isPiecerate && record.status === "draft" && (
                      <Button size="sm" variant="outline" className="gap-1.5 rounded-lg"
                        onClick={() => openPieces(record)}>
                        <Package className="w-3.5 h-3.5" />
                        Dona kiritish
                      </Button>
                    )}
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
                      <span className="text-xs text-muted-foreground">
                        ✓ {format(new Date(record.paidAt), "dd.MM.yyyy")} — {record.paidBy?.name}
                      </span>
                    )}
                    {record.status === "approved" && record.approvedAt && (
                      <span className="text-xs text-muted-foreground">
                        ✓ Tasdiqlagan: {record.approvedBy?.name} ({format(new Date(record.approvedAt), "dd.MM")})
                      </span>
                    )}
                    {record.notes && (
                      <span className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-2 py-1">
                        📝 {record.notes}
                      </span>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Piecerate pieces dialog */}
      <Dialog open={!!piecesTarget} onOpenChange={() => setPiecesTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-violet-600" />
              Ishbay hisoblash — {piecesTarget?.employee?.fullName}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {piecesTarget?.employee && (
              <div className="rounded-xl bg-violet-50 border border-violet-200 p-3 text-sm space-y-1">
                <p>1 dona narxi: <strong>{(piecesTarget.employee.pieceRate || 0).toLocaleString("uz-UZ")} so'm</strong></p>
                {piecesTarget.employee.pieceRatePlan > 0 && (
                  <p>Oylik plan: <strong>{piecesTarget.employee.pieceRatePlan} dona</strong></p>
                )}
                {piecesTarget.employee.bonusPercent > 0 && (
                  <p>Bonus foizi: <strong>{piecesTarget.employee.bonusPercent}%</strong> (plan oshganda)</p>
                )}
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Bajarilgan dona soni</Label>
              <Input type="number" min={0}
                value={piecesForm.totalPieces}
                onChange={e => setPiecesForm(p => ({ ...p, totalPieces: Number(e.target.value) }))}
                className="rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-green-700 flex items-center gap-1"><TrendingUp className="w-3 h-3" />Qo'shimcha bonus (so'm)</Label>
                <Input type="number" min={0}
                  value={piecesForm.bonusAmount}
                  onChange={e => setPiecesForm(p => ({ ...p, bonusAmount: Number(e.target.value) }))}
                  className="rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-red-700 flex items-center gap-1"><Minus className="w-3 h-3" />Ushlab qolish (so'm)</Label>
                <Input type="number" min={0}
                  value={piecesForm.deductions}
                  onChange={e => setPiecesForm(p => ({ ...p, deductions: Number(e.target.value) }))}
                  className="rounded-xl" />
              </div>
            </div>
            {piecesTarget?.employee?.pieceRate && piecesForm.totalPieces > 0 && (
              <div className="rounded-xl bg-muted/50 p-3 text-sm space-y-1">
                <p className="text-muted-foreground">Hisoblangan:</p>
                {(() => {
                  const emp = piecesTarget.employee!;
                  const rate = emp.pieceRate || 0;
                  const plan = emp.pieceRatePlan || 0;
                  const pieces = piecesForm.totalPieces;
                  const bonusPct = emp.bonusPercent || 0;
                  let base = pieces * rate;
                  let autoBonus = 0;
                  if (plan > 0 && pieces > plan) {
                    base = plan * rate + (pieces - plan) * rate;
                    autoBonus = (pieces - plan) * rate * (bonusPct / 100);
                  }
                  const total = base + autoBonus + piecesForm.bonusAmount - piecesForm.deductions;
                  return (
                    <>
                      <p>Asosiy: <strong>{base.toLocaleString("uz-UZ")} so'm</strong></p>
                      {autoBonus > 0 && <p className="text-green-600">Bonus (plan +{pieces - plan} dona): <strong>+{autoBonus.toLocaleString("uz-UZ")} so'm</strong></p>}
                      {piecesForm.bonusAmount > 0 && <p className="text-green-600">Qo'shimcha bonus: <strong>+{piecesForm.bonusAmount.toLocaleString("uz-UZ")} so'm</strong></p>}
                      {piecesForm.deductions > 0 && <p className="text-red-600">Ushlab qolish: <strong>-{piecesForm.deductions.toLocaleString("uz-UZ")} so'm</strong></p>}
                      <p className="font-bold text-primary border-t pt-1 mt-1">Toza to'lov: {total.toLocaleString("uz-UZ")} so'm</p>
                    </>
                  );
                })()}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPiecesTarget(null)}>Bekor</Button>
            <Button disabled={piecesMutation.isPending} className="bg-violet-600 hover:bg-violet-700"
              onClick={() => piecesTarget && piecesMutation.mutate({ id: piecesTarget.id, data: piecesForm })}>
              {piecesMutation.isPending ? "Saqlanmoqda..." : "Saqlash"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve dialog */}
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
                  {(approveTarget.netSalary || approveTarget.grossSalary || 0).toLocaleString("uz-UZ")} so'm
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {approveTarget.totalDays} kun · {approveTarget.totalHours.toFixed(1)} soat
                  {approveTarget.employee?.salaryType === "piecerate" && ` · ${approveTarget.totalPieces || 0} dona`}
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
            <Button disabled={approveMutation.isPending} className="bg-blue-600 hover:bg-blue-700"
              onClick={() => approveTarget && approveMutation.mutate({ id: approveTarget.id, notes })}>
              {approveMutation.isPending ? "Tasdiqlanmoqda..." : "Tasdiqlash"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pay dialog */}
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
                  {(payTarget.netSalary || payTarget.grossSalary || 0).toLocaleString("uz-UZ")} so'm
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
            <Button disabled={payMutation.isPending} className="bg-green-600 hover:bg-green-700"
              onClick={() => payTarget && payMutation.mutate({ id: payTarget.id, notes })}>
              {payMutation.isPending ? "Saqlanmoqda..." : "✓ Berildi"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
