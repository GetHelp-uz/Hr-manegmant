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
  Building2,
  CalendarDays,
  HandCoins,
  MonitorPlay,
  UserCog,
  Download,
  Brain,
  ChevronLeft,
  ChevronRight,
  Radio,
  Tablet,
} from "lucide-react";
import { useAppStore } from "@/store/use-store";
import { useTranslation, type Language } from "@/lib/i18n";
import { useGetMyCompany } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

const LANG_FLAGS: Record<Language, string> = {
  uz: '🇺🇿',
  ru: '🇷🇺',
  en: '🇬🇧',
};

export function Sidebar() {
  const [location] = useLocation();
  const { language, setLanguage, sidebarOpen, toggleSidebar, userRole } = useAppStore();
  const t = useTranslation(language);
  const { data: company } = useGetMyCompany({ query: { retry: false } });

  const { data: leaveRequests = [] } = useQuery({
    queryKey: ["/api/leave-requests"],
    queryFn: async () => { const r = await apiClient.get("/api/leave-requests"); return (Array.isArray(r) ? r : (r as any)?.data ?? []) as any[]; },
    refetchInterval: 30000,
    enabled: userRole === "admin",
  });
  const pendingCount = leaveRequests.filter((r: any) => r.status === "pending").length;

  const { data: advancesData } = useQuery({
    queryKey: ["/api/advances", "pending"],
    queryFn: async () => { const r: any = await apiClient.get("/api/advances?status=pending"); return (Array.isArray(r) ? r : r?.data ?? []) as any[]; },
    refetchInterval: 30000,
    enabled: userRole === "admin",
  });
  const pendingAdvances = (advancesData as any[] | undefined)?.length || 0;

  const roleLabel = {
    admin: t('role_admin'),
    accountant: t('role_accountant'),
    viewer: t('role_viewer'),
    observer: t('role_observer'),
    hr: t('role_hr'),
  }[userRole || ''] || t('group_system');

  const allNav = [
    { groupKey: 'group_main', items: [
      { name: t('dashboard'), href: "/dashboard", icon: LayoutDashboard, roles: ["admin", "accountant", "viewer", "observer", "hr"] },
      { name: t('employees'), href: "/employees", icon: Users, roles: ["admin", "hr"] },
      { name: t('departments'), href: "/departments", icon: Building2, roles: ["admin"] },
    ]},
    { groupKey: 'group_attendance', items: [
      { name: t('attendance'), href: "/attendance", icon: CalendarCheck, roles: ["admin", "accountant", "viewer", "observer", "hr"] },
      { name: t('monitor'), href: "/monitor", icon: MonitorPlay, roles: ["admin", "accountant", "viewer", "observer", "hr"] },
      { name: t('qr_scanner'), href: "/scanner", icon: ScanLine, roles: ["admin", "hr"] },
      { name: t('kiosk'), href: "/kiosk", icon: Tablet, roles: ["admin"] },
      { name: t('devices'), href: "/devices", icon: MonitorSmartphone, roles: ["admin"] },
    ]},
    { groupKey: 'group_requests', items: [
      { name: t('leave_requests'), href: "/leave-requests", icon: CalendarDays, badge: pendingCount || undefined, roles: ["admin"] },
      { name: t('advance_requests'), href: "/advances", icon: HandCoins, badge: pendingAdvances || undefined, roles: ["admin"] },
    ]},
    { groupKey: 'group_finance', items: [
      { name: t('payroll'), href: "/payroll", icon: Banknote, roles: ["admin", "accountant"] },
      { name: t('reports'), href: "/reports", icon: FileBarChart, roles: ["admin", "accountant", "viewer"] },
      { name: t('export'), href: "/export", icon: Download, roles: ["admin", "accountant"] },
    ]},
    { groupKey: 'group_analytics', items: [
      { name: t('ai_analytics'), href: "/analytics", icon: Brain, roles: ["admin", "accountant", "observer"] },
    ]},
    { groupKey: 'group_messages', items: [
      { name: t('broadcasting'), href: "/broadcasting", icon: Radio, roles: ["admin"] },
    ]},
    { groupKey: 'group_system', items: [
      { name: t('staff'), href: "/staff", icon: UserCog, roles: ["admin"] },
      { name: t('settings'), href: "/settings", icon: Settings, roles: ["admin"] },
    ]},
  ];

  const filteredGroups = allNav
    .map(g => ({ ...g, items: g.items.filter(i => !userRole || i.roles.includes(userRole)) }))
    .filter(g => g.items.length > 0);

  const langs: Language[] = ['uz', 'ru', 'en'];

  return (
    <div className={`
      fixed inset-y-0 left-0 z-50 flex flex-col bg-sidebar text-sidebar-foreground
      border-r border-sidebar-border
      transition-all duration-300 ease-in-out
      ${sidebarOpen ? 'w-60' : 'w-[68px]'}
    `}>

      {/* Logo */}
      <div className={`flex items-center h-[60px] px-4 border-b border-sidebar-border ${!sidebarOpen && 'justify-center'}`}>
        {sidebarOpen ? (
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center font-bold text-white text-sm shadow-md flex-shrink-0">
              {company?.name?.charAt(0) || 'H'}
            </div>
            <div className="overflow-hidden">
              <p className="font-display font-bold text-[15px] leading-tight truncate text-sidebar-foreground">
                {company?.name || 'HR Platform'}
              </p>
              <p className="text-[11px] text-sidebar-foreground/40 truncate">
                {roleLabel}
              </p>
            </div>
          </div>
        ) : (
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center font-bold text-white text-sm shadow-md">
            {company?.name?.charAt(0) || 'H'}
          </div>
        )}
      </div>

      {/* Toggle */}
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-[42px] w-6 h-6 bg-sidebar-accent border border-sidebar-border rounded-full flex items-center justify-center hover:bg-primary hover:border-primary transition-colors shadow-sm"
      >
        {sidebarOpen ? <ChevronLeft size={12} className="text-sidebar-foreground/70" /> : <ChevronRight size={12} className="text-sidebar-foreground/70" />}
      </button>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-4 space-y-5 px-3">
        {filteredGroups.map((group) => (
          <div key={group.groupKey}>
            {sidebarOpen && (
              <p className="text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/30 px-2 mb-1.5">
                {t(group.groupKey)}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item: any) => {
                const isActive = location === item.href;
                return (
                  <Link key={item.href} href={item.href} className="block">
                    <div className={`
                      flex items-center gap-3 px-2.5 py-2.5 rounded-lg cursor-pointer transition-all duration-150 relative group
                      ${!sidebarOpen && 'justify-center'}
                      ${isActive
                        ? 'bg-primary text-white'
                        : 'text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                      }
                    `}>
                      <item.icon className={`w-[18px] h-[18px] flex-shrink-0 ${isActive ? 'text-white' : ''}`} />
                      {sidebarOpen && (
                        <span className={`text-sm font-medium flex-1 ${isActive ? 'text-white' : ''}`}>
                          {item.name}
                        </span>
                      )}
                      {item.badge > 0 && (
                        <span className={`
                          text-[10px] font-bold bg-red-500 text-white rounded-full min-w-[18px] h-[18px]
                          flex items-center justify-center px-1
                          ${!sidebarOpen ? 'absolute -top-1 -right-1' : ''}
                        `}>
                          {item.badge}
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Language switcher */}
      <div className={`px-3 py-2 border-t border-sidebar-border ${sidebarOpen ? 'flex items-center gap-1' : 'flex flex-col items-center gap-1'}`}>
        {sidebarOpen && (
          <span className="text-[10px] text-sidebar-foreground/30 uppercase tracking-widest mr-1">{t('language')}:</span>
        )}
        {langs.map((lang) => (
          <button
            key={lang}
            onClick={() => setLanguage(lang)}
            title={lang.toUpperCase()}
            className={`
              text-base leading-none rounded px-1 py-0.5 transition-all
              ${language === lang
                ? 'opacity-100 ring-1 ring-primary bg-primary/10'
                : 'opacity-40 hover:opacity-70'
              }
            `}
          >
            {LANG_FLAGS[lang]}
          </button>
        ))}
      </div>

      {/* Footer */}
      <div className={`px-4 py-2.5 border-t border-sidebar-border flex items-center gap-2 ${!sidebarOpen && 'justify-center'}`}>
        <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)] animate-pulse flex-shrink-0" />
        {sidebarOpen && <span className="text-[11px] text-sidebar-foreground/35">{t('system_running')}</span>}
      </div>
    </div>
  );
}
