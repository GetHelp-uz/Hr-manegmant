import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { apiClient } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Smartphone, Monitor, KeyRound, Users, CheckCircle2, XCircle,
  RefreshCw, Search, Download, Copy, Eye, EyeOff, Zap,
  QrCode, CreditCard, Settings2, Trash2, Shield, Info,
  ChevronDown, AlertTriangle, Package,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";

type MobileEmployee = {
  id: number;
  fullName: string;
  position: string;
  department?: string;
  photo?: string;
  status: string;
  appLogin?: string;
  hasPassword: boolean;
  attendanceMethod?: string;
  timepadCode?: string;
  nfcCardId?: string;
  qrCode?: string;
  isConfigured: boolean;
};

const METHOD_LABELS: Record<string, string> = {
  qr: "QR Kod",
  nfc: "NFC Karta",
  pin: "PIN Kod",
  face: "Yuz Tanish",
  timepad: "TimePad",
};

const APK_APPS = [
  {
    key: "kiosk",
    name: "TimePad Kioski",
    desc: "Planshetga o'rnatiladi. QR, NFC, PIN, Yuz tanish orqali davomat qayd etadi.",
    color: "#2563EB",
    bg: "#EEF2FF",
    icon: Monitor,
    package: "com.hrcontrol.kiosk",
    features: ["QR skanerlash", "NFC o'qish", "PIN kiritish", "Yuz tanish", "Offline rejim"],
    forWho: "Xonadon kirish nuqtalarida planshetga o'rnatiladi",
  },
  {
    key: "employee",
    name: "HR Mobile Key",
    desc: "Xodim o'z telefoniga o'rnatadi. Shaxsiy QR, NFC, TimePad kodini ko'radi.",
    color: "#7C3AED",
    bg: "#F5F3FF",
    icon: KeyRound,
    package: "com.hrcontrol.employee",
    features: ["Shaxsiy QR kod", "NFC karta ID", "TimePad kod", "Davomat tarixi", "Ta'til so'rovi"],
    forWho: "Har bir xodim o'z telefoniga o'rnatadi",
  },
  {
    key: "admin",
    name: "HR Admin",
    desc: "HR menejer va rahbarlar uchun. Xodimlar, davomat, maosh, ta'tillar.",
    color: "#059669",
    bg: "#ECFDF5",
    icon: Users,
    package: "com.hrcontrol.admin",
    features: ["Dashboard", "Xodimlar ro'yxati", "Davomat nazorat", "Maosh boshqaruv", "Ta'til tasdiqlash"],
    forWho: "HR menejer va mas'ul shaxslar uchun",
  },
];

