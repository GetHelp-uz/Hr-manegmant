import { AppLayout } from "@/components/layout/app-layout";
import { useAppStore } from "@/store/use-store";
import { useTranslation } from "@/lib/i18n";
import { useListAttendance } from "@workspace/api-client-react";
import { format } from "date-fns";
import { Card } from "@/components/ui/card";

export default function Attendance() {
  const { language } = useAppStore();
  const t = useTranslation(language);
  
  const { data: attendance, isLoading } = useListAttendance({ limit: 50 });

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold">{t('attendance')}</h1>
          <p className="text-muted-foreground mt-1">Detailed logs of all employee check-ins and check-outs.</p>
        </div>

        <Card className="rounded-2xl border-border/50 shadow-sm overflow-hidden bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-semibold">
                <tr>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">{t('name')}</th>
                  <th className="px-6 py-4">{t('check_in')}</th>
                  <th className="px-6 py-4">{t('check_out')}</th>
                  <th className="px-6 py-4 text-right">Work Hours</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {isLoading ? (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">{t('loading')}</td></tr>
                ) : attendance?.data.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">{t('no_data')}</td></tr>
                ) : (
                  attendance?.data.map((record) => (
                    <tr key={record.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">
                        {format(new Date(record.createdAt), 'dd MMM yyyy')}
                      </td>
                      <td className="px-6 py-4 font-medium text-foreground">{record.employee.fullName}</td>
                      <td className="px-6 py-4 font-mono text-primary/80 bg-primary/5">
                        {record.checkIn ? format(new Date(record.checkIn), 'HH:mm:ss') : '-'}
                      </td>
                      <td className="px-6 py-4 font-mono text-amber-600/80 bg-amber-500/5">
                        {record.checkOut ? format(new Date(record.checkOut), 'HH:mm:ss') : '-'}
                      </td>
                      <td className="px-6 py-4 text-right font-semibold">
                        {record.workHours ? `${record.workHours.toFixed(2)}h` : '-'}
                      </td>
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
