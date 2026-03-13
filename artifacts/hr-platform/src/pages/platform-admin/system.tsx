import { useEffect } from "react";
import { useLocation, Link } from "wouter";
import { apiClient } from "@/lib/api-client";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Shield, ArrowLeft, Server, Cpu, Database, Activity, RefreshCw,
  CheckCircle2, AlertTriangle, XCircle, HardDrive, Clock,
  Building2, Users, CalendarCheck, Layers, Zap,
} from "lucide-react";
import { format } from "date-fns";

function StatusIcon({ status }: { status: string }) {
  if (status === "critical") return <XCircle className="w-5 h-5 text-red-400" />;
  if (status === "warning") return <AlertTriangle className="w-5 h-5 text-amber-400" />;
  return <CheckCircle2 className="w-5 h-5 text-green-400" />;
}

function GaugeBar({ value, warn, danger, unit = "%" }: { value: number; warn: number; danger: number; unit?: string }) {
  const color = value >= danger ? "bg-red-500" : value >= warn ? "bg-amber-500" : "bg-green-500";
  const glow = value >= danger ? "shadow-red-500/30" : value >= warn ? "shadow-amber-500/30" : "shadow-green-500/30";
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-slate-500">0{unit}</span>
        <span className="text-slate-500">100{unit}</span>
      </div>
      <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
        <div
          className={`h-3 rounded-full transition-all duration-700 shadow-sm ${color} ${glow}`}
          style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }}
        />
      </div>
    </div>
  );
}

function StatRow({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-slate-800 last:border-0">
      <span className="text-sm text-slate-400">{label}</span>
      <span className={`text-sm font-medium ${accent ? "text-amber-400" : "text-white"}`}>{value}</span>
    </div>
  );
}

function HealthBadge({ status }: { status: string }) {
  if (status === "critical") return <Badge className="bg-red-500/20 text-red-400 border-0 text-xs">Kritik</Badge>;
  if (status === "warning") return <Badge className="bg-amber-500/20 text-amber-400 border-0 text-xs">Ogohlantirish</Badge>;
  return <Badge className="bg-green-500/20 text-green-400 border-0 text-xs">Normal</Badge>;
}

