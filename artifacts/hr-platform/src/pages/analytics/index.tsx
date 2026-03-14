import { useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid,
} from "recharts";
import {
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Info,
  Users, Clock, Calendar, Banknote, Brain, Lightbulb, ShieldAlert,
  Activity, UserPlus, AlertCircle, ArrowUpRight, ArrowDownRight,
  BadgeCheck, ShoppingCart, BarChart3, Target,
} from "lucide-react";

const MONTHS = ["", "Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun",
  "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr"];

const RISK_BADGE: Record<string, { label: string; cls: string }> = {
  high: { label: "Yuqori risk", cls: "bg-red-100 text-red-700 border border-red-200" },
  medium: { label: "O'rta risk", cls: "bg-amber-100 text-amber-700 border border-amber-200" },
  low: { label: "Past risk", cls: "bg-blue-50 text-blue-600 border border-blue-200" },
};

const URGENCY_BADGE: Record<string, { label: string; cls: string; dot: string }> = {
  high: { label: "Shoshilinch", cls: "bg-red-50 text-red-600 border border-red-100", dot: "bg-red-500" },
  medium: { label: "Tavsiya", cls: "bg-amber-50 text-amber-600 border border-amber-100", dot: "bg-amber-400" },
  low: { label: "Ixtiyoriy", cls: "bg-blue-50 text-blue-600 border border-blue-100", dot: "bg-blue-400" },
};

function KpiCard({ label, value, sub, icon: Icon, accent }: {
  label: string; value: string | number; sub: string;
  icon: React.ElementType; accent: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-border p-5 flex items-start gap-4 card-lift">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${accent}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-display font-bold text-foreground leading-none">{value}</p>
        <p className="text-sm font-medium text-foreground/70 mt-1">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
      </div>
    </div>
  );
}

