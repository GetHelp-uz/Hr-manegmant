import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import {
  Send, Smartphone, Users, CheckCircle, AlertCircle, Loader2,
  Radio, MessageCircle, ChevronDown, ChevronUp, X, Search,
  Info, Building2, UserCheck, UserX, Sparkles,
} from "lucide-react";

const TEMPLATES_TG = [
  { label: "Majlis eslatmasi", text: "📢 Hurmatli xodimlar!\n\nBugun soat {vaqt} da majlis bo'lib o'tadi. Iltimos, vaqtida boring.\n\nHurmat bilan, Rahbariyat" },
  { label: "Ish haqida", text: "ℹ️ Hurmatli xodimlar!\n\n{matn}\n\nSavollar bo'lsa, HR bo'limiga murojaat qiling." },
  { label: "Bayram tabrigi", text: "🎉 Hurmatli xodimlar!\n\n{bayram} munosabati bilan sizlarni tabriklaymiz! Baxtli, sog'-salomat bo'ling!\n\nHurmat bilan, Rahbariyat" },
  { label: "Muhim xabar", text: "🔔 MUHIM XABAR\n\n{matn}\n\nIltimos, diqqat biling." },
];

const TEMPLATES_SMS = [
  { label: "Majlis", text: "Hurmatli xodim! Bugun {vaqt} da majlis. Iltimos keling." },
  { label: "Maosh", text: "Hurmatli xodim! {oy} oyi maoshingiz hisobingizga o'tkazildi." },
  { label: "Ish boshlanishi", text: "Bugun {sana} ish soat {vaqt} da boshlanadi." },
  { label: "Tez xabar", text: "{matn}" },
];

function TemplateBtn({ label, onSelect }: { label: string; onSelect: () => void }) {
  return (
    <button onClick={onSelect}
      className="text-xs px-2.5 py-1.5 rounded-lg bg-muted hover:bg-primary/10 hover:text-primary border border-border transition-all text-left truncate">
      {label}
    </button>
  );
}

interface SendResult {
  sent: number;
  failed: number;
  total: number;
  failedNames?: string[];
  errors?: string[];
  message?: string;
}

interface Emp {
  id: number;
  fullName: string;
  telegramId?: string | null;
  phone?: string;
  position: string;
  departmentId?: number | null;
}

