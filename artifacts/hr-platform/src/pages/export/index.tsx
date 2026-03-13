import { useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { useAppStore } from "@/store/use-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/lib/api-client";
import {
  Download, FileText, FileSpreadsheet, Building2, Zap, CalendarCheck,
  ArrowRight, CheckCircle2
} from "lucide-react";

const MONTHS_UZ = [
  "", "Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun",
  "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr",
];

const EXPORT_FORMATS = [
  {
    id: "excel",
    name: "Excel / CSV",
    icon: FileSpreadsheet,
    color: "bg-green-500",
    desc: "Universal format — Excel, Google Sheets da ochish mumkin",
    type: "payroll",
  },
  {
    id: "1c",
    name: "1C:Buxgalteriya",
    icon: Building2,
    color: "bg-blue-600",
    desc: "1C:Zarplata va 1C:Buxgalteriyaga import uchun TXT format",
    type: "payroll",
  },
  {
    id: "bitrix",
    name: "Bitrix24",
    icon: Zap,
    color: "bg-orange-500",
    desc: "Bitrix24 HR moduliga import uchun CSV format",
    type: "payroll",
  },
  {
    id: "uzasbo",
    name: "UzASBO",
    icon: FileText,
    color: "bg-violet-600",
    desc: "O'zbekiston UzASBO tizimiga mos TXT format",
    type: "payroll",
  },
];

const SYNC_SYSTEMS = [
  {
    id: "1c",
    name: "1C:Buxgalteriya",
    icon: Building2,
    color: "from-blue-600 to-blue-700",
    status: "Qo'lda import",
    steps: [
      "Eksport tugmasini bosing → TXT fayl yuklaydi",
      "1C ni oching → Zарплата → Импорт данных",
      "Yuklab olingan faylni tanlang va import qiling",
      "Xodimlar nomi va maosh avtomatik to'ldiriladi",
    ],
  },
  {
    id: "bitrix",
    name: "Bitrix24",
    icon: Zap,
    color: "from-orange-500 to-red-500",
    status: "Qo'lda import",
    steps: [
      "CSV formatda eksport qiling",
      "Bitrix24 → HR → Xodimlar bo'limiga o'ting",
      "Import → CSV faylni tanlang",
      "Maydonlarni moslashtiring va import qiling",
    ],
  },
  {
    id: "uzasbo",
    name: "UzASBO",
    icon: FileText,
    color: "from-violet-600 to-purple-700",
    status: "Qo'lda import",
    steps: [
      "UzASBO formatda eksport qiling",
      "UzASBO tizimiga kiring",
      "Ish haqi → Import → Faylni yuklang",
      "Ma'lumotlar tekshirib tasdiqlang",
    ],
  },
];

export default function ExportPage() {
  const { userRole } = useAppStore();
  const { toast } = useToast();

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const [month, setMonth] = useState(String(currentMonth));
  const [year, setYear] = useState(String(currentYear));
  const [loading, setLoading] = useState<string | null>(null);

  const years = [currentYear - 1, currentYear, currentYear + 1];

  async function downloadPayroll(format: string) {
    setLoading(format);
    try {
      const resp = await fetch(
        `${(apiClient as any).defaults.baseURL}/api/export/payroll?month=${month}&year=${year}&format=${format}`,
        { credentials: "include" }
      );
      if (!resp.ok) throw new Error("Export xatosi");
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const ext = format === "1c" || format === "uzasbo" ? "txt" : "csv";
      a.download = `Maosh_${format}_${year}_${month}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Yuklab olindi!", description: `${MONTHS_UZ[parseInt(month)]} ${year} maosh hisoboti tayyor` });
    } catch (err) {
      toast({ variant: "destructive", title: "Xatolik", description: "Export vaqtida xatolik yuz berdi" });
    } finally {
      setLoading(null);
    }
  }

  async function downloadAttendance() {
    setLoading("attendance");
    try {
      const resp = await fetch(
        `${(apiClient as any).defaults.baseURL}/api/export/attendance?month=${month}&year=${year}`,
        { credentials: "include" }
      );
      if (!resp.ok) throw new Error("Export xatosi");
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Davomat_${year}_${month}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Yuklab olindi!", description: `${MONTHS_UZ[parseInt(month)]} ${year} davomat hisoboti tayyor` });
    } catch (err) {
      toast({ variant: "destructive", title: "Xatolik", description: "Export vaqtida xatolik yuz berdi" });
    } finally {
      setLoading(null);
    }
  }

  return (
    <AppLayout>
      <div className="space-y-8 max-w-5xl">
        <div>
          <h1 className="text-3xl font-display font-bold">Eksport va Integratsiya</h1>
          <p className="text-muted-foreground mt-1">1C, Bitrix24, UzASBO va Excel formatlarida ma'lumot yuklash</p>
        </div>

        {/* Period selector */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarCheck className="w-4 h-4 text-primary" />
              Davr tanlash
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 items-end">
              <div className="space-y-1.5">
                <Label>Oy</Label>
                <Select value={month} onValueChange={setMonth}>
                  <SelectTrigger className="w-40 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS_UZ.slice(1).map((m, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Yil</Label>
                <Select value={year} onValueChange={setYear}>
                  <SelectTrigger className="w-28 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-sm text-muted-foreground pb-1">
                Tanlangan davr: <strong>{MONTHS_UZ[parseInt(month)]} {year}</strong>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Payroll exports */}
        <div>
          <h2 className="text-xl font-bold mb-4">💰 Maosh Hisoboti Eksport</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {EXPORT_FORMATS.map((fmt) => (
              <Card key={fmt.id} className="border-border/50 hover:border-primary/30 transition-colors group">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className={`w-11 h-11 ${fmt.color} rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                      <fmt.icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-base">{fmt.name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{fmt.desc}</p>
                    </div>
                  </div>
                  <Button
                    className="w-full mt-4 rounded-xl gap-2"
                    variant="outline"
                    disabled={loading === fmt.id}
                    onClick={() => downloadPayroll(fmt.id)}
                  >
                    {loading === fmt.id ? (
                      <span className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    {loading === fmt.id ? "Yuklanmoqda..." : "Yuklab olish"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Attendance export */}
        <div>
          <h2 className="text-xl font-bold mb-4">📅 Davomat Hisoboti Eksport</h2>
          <Card className="border-border/50 hover:border-green-500/30 transition-colors max-w-md">
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 bg-emerald-500 rounded-xl flex items-center justify-center flex-shrink-0">
                  <CalendarCheck className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-base">Davomat — Excel/CSV</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Kunlik kelish-ketish, kechikish, ish soatlari</p>
                </div>
              </div>
              <Button
                className="w-full mt-4 rounded-xl gap-2"
                variant="outline"
                disabled={loading === "attendance"}
                onClick={downloadAttendance}
              >
                {loading === "attendance" ? (
                  <span className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                {loading === "attendance" ? "Yuklanmoqda..." : "Yuklab olish"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Integration instructions */}
        <div>
          <h2 className="text-xl font-bold mb-4">🔗 Tizimlar bilan Sinxronlash</h2>
          <div className="space-y-4">
            {SYNC_SYSTEMS.map((sys) => (
              <Card key={sys.id} className="border-border/50 overflow-hidden">
                <div className={`h-1.5 bg-gradient-to-r ${sys.color}`} />
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-9 h-9 bg-gradient-to-br ${sys.color} rounded-xl flex items-center justify-center`}>
                      <sys.icon className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold">{sys.name}</h3>
                      <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{sys.status}</span>
                    </div>
                  </div>
                  <ol className="space-y-2">
                    {sys.steps.map((step, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                        <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">
                          {i + 1}
                        </span>
                        {step}
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Coming soon note */}
        <Card className="border-violet-500/20 bg-violet-500/5">
          <CardContent className="p-5 flex items-start gap-3">
            <Zap className="w-5 h-5 text-violet-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-violet-700 dark:text-violet-300">Avtomatik sinxronlash — tez orada</h3>
              <p className="text-sm text-muted-foreground mt-1">
                1C, Bitrix24 va UzASBO bilan to'liq avtomatik, real vaqt sinxronlash API orqali amalga oshiriladi.
                Har oy tugaganda ma'lumotlar avtomatik yuboriladi — qo'lda export shart emas.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