export default function PlatformAdminSystem() {
  const [, setLocation] = useLocation();

  const { data, isLoading, refetch, error, dataUpdatedAt } = useQuery({
    queryKey: ["/api/platform-admin/system"],
    queryFn: () => apiClient.get("/api/platform-admin/system"),
    refetchInterval: 20000,
    retry: false,
  });

  useEffect(() => {
    if (error) setLocation("/platform-admin/login");
  }, [error]);

  const d = data as any;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="space-y-3 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto" />
          <p className="text-slate-500 text-sm">Server ma'lumotlari yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  const overallStatus = d?.health?.some((h: any) => h.status === "critical") ? "critical"
    : d?.health?.some((h: any) => h.status === "warning") ? "warning" : "ok";

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
            <Server className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="font-semibold text-white leading-none text-sm">Infratuzilma Monitoringi</p>
            <p className="text-xs text-slate-500 mt-0.5">
              {dataUpdatedAt ? `Yangilangan: ${format(new Date(dataUpdatedAt), "HH:mm:ss")}` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {overallStatus === "critical" && (
            <Badge className="bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse">
              Kritik holat
            </Badge>
          )}
          {overallStatus === "warning" && (
            <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/30">
              Ogohlantirish bor
            </Badge>
          )}
          {overallStatus === "ok" && (
            <Badge className="bg-green-500/20 text-green-400 border border-green-500/30">
              Barcha tizimlar normal
            </Badge>
          )}
          <Button variant="ghost" size="sm" onClick={() => refetch()}
            className="text-slate-400 hover:text-white hover:bg-slate-800 gap-2 rounded-xl h-8 px-3">
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-xs">Yangilash</span>
          </Button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-5">

        {/* Health Check Quick View */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {d?.health?.map((h: any) => (
            <Card key={h.name} className={`border p-4 ${
              h.status === "critical" ? "bg-red-950/30 border-red-500/30" :
              h.status === "warning" ? "bg-amber-950/30 border-amber-500/30" :
              "bg-slate-900 border-slate-800"
            }`}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-slate-400 font-medium">{h.name}</p>
                <StatusIcon status={h.status} />
              </div>
              <p className={`text-xl font-bold ${
                h.status === "critical" ? "text-red-400" :
                h.status === "warning" ? "text-amber-400" : "text-white"
              }`}>{h.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{h.detail}</p>
            </Card>
          ))}
        </div>

        <div className="grid sm:grid-cols-2 gap-5">
          {/* CPU */}
          <Card className="bg-slate-900 border-slate-800 p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-blue-500/10 rounded-xl flex items-center justify-center">
                  <Cpu className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Protsessor (CPU)</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{d?.cpu?.model}</p>
                </div>
              </div>
              <HealthBadge status={d?.cpu?.loadPercent > 80 ? "critical" : d?.cpu?.loadPercent > 50 ? "warning" : "ok"} />
            </div>
            <div className="mb-4">
              <div className="flex justify-between items-end mb-2">
                <span className="text-slate-400 text-sm">Yuklanish</span>
                <span className={`text-3xl font-bold ${
                  d?.cpu?.loadPercent > 80 ? "text-red-400" : d?.cpu?.loadPercent > 50 ? "text-amber-400" : "text-white"
                }`}>{d?.cpu?.loadPercent || 0}%</span>
              </div>
              <GaugeBar value={d?.cpu?.loadPercent || 0} warn={50} danger={80} />
            </div>
            <div>
              <StatRow label="Yadro soni" value={`${d?.cpu?.count || 0} ta yadro`} />
              <StatRow label="Chastota" value={d?.cpu?.speed ? `${d.cpu.speed} MHz` : "—"} />
              <StatRow label="Yuklanish 1m" value={d?.cpu?.loadAvg1 || "—"} />
              <StatRow label="Yuklanish 5m" value={d?.cpu?.loadAvg5 || "—"} />
              <StatRow label="Yuklanish 15m" value={d?.cpu?.loadAvg15 || "—"} />
            </div>
          </Card>

          {/* RAM */}
          <Card className="bg-slate-900 border-slate-800 p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-purple-500/10 rounded-xl flex items-center justify-center">
                  <Activity className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Xotira (RAM)</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Tizim va Node.js</p>
                </div>
              </div>
              <HealthBadge status={d?.memory?.systemUsedPercent > 85 ? "critical" : d?.memory?.systemUsedPercent > 70 ? "warning" : "ok"} />
            </div>
            <div className="mb-4">
              <div className="flex justify-between items-end mb-2">
                <span className="text-slate-400 text-sm">Tizim RAM</span>
                <span className={`text-3xl font-bold ${
                  d?.memory?.systemUsedPercent > 85 ? "text-red-400" : d?.memory?.systemUsedPercent > 70 ? "text-amber-400" : "text-white"
                }`}>{d?.memory?.systemUsedPercent || 0}%</span>
              </div>
              <GaugeBar value={d?.memory?.systemUsedPercent || 0} warn={70} danger={85} />
            </div>
            <div>
              <StatRow label="Jami RAM" value={`${d?.memory?.systemTotal || 0} MB`} />
              <StatRow label="Ishlatilgan" value={`${d?.memory?.systemUsed || 0} MB`} accent />
              <StatRow label="Erkin" value={`${d?.memory?.systemFree || 0} MB`} />
              <StatRow label="Node heap" value={`${d?.memory?.heapUsed || 0} / ${d?.memory?.heapTotal || 0} MB`} />
              <StatRow label="Heap ishlatilishi" value={`${d?.memory?.heapPercent || 0}%`} />
            </div>
          </Card>

          {/* Disk */}
          <Card className="bg-slate-900 border-slate-800 p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-orange-500/10 rounded-xl flex items-center justify-center">
                  <HardDrive className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Disk Maydoni</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Fayl tizimi: /</p>
                </div>
              </div>
              <HealthBadge status={d?.disk?.usedPercent > 90 ? "critical" : d?.disk?.usedPercent > 75 ? "warning" : "ok"} />
            </div>
            <div className="mb-4">
              <div className="flex justify-between items-end mb-2">
                <span className="text-slate-400 text-sm">Ishlatilgan</span>
                <span className={`text-3xl font-bold ${
                  d?.disk?.usedPercent > 90 ? "text-red-400" : d?.disk?.usedPercent > 75 ? "text-amber-400" : "text-white"
                }`}>{d?.disk?.usedPercent || 0}%</span>
              </div>
              <GaugeBar value={d?.disk?.usedPercent || 0} warn={75} danger={90} />
            </div>
            <div>
              <StatRow label="Jami hajm" value={`${d?.disk?.total || 0} MB`} />
              <StatRow label="Ishlatilgan" value={`${d?.disk?.used || 0} MB`} accent />
              <StatRow label="Erkin" value={`${d?.disk?.free || 0} MB`} />
              <StatRow label="DB hajmi" value={`${d?.database?.sizeMB || 0} MB`} />
            </div>
          </Card>

          {/* Database */}
          <Card className="bg-slate-900 border-slate-800 p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-amber-500/10 rounded-xl flex items-center justify-center">
                  <Database className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Ma'lumotlar Bazasi</h3>
                  <p className="text-xs text-slate-500 mt-0.5">PostgreSQL</p>
                </div>
              </div>
              <HealthBadge status={d?.database?.latencyMs > 500 ? "critical" : d?.database?.latencyMs > 150 ? "warning" : "ok"} />
            </div>
            <div className="mb-4">
              <div className="flex justify-between items-end mb-2">
                <span className="text-slate-400 text-sm">Kechikish (ping)</span>
                <span className={`text-3xl font-bold ${
                  d?.database?.latencyMs > 500 ? "text-red-400" :
                  d?.database?.latencyMs > 150 ? "text-amber-400" : "text-green-400"
                }`}>{d?.database?.latencyMs || 0}ms</span>
              </div>
              <GaugeBar value={Math.min((d?.database?.latencyMs || 0) / 5, 100)} warn={30} danger={60} unit="ms" />
            </div>
            <div>
              <StatRow label="Holat" value={d?.database?.status || "—"} />
              <StatRow label="Baza hajmi" value={`${d?.database?.sizeMB || 0} MB`} />
              <StatRow label="Korxonalar" value={String(d?.stats?.companies || 0)} />
              <StatRow label="Xodimlar" value={String(d?.stats?.employees || 0)} />
              <StatRow label="Davomatlar" value={String(d?.stats?.totalAttendance || 0)} />
            </div>
          </Card>
        </div>

        {/* Server Info + Stats */}
        <div className="grid sm:grid-cols-2 gap-5">
          <Card className="bg-slate-900 border-slate-800 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 bg-green-500/10 rounded-xl flex items-center justify-center">
                <Server className="w-5 h-5 text-green-400" />
              </div>
              <h3 className="font-semibold text-white">Server Ma'lumotlari</h3>
            </div>
            <StatRow label="Ishlash vaqti" value={d?.server?.uptime || "—"} />
            <StatRow label="Ishga tushgan" value={d?.server?.startedAt ? format(new Date(d.server.startedAt), "dd.MM.yyyy HH:mm") : "—"} />
            <StatRow label="Node.js versiya" value={d?.server?.nodeVersion || "—"} />
            <StatRow label="Platforma" value={d?.server?.platform || "—"} />
            <StatRow label="Muhit" value={d?.server?.environment || "—"} />
          </Card>

          <Card className="bg-slate-900 border-slate-800 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 bg-cyan-500/10 rounded-xl flex items-center justify-center">
                <Layers className="w-5 h-5 text-cyan-400" />
              </div>
              <h3 className="font-semibold text-white">Platforma Statistikasi</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Korxonalar", value: d?.stats?.companies || 0, icon: Building2 },
                { label: "Xodimlar", value: d?.stats?.employees || 0, icon: Users },
                { label: "Bugun davomat", value: d?.stats?.todayAttendance || 0, icon: CalendarCheck },
                { label: "Jami davomatlar", value: d?.stats?.totalAttendance || 0, icon: Clock },
                { label: "Jami oyliklar", value: d?.stats?.totalPayrolls || 0, icon: Zap },
              ].map(item => (
                <div key={item.label} className="bg-slate-800/60 rounded-xl p-3">
                  <item.icon className="w-4 h-4 text-slate-500 mb-1.5" />
                  <p className="text-xl font-bold text-white">{item.value}</p>
                  <p className="text-xs text-slate-500">{item.label}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* DB Table Sizes */}
        {d?.database?.tables?.length > 0 && (
          <Card className="bg-slate-900 border-slate-800 p-6">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <Database className="w-4 h-4 text-slate-500" />
              Jadval Hajmlari (PostgreSQL)
            </h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {d.database.tables.map((t: any) => (
                <div key={t.table} className="flex items-center justify-between bg-slate-800/60 rounded-lg px-3 py-2">
                  <span className="text-sm text-slate-300 font-mono">{t.table}</span>
                  <span className="text-xs text-slate-500">{t.size}</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Recommendations */}
        <Card className="bg-slate-900 border-slate-800 p-6">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-slate-400" />
            Tavsiyalar va Ogohlantirish
          </h3>
          <div className="space-y-3">
            {d?.recommendations?.map((rec: any, i: number) => (
              <div key={i} className={`flex items-start gap-3 rounded-xl px-4 py-3 ${
                rec.level === "critical" ? "bg-red-950/40 border border-red-500/20" :
                rec.level === "warning" ? "bg-amber-950/30 border border-amber-500/20" :
                "bg-slate-800/60"
              }`}>
                {rec.level === "critical" ? <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" /> :
                 rec.level === "warning" ? <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" /> :
                 <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />}
                <p className={`text-sm ${
                  rec.level === "critical" ? "text-red-200" :
                  rec.level === "warning" ? "text-amber-200" : "text-slate-300"
                }`}>{rec.text}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* When to scale */}
        <Card className="bg-slate-900 border-slate-800 p-6">
          <h3 className="font-semibold text-white mb-5 flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            Serverni Qachon Kengaytirish Kerak?
          </h3>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              {
                title: "CPU 80%+ doimiy bo'lsa",
                icon: Cpu,
                color: "text-red-400 bg-red-500/10",
                steps: [
                  "Vertical scaling: Serverga kuchli CPU qo'shing",
                  "Horizontal scaling: Ko'p server ishga tushiring",
                  "Load balancer o'rnating (Nginx, HAProxy)",
                  "CPU-og'ir operatsiyalarni optimallashtiring",
                ],
              },
              {
                title: "RAM 85%+ doimiy bo'lsa",
                icon: Activity,
                color: "text-amber-400 bg-amber-500/10",
                steps: [
                  "Serverga qo'shimcha RAM qo'shing (min 4GB → 8GB)",
                  "Node.js --max-old-space-size limitini oshiring",
                  "Xotira sizib chiqishini (memory leak) tekshiring",
                  "Redis kesh yechimi o'rnatish ko'rib chiqing",
                ],
              },
              {
                title: "DB 500ms+ kechikish bo'lsa",
                icon: Database,
                color: "text-blue-400 bg-blue-500/10",
                steps: [
                  "Ko'p ishlatiladigan ustunlarga INDEX qo'shing",
                  "Connection pool hajmini oshiring (PgBouncer)",
                  "Alohida DB serveriga ko'chiring",
                  "Read replica (o'qish replika) yarating",
                ],
              },
              {
                title: "Disk 90%+ to'lsa",
                icon: HardDrive,
                color: "text-orange-400 bg-orange-500/10",
                steps: [
                  "Eski log fayllarni o'chiring",
                  "Baza arxivlarini tashqi xotiraga ko'chiring",
                  "Disk hajmini oshiring (SSD ko'paytiring)",
                  "Fayllarni Object Storage (S3) ga ko'chiring",
                ],
              },
              {
                title: "Xavfsizlik & Monitoring",
                icon: Shield,
                color: "text-purple-400 bg-purple-500/10",
                steps: [
                  "Rate limiting va DDoS himoyasini yoqing",
                  "SSL/TLS sertifikatni yangilang",
                  "Prometheus + Grafana monitoring o'rnating",
                  "Avtomatik backup (kunlik) sozlang",
                ],
              },
              {
                title: "Qachon munosib holat?",
                icon: CheckCircle2,
                color: "text-green-400 bg-green-500/10",
                steps: [
                  "CPU < 50%, RAM < 70%, DB < 100ms",
                  "Disk < 75% to'lgan bo'lsa",
                  "Uptime 99.9%+ saqlangan bo'lsa",
                  "Backup kunlik muvaffaqiyatli bo'lsa",
                ],
              },
            ].map(item => (
              <div key={item.title} className="bg-slate-800/50 rounded-2xl p-4">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-3 ${item.color}`}>
                  <item.icon className="w-4 h-4" />
                </div>
                <p className="font-medium text-white text-sm mb-3">{item.title}</p>
                <ul className="space-y-1.5">
                  {item.steps.map((step, i) => (
                    <li key={i} className="text-xs text-slate-400 flex items-start gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-slate-600 flex-shrink-0 mt-1.5" />
                      {step}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Card>

        <p className="text-center text-xs text-slate-600 pb-4">
          Ma'lumotlar har 20 soniyada avtomatik yangilanadi · Hozirgi vaqt: {format(new Date(), "HH:mm:ss")}
        </p>
      </div>
    </div>
  );
}
