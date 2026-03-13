import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Building2, FileDown, FileText, AlertTriangle, CheckCircle,
  Settings2, Eye, Download, Users, Calculator, RefreshCw, Info
} from "lucide-react";

const MONTHS = ["","Yanvar","Fevral","Mart","Aprel","May","Iyun","Iyul","Avgust","Sentabr","Oktabr","Noyabr","Dekabr"];

function fmt(n: number) {
  return n?.toLocaleString("uz-UZ") || "0";
}

type Tab = "settings" | "export" | "employees";

export default function GovIntegration() {
  const [tab, setTab] = useState<Tab>("settings");
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [previewOpen, setPreviewOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    stir: "", directorName: "", accountantName: "",
    legalAddress: "", oked: "", soliqApiKey: "", inpsLogin: "", inpsPassword: "",
  });

  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ["/api/gov-export/settings"],
    queryFn: () => apiClient.get("/api/gov-export/settings"),
  });

  useEffect(() => {
    if (settings && typeof settings === "object") {
      const s = settings as any;
      setForm({
        stir: s.stir || "",
        directorName: s.director_name || "",
        accountantName: s.accountant_name || "",
        legalAddress: s.legal_address || "",
        oked: s.oked || "",
        soliqApiKey: s.soliq_api_key || "",
        inpsLogin: s.inps_login || "",
        inpsPassword: s.inps_password_hint || "",
      });
    }
  }, [settings]);

  const { data: preview, isLoading: previewLoading, refetch: refetchPreview } = useQuery({
    queryKey: ["/api/gov-export/preview", month, year],
    queryFn: () => apiClient.get(`/api/gov-export/preview?month=${month}&year=${year}`),
    enabled: previewOpen,
  });

  const { data: empData } = useQuery({
    queryKey: ["/api/employees"],
    queryFn: () => apiClient.get("/api/employees?limit=200"),
  });

  const saveMutation = useMutation({
    mutationFn: (data: any) => apiClient.post("/api/gov-export/settings", data),
    onSuccess: () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      queryClient.invalidateQueries({ queryKey: ["/api/gov-export/settings"] });
    },
  });

  const [empForms, setEmpForms] = useState<Record<number, { jshshir: string; passportSeries: string }>>({});
  const employees: any[] = (empData as any)?.data || [];

  const updateEmpMutation = useMutation({
    mutationFn: ({ id, jshshir, passportSeries }: any) =>
      apiClient.put(`/api/employees/${id}`, { jshshir, passportSeries }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/employees"] }),
  });

  const previewData = preview as any;
  const baseUrl = window.location.origin;

  function downloadUrl(type: "soliq-xml" | "inps-xml" | "csv") {
    const base = `${baseUrl}/api/gov-export/${type}?month=${month}&year=${year}`;
    window.open(base, "_blank");
  }

  const missingStir = !form.stir;
  const hasPayroll = previewData?.count > 0;
  const missingJshshir = previewData?.hasMissingJshshir;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Building2 className="w-7 h-7 text-blue-600" />
              Davlat tizimi integratsiyasi
            </h1>
            <p className="text-muted-foreground text-sm mt-1">SOLIQ.UZ va INPS — ish haqi hisobot eksporti</p>
          </div>
          {missingStir && (
            <Badge className="bg-amber-100 text-amber-700 border-amber-300 border gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" /> STIR kiritilmagan
            </Badge>
          )}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
          <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-sm text-blue-700 space-y-1">
            <p className="font-semibold">Bu modul ixtiyoriy — faqat kerak bo'lganda ulang</p>
            <p>Korxona ma'lumotlarini bir marta kiriting, keyin har oy bitta tugma bilan <b>SOLIQ.UZ</b> va <b>INPS</b> uchun tayyor XML fayllarni yuklang. To'g'ridan-to'g'ri portallarga yuklanadi.</p>
          </div>
        </div>

        <div className="flex gap-2 border-b pb-0">
          {([
            { id: "settings", label: "Sozlamalar", icon: Settings2 },
            { id: "export", label: "Eksport & Hisobot", icon: FileDown },
            { id: "employees", label: "Xodimlar PIN (JSHSHIR)", icon: Users },
          ] as const).map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id ? "border-blue-600 text-blue-700" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>

        {tab === "settings" && (
          <div className="grid lg:grid-cols-2 gap-6">
            <Card className="shadow-none">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-blue-600" />
                  Korxona rekvizitlari
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label>STIR (Soliq to'lovchi identifikatsion raqami) *</Label>
                  <Input
                    value={form.stir}
                    onChange={e => setForm(p => ({ ...p, stir: e.target.value }))}
                    placeholder="9 yoki 14 raqam"
                    maxLength={14}
                  />
                  <p className="text-xs text-muted-foreground">SOLIQ.UZ shaxsiy kabinetingizdan oling</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Rahbar (F.I.Sh)</Label>
                    <Input value={form.directorName} onChange={e => setForm(p => ({ ...p, directorName: e.target.value }))} placeholder="Mirzayev Bobur" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Bosh hisobchi</Label>
                    <Input value={form.accountantName} onChange={e => setForm(p => ({ ...p, accountantName: e.target.value }))} placeholder="Toshmatova Malika" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Yuridik manzil</Label>
                  <Input value={form.legalAddress} onChange={e => setForm(p => ({ ...p, legalAddress: e.target.value }))} placeholder="Toshkent sh., Chilonzor t., ..." />
                </div>
                <div className="space-y-1.5">
                  <Label>OKED (Faoliyat turi kodi)</Label>
                  <Input value={form.oked} onChange={e => setForm(p => ({ ...p, oked: e.target.value }))} placeholder="Masalan: 62010" maxLength={10} />
                  <p className="text-xs text-muted-foreground">Asosiy faoliyat turi OKED klassifikatori bo'yicha</p>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card className="shadow-none">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="w-4 h-4 text-green-600" />
                    SOLIQ.UZ API (ixtiyoriy)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600 space-y-1">
                    <p className="font-medium">API kalit olish yo'li:</p>
                    <ol className="list-decimal list-inside space-y-0.5">
                      <li>soliq.uz → Shaxsiy kabinet → Kirish</li>
                      <li>Sozlamalar → API integratsiya</li>
                      <li>Yangi kalit yaratish → nusxalash</li>
                    </ol>
                  </div>
                  <div className="space-y-1.5">
                    <Label>SOLIQ API kaliti</Label>
                    <Input
                      type="password"
                      value={form.soliqApiKey}
                      onChange={e => setForm(p => ({ ...p, soliqApiKey: e.target.value }))}
                      placeholder="sk_live_..."
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-none">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="w-4 h-4 text-purple-600" />
                    INPS kirish ma'lumotlari (ixtiyoriy)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600 space-y-1">
                    <p className="font-medium">INPS login olish:</p>
                    <ol className="list-decimal list-inside space-y-0.5">
                      <li>inps.uz → Korxonalar kabineti</li>
                      <li>Ro'yxatdan o'tish yoki kirish</li>
                      <li>Login va parolni bu yerga kiriting</li>
                    </ol>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Login</Label>
                      <Input value={form.inpsLogin} onChange={e => setForm(p => ({ ...p, inpsLogin: e.target.value }))} placeholder="korxona_login" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Parol</Label>
                      <Input type="password" value={form.inpsPassword} onChange={e => setForm(p => ({ ...p, inpsPassword: e.target.value }))} placeholder="••••••••" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Button
                className="w-full gap-2"
                onClick={() => saveMutation.mutate(form)}
                disabled={saveMutation.isPending}
              >
                {saved ? <><CheckCircle className="w-4 h-4" /> Saqlandi!</> : "Sozlamalarni saqlash"}
              </Button>
            </div>
          </div>
        )}

        {tab === "export" && (
          <div className="space-y-6">
            <Card className="shadow-none">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Hisobot davri tanlash</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="space-y-1">
                    <Label>Oy</Label>
                    <select
                      className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                      value={month}
                      onChange={e => setMonth(Number(e.target.value))}
                    >
                      {MONTHS.slice(1).map((m, i) => (
                        <option key={i+1} value={i+1}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label>Yil</Label>
                    <select
                      className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                      value={year}
                      onChange={e => setYear(Number(e.target.value))}
                    >
                      {[2023,2024,2025,2026].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                  <div className="pt-5">
                    <Button variant="outline" onClick={() => { setPreviewOpen(true); refetchPreview(); }} className="gap-2">
                      <Eye className="w-4 h-4" /> Ko'rish
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {missingStir && (
              <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-800">STIR kiritilmagan</p>
                  <p className="text-sm text-amber-700">Eksport qilishdan oldin Sozlamalar bo'limida korxona STIR raqamini kiriting.</p>
                </div>
              </div>
            )}

            <div className="grid sm:grid-cols-3 gap-4">
              {[
                {
                  title: "SOLIQ.UZ",
                  subtitle: "JSHR (12%) XML hisobot",
                  desc: "Jismoniy shaxslardan olinadigan daromad solig'i. To'g'ridan-to'g'ri SOLIQ portali formatida.",
                  icon: "🏛",
                  color: "border-green-200 bg-green-50/30",
                  btnColor: "bg-green-600 hover:bg-green-700",
                  type: "soliq-xml" as const,
                  badge: "XML",
                },
                {
                  title: "INPS",
                  subtitle: "Pensiya ajratma (4%) XML",
                  desc: "Xodimlar uchun pensiya jamg'armasiga ajratmalar. INPS.UZ portali formatida.",
                  icon: "👴",
                  color: "border-purple-200 bg-purple-50/30",
                  btnColor: "bg-purple-600 hover:bg-purple-700",
                  type: "inps-xml" as const,
                  badge: "XML",
                },
                {
                  title: "Universal CSV",
                  subtitle: "1C / SAP / Excel uchun",
                  desc: "Barcha hisobchilik dasturlariga import qilinadigan universal format. UTF-8 kodlash.",
                  icon: "📊",
                  color: "border-blue-200 bg-blue-50/30",
                  btnColor: "bg-blue-600 hover:bg-blue-700",
                  type: "csv" as const,
                  badge: "CSV",
                },
              ].map(card => (
                <Card key={card.type} className={`shadow-none border-2 ${card.color}`}>
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-2xl mb-1">{card.icon}</div>
                        <h3 className="font-bold text-base">{card.title}</h3>
                        <p className="text-sm text-muted-foreground">{card.subtitle}</p>
                      </div>
                      <Badge variant="outline" className="text-xs">{card.badge}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{card.desc}</p>
                    <Button
                      className={`w-full gap-2 text-white ${card.btnColor}`}
                      onClick={() => downloadUrl(card.type)}
                      disabled={missingStir}
                    >
                      <Download className="w-4 h-4" />
                      Yuklab olish — {MONTHS[month]} {year}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="shadow-none">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-gray-600" />
                  Soliq hisoblash qoidalari (O'zbekiston 2025)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-4 gap-3">
                  {[
                    { label: "JSHR stavkasi", value: "12%", desc: "Jismoniy shaxslardan daromad solig'i" },
                    { label: "INPS (xodim)", value: "4%", desc: "Pensiya jamg'armasiga xodim ulushi" },
                    { label: "INPS (korxona)", value: "25%", desc: "Pensiya jamg'armasiga ish beruvchi ulushi" },
                    { label: "Minimal ish haqi", value: "1 050 000", desc: "2025 yil uchun (so'm)" },
                  ].map(item => (
                    <div key={item.label} className="bg-gray-50 rounded-xl p-3 text-center">
                      <div className="text-2xl font-bold text-blue-700">{item.value}</div>
                      <div className="text-xs font-medium mt-1">{item.label}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{item.desc}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {tab === "employees" && (
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-sm text-amber-700">
                <p className="font-semibold">JSHSHIR (Jismoniy shaxsning shaxsiy identifikatsion raqami)</p>
                <p>Har bir xodimning 14 raqamli PIN raqami. Eksport faylida to'g'ri ko'rsatilishi uchun shu yerga kiriting. Pasport ma'lumotlari opsional.</p>
              </div>
            </div>
            <div className="space-y-2">
              {employees.map(emp => (
                <Card key={emp.id} className="shadow-none">
                  <CardContent className="p-3 flex items-center gap-4 flex-wrap">
                    <div className="min-w-48">
                      <div className="font-medium text-sm">{emp.fullName}</div>
                      <div className="text-xs text-muted-foreground">{emp.position}</div>
                    </div>
                    <div className="flex-1 grid grid-cols-2 gap-2 min-w-64">
                      <Input
                        placeholder="JSHSHIR (14 raqam)"
                        maxLength={14}
                        defaultValue={emp.jshshir || ""}
                        onChange={e => setEmpForms(p => ({ ...p, [emp.id]: { ...p[emp.id], jshshir: e.target.value, passportSeries: p[emp.id]?.passportSeries || emp.passportSeries || "" } }))}
                        className="text-sm h-8"
                      />
                      <Input
                        placeholder="Pasport (AA 1234567)"
                        defaultValue={emp.passportSeries || ""}
                        onChange={e => setEmpForms(p => ({ ...p, [emp.id]: { ...p[emp.id], passportSeries: e.target.value, jshshir: p[emp.id]?.jshshir || emp.jshshir || "" } }))}
                        className="text-sm h-8"
                      />
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0"
                      onClick={() => {
                        const d = empForms[emp.id];
                        if (d) updateEmpMutation.mutate({ id: emp.id, jshshir: d.jshshir, passportSeries: d.passportSeries });
                      }}
                    >
                      Saqlash
                    </Button>
                    {emp.jshshir ? (
                      <Badge className="bg-green-100 text-green-700 border-green-300 border text-xs shrink-0">✓ PIN bor</Badge>
                    ) : (
                      <Badge className="bg-red-100 text-red-600 border-red-200 border text-xs shrink-0">PIN yo'q</Badge>
                    )}
                  </CardContent>
                </Card>
              ))}
              {employees.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">Xodimlar topilmadi</div>
              )}
            </div>
          </div>
        )}
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Hisobot ko'rinishi — {MONTHS[month]} {year}</DialogTitle>
          </DialogHeader>
          {previewLoading ? (
            <div className="text-center py-12 text-muted-foreground">Yuklanmoqda...</div>
          ) : !previewData ? (
            <div className="text-center py-12 text-muted-foreground">Ma'lumot topilmadi</div>
          ) : (
            <div className="space-y-4">
              {previewData.hasMissingJshshir && (
                <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
                  <AlertTriangle className="w-4 h-4" />
                  Ba'zi xodimlarning JSHSHIR raqami yo'q — "Xodimlar PIN" bo'limiga kiriting.
                </div>
              )}
              <div className="grid grid-cols-4 gap-3 text-center">
                <div className="bg-blue-50 rounded-xl p-3">
                  <div className="text-lg font-bold text-blue-700">{previewData.count}</div>
                  <div className="text-xs text-muted-foreground">Xodim</div>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <div className="text-lg font-bold">{fmt(previewData.totals?.gross)}</div>
                  <div className="text-xs text-muted-foreground">Yalpi (so'm)</div>
                </div>
                <div className="bg-red-50 rounded-xl p-3">
                  <div className="text-lg font-bold text-red-600">{fmt(previewData.totals?.jshr)}</div>
                  <div className="text-xs text-muted-foreground">JSHR 12%</div>
                </div>
                <div className="bg-green-50 rounded-xl p-3">
                  <div className="text-lg font-bold text-green-700">{fmt(previewData.totals?.net)}</div>
                  <div className="text-xs text-muted-foreground">Qo'lga beriladi</div>
                </div>
              </div>
              <div className="overflow-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="text-left p-2 font-medium">F.I.Sh</th>
                      <th className="text-left p-2 font-medium">JSHSHIR</th>
                      <th className="text-right p-2 font-medium">Yalpi</th>
                      <th className="text-right p-2 font-medium">JSHR 12%</th>
                      <th className="text-right p-2 font-medium">INPS 4%</th>
                      <th className="text-right p-2 font-medium">Qo'lga</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.rows?.map((r: any, i: number) => (
                      <tr key={i} className="border-b hover:bg-gray-50/60">
                        <td className="p-2">
                          <div>{r.fullName}</div>
                          <div className="text-xs text-muted-foreground">{r.position}</div>
                        </td>
                        <td className="p-2">
                          {r.jshshir ? (
                            <span className="font-mono text-xs">{r.jshshir}</span>
                          ) : (
                            <Badge className="bg-red-100 text-red-600 border-red-200 border text-xs">Yo'q</Badge>
                          )}
                        </td>
                        <td className="p-2 text-right font-medium">{fmt(r.gross)}</td>
                        <td className="p-2 text-right text-red-600">{fmt(r.jshr)}</td>
                        <td className="p-2 text-right text-purple-600">{fmt(r.inps)}</td>
                        <td className="p-2 text-right font-semibold text-green-700">{fmt(r.net)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50 font-bold border-t-2">
                      <td className="p-2" colSpan={2}>Jami</td>
                      <td className="p-2 text-right">{fmt(previewData.totals?.gross)}</td>
                      <td className="p-2 text-right text-red-600">{fmt(previewData.totals?.jshr)}</td>
                      <td className="p-2 text-right text-purple-600">{fmt(previewData.totals?.inps)}</td>
                      <td className="p-2 text-right text-green-700">{fmt(previewData.totals?.net)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => downloadUrl("soliq-xml")} className="gap-2">
                  <Download className="w-4 h-4 text-green-600" /> SOLIQ XML
                </Button>
                <Button variant="outline" onClick={() => downloadUrl("inps-xml")} className="gap-2">
                  <Download className="w-4 h-4 text-purple-600" /> INPS XML
                </Button>
                <Button variant="outline" onClick={() => downloadUrl("csv")} className="gap-2">
                  <Download className="w-4 h-4 text-blue-600" /> CSV
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
