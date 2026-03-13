import { useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Camera, Shield, Database, Settings2, Wifi, WifiOff,
  RefreshCw, CheckCircle2, AlertCircle, ChevronDown, ChevronUp,
  Upload, Download, Eye, EyeOff, Plug, TestTube2, Info
} from "lucide-react";

const INTEGRATIONS = [
  {
    type: "cctv",
    icon: Camera,
    name: "Video Kuzatuv (CCTV)",
    nameRu: "Видеонаблюдение",
    description: "Kamera tizimlari bilan bog'laning. Xodimlar ro'yxati, ish grafiklari va ruxsatlar avtomatik sinxronlanadi.",
    color: "bg-blue-50 text-blue-600 border-blue-200",
    badgeColor: "bg-blue-100 text-blue-700",
    accentLine: "bg-blue-500",
    fields: [
      { key: "apiUrl", label: "API URL", placeholder: "https://cctv-server.company.uz/api", type: "url" },
      { key: "apiKey", label: "API Kalit", placeholder: "Bearer token yoki API key", type: "password" },
      { key: "username", label: "Foydalanuvchi nomi", placeholder: "admin", type: "text" },
      { key: "password", label: "Parol", placeholder: "••••••••", type: "password" },
      { key: "cameraGroups", label: "Kamera guruhlari (ID)", placeholder: "group1,group2", type: "text" },
      { key: "syncSchedule", label: "Sinxronizatsiya jadvali", placeholder: "*/30 * * * * (cron)", type: "text" },
    ],
    syncActions: [],
    features: [
      "Xodimlar ro'yxati kamera tizimiga avtomatik yuklanadi",
      "Ish grafiklari va smenalar sinxronlanadi",
      "Kirish/chiqish ruxsatlari boshqariladi",
      "Real-time kamera so'rovlari qo'llab-quvvatlanadi",
    ],
  },
  {
    type: "acs",
    icon: Shield,
    name: "SKUD — Kirishni Nazorat Qilish",
    nameRu: "СКУД — Контроль доступа",
    description: "Elektron propusk va kirishni boshqarish tizimlaridan ish vaqti ma'lumotlarini import qiling.",
    color: "bg-emerald-50 text-emerald-600 border-emerald-200",
    badgeColor: "bg-emerald-100 text-emerald-700",
    accentLine: "bg-emerald-500",
    fields: [
      { key: "apiUrl", label: "API URL", placeholder: "https://acs.company.uz/api/v1", type: "url" },
      { key: "apiKey", label: "API Kalit", placeholder: "your-api-key", type: "password" },
      { key: "username", label: "Foydalanuvchi nomi", placeholder: "api_user", type: "text" },
      { key: "password", label: "Parol", placeholder: "••••••••", type: "password" },
      { key: "deviceIds", label: "Qurilma ID'lari", placeholder: "dev001,dev002,dev003", type: "text" },
      { key: "syncInterval", label: "Sinxronizatsiya davri (daqiqa)", placeholder: "15", type: "number" },
    ],
    syncActions: [
      { key: "sync-attendance", label: "Davomatni import qilish", icon: Download, endpoint: "/api/integrations/acs/sync-attendance", body: { date: new Date().toISOString().split("T")[0] } },
    ],
    features: [
      "Propusk tizimidan kirish/chiqish vaqtlari import qilinadi",
      "Avtomatik davomat yozuvlari yaratiladi",
      "Kechikish va erta ketish avtomatik aniqlanadi",
      "Bir nechta qurilma va bo'limlar qo'llab-quvvatlanadi",
    ],
  },
  {
    type: "erp",
    icon: Database,
    name: "ERP Tizimi (SAP / 1C)",
    nameRu: "ERP-система (SAP / 1C)",
    description: "SAP va 1C:Enterprise bilan xodimlarni qabul qilish, ishdan bo'shatish va ish vaqti hisobini sinxronlang.",
    color: "bg-violet-50 text-violet-600 border-violet-200",
    badgeColor: "bg-violet-100 text-violet-700",
    accentLine: "bg-violet-500",
    fields: [
      { key: "erpType", label: "ERP turi", placeholder: "", type: "select", options: [
        { value: "sap", label: "SAP S/4HANA" },
        { value: "sap_bapi", label: "SAP R/3 (BAPI)" },
        { value: "1c", label: "1C:Enterprise (HTTP)" },
        { value: "other", label: "Boshqa ERP" },
      ]},
      { key: "apiUrl", label: "API URL / Server", placeholder: "https://erp.company.uz:8080", type: "url" },
      { key: "apiKey", label: "API Kalit / Token", placeholder: "SAP token yoki 1C token", type: "password" },
      { key: "username", label: "Foydalanuvchi nomi", placeholder: "hr_api_user", type: "text" },
      { key: "password", label: "Parol", placeholder: "••••••••", type: "password" },
      { key: "companyCode", label: "Kompaniya kodi", placeholder: "1000 (SAP) yoki ORG_001", type: "text" },
      { key: "database", label: "Ma'lumotlar bazasi nomi (1C)", placeholder: "HRM_Base", type: "text" },
    ],
    syncActions: [
      { key: "sync-employees", label: "Xodimlarni ERP'dan import", icon: Download, endpoint: "/api/integrations/erp/sync-employees", body: {} },
      { key: "export-attendance", label: "Davomatni ERP'ga eksport", icon: Upload, endpoint: "/api/integrations/erp/export-attendance", body: { month: new Date().getMonth() + 1, year: new Date().getFullYear() } },
    ],
    features: [
      "Yangi xodimlar ERP'dan avtomatik qo'shiladi",
      "Ishdan bo'shatilganlar tizimdan o'chiriladi",
      "Ish vaqti ERP'ga avtomatik yuklanadi",
      "SAP BAPI va 1C HTTP interfeysini qo'llab-quvvatlaydi",
    ],
  },
] as const;

