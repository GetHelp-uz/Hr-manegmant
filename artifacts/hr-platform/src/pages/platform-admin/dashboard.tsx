import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { apiClient } from "@/lib/api-client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Shield, Building2, Users, CalendarCheck, LogOut, Search,
  ChevronRight, Server, Activity, Database, Cpu, RefreshCw,
  Trash2, Settings, HardDrive, TrendingUp, Clock, CheckCircle2,
  AlertTriangle, XCircle, BarChart3, Globe, Phone, Mail, UserCheck,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

function usePlatformAuth() {
  const [, setLocation] = useLocation();
  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/platform-admin/me"],
    queryFn: () => apiClient.get("/api/platform-admin/me"),
    retry: false,
  });
  useEffect(() => {
    if (!isLoading && error) setLocation("/platform-admin/login");
  }, [isLoading, error]);
  return { data, isLoading };
}

type Tab = "companies" | "employees" | "activity";

const PLAN_COLORS: Record<string, string> = {
  free: "bg-slate-700 text-slate-300",
  starter: "bg-cyan-500/20 text-cyan-400",
  business: "bg-purple-500/20 text-purple-400",
  enterprise: "bg-amber-500/20 text-amber-400",
  premium: "bg-amber-500/20 text-amber-400",
};

const PLANS = ["free", "starter", "business", "enterprise"];