export default function MobileAppsPage() {
  const { toast } = useToast();
  const [employees, setEmployees] = useState<MobileEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "configured" | "unconfigured">("all");
  const [selected, setSelected] = useState<number[]>([]);
  const [showPasswords, setShowPasswords] = useState<Record<number, boolean>>({});
  const [editEmp, setEditEmp] = useState<MobileEmployee | null>(null);
  const [editForm, setEditForm] = useState({ appLogin: "", appPassword: "", attendanceMethod: "qr", timepadCode: "", nfcCardId: "" });
  const [bulkDialog, setBulkDialog] = useState(false);
  const [bulkPassword, setBulkPassword] = useState("");
  const [bulkMethod, setBulkMethod] = useState("qr");
  const [bulkResult, setBulkResult] = useState<any[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("employees");
  const [buildDialog, setBuildDialog] = useState(false);
  const [selectedAppKey, setSelectedAppKey] = useState<string>("kiosk");

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const data = await apiClient.get("/api/mobile/management/employees");
      setEmployees(data);
    } catch {
      toast({ title: "Xatolik", description: "Ma'lumotlar yuklanmadi", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEmployees(); }, []);

  const filtered = employees.filter(e => {
    const q = search.toLowerCase();
    const matchSearch = e.fullName.toLowerCase().includes(q) || e.position?.toLowerCase().includes(q) || e.appLogin?.toLowerCase().includes(q);
    const matchStatus = filterStatus === "all" ? true : filterStatus === "configured" ? e.isConfigured : !e.isConfigured;
    return matchSearch && matchStatus;
  });

  const configured = employees.filter(e => e.isConfigured).length;
  const unconfigured = employees.filter(e => !e.isConfigured && e.status === "active").length;

  const openEdit = (emp: MobileEmployee) => {
    setEditEmp(emp);
    setEditForm({
      appLogin: emp.appLogin || "",
      appPassword: "",
      attendanceMethod: emp.attendanceMethod || "qr",
      timepadCode: emp.timepadCode || "",
      nfcCardId: emp.nfcCardId || "",
    });
  };

  const saveEdit = async () => {
    if (!editEmp) return;
    setSaving(true);
    try {
      await apiClient.post(`/api/mobile/setup-employee/${editEmp.id}`, editForm);
      toast({ title: "Saqlandi", description: `${editEmp.fullName} sozlamalari yangilandi` });
      setEditEmp(null);
      fetchEmployees();
    } catch (e: any) {
      toast({ title: "Xatolik", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const resetPassword = async (emp: MobileEmployee) => {
    try {
      const res = await apiClient.post(`/api/mobile/management/reset-password/${emp.id}`, {});
      toast({
        title: "Yangi parol tayyor",
        description: `Login: ${res.login} | Parol: ${res.password}`,
        duration: 10000,
      });
      fetchEmployees();
    } catch {
      toast({ title: "Xatolik", variant: "destructive" });
    }
  };

  const clearCreds = async (emp: MobileEmployee) => {
    if (!confirm(`${emp.fullName} — barcha mobil kirish ma'lumotlari o'chirilsinmi?`)) return;
    try {
      await apiClient.post(`/api/mobile/management/clear-credentials/${emp.id}`, {});
      toast({ title: "O'chirildi", description: `${emp.fullName} credentials cleared` });
      fetchEmployees();
    } catch {
      toast({ title: "Xatolik", variant: "destructive" });
    }
  };

  const bulkSetup = async () => {
    setSaving(true);
    try {
      const res = await apiClient.post("/api/mobile/management/bulk-setup", {
        employeeIds: selected.length > 0 ? selected : undefined,
        defaultPassword: bulkPassword || undefined,
        attendanceMethod: bulkMethod,
      });
      setBulkResult(res.employees);
      toast({ title: `${res.updated} xodim sozlandi` });
      setSelected([]);
      fetchEmployees();
    } catch (e: any) {
      toast({ title: "Xatolik", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} nusxalandi`, duration: 1500 });
  };

  const toggleSelect = (id: number) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const selectAll = () => {
    const ids = filtered.map(e => e.id);
    setSelected(prev => prev.length === ids.length ? [] : ids);
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Smartphone className="w-6 h-6 text-primary" /> Mobil Ilovalar Boshqaruvi
            </h1>
            <p className="text-muted-foreground mt-1">
              3 ta APK ilova uchun xodimlar kirish huquqlari va sozlamalarini boshqaring
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchEmployees}>
              <RefreshCw className="w-4 h-4 mr-1.5" /> Yangilash
            </Button>
            <Button size="sm" onClick={() => setBuildDialog(true)}>
              <Package className="w-4 h-4 mr-1.5" /> APK Ko'rsatmasi
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Jami Xodimlar</p>
                  <p className="text-2xl font-bold text-blue-700">{employees.length}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50 to-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Sozlangan</p>
                  <p className="text-2xl font-bold text-green-700">{configured}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-gradient-to-br from-orange-50 to-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Sozlanmagan</p>
                  <p className="text-2xl font-bold text-orange-700">{unconfigured}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-gradient-to-br from-violet-50 to-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Tayyor APK</p>
                  <p className="text-2xl font-bold text-violet-700">3</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                  <Smartphone className="w-5 h-5 text-violet-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="employees">
              <Users className="w-4 h-4 mr-1.5" /> Xodimlar Kirish Huquqlari
            </TabsTrigger>
            <TabsTrigger value="apps">
              <Package className="w-4 h-4 mr-1.5" /> 3 ta APK Ilova
            </TabsTrigger>
          </TabsList>

          {/* ── EMPLOYEES TAB ── */}
          <TabsContent value="employees" className="space-y-4">
            {/* Toolbar */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-56">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Xodim, login bo'yicha qidirish..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <Select value={filterStatus} onValueChange={v => setFilterStatus(v as any)}>
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Barchasi ({employees.length})</SelectItem>
                  <SelectItem value="configured">Sozlangan ({configured})</SelectItem>
                  <SelectItem value="unconfigured">Sozlanmagan ({unconfigured})</SelectItem>
                </SelectContent>
              </Select>

              {selected.length > 0 && (
                <Badge variant="secondary" className="gap-1">
                  {selected.length} ta tanlandi
                </Badge>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => { setBulkDialog(true); setBulkResult(null); }}
              >
                <Zap className="w-4 h-4 mr-1.5" />
                {selected.length > 0 ? `${selected.length} ta` : "Barcha"} avtomatik sozla
              </Button>
            </div>

            {/* Table */}
            <div className="rounded-xl border overflow-hidden shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="w-10">
                      <Checkbox
                        checked={selected.length === filtered.length && filtered.length > 0}
                        onCheckedChange={selectAll}
                      />
                    </TableHead>
                    <TableHead>Xodim</TableHead>
                    <TableHead>Holat</TableHead>
                    <TableHead>App Login</TableHead>
                    <TableHead>Usul</TableHead>
                    <TableHead>TimePad Kod</TableHead>
                    <TableHead>NFC Karta</TableHead>
                    <TableHead className="text-right">Amallar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                        Xodim topilmadi
                      </TableCell>
                    </TableRow>
                  ) : filtered.map(emp => (
                    <TableRow key={emp.id} className={selected.includes(emp.id) ? "bg-primary/5" : ""}>
                      <TableCell>
                        <Checkbox
                          checked={selected.includes(emp.id)}
                          onCheckedChange={() => toggleSelect(emp.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          {emp.photo ? (
                            <img src={emp.photo} className="w-8 h-8 rounded-full object-cover" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                              {emp.fullName[0]}
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-sm">{emp.fullName}</p>
                            <p className="text-xs text-muted-foreground">{emp.position}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {emp.isConfigured ? (
                          <Badge className="bg-green-100 text-green-700 border-0 text-xs gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Tayyor
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50 text-xs gap-1">
                            <XCircle className="w-3 h-3" /> Sozlanmagan
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {emp.appLogin ? (
                          <div className="flex items-center gap-1">
                            <code className="text-xs bg-muted px-2 py-0.5 rounded font-mono">{emp.appLogin}</code>
                            <Button
                              variant="ghost" size="icon"
                              className="h-6 w-6"
                              onClick={() => copyText(emp.appLogin!, "Login")}
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {emp.attendanceMethod ? (
                          <Badge variant="outline" className="text-xs">
                            {METHOD_LABELS[emp.attendanceMethod] || emp.attendanceMethod}
                          </Badge>
                        ) : <span className="text-muted-foreground text-xs">—</span>}
                      </TableCell>
                      <TableCell>
                        {emp.timepadCode ? (
                          <div className="flex items-center gap-1">
                            <code className="text-xs bg-muted px-2 py-0.5 rounded font-mono tracking-widest">
                              {showPasswords[emp.id] ? emp.timepadCode : "••••••"}
                            </code>
                            <Button
                              variant="ghost" size="icon" className="h-6 w-6"
                              onClick={() => setShowPasswords(p => ({ ...p, [emp.id]: !p[emp.id] }))}
                            >
                              {showPasswords[emp.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            </Button>
                            <Button
                              variant="ghost" size="icon" className="h-6 w-6"
                              onClick={() => copyText(emp.timepadCode!, "TimePad kod")}
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                        ) : <span className="text-muted-foreground text-xs">—</span>}
                      </TableCell>
                      <TableCell>
                        {emp.nfcCardId ? (
                          <div className="flex items-center gap-1">
                            <CreditCard className="w-3 h-3 text-blue-500" />
                            <code className="text-xs font-mono">{emp.nfcCardId.slice(0, 8)}…</code>
                          </div>
                        ) : <span className="text-muted-foreground text-xs">—</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 px-2">
                              <Settings2 className="w-4 h-4" />
                              <ChevronDown className="w-3 h-3 ml-1" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(emp)}>
                              <Settings2 className="w-4 h-4 mr-2" /> Sozlash / Tahrirlash
                            </DropdownMenuItem>
                            {emp.isConfigured && (
                              <DropdownMenuItem onClick={() => resetPassword(emp)}>
                                <RefreshCw className="w-4 h-4 mr-2" /> Yangi parol yaratish
                              </DropdownMenuItem>
                            )}
                            {emp.isConfigured && (
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => clearCreds(emp)}
                              >
                                <Trash2 className="w-4 h-4 mr-2" /> Kirish ma'lumotlarini o'chirish
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <p className="text-xs text-muted-foreground">
              Jami {filtered.length} ta xodim ko'rsatilmoqda
            </p>
          </TabsContent>

          {/* ── APPS TAB ── */}
          <TabsContent value="apps" className="space-y-4">
            <div className="grid grid-cols-3 gap-6">
              {APK_APPS.map(app => {
                const Icon = app.icon;
                return (
                  <Card key={app.key} className="border-0 shadow-sm overflow-hidden">
                    <div className="h-2" style={{ backgroundColor: app.color }} />
                    <CardHeader className="pb-3">
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: app.bg }}>
                          <Icon className="w-6 h-6" style={{ color: app.color }} />
                        </div>
                        <div>
                          <CardTitle className="text-base">{app.name}</CardTitle>
                          <code className="text-xs text-muted-foreground">{app.package}</code>
                        </div>
                      </div>
                      <CardDescription className="mt-2 text-sm">{app.desc}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Imkoniyatlar</p>
                        <div className="flex flex-wrap gap-1.5">
                          {app.features.map(f => (
                            <Badge key={f} variant="secondary" className="text-xs">{f}</Badge>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-start gap-2 p-3 bg-muted/40 rounded-lg text-xs text-muted-foreground">
                        <Info className="w-4 h-4 mt-0.5 shrink-0" />
                        <span>{app.forWho}</span>
                      </div>
                      <Button
                        className="w-full"
                        style={{ backgroundColor: app.color }}
                        onClick={() => { setSelectedAppKey(app.key); setBuildDialog(true); }}
                      >
                        <Package className="w-4 h-4 mr-2" /> APK Ko'rsatmasini Ko'rish
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <Card className="border-0 shadow-sm bg-gradient-to-r from-slate-50 to-white">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                    <Shield className="w-6 h-6 text-slate-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Barcha boshqaruv admin paneldan</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      3 ta mobil ilovaning funksiyalari va huquqlari faqat shu veb admin panel orqali sozlanadi.
                      Mobil ilovalar ma'lumotlarni ko'rish va davomat qayd etish uchun ishlatiladi.
                      Yangi xodim qo'shish, huquq berish, TimePad kod o'zgartirish — hammasini bu sahifadan bajaring.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* ── EDIT DIALOG ── */}
      <Dialog open={!!editEmp} onOpenChange={v => !v && setEditEmp(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="w-5 h-5" />
              {editEmp?.fullName} — Mobil Sozlamalar
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>App Login</Label>
                <Input
                  placeholder="emp_001"
                  value={editForm.appLogin}
                  onChange={e => setEditForm(f => ({ ...f, appLogin: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Yangi Parol</Label>
                <Input
                  type="text"
                  placeholder="bo'sh qoldiring = o'zgarmaydi"
                  value={editForm.appPassword}
                  onChange={e => setEditForm(f => ({ ...f, appPassword: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Davomat Usuli</Label>
              <Select value={editForm.attendanceMethod} onValueChange={v => setEditForm(f => ({ ...f, attendanceMethod: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="qr">QR Kod</SelectItem>
                  <SelectItem value="nfc">NFC Karta</SelectItem>
                  <SelectItem value="pin">PIN Kod</SelectItem>
                  <SelectItem value="face">Yuz Tanish</SelectItem>
                  <SelectItem value="timepad">TimePad</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  <QrCode className="w-3.5 h-3.5" /> TimePad Kod
                </Label>
                <Input
                  placeholder="6 xonali raqam"
                  value={editForm.timepadCode}
                  onChange={e => setEditForm(f => ({ ...f, timepadCode: e.target.value }))}
                  maxLength={6}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5" /> NFC Karta ID
                </Label>
                <Input
                  placeholder="Karta UID"
                  value={editForm.nfcCardId}
                  onChange={e => setEditForm(f => ({ ...f, nfcCardId: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditEmp(null)}>Bekor</Button>
            <Button onClick={saveEdit} disabled={saving}>
              {saving ? <RefreshCw className="w-4 h-4 mr-1.5 animate-spin" /> : null}
              Saqlash
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── BULK SETUP DIALOG ── */}
      <Dialog open={bulkDialog} onOpenChange={v => { setBulkDialog(v); if (!v) setBulkResult(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-500" />
              Avtomatik Sozlash
            </DialogTitle>
          </DialogHeader>
          {!bulkResult ? (
            <>
              <div className="space-y-4 py-2">
                <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-700 flex gap-2">
                  <Info className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>
                    {selected.length > 0
                      ? `${selected.length} ta tanlangan xodim`
                      : "Sozlanmagan barcha aktiv xodimlar"
                    } uchun avtomatik login, parol va TimePad kod yaratiladi.
                  </span>
                </div>
                <div className="space-y-1.5">
                  <Label>Umumiy Parol (ixtiyoriy)</Label>
                  <Input
                    placeholder="Bo'sh qoldiring = har biri uchun alohida"
                    value={bulkPassword}
                    onChange={e => setBulkPassword(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Bo'sh qolsa, har xodimga alohida tasodifiy parol yaratiladi
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label>Standart Davomat Usuli</Label>
                  <Select value={bulkMethod} onValueChange={setBulkMethod}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="qr">QR Kod</SelectItem>
                      <SelectItem value="nfc">NFC Karta</SelectItem>
                      <SelectItem value="pin">PIN Kod</SelectItem>
                      <SelectItem value="timepad">TimePad</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setBulkDialog(false)}>Bekor</Button>
                <Button onClick={bulkSetup} disabled={saving} className="bg-yellow-500 hover:bg-yellow-600">
                  {saving ? <RefreshCw className="w-4 h-4 mr-1.5 animate-spin" /> : <Zap className="w-4 h-4 mr-1.5" />}
                  Avtomatik Sozla
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <div className="space-y-3 py-2">
                <div className="p-3 bg-green-50 rounded-lg text-sm text-green-700 font-medium">
                  ✓ {bulkResult.length} ta xodim muvaffaqiyatli sozlandi
                </div>
                <div className="max-h-72 overflow-y-auto space-y-2">
                  {bulkResult.map(r => (
                    <div key={r.id} className="flex items-center justify-between p-2.5 bg-muted/40 rounded-lg text-sm">
                      <span className="font-medium">{r.fullName}</span>
                      <div className="flex items-center gap-2 text-muted-foreground text-xs">
                        <code className="bg-background px-1.5 py-0.5 rounded">{r.login}</code>
                        <code className="bg-background px-1.5 py-0.5 rounded">{r.password}</code>
                        <Button
                          variant="ghost" size="icon" className="h-5 w-5"
                          onClick={() => copyText(`${r.login} / ${r.password}`, r.fullName)}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Xodimlarga login va parollarini xabar qiling
                </p>
              </div>
              <DialogFooter>
                <Button onClick={() => { setBulkDialog(false); setBulkResult(null); }}>
                  Yopish
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── APK BUILD DIALOG ── */}
      <Dialog open={buildDialog} onOpenChange={setBuildDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" /> APK Qurish Ko'rsatmasi
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex gap-2">
              {APK_APPS.map(a => (
                <button
                  key={a.key}
                  onClick={() => setSelectedAppKey(a.key)}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border-2 transition-all ${selectedAppKey === a.key ? "border-primary text-primary bg-primary/5" : "border-muted text-muted-foreground hover:border-muted-foreground/30"}`}
                >
                  {a.name}
                </button>
              ))}
            </div>

            {(() => {
              const app = APK_APPS.find(a => a.key === selectedAppKey)!;
              return (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl" style={{ backgroundColor: app.bg }}>
                    <div className="flex items-center gap-3 mb-3">
                      <app.icon className="w-8 h-8" style={{ color: app.color }} />
                      <div>
                        <h3 className="font-bold" style={{ color: app.color }}>{app.name}</h3>
                        <code className="text-xs text-muted-foreground">{app.package}</code>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{app.desc}</p>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm">EAS Build bilan APK qurish:</h4>
                    <div className="space-y-2">
                      {[
                        { step: "1", label: "expo.dev da bepul hisob oching", cmd: "# expo.dev → Sign up" },
                        { step: "2", label: "EAS CLI o'rnating", cmd: "npm install -g eas-cli" },
                        { step: "3", label: "Loyiha papkasiga o'ting", cmd: "cd artifacts/timepad" },
                        { step: "4", label: "Hisobga kiring", cmd: "eas login" },
                        { step: "5", label: "Proyektni bog'lang", cmd: "eas init" },
                        { step: "6", label: `${app.name} APK quring`, cmd: `eas build --platform android --profile ${app.key}` },
                      ].map(s => (
                        <div key={s.step} className="flex items-start gap-3">
                          <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                            {s.step}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm text-muted-foreground mb-1">{s.label}</p>
                            <div className="flex items-center gap-2">
                              <code className="flex-1 text-xs bg-slate-900 text-green-400 px-3 py-2 rounded font-mono">
                                {s.cmd}
                              </code>
                              <Button
                                variant="ghost" size="icon" className="h-8 w-8 shrink-0"
                                onClick={() => copyText(s.cmd, "Buyruq")}
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
                    <strong>Muhim:</strong> APK qurishdan oldin{" "}
                    <code className="bg-amber-100 px-1 rounded">eas.json</code> dagi{" "}
                    <code className="bg-amber-100 px-1 rounded">EXPO_PUBLIC_DOMAIN</code> ni
                    Replit domeningizga o'zgartiring.
                    Masalan: <code className="bg-amber-100 px-1 rounded">abc-0-xyz.global.replit.app</code>
                  </div>
                </div>
              );
            })()}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBuildDialog(false)}>Yopish</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
