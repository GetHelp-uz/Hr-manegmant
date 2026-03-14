import { useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { useAppStore } from "@/store/use-store";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ReferenceLine, Cell,
} from "recharts";
import { Brain, TrendingUp, TrendingDown, Minus, Calendar, CloudSun, Sparkles, ChevronRight, AlertTriangle } from "lucide-react";
import { Link } from "wouter";

const fmt = (n: number) => new Intl.NumberFormat("uz-UZ").format(Math.round(n));
const fmtM = (n: number) => n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(0)}K` : String(Math.round(n));

const TREND_ICONS: Record<string, { icon: typeof TrendingUp; cls: string; label: string }> = {
  up: { icon: TrendingUp, cls: "text-emerald-500", label: "O'sish tendensiyasi" },
  down: { icon: TrendingDown, cls: "text-red-500", label: "Pasayish tendensiyasi" },
  stable: { icon: Minus, cls: "text-blue-500", label: "Barqaror" },
};

const QUALITY_BADGE: Record<string, { label: string; cls: string }> = {
  high: { label: "Yuqori aniqlik", cls: "bg-emerald-100 text-emerald-700" },
  medium: { label: "O'rta aniqlik", cls: "bg-amber-100 text-amber-700" },
  low: { label: "Kam tarix — past aniqlik", cls: "bg-red-100 text-red-600" },
};

function FactorPill({ f }: { f: any }) {
  const cls = f.sign === "+" ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
    : f.sign === "-" ? "bg-red-50 text-red-600 border border-red-100"
    : "bg-gray-50 text-gray-600 border border-gray-200";
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {f.emoji} {f.factor} <b>{f.impact}</b>
    </span>
  );
}

const ForecastTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="bg-white border border-border rounded-xl shadow-lg p-3 text-sm max-w-64">
      <p className="font-semibold mb-1">{d?.dayName}, {d?.date}</p>
      {d?.isHoliday && <p className="text-xs text-amber-600 mb-1">🎉 {d.holidayName}</p>}
      <p className="text-emerald-600 font-bold text-base">{fmt(d?.predicted)} so'm</p>
      <p className="text-xs text-muted-foreground mt-1">
        {fmt(d?.low)} — {fmt(d?.high)} so'm
      </p>
      <div className="flex flex-wrap gap-1 mt-2">
        {d?.factors?.map((f: any, i: number) => <FactorPill key={i} f={f} />)}
      </div>
    </div>
  );
};

const HistoryTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="bg-white border border-border rounded-xl shadow-lg p-3 text-sm">
      <p className="font-medium">{d?.date}</p>
      <p className="text-blue-600 font-bold">{fmt(d?.actual)} so'm</p>
    </div>
  );
};

export default function SalesForecast() {
  const { language } = useAppStore();
  const [forecastDays, setForecastDays] = useState("14");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["/api/sales/forecast", forecastDays],
    queryFn: () => apiClient.get(`/api/sales/forecast?days=${forecastDays}`) as Promise<any>,
    staleTime: 120000,
  });

  const meta = data?.meta;
  const summary = data?.summary;
  const forecast: any[] = data?.forecast || [];
  const history: any[] = data?.history || [];
  const factors = data?.factors;

  const trendInfo = meta?.trendDirection ? TREND_ICONS[meta.trendDirection] : TREND_ICONS.stable;
  const TrendIcon = trendInfo.icon;
  const qualityBadge = meta?.dataQuality ? QUALITY_BADGE[meta.dataQuality] : QUALITY_BADGE.low;

  // Combined chart data (history + forecast)
  const combinedChart = [
    ...history.map((h: any) => ({ ...h, type: "actual" })),
    ...forecast.slice(0, parseInt(forecastDays)).map((f: any) => ({ ...f, type: "forecast" })),
  ];

  // Day-of-week bar chart
  const dowChart = Object.entries(factors?.dowLearned || {}).map(([dow, mult]: any) => ({
    name: ["Ya", "Du", "Se", "Ch", "Pa", "Ju", "Sh"][parseInt(dow)],
    multiplier: +(mult * 100).toFixed(0),
    color: mult >= 1.05 ? "#10b981" : mult <= 0.90 ? "#ef4444" : "#3b82f6",
  }));

  // Seasonal chart
  const monthNames = ["Yan", "Fev", "Mar", "Apr", "May", "Iyn", "Iyl", "Avg", "Sen", "Okt", "Noy", "Dek"];
  const seasonChart = (factors?.seasonals || []).map((m: number, i: number) => ({
    name: monthNames[i],
    pct: Math.round(m * 100),
    color: m >= 1.1 ? "#10b981" : m >= 0.95 ? "#3b82f6" : "#f59e0b",
  }));

  const hasData = history.length > 0;

  return (
    <AppLayout>
      <div className="p-6 space-y-6 max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Link href="/sales" className="hover:text-foreground transition-colors">Sotuvlar</Link>
              <ChevronRight className="w-3.5 h-3.5" />
              <span>AI Bashorat</span>
            </div>
            <h1 className="text-2xl font-display font-bold flex items-center gap-2">
              <Brain className="w-6 h-6 text-violet-500" />
              Savdo Bashorat Engine
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Tarix · Hafta kuni · Mavsum · Bayramlar · Ob-havo asosida
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={forecastDays} onValueChange={v => { setForecastDays(v); }}>
              <SelectTrigger className="w-36 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 kun</SelectItem>
                <SelectItem value="14">14 kun</SelectItem>
                <SelectItem value="30">30 kun</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => refetch()} className="rounded-xl gap-2">
              <Sparkles className="w-4 h-4" /> Yangilash
            </Button>
          </div>
        </div>

        {!hasData && !isLoading && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-800">Tarixiy ma'lumot yo'q</p>
              <p className="text-sm text-amber-700 mt-1">
                Bashorat uchun avval sotuvlar sahifasidan kamida 7 kunlik savdo ma'lumotlari kiriting.
                Qancha ko'p tarix bo'lsa, bashorat shuncha aniq bo'ladi.
              </p>
              <Link href="/sales">
                <Button className="mt-3 gap-2 rounded-xl text-sm h-8" variant="outline">
                  Sotuvlar sahifasiga o'tish →
                </Button>
              </Link>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <div key={i} className="h-24 rounded-2xl bg-muted animate-pulse" />)}
          </div>
        ) : meta && (
          <>
            {/* Meta cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-card border rounded-2xl p-4 space-y-1">
                <p className="text-xs text-muted-foreground font-medium">Bashorat jami</p>
                <p className="text-2xl font-bold text-violet-600">{fmtM(summary?.totalForecast || 0)}</p>
                <p className="text-xs text-muted-foreground">{forecastDays} kun uchun so'm</p>
              </div>
              <div className="bg-card border rounded-2xl p-4 space-y-1">
                <p className="text-xs text-muted-foreground font-medium">Kunlik o'rtacha</p>
                <p className="text-2xl font-bold">{fmtM(summary?.avgForecastDaily || 0)}</p>
                <p className="text-xs text-muted-foreground">Hozirgi: {fmtM(meta.recentAvgDaily || 0)}</p>
              </div>
              <div className="bg-card border rounded-2xl p-4 space-y-1">
                <div className="flex items-center gap-1.5">
                  <TrendIcon className={`w-4 h-4 ${trendInfo.cls}`} />
                  <p className="text-xs font-medium">{trendInfo.label}</p>
                </div>
                <p className="text-2xl font-bold">
                  {meta.trendFactor > 1 ? "+" : ""}{((meta.trendFactor - 1) * 100).toFixed(1)}%
                </p>
                <p className="text-xs text-muted-foreground">So'nggi 30 kun tendensiyasi</p>
              </div>
              <div className="bg-card border rounded-2xl p-4 space-y-1">
                <p className="text-xs text-muted-foreground font-medium">Ma'lumot sifati</p>
                <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${qualityBadge.cls}`}>
                  {qualityBadge.label}
                </span>
                <p className="text-xs text-muted-foreground mt-1">{meta.historyDays} kunlik tarix mavjud</p>
              </div>
            </div>

            {/* Best/Worst day */}
            {summary?.bestDay && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-lg">🚀</div>
                  <div>
                    <p className="text-xs text-emerald-600 font-medium">Eng yuqori kun</p>
                    <p className="font-bold">{summary.bestDay.dayName}, {summary.bestDay.date}</p>
                    <p className="text-emerald-700 font-semibold">{fmt(summary.bestDay.amount)} so'm</p>
                    {summary.bestDay.reason && <p className="text-xs text-emerald-600 mt-0.5">{summary.bestDay.reason}</p>}
                  </div>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-lg">📉</div>
                  <div>
                    <p className="text-xs text-red-600 font-medium">Eng past kun</p>
                    <p className="font-bold">{summary.worstDay.dayName}, {summary.worstDay.date}</p>
                    <p className="text-red-700 font-semibold">{fmt(summary.worstDay.amount)} so'm</p>
                    {summary.worstDay.reason && <p className="text-xs text-red-600 mt-0.5">{summary.worstDay.reason}</p>}
                  </div>
                </div>
              </div>
            )}

            {/* Main forecast chart */}
            <div className="bg-card border rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-violet-500" />
                  Tarix + {forecastDays} kunlik bashorat
                </h2>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded bg-blue-400" /> Haqiqiy</span>
                  <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded bg-violet-400" /> Bashorat</span>
                </div>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={combinedChart} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="dayShort" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis tickFormatter={fmtM} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={52} />
                    <Tooltip content={<ForecastTooltip />} />
                    {history.length > 0 && (
                      <ReferenceLine x={history[history.length - 1]?.dayShort} stroke="#d1d5db" strokeDasharray="4 2" label={{ value: "Bugun", fontSize: 10, fill: "#9ca3af" }} />
                    )}
                    <Area
                      dataKey="actual"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      fill="url(#actualGrad)"
                      dot={false}
                      connectNulls
                    />
                    <Area
                      dataKey="predicted"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      strokeDasharray="5 3"
                      fill="url(#forecastGrad)"
                      dot={false}
                      connectNulls
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Daily forecast cards */}
            <div className="bg-card border rounded-2xl p-5">
              <h2 className="font-semibold mb-4 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-violet-500" />
                Kunlik bashorat
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                {forecast.slice(0, parseInt(forecastDays)).map((f: any) => (
                  <div
                    key={f.date}
                    className={`rounded-xl p-3 text-center space-y-1 border ${
                      f.isHoliday ? "bg-amber-50 border-amber-200" :
                      f.isWeekend ? "bg-blue-50/50 border-blue-100" :
                      "bg-muted/30 border-transparent"
                    }`}
                  >
                    <p className="text-xs font-semibold text-muted-foreground">{f.dayShort}</p>
                    <p className="text-xs text-muted-foreground">{f.date.slice(5)}</p>
                    {f.isHoliday && (
                      <p className="text-xs text-amber-600 font-medium leading-tight">🎉 {f.holidayName}</p>
                    )}
                    <p className={`text-sm font-bold ${f.isHoliday ? "text-amber-700" : ""}`}>
                      {fmtM(f.predicted)}
                    </p>
                    <p className="text-xs text-muted-foreground">{f.weatherEmoji}</p>
                    <div className="flex justify-center gap-0.5 flex-wrap">
                      {f.factors.slice(0, 2).map((factor: any, i: number) => (
                        <span key={i} className={`text-xs px-1 rounded ${factor.sign === "+" ? "text-emerald-600" : "text-red-500"}`}>
                          {factor.impact}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Factor analysis: 2 columns */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

              {/* Day of week chart */}
              <div className="bg-card border rounded-2xl p-5">
                <h2 className="font-semibold mb-1 flex items-center gap-2">📅 Hafta kunlari ta'siri</h2>
                <p className="text-xs text-muted-foreground mb-4">Tarixiy savdo tahlilidan o'rganilgan</p>
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dowChart} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} />
                      <Tooltip formatter={(v: any) => [`${v}%`, "Savdo indeksi"]} />
                      <ReferenceLine y={100} stroke="#d1d5db" strokeDasharray="3 2" />
                      <Bar dataKey="multiplier" radius={[4, 4, 0, 0]}>
                        {dowChart.map((entry: any, i: number) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Seasonal chart */}
              <div className="bg-card border rounded-2xl p-5">
                <h2 className="font-semibold mb-1 flex items-center gap-2">🍂 Mavsumiy ta'sir</h2>
                <p className="text-xs text-muted-foreground mb-4">O'zbekiston savdo naqshlari (yillik)</p>
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={seasonChart} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} />
                      <Tooltip formatter={(v: any) => [`${v}%`, "Mavsumiy indeks"]} />
                      <ReferenceLine y={100} stroke="#d1d5db" strokeDasharray="3 2" />
                      <Bar dataKey="pct" radius={[4, 4, 0, 0]}>
                        {seasonChart.map((entry: any, i: number) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Weather + Holiday reference */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-card border rounded-2xl p-5">
                <h2 className="font-semibold mb-3 flex items-center gap-2">
                  <CloudSun className="w-4 h-4 text-sky-500" />
                  Ob-havo ta'siri
                </h2>
                <div className="space-y-2">
                  {[
                    { range: "≤ 0°C", label: "Ayoz — muzli yo'llar", factor: -22, emoji: "🥶" },
                    { range: "1–5°C", label: "Sovuq ob-havo", factor: -15, emoji: "🧣" },
                    { range: "6–15°C", label: "Salqin, qulay", factor: -3, emoji: "🌤" },
                    { range: "16–22°C", label: "Iliq, optimal", factor: +5, emoji: "☀️" },
                    { range: "23–28°C", label: "Issiq, qulay", factor: +2, emoji: "🌞" },
                    { range: "29–33°C", label: "Qattiq issiq", factor: -8, emoji: "🌡" },
                    { range: "> 33°C", label: "Ekstremal issiq", factor: -20, emoji: "🔥" },
                  ].map((row, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <span className="text-base w-6">{row.emoji}</span>
                      <span className="text-muted-foreground w-16 text-xs">{row.range}</span>
                      <span className="flex-1 text-xs">{row.label}</span>
                      <span className={`text-xs font-semibold ${row.factor >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                        {row.factor >= 0 ? "+" : ""}{row.factor}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-card border rounded-2xl p-5">
                <h2 className="font-semibold mb-3 flex items-center gap-2">
                  🎉 Bayramlar ta'siri
                </h2>
                <div className="space-y-2">
                  {[
                    { date: "Yan 1", name: "Yangi Yil", impact: -60, emoji: "🎆" },
                    { date: "Mar 8", name: "Xotin-qizlar kuni", impact: +50, emoji: "💐" },
                    { date: "Mar 20", name: "Navro'z arafasi", impact: +80, emoji: "🌺" },
                    { date: "Mar 21", name: "Navro'z bayrami", impact: -40, emoji: "🌸" },
                    { date: "May 9", name: "Xotira va qadrlash", impact: -30, emoji: "🕊" },
                    { date: "Sep 1", name: "Mustaqillik kuni", impact: -30, emoji: "🇺🇿" },
                    { date: "Dek 31", name: "Yangi yil arafasi", impact: +90, emoji: "🎄" },
                  ].map((row, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <span className="w-6 text-base">{row.emoji}</span>
                      <span className="text-muted-foreground w-12 text-xs">{row.date}</span>
                      <span className="flex-1 text-xs">{row.name}</span>
                      <span className={`text-xs font-semibold ${row.impact >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                        {row.impact >= 0 ? "+" : ""}{row.impact}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </>
        )}
      </div>
    </AppLayout>
  );
}