function SystemMiniCard() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["/api/platform-admin/system"],
    queryFn: () => apiClient.get("/api/platform-admin/system"),
    refetchInterval: 30000,
  });

  const getColor = (v: number, w: number, d: number) =>
    v >= d ? "text-red-400" : v >= w ? "text-amber-400" : "text-green-400";
  const getBar = (v: number, w: number, d: number) =>
    v >= d ? "bg-red-500" : v >= w ? "bg-amber-500" : "bg-green-500";

  if (isLoading) return <Card className="bg-slate-900 border-slate-800 p-5 animate-pulse h-36" />;

  const metrics = [
    { label: "CPU", value: data?.cpu?.loadPercent || 0, unit: "%", warn: 50, danger: 80, icon: Cpu },
    { label: "RAM", value: data?.memory?.systemUsedPercent || 0, unit: "%", warn: 70, danger: 85, icon: Activity },
    { label: "DB ping", value: data?.database?.latencyMs || 0, unit: "ms", warn: 150, danger: 500, icon: Database },
    { label: "Disk", value: data?.disk?.usedPercent || 0, unit: "%", warn: 75, danger: 90, icon: HardDrive },
  ];

  return (
    <Card className="bg-slate-900 border-slate-800 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600/20 rounded-xl flex items-center justify-center">
            <Server className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <p className="font-semibold text-white text-sm">Server holati</p>
            <p className="text-xs text-slate-500">Uptime: {data?.server?.uptime}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/platform-admin/system">
            <Button size="sm" variant="ghost" className="text-slate-400 hover:text-white hover:bg-slate-800 text-xs rounded-lg h-7 px-2">
              Batafsil
            </Button>
          </Link>
          <Button size="sm" variant="ghost" onClick={() => refetch()}
            className="text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg h-7 w-7 p-0">
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-3">
        {metrics.map(m => (
          <div key={m.label} className="bg-slate-950/50 rounded-xl p-3">
            <p className="text-xs text-slate-500 mb-1">{m.label}</p>
            <p className={`text-lg font-bold ${getColor(m.value, m.warn, m.danger)}`}>{m.value}{m.unit}</p>
            <div className="w-full bg-slate-700 rounded-full h-1 mt-1.5">
              <div className={`h-1 rounded-full ${getBar(m.value, m.warn, m.danger)}`}
                style={{ width: `${Math.min(m.value, 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

export default function PlatformAdminDashboard() {
  const [, setLocation] = useLocation();
  const { isLoading: authLoading } = usePlatformAuth();
  const [tab, setTab] = useState<Tab>("companies");
  const [search, setSearch] = useState("");
  const [changePlanId, setChangePlanId] = useState<number | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const qc = useQueryClient();

  const { data: companiesData, isLoading: companiesLoading } = useQuery({
    queryKey: ["/api/platform-admin/companies"],
    queryFn: () => apiClient.get("/api/platform-admin/companies"),
    enabled: !authLoading,
  });

  const { data: employeesData, isLoading: employeesLoading } = useQuery({
    queryKey: ["/api/platform-admin/employees", search],
    queryFn: () => apiClient.get(`/api/platform-admin/employees${search ? `?search=${encodeURIComponent(search)}` : ""}`),
    enabled: tab === "employees" && !authLoading,
  });

  const { data: activityData } = useQuery({
    queryKey: ["/api/platform-admin/activity"],
    queryFn: () => apiClient.get("/api/platform-admin/activity"),
    enabled: tab === "activity" && !authLoading,
    refetchInterval: 30000,
  });

  const planMutation = useMutation({
    mutationFn: ({ id, plan }: { id: number; plan: string }) =>
      apiClient.patch(`/api/platform-admin/companies/${id}/plan`, { plan }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/platform-admin/companies"] });
      setChangePlanId(null);
    },
  });

  const deleteCompanyMutation = useMutation({
    mutationFn: (id: number) => apiClient.delete(`/api/platform-admin/companies/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/platform-admin/companies"] });
      setDeleteConfirm(null);
    },
  });

  const deleteEmpMutation = useMutation({
    mutationFn: (id: number) => apiClient.delete(`/api/platform-admin/employees/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/platform-admin/employees"] }),
  });

  const handleLogout = async () => {
    await apiClient.post("/api/platform-admin/logout", {});
    setLocation("/platform-admin/login");
  };

  const companies: any[] = (companiesData as any)?.data || [];
  const employees: any[] = (employeesData as any)?.data || [];
  const activity: any[] = (activityData as any)?.feed || [];

  const totalEmployees = companies.reduce((s: number, c: any) => s + (c.employeeCount || 0), 0);
  const todayAttendance = companies.reduce((s: number, c: any) => s + (c.todayAttendance || 0), 0);
  const paidPlans = companies.filter((c: any) => c.subscriptionPlan !== "free").length;

  const filteredCompanies = tab === "companies" && search
    ? companies.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.email?.toLowerCase().includes(search.toLowerCase()) ||
        c.adminName?.toLowerCase().includes(search.toLowerCase())
      )
    : companies;

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur px-6 py-4 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/30">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-white leading-none">Platform Admin</h1>
            <p className="text-xs text-slate-500 mt-0.5">Boshqaruv markazi</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/platform-admin/system">
            <Button variant="ghost" size="sm"
              className="text-slate-400 hover:text-white hover:bg-slate-800 gap-2 rounded-xl">
              <Server className="w-4 h-4" />
              <span className="hidden sm:inline text-xs">Infratuzilma</span>
            </Button>
          </Link>
          <Button variant="ghost" size="sm" onClick={handleLogout}
            className="text-slate-400 hover:text-red-400 hover:bg-red-500/10 gap-2 rounded-xl">
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline text-xs">Chiqish</span>
          </Button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Korxonalar", value: (companiesData as any)?.total || 0, icon: Building2, color: "text-blue-400 bg-blue-500/10", sub: "Jami ro'yxatdan" },
            { label: "Xodimlar", value: totalEmployees, icon: Users, color: "text-green-400 bg-green-500/10", sub: "Barcha korxona" },
            { label: "Bugungi davomat", value: todayAttendance, icon: CalendarCheck, color: "text-amber-400 bg-amber-500/10", sub: "Bugun kelganlar" },
            { label: "Pullik tariflar", value: paidPlans, icon: TrendingUp, color: "text-purple-400 bg-purple-500/10", sub: "Starter va yuqori" },
          ].map(stat => (
            <Card key={stat.label} className="bg-slate-900 border-slate-800 p-5">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${stat.color}`}>
                <stat.icon className="w-4 h-4" />
              </div>
              <p className="text-2xl font-bold text-white">{stat.value}</p>
              <p className="text-xs text-slate-400 mt-0.5">{stat.label}</p>
              <p className="text-xs text-slate-600 mt-0.5">{stat.sub}</p>
            </Card>
          ))}
        </div>

        <SystemMiniCard />

        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1">
            {([["companies", "Korxonalar", Building2], ["employees", "Xodimlar", Users], ["activity", "Faollik", Activity]] as const).map(([key, label, Icon]) => (
              <button key={key} onClick={() => { setTab(key); setSearch(""); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  tab === key ? "bg-blue-600 text-white shadow" : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}>
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
          {(tab === "companies" || tab === "employees") && (
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Qidirish..."
                className="pl-9 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 rounded-xl w-64 h-9 text-sm"
              />
            </div>
          )}
        </div>

        {tab === "companies" && (
          <div className="space-y-3">
            {companiesLoading ? (
              [1, 2, 3].map(i => <Card key={i} className="bg-slate-900 border-slate-800 p-5 animate-pulse h-24" />)
            ) : filteredCompanies.length === 0 ? (
              <Card className="bg-slate-900 border-slate-800 p-12 text-center text-slate-500">
                Korxona topilmadi
              </Card>
            ) : filteredCompanies.map((company: any) => (
              <Card key={company.id} className="bg-slate-900 border-slate-800 hover:border-slate-700 transition-all">
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600/30 to-indigo-600/20 flex items-center justify-center text-blue-400 font-bold text-xl flex-shrink-0">
                        {company.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-white">{company.name}</p>
                          <Badge className={`${PLAN_COLORS[company.subscriptionPlan] || "bg-slate-700 text-slate-300"} border-0 text-xs`}>
                            {company.subscriptionPlan}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          {company.email && (
                            <span className="flex items-center gap-1 text-xs text-slate-500">
                              <Mail className="w-3 h-3" />{company.email}
                            </span>
                          )}
                          {company.phone && (
                            <span className="flex items-center gap-1 text-xs text-slate-500">
                              <Phone className="w-3 h-3" />{company.phone}
                            </span>
                          )}
                          {company.adminName && (
                            <span className="flex items-center gap-1 text-xs text-slate-500">
                              <UserCheck className="w-3 h-3" />Admin: {company.adminName}
                              {company.adminLogin && <span className="text-slate-600">({company.adminLogin})</span>}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <p className="text-lg font-bold text-white">{company.employeeCount}</p>
                          <p className="text-xs text-slate-500">Xodim</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold text-green-400">{company.todayAttendance}</p>
                          <p className="text-xs text-slate-500">Bugun</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold text-amber-400">{company.pendingLeave}</p>
                          <p className="text-xs text-slate-500">Ta'til so'rov</p>
                        </div>
                      </div>
                      <p className="text-xs text-slate-600">
                        {company.createdAt ? format(new Date(company.createdAt), "dd.MM.yy") : "—"}
                      </p>

                      <div className="flex items-center gap-1.5">
                        {changePlanId === company.id ? (
                          <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-xl p-1">
                            {PLANS.map(plan => (
                              <button key={plan} onClick={() => planMutation.mutate({ id: company.id, plan })}
                                disabled={planMutation.isPending}
                                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                                  company.subscriptionPlan === plan
                                    ? "bg-blue-600 text-white"
                                    : "text-slate-400 hover:text-white hover:bg-slate-700"
                                }`}>
                                {plan}
                              </button>
                            ))}
                            <button onClick={() => setChangePlanId(null)} className="px-2 py-1 text-slate-600 hover:text-white text-xs">✕</button>
                          </div>
                        ) : (
                          <>
                            <Button size="sm" variant="ghost"
                              onClick={() => setChangePlanId(company.id)}
                              className="h-8 w-8 p-0 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg" title="Tarif o'zgartirish">
                              <Settings className="w-3.5 h-3.5" />
                            </Button>
                            <Link href={`/platform-admin/companies/${company.id}`}>
                              <Button size="sm" variant="ghost"
                                className="h-8 w-8 p-0 text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg" title="Batafsil ko'rish">
                                <ChevronRight className="w-3.5 h-3.5" />
                              </Button>
                            </Link>
                            {deleteConfirm === company.id ? (
                              <div className="flex items-center gap-1">
                                <Button size="sm" variant="ghost"
                                  onClick={() => deleteCompanyMutation.mutate(company.id)}
                                  disabled={deleteCompanyMutation.isPending}
                                  className="h-8 px-2 text-red-400 hover:bg-red-500/10 rounded-lg text-xs">
                                  {deleteCompanyMutation.isPending ? "..." : "Ha, o'chir"}
                                </Button>
                                <Button size="sm" variant="ghost"
                                  onClick={() => setDeleteConfirm(null)}
                                  className="h-8 px-2 text-slate-500 hover:text-white rounded-lg text-xs">Yo'q</Button>
                              </div>
                            ) : (
                              <Button size="sm" variant="ghost"
                                onClick={() => setDeleteConfirm(company.id)}
                                className="h-8 w-8 p-0 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg" title="O'chirish">
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {tab === "employees" && (
          <Card className="bg-slate-900 border-slate-800 overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-white">Barcha Xodimlar</h2>
                <p className="text-xs text-slate-500 mt-0.5">{(employeesData as any)?.total || 0} ta xodim</p>
              </div>
              <Badge className="bg-green-500/20 text-green-400 border-0">
                Bugun faol: {(employeesData as any)?.todayActive || 0}
              </Badge>
            </div>
            {employeesLoading ? (
              <div className="p-12 flex justify-center">
                <div className="animate-spin w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-950/50">
                      <th className="text-left px-5 py-3 text-xs text-slate-500 font-medium">Ism</th>
                      <th className="text-left px-5 py-3 text-xs text-slate-500 font-medium">Lavozim</th>
                      <th className="text-left px-5 py-3 text-xs text-slate-500 font-medium">Korxona</th>
                      <th className="text-left px-5 py-3 text-xs text-slate-500 font-medium">Telefon</th>
                      <th className="text-left px-5 py-3 text-xs text-slate-500 font-medium">Oylik turi</th>
                      <th className="text-left px-5 py-3 text-xs text-slate-500 font-medium">Qo'shilgan</th>
                      <th className="px-5 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {employees.map((emp: any) => (
                      <tr key={emp.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-blue-600/20 flex items-center justify-center text-blue-400 text-xs font-bold flex-shrink-0">
                              {emp.fullName?.charAt(0)}
                            </div>
                            <span className="text-white font-medium">{emp.fullName}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-slate-300">{emp.position || "—"}</td>
                        <td className="px-5 py-3.5">
                          <span className="text-blue-400 text-xs bg-blue-500/10 px-2 py-0.5 rounded-lg">{emp.companyName}</span>
                        </td>
                        <td className="px-5 py-3.5 text-slate-400 text-xs">{emp.phone || "—"}</td>
                        <td className="px-5 py-3.5">
                          <Badge className="bg-slate-800 text-slate-300 border-0 text-xs">
                            {emp.salaryType === "monthly" ? "Oylik" : emp.salaryType === "hourly" ? "Soatbay" : emp.salaryType || "—"}
                          </Badge>
                        </td>
                        <td className="px-5 py-3.5 text-slate-500 text-xs">
                          {emp.createdAt ? format(new Date(emp.createdAt), "dd.MM.yy") : "—"}
                        </td>
                        <td className="px-5 py-3.5">
                          <Button size="sm" variant="ghost"
                            onClick={() => deleteEmpMutation.mutate(emp.id)}
                            disabled={deleteEmpMutation.isPending}
                            className="h-7 w-7 p-0 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg">
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {employees.length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-center py-12 text-slate-500">Xodim topilmadi</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}

        {tab === "activity" && (
          <Card className="bg-slate-900 border-slate-800">
            <div className="p-5 border-b border-slate-800">
              <h2 className="font-semibold text-white">So'nggi Faollik</h2>
              <p className="text-xs text-slate-500 mt-0.5">Barcha tizim bo'yicha so'nggi hodisalar</p>
            </div>
            <div className="divide-y divide-slate-800/60">
              {activity.length === 0 ? (
                <div className="text-center py-12 text-slate-500">Ma'lumot yo'q</div>
              ) : activity.map((item: any, i: number) => {
                const iconMap: Record<string, React.ReactNode> = {
                  building: <Building2 className="w-4 h-4 text-blue-400" />,
                  user: <Users className="w-4 h-4 text-green-400" />,
                  clock: <Clock className="w-4 h-4 text-amber-400" />,
                };
                const bgMap: Record<string, string> = {
                  building: "bg-blue-500/10",
                  user: "bg-green-500/10",
                  clock: "bg-amber-500/10",
                };
                return (
                  <div key={i} className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-800/30 transition-colors">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${bgMap[item.icon] || "bg-slate-700"}`}>
                      {iconMap[item.icon] || <Globe className="w-4 h-4 text-slate-400" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-slate-200 truncate">{item.text}</p>
                    </div>
                    <p className="text-xs text-slate-600 flex-shrink-0">
                      {item.time ? formatDistanceToNow(new Date(item.time), { addSuffix: true }) : ""}
                    </p>
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
