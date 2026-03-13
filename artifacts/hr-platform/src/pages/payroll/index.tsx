import { useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { useAppStore } from "@/store/use-store";
import { useTranslation } from "@/lib/i18n";
import { useListPayroll, useCalculatePayroll } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Calculator } from "lucide-react";

export default function Payroll() {
  const { language } = useAppStore();
  const t = useTranslation(language);
  const queryClient = useQueryClient();
  
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  
  const [month, setMonth] = useState(currentMonth);
  const [year, setYear] = useState(currentYear);

  const { data: payroll, isLoading } = useListPayroll({ month, year });
  
  const calculateMutation = useCalculatePayroll({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/payroll"] });
      }
    }
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold">{t('payroll')}</h1>
            <p className="text-muted-foreground mt-1">Calculate and manage monthly employee salaries.</p>
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
            <Button 
              onClick={() => calculateMutation.mutate({ data: { month, year } })}
              disabled={calculateMutation.isPending}
              className="rounded-xl shadow-md"
            >
              <Calculator className="w-4 h-4 mr-2" />
              {t('calculate_payroll')}
            </Button>
          </div>
        </div>

        <Card className="rounded-2xl border-border/50 shadow-sm overflow-hidden bg-card">
          <div className="p-6 bg-muted/20 border-b border-border/50 flex justify-between items-center">
            <span className="font-semibold text-muted-foreground">Total Payroll Amount</span>
            <span className="text-2xl font-bold text-primary">${payroll?.totalAmount?.toLocaleString() || "0.00"}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-semibold">
                <tr>
                  <th className="px-6 py-4">{t('name')}</th>
                  <th className="px-6 py-4">{t('salary_type')}</th>
                  <th className="px-6 py-4 text-right">{t('total_hours')}</th>
                  <th className="px-6 py-4 text-right">{t('total_days')}</th>
                  <th className="px-6 py-4 text-right text-primary">{t('gross_salary')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {isLoading ? (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">{t('loading')}</td></tr>
                ) : payroll?.data.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">No payroll calculated for this month.</td></tr>
                ) : (
                  payroll?.data.map((record) => (
                    <tr key={record.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4 font-medium">{record.employee.fullName}</td>
                      <td className="px-6 py-4 text-muted-foreground uppercase text-xs font-semibold">{record.employee.salaryType}</td>
                      <td className="px-6 py-4 text-right">{record.totalHours.toFixed(1)}h</td>
                      <td className="px-6 py-4 text-right">{record.totalDays}</td>
                      <td className="px-6 py-4 text-right font-bold text-base">${record.grossSalary.toLocaleString()}</td>
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