export default function BroadcastingPage() {
  const [activeTab, setActiveTab] = useState<"telegram" | "sms">("telegram");
  const [tgMessage, setTgMessage] = useState("");
  const [smsMessage, setSmsMessage] = useState("");
  const [selectedDept, setSelectedDept] = useState("all");
  const [searchQ, setSearchQ] = useState("");
  const [showRecipients, setShowRecipients] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [tgLoading, setTgLoading] = useState(false);
  const [smsLoading, setSmsLoading] = useState(false);
  const [tgResult, setTgResult] = useState<SendResult | null>(null);
  const [smsResult, setSmsResult] = useState<SendResult | null>(null);
  const [tgError, setTgError] = useState("");
  const [smsError, setSmsError] = useState("");

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/broadcasting/stats"],
    queryFn: () => apiClient.get("/api/broadcasting/stats"),
    refetchInterval: 60000,
  });

  const { data: recipientsData, isLoading: recipientsLoading } = useQuery({
    queryKey: ["/api/broadcasting/recipients", activeTab, selectedDept],
    queryFn: () =>
      apiClient.get(`/api/broadcasting/recipients?channel=${activeTab}&departmentId=${selectedDept}`),
  });

  const s = stats as any;
  const allRecipients: Emp[] = (recipientsData as any)?.employees || [];

  const filtered = useMemo(() => {
    let list = allRecipients;
    if (searchQ.trim()) {
      const q = searchQ.toLowerCase();
      list = list.filter(e =>
        e.fullName.toLowerCase().includes(q) ||
        e.position.toLowerCase().includes(q) ||
        (e.phone || "").includes(q)
      );
    }
    return list;
  }, [allRecipients, searchQ]);

  const departments: any[] = s?.departments || [];
  const selectedDeptInfo = selectedDept === "all" ? null : departments.find(d => d.id === parseInt(selectedDept));

  const targetCount = selectedIds.length > 0
    ? selectedIds.length
    : activeTab === "telegram"
      ? (selectedDeptInfo ? selectedDeptInfo.telegramCount : s?.telegramConnected ?? 0)
      : (selectedDeptInfo ? selectedDeptInfo.smsCount : s?.phoneCount ?? 0);

  const toggleEmployee = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const selectAll = () => setSelectedIds(filtered.map(e => e.id));
  const clearAll = () => setSelectedIds([]);

  const sendTelegram = async () => {
    if (!tgMessage.trim()) return;
    setTgLoading(true);
    setTgResult(null);
    setTgError("");
    try {
      const result = await apiClient.post("/api/broadcasting/telegram", {
        message: tgMessage,
        departmentId: selectedDept,
        employeeIds: selectedIds.length > 0 ? selectedIds : undefined,
      });
      setTgResult(result as any);
    } catch (err: any) {
      setTgError(err?.message || "Xatolik yuz berdi");
    }
    setTgLoading(false);
  };

  const sendSms = async () => {
    if (!smsMessage.trim()) return;
    setSmsLoading(true);
    setSmsResult(null);
    setSmsError("");
    try {
      const result = await apiClient.post("/api/broadcasting/sms", {
        message: smsMessage,
        departmentId: selectedDept,
        employeeIds: selectedIds.length > 0 ? selectedIds : undefined,
      });
      setSmsResult(result as any);
    } catch (err: any) {
      setSmsError(err?.message || "Xatolik yuz berdi");
    }
    setSmsLoading(false);
  };

  const applyTemplate = (text: string) => {
    if (activeTab === "telegram") setTgMessage(text);
    else setSmsMessage(text);
  };

  const isTg = activeTab === "telegram";
  const message = isTg ? tgMessage : smsMessage;
  const setMessage = isTg ? setTgMessage : setSmsMessage;
  const maxLen = isTg ? 4096 : 160;
  const result = isTg ? tgResult : smsResult;
  const error = isTg ? tgError : smsError;
  const loading = isTg ? tgLoading : smsLoading;
  const templates = isTg ? TEMPLATES_TG : TEMPLATES_SMS;

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-5">

        {/* HEADER */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <Radio className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Ommaviy Xabar Yuborish</h1>
            <p className="text-sm text-muted-foreground">Telegram va SMS orqali barcha yoki tanlangan xodimlarga xabar yuboring</p>
          </div>
        </div>

        {/* STATS ROW */}
        {statsLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[1,2,3,4].map(i => <Card key={i} className="h-20 animate-pulse bg-muted/40" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Jami xodimlar", value: s?.total ?? 0, icon: Users, color: "text-foreground", bg: "bg-muted/40" },
              { label: "Telegram ulangan", value: s?.telegramConnected ?? 0, icon: MessageCircle, color: "text-blue-500", bg: "bg-blue-500/5 border-blue-500/20" },
              { label: "SMS (telefon)", value: s?.phoneCount ?? 0, icon: Smartphone, color: "text-green-500", bg: "bg-green-500/5 border-green-500/20" },
              {
                label: "SMS xizmati",
                value: s?.smsEnabled ? "Faol" : "O'chirilgan",
                icon: s?.smsEnabled ? CheckCircle : AlertCircle,
                color: s?.smsEnabled ? "text-green-500" : "text-amber-500",
                bg: s?.smsEnabled ? "bg-green-500/5 border-green-500/20" : "bg-amber-500/5 border-amber-500/20"
              },
            ].map(item => (
              <Card key={item.label} className={`p-3.5 border flex items-center gap-3 ${item.bg}`}>
                <item.icon className={`w-5 h-5 flex-shrink-0 ${item.color}`} />
                <div>
                  <p className={`text-lg font-bold leading-none ${item.color}`}>{item.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.label}</p>
                </div>
              </Card>
            ))}
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-5">

          {/* LEFT: TARGETING + MESSAGE */}
          <div className="lg:col-span-2 space-y-4">

            {/* CHANNEL TABS */}
            <div className="flex rounded-xl border p-1 gap-1 bg-muted/30">
              <button
                onClick={() => { setActiveTab("telegram"); setTgResult(null); setTgError(""); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-medium transition-all
                  ${isTg ? "bg-background shadow-sm text-blue-600 border border-blue-500/20" : "text-muted-foreground hover:text-foreground"}`}>
                <MessageCircle className="w-4 h-4" />
                Telegram Bot
                {s?.telegramConnected > 0 && (
                  <Badge className="bg-blue-500/20 text-blue-600 border-0 text-xs">{s.telegramConnected}</Badge>
                )}
              </button>
              <button
                onClick={() => { setActiveTab("sms"); setSmsResult(null); setSmsError(""); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-medium transition-all
                  ${!isTg ? "bg-background shadow-sm text-green-600 border border-green-500/20" : "text-muted-foreground hover:text-foreground"}`}>
                <Smartphone className="w-4 h-4" />
                SMS (Eskiz)
                {s?.phoneCount > 0 && (
                  <Badge className="bg-green-500/20 text-green-700 border-0 text-xs">{s.phoneCount}</Badge>
                )}
              </button>
            </div>

            {/* DEPARTMENT FILTER */}
            <Card className="p-4 space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Building2 className="w-4 h-4 text-muted-foreground" />
                Bo'lim Tanlash
              </h3>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => { setSelectedDept("all"); setSelectedIds([]); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all
                    ${selectedDept === "all"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/40 border-border hover:border-primary/40"}`}>
                  Barcha bo'limlar
                  <span className="ml-1.5 opacity-60">({s?.total ?? 0})</span>
                </button>
                {departments.map(d => (
                  <button key={d.id}
                    onClick={() => { setSelectedDept(String(d.id)); setSelectedIds([]); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all
                      ${selectedDept === String(d.id)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted/40 border-border hover:border-primary/40"}`}>
                    {d.name}
                    <span className="ml-1.5 opacity-60">
                      ({isTg ? d.telegramCount : d.smsCount})
                    </span>
                  </button>
                ))}
              </div>
            </Card>

            {/* MESSAGE INPUT */}
            <Card className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  {isTg ? <MessageCircle className="w-4 h-4 text-blue-500" /> : <Smartphone className="w-4 h-4 text-green-600" />}
                  Xabar Matni
                </h3>
                <span className={`text-xs ${message.length > maxLen * 0.9 ? "text-amber-500" : "text-muted-foreground"}`}>
                  {message.length}/{maxLen}
                </span>
              </div>

              {/* TEMPLATES */}
              <div>
                <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />Shablon tanlang:
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {templates.map(t => (
                    <TemplateBtn key={t.label} label={t.label} onSelect={() => applyTemplate(t.text)} />
                  ))}
                </div>
              </div>

              <Textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder={
                  isTg
                    ? "Xabar matnini kiriting...\n\nTelegram HTML formatini qo'llab-quvvatlaydi: <b>qalin</b>, <i>kursiv</i>"
                    : "SMS matni kiriting (max 160 belgi)..."
                }
                className="min-h-[140px] resize-none"
                maxLength={maxLen}
              />

              {/* SEND BUTTON */}
              {!isTg && !s?.smsEnabled && (
                <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2.5 text-xs text-amber-700">
                  <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  SMS xizmati faol emas. Super admin Eskiz sozlamalarini yoqishi kerak.
                </div>
              )}

              {error && (
                <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5 text-sm text-red-600">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  {error}
                </div>
              )}

              {result && (
                <div className={`rounded-xl border px-4 py-3 space-y-1.5
                  ${result.failed === 0 ? "bg-green-500/10 border-green-500/20" : "bg-amber-500/10 border-amber-500/20"}`}>
                  <div className="flex items-center gap-2 font-medium text-sm">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    {result.sent} ta xodimga yuborildi
                    {result.failed > 0 && <span className="text-amber-600">• {result.failed} ta xato</span>}
                  </div>
                  {result.message && <p className="text-xs text-muted-foreground">{result.message}</p>}
                  {result.failedNames && result.failedNames.length > 0 && (
                    <p className="text-xs text-red-600">Xato: {result.failedNames.slice(0, 5).join(", ")}</p>
                  )}
                </div>
              )}

              <Button
                onClick={isTg ? sendTelegram : sendSms}
                disabled={loading || !message.trim() || (!isTg && !s?.smsEnabled) || targetCount === 0}
                className={`w-full gap-2 ${isTg ? "bg-blue-600 hover:bg-blue-500" : "bg-green-600 hover:bg-green-500"} text-white`}>
                {loading
                  ? <><Loader2 className="w-4 h-4 animate-spin" />Yuborilmoqda ({targetCount} ta)...</>
                  : <><Send className="w-4 h-4" />{isTg ? "Telegram" : "SMS"} Yuborish — {targetCount} ta xodim</>
                }
              </Button>
            </Card>
          </div>

          {/* RIGHT: RECIPIENTS PANEL */}
          <div className="space-y-3">
            <Card className="overflow-hidden">
              <div className="p-3 border-b flex items-center justify-between bg-muted/30">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-muted-foreground" />
                  Qabul qiluvchilar
                  <Badge variant="outline" className="text-xs">{targetCount}</Badge>
                </h3>
                <button
                  onClick={() => setShowRecipients(s => !s)}
                  className="text-muted-foreground hover:text-foreground text-xs flex items-center gap-1">
                  {showRecipients ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  {showRecipients ? "Yopish" : "Ko'rish"}
                </button>
              </div>

              {showRecipients && (
                <div className="flex flex-col">
                  <div className="p-2.5 border-b flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-muted-foreground" />
                      <Input
                        value={searchQ}
                        onChange={e => setSearchQ(e.target.value)}
                        placeholder="Qidirish..."
                        className="h-7 pl-7 text-xs"
                      />
                    </div>
                    {selectedIds.length > 0 ? (
                      <Button size="sm" variant="ghost" onClick={clearAll} className="h-7 px-2 text-xs gap-1">
                        <X className="w-3 h-3" />{selectedIds.length} bekor
                      </Button>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={selectAll} className="h-7 px-2 text-xs">
                        Barchasi
                      </Button>
                    )}
                  </div>

                  <div className="max-h-72 overflow-y-auto divide-y">
                    {recipientsLoading ? (
                      <div className="p-4 flex items-center justify-center">
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                      </div>
                    ) : filtered.length === 0 ? (
                      <div className="p-4 text-center text-xs text-muted-foreground">
                        {isTg ? "Telegram ulangan xodim yo'q" : "Telefon raqamli xodim yo'q"}
                      </div>
                    ) : (
                      filtered.map(emp => {
                        const isSelected = selectedIds.length === 0 || selectedIds.includes(emp.id);
                        const hasChan = isTg ? !!emp.telegramId : !!emp.phone;
                        return (
                          <button
                            key={emp.id}
                            onClick={() => toggleEmployee(emp.id)}
                            className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors
                              ${selectedIds.includes(emp.id) ? "bg-primary/5" : "hover:bg-muted/40"}
                              ${!hasChan ? "opacity-40" : ""}`}
                            disabled={!hasChan}>
                            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                              selectedIds.length > 0 && selectedIds.includes(emp.id)
                                ? "bg-primary"
                                : hasChan ? "bg-green-500" : "bg-muted-foreground"
                            }`} />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium truncate">{emp.fullName}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {isTg
                                  ? (emp.telegramId ? `@${emp.telegramId}` : "Telegram yo'q")
                                  : (emp.phone || "Raqam yo'q")
                                }
                              </p>
                            </div>
                            {!hasChan && <UserX className="w-3 h-3 text-muted-foreground flex-shrink-0" />}
                          </button>
                        );
                      })
                    )}
                  </div>

                  {filtered.length > 0 && (
                    <div className="p-2.5 border-t text-xs text-center text-muted-foreground bg-muted/20">
                      {filtered.filter(e => isTg ? e.telegramId : e.phone).length} ta{" "}
                      {isTg ? "Telegram" : "SMS"} qabul qiladi
                    </div>
                  )}
                </div>
              )}

              {!showRecipients && (
                <div className="p-3 space-y-2">
                  {isTg ? (
                    <>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Telegram ulangan</span>
                        <span className="font-medium text-blue-600">{targetCount} ta</span>
                      </div>
                      {s?.total > 0 && (
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full transition-all"
                            style={{ width: `${(targetCount / (s?.total || 1)) * 100}%` }}
                          />
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Jami {s?.total ?? 0} dan {Math.round((targetCount / (s?.total || 1)) * 100)}% qabul qiladi
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Telefon raqamli</span>
                        <span className="font-medium text-green-600">{targetCount} ta</span>
                      </div>
                      {s?.total > 0 && (
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-500 rounded-full transition-all"
                            style={{ width: `${(targetCount / (s?.total || 1)) * 100}%` }}
                          />
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </Card>

            {/* HOW IT WORKS */}
            <Card className="p-4 space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground">Eslatmalar</h3>
              <div className="space-y-2.5">
                {(isTg ? [
                  { icon: "📱", text: "Xodim Telegram botga /start yozib ulangan bo'lishi kerak" },
                  { icon: "⚡", text: "Telegram orqali tez va bepul" },
                  { icon: "📝", text: "HTML formatlash: qalin, kursiv, chiziq ishlaydi" },
                ] : [
                  { icon: "📲", text: "Barcha O'zbekiston raqamlariga yuboriladi" },
                  { icon: "💰", text: "Har SMS uchun Eskiz kredit sarflanadi" },
                  { icon: "🔤", text: "Max 160 belgi (ko'p uchun 2 SMS hisoblanadi)" },
                ]).map((item, i) => (
                  <div key={i} className="flex gap-2.5 text-xs">
                    <span className="text-base leading-none flex-shrink-0">{item.icon}</span>
                    <p className="text-muted-foreground">{item.text}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
