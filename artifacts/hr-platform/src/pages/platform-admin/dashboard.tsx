import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { apiClient } from "@/lib/api-client";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Shield, Building2, Users, CalendarCheck, LogOut, Search,
  ChevronRight, Server, Activity, Database, Cpu, Eye, RefreshCw
} from "lucide-react";
import { format } from "date-fns";

function usePlatformAuth() {
  const [, setLocation] = useLocation();
  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/platform-admin/me"],
    queryFn: () => apiClient.get("/api/platform-admin/me").then(r => r.data),
    retry: false,
  });
  useEffect(() => {
    if (!isLoading && error) setLocation("/platform-admin/login");
  }, [isLoading, error]);
  return { data, isLoading };
}

function SystemCard() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["/api/platform-admin/system"],
    queryFn: () => apiClient.get("/api/platform-admin/system").then(r => r.data),
    refetchInterval: 30000,
  });

  if (isLoading) return <Card className="bg-slate-800 border-slate-700 p-6 animate-pulse h-48" />;

  const getStatusColor = (val: number, warn: number, danger: number) =>
    val >= danger ? "text-red-400" : val >= warn ? "text-amber-400" : "text-green-400";

  return (
    <Card className="bg-slate-800 border-slate-700 p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600/20 rounded-xl flex items-center justify-center">
            <Server className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Server Holati</h3>
            <p className="text-xs text-slate-400">Ishga tushgandan: {data?.server?.uptime}</p>
          </div>
        </div>
        <Button size="sm" variant="ghost" onClick={() => refetch()}
          className="text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg">
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-slate-900 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Cpu className="w-4 h-4 text-slate-400" />
            <span className="text-xs text-slate-400">CPU yuklanish</span>
          </div>
          <p className={`text-2xl font-bold ${getStatusColor(data?.cpu?.loadPercent || 0, 50, 80)}`}>
            {data?.cpu?.loadPercent || 0}%
          </p>
          <p className="text-xs text-slate-500 mt-1">{data?.cpu?.count} core · {data?.cpu?.loadAvg1} avg</p>
        </div>
        <div className="bg-slate-900 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-slate-400" />
            <span className="text-xs text-slate-400">RAM</span>
          </div>
          <p className={`text-2xl font-bold ${getStatusColor(data?.memory?.systemUsedPercent || 0, 70, 85)}`}>
            {data?.memory?.systemUsedPercent || 0}%
          </p>
          <p className="text-xs text-slate-500 mt-1">{data?.memory?.heapUsed}MB heap</p>
        </div>
        <div className="bg-slate-900 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Database className="w-4 h-4 text-slate-400" />
            <span className="text-xs text-slate-400">DB kechikish</span>
          </div>
          <p className={`text-2xl font-bold ${getStatusColor(data?.database?.latencyMs || 0, 100, 500)}`}>
            {data?.database?.latencyMs || 0}ms
          </p>
          <p className="text-xs text-slate-500 mt-1">{data?.database?.status}</p>
        </div>
        <div className="bg-slate-900 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="w-4 h-4 text-slate-400" />
            <span className="text-xs text-slate-400">Jami</span>
          </div>
          <p className="text-2xl font-bold text-white">{data?.stats?.companies || 0}</p>
          <p className="text-xs text-slate-500 mt-1">{data?.stats?.employees || 0} xodim</p>
        </div>
      </div>

      {data?.recommendations?.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tavsiyalar</p>
          {data.recommendations.map((rec: string, i: number) => (
            <p key={i} className="text-sm text-slate-300 bg-slate-900 rounded-lg px-3 py-2">{rec}</p>
          ))}
        </div>
      )}
    </Card>
  );
}

