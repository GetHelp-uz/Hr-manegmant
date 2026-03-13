import { AppLayout } from "@/components/layout/app-layout";
import { useAppStore } from "@/store/use-store";
import { useTranslation } from "@/lib/i18n";
import { useGetCompanyStats, useGetTodayAttendance } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Users, UserCheck, UserX, Clock, Activity } from "lucide-react";
import { format } from "date-fns";

export default function Dashboard() {
  const { language } = useAppStore();
  const t = useTranslation(language);
  
  const { data: stats, isLoading: statsLoading } = useGetCompanyStats();
  const { data: attendance, isLoading: attendanceLoading } = useGetTodayAttendance();

  const statCards = [
    { title: t('total_employees'), value: stats?.totalEmployees || 0, icon: Users, color: "text-blue-500", bg: "bg-blue-500/10" },
    { title: t('present_today'), value: stats?.presentToday || 0, icon: UserCheck, color: "text-green-500", bg: "bg-green-500/10" },
    { title: t('absent_today'), value: stats?.absentToday || 0, icon: UserX, color: "text-red-500", bg: "bg-red-500/10" },
    { title: t('late_today'), value: stats?.lateToday || 0, icon: Clock, color: "text-amber-500", bg: "bg-amber-500/10" },
  ];

  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">{t('dashboard')}</h1>
          <p className="text-muted-foreground mt-1">Welcome back. Here's what's happening today.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat, i) => (
            <Card key={i} className="border-border/50 shadow-sm hover:shadow-md transition-all duration-300 rounded-2xl overflow-hidden group">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                    <p className="text-3xl font-display font-bold">{statsLoading ? "-" : stat.value}</p>
                  </div>
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.bg} ${stat.color} group-hover:scale-110 transition-transform`}>
                    <stat.icon className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Rate Card */}
        <Card className="border-border/50 shadow-sm rounded-2xl bg-gradient-to-r from-primary/5 to-transparent">
          <CardContent className="p-6 flex items-center gap-6">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-primary">
              <Activity className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t('attendance_rate')}</p>
              <div className="flex items-baseline gap-2">
                <p className="text-4xl font-display font-bold text-primary">{statsLoading ? "-" : `${stats?.attendanceRate}%`}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Attendance Table */}
        <div className="space-y-4">
          <h2 className="text-xl font-display font-bold">{t('recent_attendance')}</h2>
          <Card className="rounded-2xl border-border/50 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-semibold">
                  <tr>
                    <th className="px-6 py-4">{t('name')}</th>
                    <th className="px-6 py-4">{t('position')}</th>
                    <th className="px-6 py-4">{t('check_in')}</th>
                    <th className="px-6 py-4">{t('check_out')}</th>
                    <th className="px-6 py-4">{t('status')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {attendanceLoading ? (
                    <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">{t('loading')}</td></tr>
                  ) : attendance?.data.length === 0 ? (
                    <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">{t('no_data')}</td></tr>
                  ) : (
                    attendance?.data.slice(0, 10).map((record) => (
                      <tr key={record.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-4 font-medium">{record.employee.fullName}</td>
                        <td className="px-6 py-4 text-muted-foreground">{record.employee.position}</td>
                        <td className="px-6 py-4">{record.checkIn ? format(new Date(record.checkIn), 'HH:mm') : '-'}</td>
                        <td className="px-6 py-4">{record.checkOut ? format(new Date(record.checkOut), 'HH:mm') : '-'}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold
                            ${record.checkIn ? 'bg-green-100 text-green-700 dark:bg-green-500/20' : 'bg-red-100 text-red-700 dark:bg-red-500/20'}
                          `}>
                            {record.checkIn ? 'Present' : 'Absent'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
