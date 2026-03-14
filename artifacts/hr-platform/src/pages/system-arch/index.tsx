import { Smartphone, Monitor, ScanLine, Camera, ShieldCheck, Zap, Globe, Users, Building2, CalendarCheck, CalendarDays, Banknote, BarChart3, Bell, Brain, Database, Server, Layers, ArrowDown, Cpu, Tablet, MessageSquare, Plug } from "lucide-react";

const LAYERS = [
  {
    id: "clients",
    label: "Foydalanuvchi Interfeysi",
    sublabel: "Client Layer",
    gradient: "from-blue-600 to-blue-700",
    lightBg: "bg-blue-50",
    border: "border-blue-200",
    textColor: "text-blue-700",
    iconColor: "text-blue-600",
    items: [
      { icon: Monitor, label: "Admin Dashboard", desc: "Web brauzer" },
      { icon: Smartphone, label: "Xodim Mobil App", desc: "iOS / Android" },
      { icon: Tablet, label: "Kiosk Rejimi", desc: "Planshет터치" },
      { icon: MessageSquare, label: "Telegram Bot", desc: "@HeadRecruiment_bot" },
    ],
  },
  {
    id: "devices",
    label: "Qurilmalar Qatlami",
    sublabel: "Device Layer",
    gradient: "from-violet-600 to-violet-700",
    lightBg: "bg-violet-50",
    border: "border-violet-200",
    textColor: "text-violet-700",
    iconColor: "text-violet-600",
    items: [
      { icon: Monitor, label: "POS Tizimi", desc: "Savdo terminali" },
      { icon: Camera, label: "Yuz aniqlash kamera", desc: "DeepFace / CCTV" },
      { icon: ScanLine, label: "QR Scanner", desc: "Davomat skaneri" },
      { icon: Smartphone, label: "Mobil ilova", desc: "GPS + Selfie" },
    ],
  },
  {
    id: "gateway",
    label: "API Gateway",
    sublabel: "Auth • Rate Limit • Routing • HTTPS/TLS",
    gradient: "from-slate-700 to-slate-800",
    lightBg: "bg-slate-50",
    border: "border-slate-200",
    textColor: "text-slate-700",
    iconColor: "text-slate-600",
    single: true,
    items: [
      { icon: ShieldCheck, label: "Autentifikatsiya", desc: "Session / JWT" },
      { icon: Zap, label: "Rate Limiting", desc: "DDoS himoya" },
      { icon: Globe, label: "Routing", desc: "Multi-tenant" },
      { icon: ShieldCheck, label: "HTTPS / TLS", desc: "mTLS proxy" },
    ],
  },
  {
    id: "backend",
    label: "Backend Xizmatlar",
    sublabel: "Backend Services",
    gradient: "from-emerald-600 to-emerald-700",
    lightBg: "bg-emerald-50",
    border: "border-emerald-200",
    textColor: "text-emerald-700",
    iconColor: "text-emerald-600",
    items: [
      { icon: ShieldCheck, label: "Authentication", desc: "Login / Session" },
      { icon: Building2, label: "Company Mgmt", desc: "Multi-tenant" },
      { icon: Users, label: "Employee Service", desc: "CRUD / Profil" },
      { icon: CalendarCheck, label: "Attendance", desc: "QR / Selfie" },
      { icon: CalendarDays, label: "Schedule Service", desc: "Ish jadvali" },
      { icon: Banknote, label: "Payroll Service", desc: "Hisob / Soliq" },
      { icon: BarChart3, label: "Analytics Service", desc: "KPI / Hisobot" },
      { icon: Bell, label: "Notification", desc: "SMS / Telegram" },
    ],
  },
  {
    id: "ai",
    label: "AI Forecast Engine",
    sublabel: "Machine Learning • DeepFace • Analytics",
    gradient: "from-amber-500 to-orange-600",
    lightBg: "bg-amber-50",
    border: "border-amber-200",
    textColor: "text-amber-700",
    iconColor: "text-amber-600",
    items: [
      { icon: Brain, label: "Savdo Bashorat", desc: "90-kun model" },
      { icon: Cpu, label: "Yuz Aniqlash", desc: "DeepFace AI" },
      { icon: BarChart3, label: "AI Analitika", desc: "KPI & trend" },
      { icon: Zap, label: "Real-time Engine", desc: "Live scoring" },
    ],
  },
  {
    id: "db",
    label: "Ma'lumotlar Bazasi",
    sublabel: "Database Layer",
    gradient: "from-rose-600 to-rose-700",
    lightBg: "bg-rose-50",
    border: "border-rose-200",
    textColor: "text-rose-700",
    iconColor: "text-rose-600",
    items: [
      { icon: Database, label: "PostgreSQL", desc: "Asosiy DB" },
      { icon: Server, label: "Object Storage", desc: "Rasm / Fayl" },
      { icon: Layers, label: "Drizzle ORM", desc: "Schema / Query" },
      { icon: Zap, label: "Connection Pool", desc: "Neon serverless" },
    ],
  },
];