type IntegrationType = "cctv" | "acs" | "erp";

function IntegrationCard({ config, data, onSave, onTest, onSync, onToggle }: {
  config: typeof INTEGRATIONS[number];
  data: any;
  onSave: (type: string, settings: any) => void;
  onTest: (type: string) => void;
  onSync: (endpoint: string, body: any, label: string) => void;
  onToggle: (type: string, enabled: boolean) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showPwd, setShowPwd] = useState<Record<string, boolean>>({});
  const [form, setForm] = useState<Record<string, string>>(data?.settings || {});
  const Icon = config.icon;
  const enabled = data?.enabled || false;
  const connectedAt = data?.connectedAt;

  const togglePwd = (key: string) => setShowPwd(p => ({ ...p, [key]: !p[key] }));

  const handleSave = () => {
    onSave(config.type, form);
  };

  return (
    <Card className="overflow-hidden border-border">
      <div className={`h-1 ${config.accentLine}`} />
      <div className="p-5">
        <div className="flex items-start gap-4">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 border ${config.color}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h3 className="font-display font-bold text-[15px] text-foreground">{config.name}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{config.nameRu}</p>
              </div>
              <div className="flex items-center gap-3">
                {enabled && connectedAt && (
                  <span className="flex items-center gap-1.5 text-xs text-emerald-600">
                    <Wifi className="w-3.5 h-3.5" />
                    Ulangan
                  </span>
                )}
                {enabled && !connectedAt && (
                  <span className="flex items-center gap-1.5 text-xs text-amber-600">
                    <WifiOff className="w-3.5 h-3.5" />
                    Test kerak
                  </span>
                )}
                <Switch
                  checked={enabled}
                  onCheckedChange={(v) => onToggle(config.type, v)}
                />
              </div>
            </div>

            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{config.description}</p>

            <div className="flex flex-wrap gap-2 mt-3">
              {config.features.slice(0, 2).map((f, i) => (
                <span key={i} className="text-xs bg-muted/60 rounded-md px-2 py-1 text-muted-foreground">✓ {f}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-4 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 rounded-lg text-xs h-8"
            onClick={() => setExpanded(e => !e)}
          >
            <Settings2 className="w-3.5 h-3.5" />
            Sozlamalar
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </Button>

          {enabled && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 rounded-lg text-xs h-8"
              onClick={() => onTest(config.type)}
            >
              <TestTube2 className="w-3.5 h-3.5" />
              Ulanishni test qilish
            </Button>
          )}

          {enabled && config.syncActions.map((action) => {
            const ActionIcon = action.icon;
            return (
              <Button
                key={action.key}
                variant="outline"
                size="sm"
                className="gap-1.5 rounded-lg text-xs h-8"
                onClick={() => onSync(action.endpoint, action.body, action.label)}
              >
                <ActionIcon className="w-3.5 h-3.5" />
                {action.label}
              </Button>
            );
          })}
        </div>

        {expanded && (
          <div className="mt-5 pt-5 border-t border-border">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {config.fields.map((field) => (
                <div key={field.key} className="space-y-1.5">
                  <Label className="text-xs font-medium">{field.label}</Label>
                  {field.type === "select" ? (
                    <Select
                      value={form[field.key] || ""}
                      onValueChange={(v) => setForm(f => ({ ...f, [field.key]: v }))}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Tanlang..." />
                      </SelectTrigger>
                      <SelectContent>
                        {(field as any).options?.map((opt: any) => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="relative">
                      <Input
                        type={field.type === "password" && !showPwd[field.key] ? "password" : "text"}
                        placeholder={field.placeholder}
                        value={form[field.key] || ""}
                        onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                        className="h-8 text-sm pr-8"
                      />
                      {field.type === "password" && (
                        <button
                          type="button"
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          onClick={() => togglePwd(field.key)}
                        >
                          {showPwd[field.key] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg">
              <p className="text-xs font-semibold text-blue-700 flex items-center gap-1.5 mb-2">
                <Info className="w-3.5 h-3.5" /> Imkoniyatlar
              </p>
              <ul className="space-y-1">
                {config.features.map((f, i) => (
                  <li key={i} className="text-xs text-blue-600 flex items-start gap-1.5">
                    <CheckCircle2 className="w-3 h-3 mt-0.5 flex-shrink-0" /> {f}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex justify-end mt-4 gap-2">
              <Button
                size="sm"
                className="rounded-lg gap-1.5"
                onClick={handleSave}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Sozlamalarni saqlash
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

export default function IntegrationsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["/api/integrations"],
    queryFn: () => apiClient.get("/api/integrations").then((r: any) => (r?.data ?? r) as Record<string, any>),
    staleTime: 30000,
  });

  const saveMutation = useMutation({
    mutationFn: ({ type, settings, enabled }: { type: string; settings?: any; enabled?: boolean }) =>
      apiClient.put(`/api/integrations/${type}`, { settings, enabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/integrations"] });
      toast({ title: "Saqlandi!", description: "Integratsiya sozlamalari yangilandi" });
    },
    onError: () => toast({ variant: "destructive", title: "Xatolik", description: "Saqlashda muammo" }),
  });

  const testMutation = useMutation({
    mutationFn: (type: string) => apiClient.post(`/api/integrations/${type}/test`, {}),
    onSuccess: (result: any) => {
      const r = (result?.data ?? result) as any;
      if (r?.success) {
        toast({ title: "Ulanish muvaffaqiyatli!", description: r.message || "Server javob berdi" });
      } else {
        toast({ variant: "destructive", title: "Ulanmadi", description: r?.message || "Server javob bermadi" });
      }
    },
    onError: () => toast({ variant: "destructive", title: "Test xatosi", description: "Ulanishni tekshirib bo'lmadi" }),
  });

  const syncMutation = useMutation({
    mutationFn: ({ endpoint, body }: { endpoint: string; body: any; label: string }) =>
      apiClient.post(endpoint, body),
    onSuccess: (result: any, vars) => {
      const r = (result?.data ?? result) as any;
      if (r?.success !== false) {
        toast({ title: vars.label + " — tayyor", description: r?.message || "Muvaffaqiyatli" });
      } else {
        toast({ variant: "destructive", title: "Sinxronizatsiya xatosi", description: r?.message });
      }
    },
    onError: () => toast({ variant: "destructive", title: "Xatolik", description: "Sinxronizatsiya amalga oshmadi" }),
  });

  const handleSave = (type: string, settings: any) => {
    saveMutation.mutate({ type, settings });
  };

  const handleToggle = (type: string, enabled: boolean) => {
    saveMutation.mutate({ type, enabled });
  };

  const handleTest = (type: string) => {
    testMutation.mutate(type);
  };

  const handleSync = (endpoint: string, body: any, label: string) => {
    syncMutation.mutate({ endpoint, body, label });
  };

  const integrationData = (data as any) || {};
  const enabledCount = Object.values(integrationData).filter((v: any) => v?.enabled).length;

  return (
    <AppLayout>
      <div className="space-y-6 max-w-4xl">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-display font-bold flex items-center gap-2.5">
              <Plug className="w-6 h-6 text-primary" />
              Tizim Integratsiyalari
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Video kuzatuv, kirishni nazorat qilish (СКУД) va ERP tizimlari bilan ulaning
            </p>
          </div>
          {!isLoading && (
            <Badge variant="outline" className="text-sm px-3 py-1.5 gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              {enabledCount} / {INTEGRATIONS.length} ulangan
            </Badge>
          )}
        </div>

        {/* Overview cards */}
        <div className="grid grid-cols-3 gap-4">
          {INTEGRATIONS.map((cfg) => {
            const d = integrationData[cfg.type];
            const Icon = cfg.icon;
            return (
              <div key={cfg.type} className={`rounded-xl p-4 border ${d?.enabled ? cfg.color : "bg-muted/30 border-border text-muted-foreground"}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="w-4 h-4" />
                  <span className="text-xs font-semibold">{cfg.type.toUpperCase()}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${d?.enabled ? "bg-emerald-500 animate-pulse" : "bg-gray-300"}`} />
                  <span className="text-xs">{d?.enabled ? "Faol" : "O'chirilgan"}</span>
                </div>
                {d?.connectedAt && (
                  <p className="text-xs mt-1 opacity-70">{new Date(d.connectedAt).toLocaleDateString("uz-UZ")}</p>
                )}
              </div>
            );
          })}
        </div>

        {/* Architecture note */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Ma'lumot</p>
            <p className="text-xs text-amber-700 mt-1 leading-relaxed">
              Bu integratsiyalar uchun tashqi tizimlaringiz REST API yoki JSON interfeysi orqali ma'lumot almashishi kerak.
              SAP OData, 1C HTTP, Milestone, Hikvision va boshqa mashxur protokollar qo'llab-quvvatlanadi.
              Ulanish sozlangach, "Test" tugmasi bilan tekshiring.
            </p>
          </div>
        </div>

        {/* Integration cards */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-40 bg-muted animate-pulse rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {INTEGRATIONS.map((cfg) => (
              <IntegrationCard
                key={cfg.type}
                config={cfg}
                data={integrationData[cfg.type]}
                onSave={handleSave}
                onTest={handleTest}
                onSync={handleSync}
                onToggle={handleToggle}
              />
            ))}
          </div>
        )}

        {/* Data flow diagram */}
        <Card className="p-5">
          <h3 className="font-display font-bold text-sm mb-4 flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-primary" />
            Ma'lumot almashinuvi sxemasi
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
              <p className="font-semibold text-blue-700 mb-2 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5" /> CCTV → HR
              </p>
              <ul className="space-y-1 text-blue-600">
                <li>→ Xodimlar ro'yxati</li>
                <li>→ Ish grafiklari</li>
                <li>→ Kirish ruxsatlari</li>
              </ul>
            </div>
            <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-100">
              <p className="font-semibold text-emerald-700 mb-2 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" /> СКУД → HR
              </p>
              <ul className="space-y-1 text-emerald-600">
                <li>→ Kelish/ketish vaqti</li>
                <li>→ Propusk ma'lumotlari</li>
                <li>→ Ish soatlari hisobi</li>
              </ul>
            </div>
            <div className="bg-violet-50 rounded-lg p-3 border border-violet-100">
              <p className="font-semibold text-violet-700 mb-2 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5" /> HR ↔ ERP
              </p>
              <ul className="space-y-1 text-violet-600">
                <li>← Yangi xodimlar</li>
                <li>← Ishdan bo'shatish</li>
                <li>→ Ish vaqti hisobi</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
