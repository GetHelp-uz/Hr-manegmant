import { useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { useAppStore } from "@/store/use-store";
import { useTranslation } from "@/lib/i18n";
import { useGetAttendanceSummary } from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function Reports() {
  const { language } = useAppStore();
  const t = useTranslation(language);
  
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  
  const [month, setMonth] = useState(currentMonth);
  const [year, setYear] = useState(currentYear);

  const { data: summary, isLoading } = useGetAttendanceSummary({ month, year });

  const chartData = summary?.employeeSummaries.map(s => ({
    name: s.employee.fullName.split(' ')[0], // Just first name for chart fit
    Present: s.presentDays,
    Absent: s.absentDays,
    Late: s.lateDays
  })) || [];

  return (
    <AppLayout>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold">{t('reports')}</h1>
            <p className="text-muted-foreground mt-1">Monthly attendance analytics and summaries.</p>
          </div>
          
          <div className="flex items-center gap-3 bg-card p-2 rounded-2xl border border-border/50 shadow-sm">
            <Select value={month.toString()} onValueChange={(v) => setMonth(Number(v))}>
              <SelectTrigger className="w-[120px] rounded-xl border-none focus:ring-0 bg-transparent font-medium">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                  <SelectItem key={m} value={m.toString()}>Month {m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={year.toString()} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger className="w-[100px] rounded-xl border-none focus:ring-0 bg-transparent font-medium">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[year-1, year, year+1].map(y => (
                  <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Card className="p-6 rounded-3xl border-border/50 shadow-sm bg-card">
          <h3 className="text-lg font-bold mb-6">Attendance Overview Chart</h3>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                <Legend iconType="circle" wrapperStyle={{paddingTop: '20px'}}/>
                <Bar dataKey="Present" stackId="a" fill="#3b82f6" radius={[0, 0, 4, 4]} barSize={30} />
                <Bar dataKey="Late" stackId="a" fill="#f59e0b" />
                <Bar dataKey="Absent" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="rounded-3xl border-border/50 shadow-sm overflow-hidden bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-semibold">
                <tr>
                  <th className="px-6 py-4">{t('name')}</th>
                  <th className="px-6 py-4 text-center text-green-600">Present</th>
                  <th className="px-6 py-4 text-center text-amber-600">Late</th>
                  <th className="px-6 py-4 text-center text-red-600">Absent</th>
                  <th className="px-6 py-4 text-right">Avg Arrival</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {isLoading ? (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">{t('loading')}</td></tr>
                ) : summary?.employeeSummaries.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">{t('no_data')}</td></tr>
                ) : (
                  summary?.employeeSummaries.map((s) => (
                    <tr key={s.employee.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4 font-semibold">{s.employee.fullName}</td>
                      <td className="px-6 py-4 text-center font-medium bg-green-500/5">{s.presentDays}</td>
                      <td className="px-6 py-4 text-center font-medium bg-amber-500/5">{s.lateDays}</td>
                      <td className="px-6 py-4 text-center font-medium bg-red-500/5">{s.absentDays}</td>
                      <td className="px-6 py-4 text-right text-muted-foreground font-mono">{s.avgArrivalTime || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