const INTEGRATIONS = [
  { label: "CCTV / СКУД", color: "bg-slate-100 text-slate-700 border-slate-200" },
  { label: "ERP SAP / 1C", color: "bg-blue-50 text-blue-700 border-blue-200" },
  { label: "POS / Sales", color: "bg-green-50 text-green-700 border-green-200" },
  { label: "SOLIQ / INPS", color: "bg-amber-50 text-amber-700 border-amber-200" },
  { label: "Telegram API", color: "bg-sky-50 text-sky-700 border-sky-200" },
  { label: "SMS Gateway", color: "bg-violet-50 text-violet-700 border-violet-200" },
];

export default function SystemArch() {
  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Tizim Arxitekturasi</h1>
          <p className="text-sm text-muted-foreground mt-1">HR Workforce Management Platform — to'liq qatlam ko'rinishi</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-full">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Barcha xizmatlar ishlayapti
        </div>
      </div>

      {/* Architecture Stack */}
      <div className="space-y-2">
        {LAYERS.map((layer, idx) => (
          <div key={layer.id}>
            {/* Layer Card */}
            <div className={`rounded-2xl border ${layer.border} ${layer.lightBg} overflow-hidden`}>
              {/* Layer Header */}
              <div className={`bg-gradient-to-r ${layer.gradient} px-5 py-3 flex items-center gap-3`}>
                <div className="flex-1">
                  <p className="text-white font-display font-bold text-[15px]">{layer.label}</p>
                  <p className="text-white/60 text-[11px] font-medium mt-0.5">{layer.sublabel}</p>
                </div>
                <div className="text-white/30 text-[11px] font-mono uppercase tracking-widest">
                  Layer {LAYERS.length - idx}
                </div>
              </div>

              {/* Layer Items */}
              <div className={`grid gap-2 p-4 ${layer.single ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2 sm:grid-cols-4'}`}>
                {layer.items.map((item, i) => (
                  <div
                    key={i}
                    className="bg-white rounded-xl border border-border/70 p-3 flex items-center gap-3 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className={`w-9 h-9 rounded-lg ${layer.lightBg} border ${layer.border} flex items-center justify-center flex-shrink-0`}>
                      <item.icon className={`w-4 h-4 ${layer.iconColor}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-foreground leading-tight truncate">{item.label}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Connector Arrow */}
            {idx < LAYERS.length - 1 && (
              <div className="flex justify-center py-1">
                <div className="flex flex-col items-center gap-0.5">
                  <div className="w-px h-3 bg-gradient-to-b from-border to-primary/30" />
                  <ArrowDown className="w-4 h-4 text-primary/40" />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* External Integrations */}
      <div className="rounded-2xl border border-border bg-white p-5">
        <p className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Plug className="w-4 h-4 text-primary" />
          Tashqi Integratsiyalar
        </p>
        <div className="flex flex-wrap gap-2">
          {INTEGRATIONS.map((intg, i) => (
            <span
              key={i}
              className={`px-3 py-1.5 rounded-full border text-[12px] font-semibold ${intg.color}`}
            >
              {intg.label}
            </span>
          ))}
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "API Endpoint", value: "60+", icon: Globe, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "DB Jadval", value: "18+", icon: Database, color: "text-rose-600", bg: "bg-rose-50" },
          { label: "Xizmat", value: "8", icon: Server, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "AI Model", value: "3", icon: Brain, color: "text-amber-600", bg: "bg-amber-50" },
        ].map((s, i) => (
          <div key={i} className="rounded-2xl border border-border bg-white p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center flex-shrink-0`}>
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <div>
              <p className="text-2xl font-display font-bold text-foreground">{s.value}</p>
              <p className="text-[11px] text-muted-foreground">{s.label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
