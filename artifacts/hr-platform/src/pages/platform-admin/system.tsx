import { useEffect } from "react";
import { useLocation, Link } from "wouter";
import { apiClient } from "@/lib/api-client";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, ArrowLeft, Server, Cpu, Database, Activity, RefreshCw, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

function StatusIcon({ value, warn, danger }: { value: number; warn: number; danger: number }) {
  if (value >= danger) return <XCircle className="w-5 h-5 text-red-400" />;
  if (value >= warn) return <AlertTriangle className="w-5 h-5 text-amber-400" />;
  return <CheckCircle2 className="w-5 h-5 text-green-400" />;
}

function ProgressBar({ value, warn, danger }: { value: number; warn: number; danger: number }) {
  const color = value >= danger ? "bg-red-500" : value >= warn ? "bg-amber-500" : "bg-green-500";
  return (
    <div className="w-full bg-slate-700 rounded-full h-2 mt-2">
      <div className={`h-2 rounded-full transition-all ${color}`} style={{ width: `${Math.min(value, 100)}%` }} />
    </div>
  );
}

export default function PlatformAdminSystem() {
  const [, setLocation] = useLocation();

  const { data, isLoading, refetch, error } = useQuery({
    queryKey: ["/api/platform-admin/system"],
    queryFn: () => apiClient.get("/api/platform-admin/system").then(r => r.data),
    refetchInterval: 15000,
    retry: false,
  });

  useEffect(() => {
    if (error) setLocation("/platform-admin/login");
  }, [error]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

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
            <Server className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-white">Infratuzilma Monitoringi</span>
        </div>
        <Button variant="ghost" size="sm" onClick={() => refetch()}
          className="text-slate-400 hover:text-white hover:bg-slate-800 gap-2 rounded-xl">
          <RefreshCw className="w-4 h-4" />
          Yangilash
        </Button>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <Card className="bg-slate-900 border-slate-800 p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-green-500/10 rounded-xl flex items-center justify-center">
                  <Server className="w-5 h-5 text-green-400" />
                </div>
                <h3 className="font-semibold text-white">Server</h3>
              </div>
              <StatusIcon value={0} warn={50} danger={80} />
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Ishlash vaqti</span>
                <span className="text-white font-medium">{data?.server?.uptime}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Node.js versiya</span>
                <span className="text-white">{data?.server?.nodeVersion}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Muhit</span>
                <span className="text-white">{data?.server?.environment}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Platforma</span>
                <span className="text-white">{data?.server?.platform}</span>
              </div>
            </div>
          </Card>

          <Card className="bg-slate-900 border-slate-800 p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-blue-500/10 rounded-xl flex items-center justify-center">
                  <Cpu className="w-5 h-5 text-blue-400" />
                </div>
                <h3 className="font-semibold text-white">CPU</h3>
              </div>
              <StatusIcon value={data?.cpu?.loadPercent || 0} warn={50} danger={80} />
            </div>
            <div className="space-y-3 text-sm">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-400">Yuklanish</span>
                  <span className="text-white font-bold">{data?.cpu?.loadPercent || 0}%</span>
                </div>
                <ProgressBar value={data?.cpu?.loadPercent || 0} warn={50} danger={80} />
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Yadrolar</span>
                <span className="text-white">{data?.cpu?.count} ta</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">1m / 5m / 15m</span>
                <span className="text-white text-xs">{data?.cpu?.loadAvg1} / {data?.cpu?.loadAvg5} / {data?.cpu?.loadAvg15}</span>
              </div>
            </div>
          </Card>

          <Card className="bg-slate-900 border-slate-800 p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-purple-500/10 rounded-xl flex items-center justify-center">
                  <Activity className="w-5 h-5 text-purple-400" />
                </div>
                <h3 className="font-semibold text-white">RAM</h3>
              </div>
              <StatusIcon value={data?.memory?.systemUsedPercent || 0} warn={70} danger={85} />
            </div>
            <div className="space-y-3 text-sm">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-400">Tizim RAM</span>
                  <span className="text-white font-bold">{data?.memory?.systemUsedPercent || 0}%</span>
                </div>
                <ProgressBar value={data?.memory?.systemUsedPercent || 0} warn={70} danger={85} />
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Erkin</span>
                <span className="text-white">{data?.memory?.systemFree} MB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Node heap</span>
                <span className="text-white">{data?.memory?.heapUsed} / {data?.memory?.heapTotal} MB</span>
              </div>
            </div>
          </Card>

          <Card className="bg-slate-900 border-slate-800 p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-amber-500/10 rounded-xl flex items-center justify-center">
                  <Database className="w-5 h-5 text-amber-400" />
                </div>
                <h3 className="font-semibold text-white">Ma'lumotlar bazasi</h3>
              </div>
              <StatusIcon value={data?.database?.latencyMs || 0} warn={100} danger={500} />
            </div>
            <div className="space-y-3 text-sm">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-400">Kechikish</span>
                  <span className="text-white font-bold">{data?.database?.latencyMs} ms</span>
                </div>
                <ProgressBar value={Math.min((data?.database?.latencyMs || 0) / 5, 100)} warn={20} danger={60} />
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Holat</span>
                <span className={`font-medium ${data?.database?.latencyMs < 100 ? "text-green-400" : data?.database?.latencyMs < 500 ? "text-amber-400" : "text-red-400"}`}>
                  {data?.database?.status}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Korxonalar / Xodimlar</span>
                <span className="text-white">{data?.stats?.companies} / {data?.stats?.employees}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Bugungi davomatlar</span>
                <span className="text-green-400 font-bold">{data?.stats?.todayAttendance}</span>
              </div>
            </div>
          </Card>
        </div>

        {data?.recommendations?.length > 0 && (
          <Card className="bg-slate-900 border-slate-800 p-6">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              Tavsiyalar va Ogohlantirish
            </h3>
            <div className="space-y-3">
              {data.recommendations.map((rec: string, i: number) => (
                <div key={i} className="bg-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200">
                  {rec}
                </div>
              ))}
            </div>
          </Card>
        )}

        <Card className="bg-slate-900 border-slate-800 p-6">
          <h3 className="font-semibold text-white mb-4">Server Ko'tarishni Qachon Kerak?</h3>
          <div className="grid sm:grid-cols-3 gap-4 text-sm">
            {[
              { title: "CPU 80%+ doimiy", action: "Vertical scaling (kuchli server) yoki Horizontal scaling (ko'p server)", icon: Cpu, color: "text-red-400 bg-red-500/10" },
              { title: "RAM 85%+ doimiy", action: "Server xotirasini oshiring yoki Node.js heap limitini kengaytiring", icon: Activity, color: "text-amber-400 bg-amber-500/10" },
              { title: "DB 500ms+ kechikish", action: "DB connection pool'ini optimallang yoki alohida DB serveriga o'ting", icon: Database, color: "text-blue-400 bg-blue-500/10" },
            ].map(item => (
              <div key={item.title} className="bg-slate-800 rounded-xl p-4">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${item.color}`}>
                  <item.icon className="w-4 h-4" />
                </div>
                <p className="font-medium text-white mb-1">{item.title}</p>
                <p className="text-slate-400 text-xs leading-relaxed">{item.action}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
