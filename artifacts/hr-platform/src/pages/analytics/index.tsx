import { useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line,
  Cell, PieChart, Pie, Legend
} from "recharts";
import {
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Info,
  Users, Clock, Calendar, Banknote, Brain, Lightbulb, ShieldAlert,
  Activity
} from "lucide-react";

const MONTHS = ["", "Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun",
  "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr"];

const RISK_ICONS: Record<string, any> = {
  danger: { icon: ShieldAlert, color: "text-red-600", bg: "bg-red-50 border-red-200" },
  warning: { icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50 border-amber-200" },
  info: { icon: Info, color: "text-blue-600", bg: "bg-blue-50 border-blue-200" },
};

const COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

export default function AnalyticsPage() {
  const now = new Date();
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const years = [now.getFullYear() - 1, now.getFullYear()];

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["/api/analytics/overview", month, year],
    queryFn: () => apiClient.get(`/api/analytics/overview?month=${month}&year=${year}`)
      .then(r => r.data as any),
    staleTime: 30000,
  });

  const ov = data?.overview;
  const trend = data?.trend || [];
  const empStats = data?.employeeStats || [];
  const risks = data?.risks || [];
  const recs = data?.recommendations || [];

  const salaryTypePie = empStats.length > 0 ? [
    { name: "Yaxshi davomat (7+ kun)", value: empStats.filter((e: any) => e.days >= 7).length, color: "#22c55e" },
    { name: "O'rtacha (3-6 kun)", value: empStats.filter((e: any) => e.days >= 3 && e.days < 7).length, color: "#f59e0b" },
    { name: "Kam (<3 kun)", value: empStats.filter((e: any) => e.days < 3).length, color: "#ef4444" },
  ].filter(s => s.value > 0) : [];

  return (
    <AppLayout>
      <div className="space-y-8 max-w-6xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Brain className="w-5 h-5 text-primary" />
              </div>
              AI Tahlil
            </h1>
            <p className="text-muted-foreground mt-1">Aqlli hisobotlar va tavsiyalar</p>
          </div>
          <div className="flex items-center gap-2 bg-card p-2 rounded-2xl border border-border/50">
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger className="w-32 border-none bg-transparent rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.slice(1).map((m, i) => (
                  <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="w-24 border-none bg-transparent rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => <Card key={i} className="h-28 animate-pulse" />)}
          </div>
        ) : !ov ? (
          <Card className="p-12 text-center">
            <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="font-medium">Ma'lumot topilmadi</p>
          </Card>
        ) : (
          <>
            {/* KPI cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "Jami xodim", value: ov.totalEmployees, icon: Users, color: "text-blue-600 bg-blue-50", sub: "ro'yxatda" },
                { label: "Davomat kunlari", value: ov.totalDays, icon: Calendar, color: "text-green-600 bg-green-50", sub: `${MONTHS[parseInt(month)]} oyi` },
                { label: "O'rt. ish soati", value: `${ov.avgHoursPerDay}s`, icon: Clock, color: "text-violet-600 bg-violet-50", sub: "kuniga o'rtacha" },
                { label: "Kechikish", value: `${ov.lateRate}%`, icon: AlertTriangle, color: parseFloat(ov.lateRate) > 20 ? "text-red-600 bg-red-50" : "text-amber-600 bg-amber-50", sub: `${ov.lateDays} marta` },
                { label: "Jami maosh fondi", value: `${(ov.totalPayroll / 1_000_000).toFixed(1)}M`, icon: Banknote, color: "text-emerald-600 bg-emerald-50", sub: "so'm" },
                { label: "To'langan", value: ov.paidPayrolls, icon: CheckCircle2, color: "text-green-600 bg-green-50", sub: "xodim" },
                { label: "Ta'til so'rovlari", value: ov.pendingLeave, icon: Info, color: ov.pendingLeave > 0 ? "text-blue-600 bg-blue-50" : "text-gray-400 bg-gray-50", sub: "kutilmoqda" },
                { label: "Avans so'rovlari", value: ov.pendingAdvance, icon: TrendingDown, color: ov.pendingAdvance > 0 ? "text-orange-600 bg-orange-50" : "text-gray-400 bg-gray-50", sub: "kutilmoqda" },
              ].map((kpi) => (
                <Card key={kpi.label} className="p-4 hover:shadow-md transition-shadow">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${kpi.color}`}>
                    <kpi.icon className="w-4 h-4" />
                  </div>
                  <p className="text-2xl font-bold">{kpi.value}</p>
                  <p className="text-xs font-medium text-foreground/80 mt-0.5">{kpi.label}</p>
                  <p className="text-xs text-muted-foreground">{kpi.sub}</p>
                </Card>
              ))}
            </div>

            {/* Trend chart */}
            {trend.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Activity className="w-4 h-4 text-primary" />
                    So'nggi 7 kunlik davomat
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={trend} barGap={4}>
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip
                        formatter={(val, name) => [val, name === "present" ? "Kelgan" : "Kechikkan"]}
                        labelStyle={{ fontWeight: 600 }}
                      />
                      <Bar dataKey="present" fill="#6366f1" radius={[4, 4, 0, 0]} name="present" />
                      <Bar dataKey="late" fill="#f59e0b" radius={[4, 4, 0, 0]} name="late" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Risks */}
              <div className="lg:col-span-2 space-y-4">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-red-500" />
                  Muammolar va Ogohlantirishlar
                </h2>
                {risks.length === 0 ? (
                  <Card className="p-6 text-center">
                    <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-2" />
                    <p className="font-medium text-green-700">Hech qanday muammo yo'q!</p>
                    <p className="text-sm text-muted-foreground mt-1">Kompaniya yaxshi ishlayapti</p>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {risks.map((risk: any, i: number) => {
                      const cfg = RISK_ICONS[risk.type] || RISK_ICONS.info;
                      return (
                        <div key={i} className={`rounded-xl border p-4 flex items-start gap-3 ${cfg.bg}`}>
                          <cfg.icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${cfg.color}`} />
                          <div>
                            <p className={`font-semibold text-sm ${cfg.color}`}>{risk.title}</p>
                            <p className="text-sm text-muted-foreground mt-0.5">{risk.desc}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Top employees table */}
                {empStats.length > 0 && (
                  <div>
                    <h2 className="text-lg font-bold flex items-center gap-2 mb-3">
                      <TrendingUp className="w-5 h-5 text-green-500" />
                      Xodimlar reytingi
                    </h2>
                    <Card>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left p-3 text-muted-foreground font-medium">Xodim</th>
                              <th className="text-center p-3 text-muted-foreground font-medium">Kun</th>
                              <th className="text-center p-3 text-muted-foreground font-medium">Soat</th>
                              <th className="text-center p-3 text-muted-foreground font-medium">Kechikish</th>
                              <th className="text-center p-3 text-muted-foreground font-medium">Baho</th>
                            </tr>
                          </thead>
                          <tbody>
                            {empStats.slice(0, 10).map((emp: any, i: number) => {
                              const lateR = parseInt(emp.lateRate);
                              const score = emp.days >= 15 && lateR < 10 ? "A" : emp.days >= 10 && lateR < 20 ? "B" : emp.days >= 5 ? "C" : "D";
                              const scoreColor = score === "A" ? "text-green-600 bg-green-50" : score === "B" ? "text-blue-600 bg-blue-50" : score === "C" ? "text-amber-600 bg-amber-50" : "text-red-600 bg-red-50";
                              return (
                                <tr key={emp.id} className={`border-b last:border-0 hover:bg-muted/30 transition-colors ${i === 0 ? "bg-green-50/30" : ""}`}>
                                  <td className="p-3">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs text-muted-foreground w-4">{i + 1}</span>
                                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                                        {emp.name.charAt(0)}
                                      </div>
                                      <div>
                                        <p className="font-medium">{emp.name}</p>
                                        <p className="text-xs text-muted-foreground">{emp.position}</p>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="p-3 text-center font-medium">{emp.days}</td>
                                  <td className="p-3 text-center text-muted-foreground">{emp.hours.toFixed(1)}</td>
                                  <td className="p-3 text-center">
                                    {emp.lateDays > 0 ? (
                                      <span className="text-amber-600">{emp.lateDays} marta ({emp.lateRate}%)</span>
                                    ) : (
                                      <span className="text-green-600">0</span>
                                    )}
                                  </td>
                                  <td className="p-3 text-center">
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${scoreColor}`}>{score}</span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </Card>
                  </div>
                )}
              </div>

              {/* Recommendations + pie */}
              <div className="space-y-4">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-amber-500" />
                  AI Tavsiyalar
                </h2>
                <div className="space-y-3">
                  {recs.map((rec: string, i: number) => (
                    <div key={i} className="flex items-start gap-3 bg-amber-50 border border-amber-200/50 rounded-xl p-3">
                      <span className="w-5 h-5 rounded-full bg-amber-400 text-white text-xs flex items-center justify-center font-bold flex-shrink-0 mt-0.5">{i + 1}</span>
                      <p className="text-sm text-amber-900 leading-relaxed">{rec}</p>
                    </div>
                  ))}
                </div>

                {salaryTypePie.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Davomat taqsimoti</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={180}>
                        <PieChart>
                          <Pie
                            data={salaryTypePie}
                            cx="50%" cy="50%"
                            innerRadius={40}
                            outerRadius={70}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {salaryTypePie.map((entry, i) => (
                              <Cell key={i} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(v: any, n: any) => [v + " xodim", n]} />
                          <Legend
                            formatter={(v) => <span className="text-xs">{v}</span>}
                            iconSize={8}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}

                <Card className="bg-gradient-to-br from-violet-50 to-blue-50 border-violet-200/50">
                  <CardContent className="p-4">
                    <p className="font-bold text-violet-700 mb-2 flex items-center gap-2">
                      <Brain className="w-4 h-4" /> AI Tahlil haqida
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Tizim real vaqt ma'lumotlari asosida davomat trendlarini, kechikish naqshlarini, maosh holatini va xodim faolligini tahlil qiladi. 
                      Tavsiyalar avtomatik generatsiya qilinadi.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
