import { useState } from "react";
import { useLocation, useParams, Link } from "wouter";
import { apiClient } from "@/lib/api-client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Shield, Building2, Users, CalendarCheck, ArrowLeft,
  Phone, Mail, MapPin, UserCheck, Banknote, Clock, Settings,
  Trash2, CalendarX, CreditCard, FileText,
} from "lucide-react";
import { format } from "date-fns";

const PLAN_COLORS: Record<string, string> = {
  free: "bg-slate-700 text-slate-300",
  starter: "bg-cyan-500/20 text-cyan-400",
  business: "bg-purple-500/20 text-purple-400",
  enterprise: "bg-amber-500/20 text-amber-400",
};

const PLANS = ["free", "starter", "business", "enterprise"];

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  present: { label: "Keldi", color: "bg-green-500/20 text-green-400" },
  late: { label: "Kechikdi", color: "bg-amber-500/20 text-amber-400" },
  checked_out: { label: "Ketdi", color: "bg-blue-500/20 text-blue-400" },
  absent: { label: "Kelmadi", color: "bg-red-500/20 text-red-400" },
};

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  admin: { label: "Admin", color: "bg-purple-500/20 text-purple-400" },
  hr: { label: "HR", color: "bg-blue-500/20 text-blue-400" },
  accountant: { label: "Buxgalter", color: "bg-green-500/20 text-green-400" },
  observer: { label: "Kuzatuvchi", color: "bg-slate-700 text-slate-400" },
  viewer: { label: "Ko'ruvchi", color: "bg-slate-700 text-slate-400" },
};

type TabType = "employees" | "admins" | "attendance" | "payroll" | "requests";

