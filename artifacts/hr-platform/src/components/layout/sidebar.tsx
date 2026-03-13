import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Users, 
  CalendarCheck, 
  ScanLine, 
  MonitorSmartphone, 
  Banknote, 
  FileBarChart, 
  Settings,
  ChevronLeft,
  ChevronRight,
  Building2,
  CalendarDays,
} from "lucide-react";
import { useAppStore } from "@/store/use-store";
import { useTranslation } from "@/lib/i18n";
import { useGetMyCompany } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export function Sidebar() {
  const [location] = useLocation();
  const { language, sidebarOpen, toggleSidebar } = useAppStore();
  const t = useTranslation(language);
  const { data: company } = useGetMyCompany({ query: { retry: false } });

  const { data: leaveRequests = [] } = useQuery({
    queryKey: ["/api/leave-requests"],
    queryFn: async () => { const r = await apiClient.get("/api/leave-requests"); return r.data as any[]; },
    refetchInterval: 30000,
  });
  const pendingCount = leaveRequests.filter((r: any) => r.status === "pending").length;

  const navigation = [
    { name: t('dashboard'), href: "/dashboard", icon: LayoutDashboard },
    { name: t('employees'), href: "/employees", icon: Users },
    { name: "Bo'limlar", href: "/departments", icon: Building2 },
    { name: t('attendance'), href: "/attendance", icon: CalendarCheck },
    { name: "Ta'til So'rovlar", href: "/leave-requests", icon: CalendarDays, badge: pendingCount || undefined },
    { name: t('qr_scanner'), href: "/scanner", icon: ScanLine },
    { name: t('devices'), href: "/devices", icon: MonitorSmartphone },
    { name: t('payroll'), href: "/payroll", icon: Banknote },
    { name: t('reports'), href: "/reports", icon: FileBarChart },
    { name: t('settings'), href: "/settings", icon: Settings },
  ];

  return (
    <div 
      className={`
        fixed inset-y-0 left-0 z-50 flex flex-col bg-sidebar text-sidebar-foreground transition-all duration-300 ease-in-out
        border-r border-sidebar-border shadow-xl
        ${sidebarOpen ? 'w-64' : 'w-20'}
      `}
    >
      <div className="flex items-center justify-between h-16 px-4 border-b border-sidebar-border bg-sidebar-accent/50">
        {sidebarOpen ? (
          <div className="flex items-center gap-3 overflow-hidden">
            {company?.logo ? (
              <img src={company.logo} alt="Logo" className="w-8 h-8 rounded-md object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center font-bold text-white shadow-md shadow-primary/20">
                {company?.name?.charAt(0) || 'HR'}
              </div>
            )}
            <span className="font-display font-bold truncate text-lg tracking-tight">
              {company?.name || 'HR Platform'}
            </span>
          </div>
        ) : (
          <div className="w-full flex justify-center">
            <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center font-bold text-white shadow-md shadow-primary/20">
              {company?.name?.charAt(0) || 'HR'}
            </div>
          </div>
        )}
      </div>

      <button 
        onClick={toggleSidebar}
        className="absolute -right-3 top-20 bg-primary text-white rounded-full p-1 shadow-md hover:scale-110 transition-transform focus:outline-none"
      >
        {sidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
      </button>

      <div className="flex-1 overflow-y-auto py-6 px-3 space-y-1 scrollbar-hide">
        {navigation.map((item: any) => {
          const isActive = location === item.href;
          return (
            <Link key={item.name} href={item.href} className="block">
              <div className={`
                flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-all duration-200 group relative
                ${isActive 
                  ? 'bg-primary text-white shadow-md shadow-primary/25' 
                  : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-white'
                }
                ${!sidebarOpen && 'justify-center'}
              `}>
                <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-white' : 'text-sidebar-foreground/60 group-hover:text-white transition-colors'}`} />
                {sidebarOpen && <span className="font-medium flex-1">{item.name}</span>}
                {item.badge > 0 && (
                  <span className={`text-xs font-bold bg-red-500 text-white rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 ${!sidebarOpen ? 'absolute -top-1 -right-1' : ''}`}>
                    {item.badge}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
      
      <div className="p-4 border-t border-sidebar-border bg-sidebar-accent/20">
        <div className={`flex items-center ${sidebarOpen ? 'gap-3' : 'justify-center'} text-xs text-sidebar-foreground/50`}>
          <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse"></div>
          {sidebarOpen && <span>System Online</span>}
        </div>
      </div>
    </div>
  );
}
