import { useLocation, useParams, Link } from "wouter";
import { apiClient } from "@/lib/api-client";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Shield, Building2, Users, CalendarCheck, ArrowLeft,
  User, Phone, Banknote, Clock, CheckCheck, CircleDollarSign,
} from "lucide-react";
import { format } from "date-fns";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  present: { label: "Keldi", color: "bg-green-500/20 text-green-400" },
  late: { label: "Kechikdi", color: "bg-amber-500/20 text-amber-400" },
  checked_out: { label: "Ketdi", color: "bg-blue-500/20 text-blue-400" },
  absent: { label: "Kelmadi", color: "bg-red-500/20 text-red-400" },
};

export default function PlatformAdminCompany() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const id = params.id;

  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/platform-admin/companies", id],
    queryFn: () => apiClient.get(`/api/platform-admin/companies/${id}`).then(r => r.data),
    retry: false,
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

  const { company, admins, employees, recentAttendance, stats } = data || {};

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Link href="/platform-admin/dashboard">
            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white gap-2 rounded-xl">
              <ArrowLeft className="w-4 h-4" />
              Orqaga
            </Button>
          </Link>
          <div className="h-6 w-px bg-slate-700" />
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-white">{company?.name}</span>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="bg-slate-900 border-slate-800 p-5">
            <div className="flex items-center gap-3 mb-3">
              <Building2 className="w-5 h-5 text-blue-400" />
              <span className="font-semibold text-white">Korxona ma'lumotlari</span>
            </div>
            <p className="text-2xl font-bold text-white mb-1">{company?.name}</p>
            <p className="text-sm text-slate-400">{company?.email}</p>
            <p className="text-sm text-slate-400">{company?.phone}</p>
            <Badge className="mt-3 bg-blue-500/20 text-blue-400 border-0">{company?.subscriptionPlan}</Badge>
            <p className="text-xs text-slate-500 mt-2">
              Ro'yxatdan o'tgan: {company?.createdAt ? format(new Date(company.createdAt), "dd.MM.yyyy") : "—"}
            </p>
          </Card>

          <Card className="bg-slate-900 border-slate-800 p-5">
            <div className="flex items-center gap-3 mb-3">
              <Users className="w-5 h-5 text-green-400" />
              <span className="font-semibold text-white">Statistika</span>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-400 text-sm">Jami xodimlar</span>
                <span className="font-bold text-white">{stats?.totalEmployees}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 text-sm">Bugungi davomat</span>
                <span className="font-bold text-green-400">{stats?.todayAttendance}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 text-sm">To'langan oyliklar</span>
                <span className="font-bold text-amber-400">{stats?.totalPayroll?.toLocaleString()} so'm</span>
              </div>
            </div>
          </Card>

          <Card className="bg-slate-900 border-slate-800 p-5">
            <div className="flex items-center gap-3 mb-3">
              <Shield className="w-5 h-5 text-purple-400" />
              <span className="font-semibold text-white">Foydalanuvchilar</span>
            </div>
            <div className="space-y-2">
              {admins?.map((admin: any) => (
                <div key={admin.id} className="flex items-center justify-between bg-slate-800 rounded-lg px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-white">{admin.name}</p>
                    <p className="text-xs text-slate-400">{admin.email}</p>
                  </div>
                  <Badge className={`border-0 text-xs ${
                    admin.role === "admin" ? "bg-purple-500/20 text-purple-400" :
                    admin.role === "accountant" ? "bg-blue-500/20 text-blue-400" :
                    "bg-slate-700 text-slate-400"
                  }`}>{admin.role}</Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <Card className="bg-slate-900 border-slate-800 p-6">
          <div className="flex items-center gap-3 mb-5">
            <Users className="w-5 h-5 text-green-400" />
            <h2 className="font-semibold text-white text-lg">Xodimlar va Oyliklar</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-3 text-slate-400 font-medium">Ism</th>
                  <th className="text-left py-3 text-slate-400 font-medium">Lavozim</th>
                  <th className="text-left py-3 text-slate-400 font-medium">Telefon</th>
                  <th className="text-left py-3 text-slate-400 font-medium">Oylik turi</th>
                  <th className="text-left py-3 text-slate-400 font-medium">Maosh</th>
                  <th className="text-left py-3 text-slate-400 font-medium">So'nggi hisob</th>
                </tr>
              </thead>
              <tbody>
                {employees?.map((emp: any) => (
                  <tr key={emp.id} className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors">
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-blue-600/20 flex items-center justify-center text-blue-400 text-xs font-bold">
                          {emp.fullName?.charAt(0)}
                        </div>
                        <span className="text-white font-medium">{emp.fullName}</span>
                      </div>
                    </td>
                    <td className="py-3 text-slate-300">{emp.position}</td>
                    <td className="py-3 text-slate-400">{emp.phone}</td>
                    <td className="py-3">
                      <Badge className="bg-slate-700 text-slate-300 border-0 text-xs">
                        {emp.salaryType === "monthly" ? "Oylik" : "Soatbay"}
                      </Badge>
                    </td>
                    <td className="py-3 text-amber-400 font-medium">
                      {emp.monthlySalary ? emp.monthlySalary.toLocaleString() + " so'm" :
                       emp.hourlyRate ? emp.hourlyRate.toLocaleString() + " so'm/soat" : "—"}
                    </td>
                    <td className="py-3">
                      {emp.lastPayroll ? (
                        <div>
                          <span className="text-white">{emp.lastPayroll.grossSalary.toLocaleString()} so'm</span>
                          <Badge className={`ml-2 border-0 text-xs ${
                            emp.lastPayroll.status === "paid" ? "bg-green-500/20 text-green-400" :
                            emp.lastPayroll.status === "approved" ? "bg-blue-500/20 text-blue-400" :
                            "bg-slate-700 text-slate-400"
                          }`}>
                            {emp.lastPayroll.status === "paid" ? "To'langan" :
                             emp.lastPayroll.status === "approved" ? "Tasdiqlangan" : "Qoralama"}
                          </Badge>
                        </div>
                      ) : <span className="text-slate-600">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {employees?.length === 0 && (
              <div className="text-center py-12 text-slate-500">Xodimlar yo'q</div>
            )}
          </div>
        </Card>

        <Card className="bg-slate-900 border-slate-800 p-6">
          <div className="flex items-center gap-3 mb-5">
            <CalendarCheck className="w-5 h-5 text-blue-400" />
            <h2 className="font-semibold text-white text-lg">So'nggi Davomat ({recentAttendance?.length || 0})</h2>
          </div>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {recentAttendance?.map((att: any) => {
              const s = STATUS_LABELS[att.status] || STATUS_LABELS.absent;
              return (
                <div key={att.id} className="flex items-center justify-between bg-slate-800 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 text-xs font-bold">
                      {att.employeeName?.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{att.employeeName}</p>
                      <p className="text-xs text-slate-500">
                        {att.createdAt ? format(new Date(att.createdAt), "dd.MM.yy HH:mm") : "—"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {att.lateMinutes > 0 && (
                      <span className="text-xs text-amber-400">+{att.lateMinutes}m kech</span>
                    )}
                    <Badge className={`${s.color} border-0 text-xs`}>{s.label}</Badge>
                  </div>
                </div>
              );
            })}
            {recentAttendance?.length === 0 && (
              <div className="text-center py-8 text-slate-500">Davomat ma'lumoti yo'q</div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