export default function PlatformAdminCompany() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<TabType>("employees");
  const [changePlan, setChangePlan] = useState(false);
  const id = params.id;
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/platform-admin/companies", id],
    queryFn: () => apiClient.get(`/api/platform-admin/companies/${id}`),
    retry: false,
  });

  const planMutation = useMutation({
    mutationFn: (plan: string) => apiClient.patch(`/api/platform-admin/companies/${id}/plan`, { plan }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/platform-admin/companies", id] });
      qc.invalidateQueries({ queryKey: ["/api/platform-admin/companies"] });
      setChangePlan(false);
    },
  });

  if (error) {
    setLocation("/platform-admin/login");
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const { company, admins, employees, recentAttendance, leaveRequests, advanceRequests, stats } = (data as any) || {};

  const tabs: Array<{ key: TabType; label: string; icon: any; count?: number }> = [
    { key: "employees", label: "Xodimlar", icon: Users, count: stats?.totalEmployees },
    { key: "admins", label: "Foydalanuvchilar", icon: UserCheck, count: stats?.totalAdmins },
    { key: "attendance", label: "Davomat", icon: CalendarCheck, count: stats?.totalAttendance },
    { key: "payroll", label: "Oylik hisobi", icon: Banknote },
    { key: "requests", label: "So'rovlar", icon: FileText, count: (stats?.pendingLeave || 0) + (stats?.pendingAdvance || 0) },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur px-6 py-4 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <Link href="/platform-admin/dashboard">
            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white gap-2 rounded-xl h-8 px-3">
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline text-xs">Orqaga</span>
            </Button>
          </Link>
          <div className="h-5 w-px bg-slate-700" />
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Building2 className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="font-semibold text-white leading-none">{company?.name}</p>
            <Badge className={`${PLAN_COLORS[company?.subscriptionPlan] || "bg-slate-700 text-slate-300"} border-0 text-xs mt-0.5`}>
              {company?.subscriptionPlan}
            </Badge>
          </div>
        </div>
        <Button size="sm" variant="ghost" onClick={() => setChangePlan(s => !s)}
          className="text-slate-400 hover:text-white hover:bg-slate-800 gap-2 rounded-xl h-8 px-3">
          <Settings className="w-4 h-4" />
          <span className="hidden sm:inline text-xs">Tarif</span>
        </Button>
      </header>

      {changePlan && (
        <div className="border-b border-slate-800 bg-slate-900/50 px-6 py-3 flex items-center gap-3">
          <p className="text-sm text-slate-400 mr-2">Tarif tanlang:</p>
          {PLANS.map(plan => (
            <button key={plan} onClick={() => planMutation.mutate(plan)}
              disabled={planMutation.isPending}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                company?.subscriptionPlan === plan
                  ? "bg-blue-600 text-white"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}>
              {plan}
            </button>
          ))}
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { label: "Xodimlar", value: stats?.totalEmployees || 0, icon: Users, color: "text-blue-400 bg-blue-500/10" },
            { label: "Bugun keldi", value: stats?.todayAttendance || 0, icon: CalendarCheck, color: "text-green-400 bg-green-500/10" },
            { label: "To'langan (UZS)", value: stats?.totalPayrollPaid ? (stats.totalPayrollPaid / 1_000_000).toFixed(1) + "M" : "0", icon: Banknote, color: "text-amber-400 bg-amber-500/10" },
            { label: "Foydalanuvchilar", value: stats?.totalAdmins || 0, icon: Shield, color: "text-purple-400 bg-purple-500/10" },
            { label: "Ta'til so'rov", value: stats?.pendingLeave || 0, icon: CalendarX, color: "text-cyan-400 bg-cyan-500/10" },
            { label: "Avans so'rov", value: stats?.pendingAdvance || 0, icon: CreditCard, color: "text-orange-400 bg-orange-500/10" },
          ].map(stat => (
            <Card key={stat.label} className="bg-slate-900 border-slate-800 p-4">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center mb-2 ${stat.color}`}>
                <stat.icon className="w-3.5 h-3.5" />
              </div>
              <p className="text-xl font-bold text-white">{stat.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{stat.label}</p>
            </Card>
          ))}
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <Card className="bg-slate-900 border-slate-800 p-4 sm:col-span-2">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-3">Korxona ma'lumotlari</p>
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              {company?.email && (
                <div className="flex items-center gap-2 text-slate-300">
                  <Mail className="w-4 h-4 text-slate-500 flex-shrink-0" />
                  <span className="truncate">{company.email}</span>
                </div>
              )}
              {company?.phone && (
                <div className="flex items-center gap-2 text-slate-300">
                  <Phone className="w-4 h-4 text-slate-500 flex-shrink-0" />
                  <span>{company.phone}</span>
                </div>
              )}
              {company?.address && (
                <div className="flex items-center gap-2 text-slate-300 sm:col-span-2">
                  <MapPin className="w-4 h-4 text-slate-500 flex-shrink-0" />
                  <span>{company.address}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-slate-400">
                <Clock className="w-4 h-4 text-slate-500 flex-shrink-0" />
                <span>Ro'yxatdan: {company?.createdAt ? format(new Date(company.createdAt), "dd.MM.yyyy HH:mm") : "—"}</span>
              </div>
            </div>
          </Card>
          <Card className="bg-slate-900 border-slate-800 p-4">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-3">Adminlar</p>
            <div className="space-y-2">
              {admins?.slice(0, 3).map((admin: any) => {
                const r = ROLE_LABELS[admin.role] || { label: admin.role, color: "bg-slate-700 text-slate-400" };
                return (
                  <div key={admin.id} className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">{admin.name}</p>
                      <p className="text-xs text-slate-500 truncate">{admin.login || admin.email}</p>
                    </div>
                    <Badge className={`${r.color} border-0 text-xs flex-shrink-0`}>{r.label}</Badge>
                  </div>
                );
              })}
              {(admins?.length || 0) > 3 && (
                <p className="text-xs text-slate-600">+{admins.length - 3} ta yana</p>
              )}
            </div>
          </Card>
        </div>

        <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1 overflow-x-auto">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap flex-shrink-0 ${
                activeTab === t.key ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}>
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
              {t.count != null && t.count > 0 && (
                <span className={`px-1.5 py-0.5 rounded-md text-xs font-bold ${
                  activeTab === t.key ? "bg-white/20 text-white" : "bg-slate-700 text-slate-300"
                }`}>{t.count}</span>
              )}
            </button>
          ))}
        </div>

        {activeTab === "employees" && (
          <Card className="bg-slate-900 border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-950/50">
                    <th className="text-left px-5 py-3 text-xs text-slate-500">Ism</th>
                    <th className="text-left px-5 py-3 text-xs text-slate-500">Lavozim</th>
                    <th className="text-left px-5 py-3 text-xs text-slate-500">Telefon</th>
                    <th className="text-left px-5 py-3 text-xs text-slate-500">Oylik turi</th>
                    <th className="text-left px-5 py-3 text-xs text-slate-500">Maosh</th>
                    <th className="text-left px-5 py-3 text-xs text-slate-500">Davomat</th>
                    <th className="text-left px-5 py-3 text-xs text-slate-500">So'nggi hisob</th>
                    <th className="text-left px-5 py-3 text-xs text-slate-500">Jami to'langan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {employees?.map((emp: any) => (
                    <tr key={emp.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-blue-600/20 flex items-center justify-center text-blue-400 text-xs font-bold">
                            {emp.fullName?.charAt(0)}
                          </div>
                          <span className="text-white font-medium whitespace-nowrap">{emp.fullName}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-slate-300">{emp.position || "—"}</td>
                      <td className="px-5 py-3.5 text-slate-400 text-xs">{emp.phone || "—"}</td>
                      <td className="px-5 py-3.5">
                        <Badge className="bg-slate-800 text-slate-300 border-0 text-xs">
                          {emp.salaryType === "monthly" ? "Oylik" : emp.salaryType === "hourly" ? "Soatbay" : emp.salaryType === "daily" ? "Kunbay" : "Ishbay"}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5 text-amber-400 font-medium whitespace-nowrap">
                        {emp.monthlySalary ? emp.monthlySalary.toLocaleString() + " so'm" :
                         emp.hourlyRate ? emp.hourlyRate.toLocaleString() + "/soat" : "—"}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-white font-medium">{emp.attendanceDays}</span>
                        <span className="text-slate-500 text-xs ml-1">kun</span>
                      </td>
                      <td className="px-5 py-3.5">
                        {emp.lastPayroll ? (
                          <div>
                            <p className="text-white text-xs whitespace-nowrap">
                              {emp.lastPayroll.month}/{emp.lastPayroll.year} — {emp.lastPayroll.netSalary?.toLocaleString()} so'm
                            </p>
                            <Badge className={`border-0 text-xs mt-0.5 ${
                              emp.lastPayroll.status === "paid" ? "bg-green-500/20 text-green-400" :
                              emp.lastPayroll.status === "approved" ? "bg-blue-500/20 text-blue-400" :
                              "bg-slate-700 text-slate-400"
                            }`}>
                              {emp.lastPayroll.status === "paid" ? "To'langan" :
                               emp.lastPayroll.status === "approved" ? "Tasdiqlangan" : "Qoralama"}
                            </Badge>
                          </div>
                        ) : <span className="text-slate-600 text-xs">—</span>}
                      </td>
                      <td className="px-5 py-3.5 text-green-400 font-medium whitespace-nowrap">
                        {emp.totalPaidSalary > 0 ? emp.totalPaidSalary.toLocaleString() + " so'm" : "—"}
                      </td>
                    </tr>
                  ))}
                  {employees?.length === 0 && (
                    <tr><td colSpan={8} className="text-center py-10 text-slate-500">Xodimlar yo'q</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {activeTab === "admins" && (
          <Card className="bg-slate-900 border-slate-800 overflow-hidden">
            <div className="divide-y divide-slate-800">
              {admins?.map((admin: any) => {
                const r = ROLE_LABELS[admin.role] || { label: admin.role, color: "bg-slate-700 text-slate-400" };
                return (
                  <div key={admin.id} className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-slate-800/40">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-purple-600/20 flex items-center justify-center text-purple-400 font-bold">
                        {admin.name?.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-white">{admin.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {admin.login && <span className="text-xs text-slate-500 font-mono">{admin.login}</span>}
                          {admin.email && <span className="text-xs text-slate-600">{admin.email}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={`${r.color} border-0`}>{r.label}</Badge>
                      <p className="text-xs text-slate-600">{admin.createdAt ? format(new Date(admin.createdAt), "dd.MM.yy") : "—"}</p>
                    </div>
                  </div>
                );
              })}
              {admins?.length === 0 && (
                <div className="text-center py-10 text-slate-500">Foydalanuvchilar yo'q</div>
              )}
            </div>
          </Card>
        )}

        {activeTab === "attendance" && (
          <Card className="bg-slate-900 border-slate-800 overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <p className="font-medium text-white text-sm">So'nggi {recentAttendance?.length || 0} ta davomat yozuvi</p>
              <Badge className="bg-green-500/20 text-green-400 border-0 text-xs">Bugun: {stats?.todayAttendance || 0}</Badge>
            </div>
            <div className="divide-y divide-slate-800 max-h-[600px] overflow-y-auto">
              {recentAttendance?.map((att: any) => {
                const s = STATUS_LABELS[att.status] || STATUS_LABELS.absent;
                return (
                  <div key={att.id} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-slate-800/30">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 text-xs font-bold">
                        {att.employeeName?.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{att.employeeName}</p>
                        <p className="text-xs text-slate-500">
                          {att.createdAt ? format(new Date(att.createdAt), "dd.MM.yy HH:mm") : "—"}
                          {att.checkIn && <span className="ml-2 text-green-500">Kirish: {att.checkIn}</span>}
                          {att.checkOut && <span className="ml-2 text-blue-400">Chiqish: {att.checkOut}</span>}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {att.lateMinutes > 0 && (
                        <span className="text-xs text-amber-400">+{att.lateMinutes}m kech</span>
                      )}
                      {att.workHours && (
                        <span className="text-xs text-slate-500">{parseFloat(att.workHours).toFixed(1)}s</span>
                      )}
                      <Badge className={`${s.color} border-0 text-xs`}>{s.label}</Badge>
                    </div>
                  </div>
                );
              })}
              {recentAttendance?.length === 0 && (
                <div className="text-center py-10 text-slate-500">Davomat ma'lumoti yo'q</div>
              )}
            </div>
          </Card>
        )}

        {activeTab === "payroll" && (
          <Card className="bg-slate-900 border-slate-800 overflow-hidden">
            <div className="p-4 border-b border-slate-800">
              <p className="font-medium text-white text-sm">Jami to'langan oylik fondi</p>
              <p className="text-2xl font-bold text-amber-400 mt-1">
                {stats?.totalPayrollPaid ? stats.totalPayrollPaid.toLocaleString() + " so'm" : "0"}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-950/50">
                    <th className="text-left px-5 py-3 text-xs text-slate-500">Xodim</th>
                    <th className="text-left px-5 py-3 text-xs text-slate-500">Oy/Yil</th>
                    <th className="text-left px-5 py-3 text-xs text-slate-500">Oylik</th>
                    <th className="text-left px-5 py-3 text-xs text-slate-500">Sof</th>
                    <th className="text-left px-5 py-3 text-xs text-slate-500">Holat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {employees?.filter((e: any) => e.lastPayroll).map((emp: any) => (
                    <tr key={emp.id} className="hover:bg-slate-800/40">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-blue-600/20 flex items-center justify-center text-blue-400 text-xs font-bold">
                            {emp.fullName?.charAt(0)}
                          </div>
                          <span className="text-white text-sm">{emp.fullName}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-slate-400 text-xs">
                        {emp.lastPayroll.month}/{emp.lastPayroll.year}
                      </td>
                      <td className="px-5 py-3.5 text-slate-300">
                        {emp.lastPayroll.grossSalary?.toLocaleString()} so'm
                      </td>
                      <td className="px-5 py-3.5 text-amber-400 font-medium">
                        {emp.lastPayroll.netSalary?.toLocaleString()} so'm
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge className={`border-0 text-xs ${
                          emp.lastPayroll.status === "paid" ? "bg-green-500/20 text-green-400" :
                          emp.lastPayroll.status === "approved" ? "bg-blue-500/20 text-blue-400" :
                          "bg-slate-700 text-slate-400"
                        }`}>
                          {emp.lastPayroll.status === "paid" ? "To'langan" :
                           emp.lastPayroll.status === "approved" ? "Tasdiqlangan" : "Qoralama"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                  {employees?.filter((e: any) => e.lastPayroll).length === 0 && (
                    <tr><td colSpan={5} className="text-center py-10 text-slate-500">Oylik hisob yo'q</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {activeTab === "requests" && (
          <div className="grid sm:grid-cols-2 gap-4">
            <Card className="bg-slate-900 border-slate-800">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <p className="font-medium text-white text-sm">Ta'til so'rovlari</p>
                <Badge className="bg-amber-500/20 text-amber-400 border-0 text-xs">
                  Kutilmoqda: {stats?.pendingLeave || 0}
                </Badge>
              </div>
              <div className="divide-y divide-slate-800 max-h-80 overflow-y-auto">
                {leaveRequests?.map((lr: any) => {
                  const emp = employees?.find((e: any) => e.id === lr.employeeId);
                  return (
                    <div key={lr.id} className="px-4 py-3 hover:bg-slate-800/30">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm text-white">{emp?.fullName || "—"}</p>
                        <Badge className={`border-0 text-xs ${
                          lr.status === "approved" ? "bg-green-500/20 text-green-400" :
                          lr.status === "pending" ? "bg-amber-500/20 text-amber-400" :
                          "bg-red-500/20 text-red-400"
                        }`}>
                          {lr.status === "approved" ? "Tasdiqlandi" : lr.status === "pending" ? "Kutilmoqda" : "Rad etildi"}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {lr.startDate} — {lr.endDate} · {lr.leaveType}
                      </p>
                    </div>
                  );
                })}
                {leaveRequests?.length === 0 && (
                  <div className="text-center py-8 text-slate-500 text-sm">Ta'til so'rovlari yo'q</div>
                )}
              </div>
            </Card>

            <Card className="bg-slate-900 border-slate-800">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <p className="font-medium text-white text-sm">Avans so'rovlari</p>
                <Badge className="bg-blue-500/20 text-blue-400 border-0 text-xs">
                  Kutilmoqda: {stats?.pendingAdvance || 0}
                </Badge>
              </div>
              <div className="divide-y divide-slate-800 max-h-80 overflow-y-auto">
                {advanceRequests?.map((ar: any) => {
                  const emp = employees?.find((e: any) => e.id === ar.employeeId);
                  return (
                    <div key={ar.id} className="px-4 py-3 hover:bg-slate-800/30">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm text-white">{emp?.fullName || "—"}</p>
                        <Badge className={`border-0 text-xs ${
                          ar.status === "approved" ? "bg-green-500/20 text-green-400" :
                          ar.status === "pending" ? "bg-amber-500/20 text-amber-400" :
                          "bg-red-500/20 text-red-400"
                        }`}>
                          {ar.status === "approved" ? "Tasdiqlandi" : ar.status === "pending" ? "Kutilmoqda" : "Rad etildi"}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {ar.amount ? Number(ar.amount).toLocaleString() + " so'm" : "—"}
                      </p>
                    </div>
                  );
                })}
                {advanceRequests?.length === 0 && (
                  <div className="text-center py-8 text-slate-500 text-sm">Avans so'rovlari yo'q</div>
                )}
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