function SectionHeader({ icon: Icon, title, sub, iconCls }: {
  icon: React.ElementType; title: string; sub?: string; iconCls: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${iconCls}`}>
        <Icon className="w-4.5 h-4.5" />
      </div>
      <div>
        <h2 className="text-[17px] font-display font-bold text-foreground">{title}</h2>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-border rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>{p.name === "present" ? "Kelgan" : "Kechikkan"}: <strong>{p.value}</strong></p>
      ))}
    </div>
  );
};

export default function AnalyticsPage() {
  const now = new Date();
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const years = [now.getFullYear() - 1, now.getFullYear()];

  const { data, isLoading } = useQuery({
    queryKey: ["/api/analytics/overview", month, year],
    queryFn: () => apiClient.get(`/api/analytics/overview?month=${month}&year=${year}`)
      .then((r: any) => (r?.data ?? r) as any),
    staleTime: 30000,
  });

  const { data: predict } = useQuery({
    queryKey: ["/api/analytics/predict"],
    queryFn: () => apiClient.get("/api/analytics/predict").then((r: any) => (r?.data ?? r) as any),
    staleTime: 60000,
  });

  const { data: salesKpi } = useQuery({
    queryKey: ["/api/sales/kpi", month, year],
    queryFn: () => apiClient.get(`/api/sales/kpi?month=${month}&year=${year}`) as Promise<any>,
    staleTime: 60000,
  });

  const ov = data?.overview;
  const trend = data?.trend || [];
  const empStats = data?.employeeStats || [];
  const risks = data?.risks || [];
  const recs = data?.recommendations || [];
  const hrRisks: any[] = data?.hrRisks || [];
  const hiringRecs: any[] = data?.hiringRecommendations || [];

  const highRisks = hrRisks.filter((e: any) => e.riskLevel === "high");
  const medRisks = hrRisks.filter((e: any) => e.riskLevel === "medium");

  return (
    <AppLayout>
      <div className="space-y-8 max-w-7xl">

        {/* Page header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2.5">
              <Brain className="w-6 h-6 text-primary" />
              AI Tahlil va Bashorat
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Xodimlar riski, yollash tavsiyalari va davomat tahlili
            </p>
          </div>
          <div className="flex items-center gap-2 bg-white border border-border rounded-lg px-3 py-2 shadow-sm">
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger className="w-28 border-none shadow-none bg-transparent h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.slice(1).map((m, i) => (
                  <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="w-px h-5 bg-border" />
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="w-20 border-none shadow-none bg-transparent h-8 text-sm">
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
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-border h-28 animate-pulse" />
            ))}
          </div>
        ) : !ov ? (
          <div className="bg-white rounded-xl border border-border p-16 text-center">
            <Activity className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="font-display font-semibold text-foreground/60">Ma'lumot topilmadi</p>
          </div>
        ) : (
          <>

            {/* ── KPI CARDS ─────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <KpiCard label="Jami xodim" value={ov.totalEmployees} sub="ro'yxatda" icon={Users} accent="bg-blue-50 text-blue-600" />
              <KpiCard label="Davomat kunlari" value={ov.totalDays} sub={`${MONTHS[parseInt(month)]} oyi`} icon={Calendar} accent="bg-emerald-50 text-emerald-600" />
              <KpiCard label="O'rt. ish soati" value={`${ov.avgHoursPerDay}s`} sub="kuniga" icon={Clock} accent="bg-violet-50 text-violet-600" />
              <KpiCard
                label="Kechikish darajasi"
                value={`${ov.lateRate}%`}
                sub={`${ov.lateDays} marta`}
                icon={AlertTriangle}
                accent={parseFloat(ov.lateRate) > 20 ? "bg-red-50 text-red-500" : "bg-amber-50 text-amber-500"}
              />
              <KpiCard label="Maosh fondi" value={`${(ov.totalPayroll / 1_000_000).toFixed(1)}M`} sub="so'm" icon={Banknote} accent="bg-emerald-50 text-emerald-600" />
              <KpiCard label="To'langan" value={ov.paidPayrolls} sub="xodim" icon={BadgeCheck} accent="bg-green-50 text-green-600" />
              <KpiCard label="Ta'til so'rovlari" value={ov.pendingLeave} sub="kutilmoqda" icon={Info} accent={ov.pendingLeave > 0 ? "bg-blue-50 text-blue-500" : "bg-slate-50 text-slate-400"} />
              <KpiCard label="Avans so'rovlari" value={ov.pendingAdvance} sub="kutilmoqda" icon={TrendingDown} accent={ov.pendingAdvance > 0 ? "bg-orange-50 text-orange-500" : "bg-slate-50 text-slate-400"} />
            </div>

            {/* ── BIZNES KPI ─────────────────────────────────────────────── */}
            <div className="bg-white rounded-xl border border-border overflow-hidden">
              <div className="px-6 py-5 border-b border-border">
                <SectionHeader icon={BarChart3} title="Biznes Ko'rsatkichlari" sub="Sotuvlar, mehnat xarajatlari va daromad tahlili" iconCls="bg-emerald-50 text-emerald-600" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-0 divide-x divide-y sm:divide-y-0">
                {[
                  {
                    label: "Xodim boshiga daromad",
                    value: salesKpi?.revenuePerEmployee > 0
                      ? `${(salesKpi.revenuePerEmployee / 1_000_000).toFixed(2)}M`
                      : "—",
                    sub: "so'm / xodim",
                    icon: ShoppingCart,
                    accent: "text-emerald-600",
                    tip: "Sales per Employee",
                  },
                  {
                    label: "Mehnat xarajatlari ulushi",
                    value: salesKpi?.totalRevenue > 0 && ov?.totalPayroll > 0
                      ? `${((ov.totalPayroll / salesKpi.totalRevenue) * 100).toFixed(1)}%`
                      : "—",
                    sub: "Maosh / Daromad",
                    icon: Target,
                    accent: "text-blue-600",
                    tip: "Labor Cost %",
                  },
                  {
                    label: "Soatlik daromad",
                    value: salesKpi?.totalRevenue > 0 && ov?.totalHours > 0
                      ? `${Math.round(salesKpi.totalRevenue / ov.totalHours).toLocaleString("uz-UZ")}`
                      : "—",
                    sub: "so'm / soat",
                    icon: TrendingUp,
                    accent: "text-purple-600",
                    tip: "Revenue per Hour",
                  },
                  {
                    label: "Davomat darajasi",
                    value: ov?.totalEmployees > 0 && ov?.totalDays > 0
                      ? `${Math.min(100, Math.round((ov.totalDays / (ov.totalEmployees * 22)) * 100))}%`
                      : "—",
                    sub: "oylik o'rtacha",
                    icon: Users,
                    accent: "text-orange-600",
                    tip: "Attendance Rate",
                  },
                ].map((kpi, i) => (
                  <div key={i} className="p-5 flex flex-col gap-1">
                    <div className={`flex items-center gap-1.5 text-xs font-semibold ${kpi.accent} mb-1`}>
                      <kpi.icon className="w-3.5 h-3.5" />
                      {kpi.tip}
                    </div>
                    <p className="text-2xl font-display font-bold">{kpi.value}</p>
                    <p className="text-sm font-medium text-foreground/70">{kpi.label}</p>
                    <p className="text-xs text-muted-foreground">{kpi.sub}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* ── HR RISK DETECTOR ───────────────────────────────────────── */}
            <div className="bg-white rounded-xl border border-border overflow-hidden">
              <div className="px-6 py-5 border-b border-border">
                <SectionHeader
                  icon={ShieldAlert}
                  title="HR Risk Detector"
                  sub="Tizim avtomatik aniqlaydi — kim ishdan ketishi mumkin va nima uchun"
                  iconCls="bg-red-50 text-red-600"
                />
                {hrRisks.length === 0 ? (
                  <div className="flex flex-col items-center py-10 text-center">
                    <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mb-3">
                      <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                    </div>
                    <p className="font-display font-semibold text-foreground/70">Risk aniqlanmadi</p>
                    <p className="text-sm text-muted-foreground mt-1">Barcha xodimlar normal davomat ko'rsatmoqda</p>
                  </div>
                ) : (
                  <>
                    {/* Summary pills */}
                    <div className="flex gap-3 flex-wrap mb-5">
                      {highRisks.length > 0 && (
                        <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-lg px-3 py-1.5">
                          <div className="w-2 h-2 rounded-full bg-red-500" />
                          <span className="text-sm font-semibold text-red-700">{highRisks.length} xodim — yuqori risk</span>
                        </div>
                      )}
                      {medRisks.length > 0 && (
                        <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-1.5">
                          <div className="w-2 h-2 rounded-full bg-amber-400" />
                          <span className="text-sm font-semibold text-amber-700">{medRisks.length} xodim — o'rta risk</span>
                        </div>
                      )}
                    </div>

                    {/* Risk table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left py-3 px-4 text-xs font-semibold uppercase text-muted-foreground">Xodim</th>
                            <th className="text-left py-3 px-4 text-xs font-semibold uppercase text-muted-foreground">Bo'lim</th>
                            <th className="text-center py-3 px-4 text-xs font-semibold uppercase text-muted-foreground">Risk ball</th>
                            <th className="text-left py-3 px-4 text-xs font-semibold uppercase text-muted-foreground">Ogohlantirishlar</th>
                            <th className="text-center py-3 px-4 text-xs font-semibold uppercase text-muted-foreground">Daraja</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60">
                          {hrRisks.map((emp: any) => {
                            const badge = RISK_BADGE[emp.riskLevel] || RISK_BADGE.low;
                            const barColor = emp.riskLevel === "high" ? "bg-red-500" : emp.riskLevel === "medium" ? "bg-amber-400" : "bg-blue-400";
                            return (
                              <tr key={emp.id} className={`hover:bg-slate-50/80 transition-colors ${emp.riskLevel === "high" ? "bg-red-50/30" : ""}`}>
                                <td className="py-3.5 px-4">
                                  <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold flex-shrink-0">
                                      {emp.name.charAt(0)}
                                    </div>
                                    <div>
                                      <p className="font-semibold text-foreground">{emp.name}</p>
                                      <p className="text-xs text-muted-foreground">{emp.position}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-3.5 px-4 text-muted-foreground">{emp.department}</td>
                                <td className="py-3.5 px-4">
                                  <div className="flex flex-col items-center gap-1">
                                    <span className="font-display font-bold text-base text-foreground">{emp.riskScore}</span>
                                    <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                      <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${emp.riskScore}%` }} />
                                    </div>
                                  </div>
                                </td>
                                <td className="py-3.5 px-4">
                                  <div className="flex flex-wrap gap-1.5">
                                    {emp.factors.map((f: string, i: number) => (
                                      <span key={i} className="inline-block bg-slate-100 text-slate-600 text-[11px] px-2 py-0.5 rounded-md">{f}</span>
                                    ))}
                                  </div>
                                </td>
                                <td className="py-3.5 px-4 text-center">
                                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${badge.cls}`}>
                                    {badge.label}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* ── SMART HIRING ─────────────────────────────────────────────── */}
            <div className="bg-white rounded-xl border border-border overflow-hidden">
              <div className="px-6 py-5">
                <SectionHeader
                  icon={UserPlus}
                  title="Smart Hiring — Yollash Tavsiyalari"
                  sub="Tizim qaysi bo'limga yangi xodim kerakligini aniqlaydi"
                  iconCls="bg-blue-50 text-blue-600"
                />

                {hiringRecs.length === 0 ? (
                  <div className="flex flex-col items-center py-10 text-center">
                    <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mb-3">
                      <CheckCircle2 className="w-6 h-6 text-blue-400" />
                    </div>
                    <p className="font-display font-semibold text-foreground/70">Hech qanday yollash zaruri emas</p>
                    <p className="text-sm text-muted-foreground mt-1">Barcha bo'limlar normal xodimlar bilan ta'minlangan</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {hiringRecs.map((rec: any, i: number) => {
                      const u = URGENCY_BADGE[rec.urgency] || URGENCY_BADGE.low;
                      return (
                        <div key={i} className={`rounded-xl border p-4 ${u.cls}`}>
                          <div className="flex items-start justify-between gap-2 mb-3">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${u.dot}`} />
                              <p className="font-display font-bold text-[15px]">{rec.department}</p>
                            </div>
                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${u.cls} border`}>
                              {u.label}
                            </span>
                          </div>
                          <p className="text-[13px] leading-relaxed mb-3">{rec.reason}</p>
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1">
                              <Users className="w-3.5 h-3.5" />
                              <span>Hozir: <strong>{rec.currentCount}</strong> xodim</span>
                            </div>
                            <div className="flex items-center gap-1 font-semibold">
                              <UserPlus className="w-3.5 h-3.5" />
                              <span>+{rec.suggestedCount} tavsiya</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* ── TREND + RISKS + RECS ─────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Trend chart */}
              <div className="lg:col-span-2 space-y-5">
                {trend.length > 0 && (
                  <div className="bg-white rounded-xl border border-border p-5">
                    <div className="flex items-center gap-2 mb-5">
                      <Activity className="w-4 h-4 text-primary" />
                      <p className="font-display font-semibold text-[15px]">So'nggi 7 kun davomat</p>
                    </div>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={trend} barGap={6} barSize={14}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} width={30} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="present" fill="#3b82f6" radius={[3, 3, 0, 0]} name="present" />
                        <Bar dataKey="late" fill="#f59e0b" radius={[3, 3, 0, 0]} name="late" />
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="flex items-center gap-5 mt-3 justify-center">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <div className="w-3 h-3 rounded bg-blue-500" />
                        Kelgan
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <div className="w-3 h-3 rounded bg-amber-400" />
                        Kechikkan
                      </div>
                    </div>
                  </div>
                )}

                {/* Operational risks */}
                <div className="bg-white rounded-xl border border-border p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <AlertCircle className="w-4 h-4 text-amber-500" />
                    <p className="font-display font-semibold text-[15px]">Operativ Muammolar</p>
                  </div>
                  {risks.length === 0 ? (
                    <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-100 rounded-lg px-4 py-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                      <p className="text-sm font-medium text-emerald-700">Hech qanday operativ muammo yo'q</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {risks.map((risk: any, i: number) => (
                        <div key={i} className={`flex items-start gap-3 rounded-lg border px-4 py-3 ${
                          risk.type === "danger" ? "bg-red-50 border-red-100" :
                          risk.type === "warning" ? "bg-amber-50 border-amber-100" :
                          "bg-blue-50 border-blue-100"
                        }`}>
                          {risk.type === "danger" ? <ShieldAlert className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" /> :
                           risk.type === "warning" ? <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" /> :
                           <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />}
                          <div>
                            <p className="text-sm font-semibold text-foreground">{risk.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{risk.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Employee ranking */}
                {empStats.length > 0 && (
                  <div className="bg-white rounded-xl border border-border overflow-hidden">
                    <div className="px-5 py-4 border-b border-border flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-emerald-500" />
                      <p className="font-display font-semibold text-[15px]">Xodimlar reytingi</p>
                    </div>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-slate-50/50">
                          <th className="text-left py-2.5 px-4 text-xs font-semibold uppercase text-muted-foreground">Xodim</th>
                          <th className="text-center py-2.5 px-3 text-xs font-semibold uppercase text-muted-foreground">Kun</th>
                          <th className="text-center py-2.5 px-3 text-xs font-semibold uppercase text-muted-foreground">Soat</th>
                          <th className="text-center py-2.5 px-3 text-xs font-semibold uppercase text-muted-foreground">Kechikish</th>
                          <th className="text-center py-2.5 px-3 text-xs font-semibold uppercase text-muted-foreground">Baho</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {empStats.slice(0, 10).map((emp: any, i: number) => {
                          const lateR = parseInt(emp.lateRate);
                          const score = emp.days >= 15 && lateR < 10 ? "A" : emp.days >= 10 && lateR < 20 ? "B" : emp.days >= 5 ? "C" : "D";
                          const scoreColor = score === "A" ? "bg-emerald-100 text-emerald-700" : score === "B" ? "bg-blue-100 text-blue-700" : score === "C" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700";
                          return (
                            <tr key={emp.id} className="hover:bg-slate-50/60 transition-colors">
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2.5">
                                  <span className="text-xs text-muted-foreground w-4 text-right">{i + 1}</span>
                                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">{emp.name.charAt(0)}</div>
                                  <div>
                                    <p className="font-medium text-foreground">{emp.name}</p>
                                    <p className="text-xs text-muted-foreground">{emp.position}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-3 text-center font-semibold">{emp.days}</td>
                              <td className="py-3 px-3 text-center text-muted-foreground">{emp.hours.toFixed(1)}</td>
                              <td className="py-3 px-3 text-center">
                                {emp.lateDays > 0
                                  ? <span className="text-amber-600">{emp.lateDays} ({emp.lateRate}%)</span>
                                  : <span className="text-emerald-600">—</span>}
                              </td>
                              <td className="py-3 px-3 text-center">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${scoreColor}`}>{score}</span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Right column — AI recs */}
              <div className="space-y-4">
                <div className="bg-white rounded-xl border border-border p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Lightbulb className="w-4 h-4 text-amber-500" />
                    <p className="font-display font-semibold text-[15px]">AI Tavsiyalar</p>
                  </div>
                  <div className="space-y-3">
                    {recs.map((rec: string, i: number) => (
                      <div key={i} className="flex items-start gap-2.5">
                        <div className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] flex items-center justify-center font-bold flex-shrink-0 mt-0.5">{i + 1}</div>
                        <p className="text-sm text-foreground/80 leading-relaxed">{rec}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-900 rounded-xl p-5 text-white">
                  <p className="font-display font-bold text-[15px] mb-2 flex items-center gap-2">
                    <Brain className="w-4 h-4 text-blue-400" />
                    AI Tahlil haqida
                  </p>
                  <p className="text-[13px] text-slate-400 leading-relaxed">
                    Tizim real vaqt ma'lumotlari asosida davomat trendlarini, kechikish naqshlarini, bo'limlar ish yukini va xodimlar faolligini tahlil qiladi.
                    <br /><br />
                    Risk ballar avtomatik hisoblanadi — 0 (xavfsiz) dan 100 (yuqori risk) gacha.
                  </p>
                </div>
              </div>
            </div>

            {/* ── PREDICTIVE ANALYTICS ───────────────────────────────────── */}
            {predict && (
              <div className="bg-white rounded-xl border border-border overflow-hidden">
                <div className="px-6 pt-5 pb-4 border-b border-border">
                  <SectionHeader
                    icon={TrendingUp}
                    title={`Bashorat — ${predict.period?.nextMonth}`}
                    sub={`Keyingi oy uchun AI bashorat (${predict.period?.workDays} ish kuni)`}
                    iconCls="bg-violet-50 text-violet-600"
                  />
                </div>
                <div className="p-6 space-y-5">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                      <p className="text-xs text-blue-500 font-medium mb-1">Kutilgan davomat</p>
                      <p className="text-2xl font-bold text-blue-700">{predict.attendance?.predictedAttendancePct}%</p>
                      <p className="text-xs text-blue-400 mt-0.5">{predict.attendance?.predictedPresentDays} ta yozuv</p>
                    </div>
                    <div className={`rounded-xl p-4 border ${parseFloat(predict.attendance?.predictedLateRate) > 20 ? "bg-red-50 border-red-100" : "bg-amber-50 border-amber-100"}`}>
                      <p className={`text-xs font-medium mb-1 ${parseFloat(predict.attendance?.predictedLateRate) > 20 ? "text-red-500" : "text-amber-500"}`}>Kechikish (bashorat)</p>
                      <p className={`text-2xl font-bold ${parseFloat(predict.attendance?.predictedLateRate) > 20 ? "text-red-700" : "text-amber-700"}`}>{predict.attendance?.predictedLateRate}%</p>
                      <p className={`text-xs mt-0.5 ${parseFloat(predict.attendance?.predictedLateRate) > 20 ? "text-red-400" : "text-amber-400"}`}>3 oylik trend asosida</p>
                    </div>
                    <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100 col-span-2 sm:col-span-1">
                      <p className="text-xs text-emerald-500 font-medium mb-1">Maosh fondi (bashorat)</p>
                      <p className="text-2xl font-bold text-emerald-700">{(predict.payroll?.predictedTotal / 1_000_000).toFixed(1)}M</p>
                      <p className="text-xs text-emerald-400 mt-0.5">so'm • xodim boshiga {(predict.payroll?.perEmployee || 0).toLocaleString("uz-UZ")}</p>
                    </div>
                  </div>

                  {predict.warnings?.length > 0 && (
                    <div className="space-y-2">
                      {predict.warnings.map((w: any, i: number) => (
                        <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${
                          w.level === "danger" ? "bg-red-50 border-red-100" :
                          w.level === "warning" ? "bg-amber-50 border-amber-100" : "bg-blue-50 border-blue-100"
                        }`}>
                          <AlertCircle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                            w.level === "danger" ? "text-red-500" :
                            w.level === "warning" ? "text-amber-500" : "text-blue-500"
                          }`} />
                          <p className={`text-sm ${
                            w.level === "danger" ? "text-red-700" :
                            w.level === "warning" ? "text-amber-700" : "text-blue-700"
                          }`}>{w.message}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {predict.trends?.lateRates?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Kechikish trend (3 oy)</p>
                      <div className="flex gap-3">
                        {predict.trends.lateRates.map((lr: any, i: number) => (
                          <div key={i} className="flex-1 bg-slate-50 rounded-lg p-3 text-center border border-border">
                            <p className="text-lg font-bold text-foreground">{lr.rate}%</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{lr.label}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

          </>
        )}
      </div>
    </AppLayout>
  );
}