export default function PlatformAdminDashboard() {
  const [, setLocation] = useLocation();
  const { isLoading: authLoading } = usePlatformAuth();
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["/api/platform-admin/companies"],
    queryFn: () => apiClient.get("/api/platform-admin/companies").then(r => r.data as { data: any[]; total: number }),
    enabled: !authLoading,
  });

  const handleLogout = async () => {
    await apiClient.post("/api/platform-admin/logout", {});
    setLocation("/platform-admin/login");
  };

  const companies = (data?.data || []).filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  );

  if (authLoading) {
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
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-white">Platform Admin</h1>
            <p className="text-xs text-slate-400">Boshqaruv markazi</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/platform-admin/system">
            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white hover:bg-slate-800 gap-2 rounded-xl">
              <Server className="w-4 h-4" />
              <span className="hidden sm:inline">Infratuzilma</span>
            </Button>
          </Link>
          <Button variant="ghost" size="sm" onClick={handleLogout}
            className="text-slate-400 hover:text-red-400 hover:bg-red-500/10 gap-2 rounded-xl">
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Chiqish</span>
          </Button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Jami korxonalar", value: data?.total || 0, icon: Building2, color: "text-blue-400 bg-blue-500/10" },
            { label: "Jami xodimlar", value: data?.data?.reduce((s: number, c: any) => s + c.employeeCount, 0) || 0, icon: Users, color: "text-green-400 bg-green-500/10" },
            { label: "Bugungi davomat", value: data?.data?.reduce((s: number, c: any) => s + c.todayAttendance, 0) || 0, icon: CalendarCheck, color: "text-amber-400 bg-amber-500/10" },
            { label: "Faol tarif", value: data?.data?.filter((c: any) => c.subscriptionPlan !== "free").length || 0, icon: Activity, color: "text-purple-400 bg-purple-500/10" },
          ].map(stat => (
            <Card key={stat.label} className="bg-slate-900 border-slate-800 p-5">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${stat.color}`}>
                <stat.icon className="w-4 h-4" />
              </div>
              <p className="text-2xl font-bold text-white">{stat.value}</p>
              <p className="text-xs text-slate-400 mt-0.5">{stat.label}</p>
            </Card>
          ))}
        </div>

        <SystemCard />

        <div>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <h2 className="text-xl font-bold text-white">Barcha Korxonalar</h2>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Qidirish..."
                className="pl-9 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 rounded-xl w-64"
              />
            </div>
          </div>
          <div className="space-y-3">
            {isLoading ? (
              [1, 2, 3].map(i => <Card key={i} className="bg-slate-900 border-slate-800 p-5 animate-pulse h-20" />)
            ) : companies.map((company: any) => (
              <Link key={company.id} href={`/platform-admin/companies/${company.id}`}>
                <Card className="bg-slate-900 border-slate-800 hover:border-blue-500/40 hover:bg-slate-800/50 transition-all cursor-pointer p-5">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-blue-600/20 flex items-center justify-center text-blue-400 font-bold text-lg">
                        {company.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-white">{company.name}</p>
                        <p className="text-sm text-slate-400">{company.email}</p>
                        {company.adminName && (
                          <p className="text-xs text-slate-500">Admin: {company.adminName}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 flex-wrap">
                      <div className="text-center">
                        <p className="text-lg font-bold text-white">{company.employeeCount}</p>
                        <p className="text-xs text-slate-500">Xodim</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-green-400">{company.todayAttendance}</p>
                        <p className="text-xs text-slate-500">Bugun</p>
                      </div>
                      <Badge className={`
                        border-0 
                        ${company.subscriptionPlan === 'premium' ? 'bg-amber-500/20 text-amber-400' :
                          company.subscriptionPlan === 'business' ? 'bg-purple-500/20 text-purple-400' :
                          'bg-slate-700 text-slate-400'}
                      `}>
                        {company.subscriptionPlan}
                      </Badge>
                      <p className="text-xs text-slate-500">
                        {company.createdAt ? format(new Date(company.createdAt), "dd.MM.yy") : "—"}
                      </p>
                      <ChevronRight className="w-5 h-5 text-slate-600" />
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
