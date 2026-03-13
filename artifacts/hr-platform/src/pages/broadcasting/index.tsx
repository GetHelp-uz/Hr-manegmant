import { useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import {
  Send, MessageSquare, Smartphone, Users, CheckCircle,
  AlertCircle, Loader2, BellRing, MessageCircle, Radio,
  Info
} from "lucide-react";

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number | string; color: string }) {
  return (
    <Card className={`p-4 border ${color} flex items-center gap-3`}>
      <div className="w-10 h-10 rounded-xl bg-current/10 flex items-center justify-center opacity-80 flex-shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </Card>
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

export default function BroadcastingPage() {
  const [tgMessage, setTgMessage] = useState("");
  const [smsMessage, setSmsMessage] = useState("");
  const [tgLoading, setTgLoading] = useState(false);
  const [smsLoading, setSmsLoading] = useState(false);
  const [tgResult, setTgResult] = useState<SendResult | null>(null);
  const [smsResult, setSmsResult] = useState<SendResult | null>(null);
  const [tgError, setTgError] = useState("");
  const [smsError, setSmsError] = useState("");

  const { data: stats } = useQuery({
    queryKey: ["/api/broadcasting/stats"],
    queryFn: () => apiClient.get("/api/broadcasting/stats"),
    refetchInterval: 60000,
  });

  const s = stats as any;

  const sendTelegram = async () => {
    if (!tgMessage.trim()) return;
    setTgLoading(true);
    setTgResult(null);
    setTgError("");
    try {
      const result = await apiClient.post("/api/broadcasting/telegram", {
        message: tgMessage,
        targetGroup: "all",
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
        targetGroup: "all",
      });
      setSmsResult(result as any);
    } catch (err: any) {
      setSmsError(err?.message || "Xatolik yuz berdi");
    }
    setSmsLoading(false);
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-3xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <Radio className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Ommaviy Xabar Yuborish</h1>
            <p className="text-sm text-muted-foreground">Barcha xodimlarga Telegram va SMS orqali xabar yuboring</p>
          </div>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <StatCard
            icon={<Users className="w-5 h-5 text-gray-500" />}
            label="Jami faol xodimlar"
            value={s?.total ?? "—"}
            color="border-border"
          />
          <StatCard
            icon={<MessageCircle className="w-5 h-5 text-blue-500" />}
            label="Telegram ulangan"
            value={s?.telegramConnected ?? "—"}
            color="border-blue-500/20 bg-blue-500/5"
          />
          <StatCard
            icon={<Smartphone className="w-5 h-5 text-green-500" />}
            label="Telefon raqami bor"
            value={s?.phoneCount ?? "—"}
            color="border-green-500/20 bg-green-500/5"
          />
        </div>

        {/* TELEGRAM SECTION */}
        <Card className="p-5 border-blue-500/20 bg-blue-500/5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-blue-500" />
              <h2 className="font-semibold">Telegram Xabar</h2>
              <Badge className="bg-blue-500/20 text-blue-600 border-0 text-xs">
                {s?.telegramConnected ?? 0} ta qabul qiluvchi
              </Badge>
            </div>
            {s?.telegramConnected === 0 && (
              <div className="flex items-center gap-1 text-xs text-amber-600">
                <Info className="w-3.5 h-3.5" />
                Telegram ulangan xodim yo'q
              </div>
            )}
          </div>

          <Textarea
            value={tgMessage}
            onChange={e => setTgMessage(e.target.value)}
            placeholder="Xabar matnini kiriting...&#10;&#10;Masalan: Hurmatli xodimlar, bugun kechki 18:00 da majlis bo'ladi. Iltimos vaqtida keling."
            className="min-h-[120px] resize-none bg-background"
            maxLength={4096}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{tgMessage.length}/4096</span>
            <Button
              onClick={sendTelegram}
              disabled={tgLoading || !tgMessage.trim() || (s?.telegramConnected === 0)}
              className="bg-blue-600 hover:bg-blue-500 text-white gap-2"
            >
              {tgLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {tgLoading ? "Yuborilmoqda..." : "Telegram Yuborish"}
            </Button>
          </div>

          {tgError && (
            <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-600">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              {tgError}
            </div>
          )}

          {tgResult && (
            <div className={`rounded-xl border px-4 py-3 space-y-1 ${tgResult.failed === 0 ? "bg-green-500/10 border-green-500/20" : "bg-amber-500/10 border-amber-500/20"}`}>
              <div className="flex items-center gap-2 font-medium text-sm">
                <CheckCircle className="w-4 h-4 text-green-600" />
                Natija: {tgResult.sent} ta yuborildi, {tgResult.failed} ta xato
              </div>
              {tgResult.message && <p className="text-xs text-muted-foreground">{tgResult.message}</p>}
              {tgResult.failedNames && tgResult.failedNames.length > 0 && (
                <p className="text-xs text-red-600">Xato: {tgResult.failedNames.join(", ")}</p>
              )}
            </div>
          )}
        </Card>

        {/* SMS SECTION */}
        <Card className="p-5 border-green-500/20 bg-green-500/5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-green-600" />
              <h2 className="font-semibold">SMS Xabar</h2>
              <Badge className="bg-green-500/20 text-green-700 border-0 text-xs">
                {s?.phoneCount ?? 0} ta qabul qiluvchi
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              {s?.smsEnabled ? (
                <Badge className="bg-green-500/20 text-green-700 border-0 text-xs gap-1">
                  <CheckCircle className="w-3 h-3" />Eskiz faol
                </Badge>
              ) : (
                <Badge className="bg-amber-500/20 text-amber-700 border-0 text-xs gap-1">
                  <AlertCircle className="w-3 h-3" />Eskiz sozlanmagan
                </Badge>
              )}
            </div>
          </div>

          {!s?.smsEnabled && (
            <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 text-sm text-amber-700">
              <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
              SMS xizmati sozlanmagan. Super admin platformada Eskiz integratsiyasini yoqishi kerak.
            </div>
          )}

          <Textarea
            value={smsMessage}
            onChange={e => setSmsMessage(e.target.value)}
            placeholder="SMS matni kiriting (max 160 belgi)..."
            className="min-h-[100px] resize-none bg-background"
            maxLength={160}
          />
          <div className="flex items-center justify-between">
            <span className={`text-xs ${smsMessage.length > 150 ? "text-amber-600" : "text-muted-foreground"}`}>
              {smsMessage.length}/160
            </span>
            <Button
              onClick={sendSms}
              disabled={smsLoading || !smsMessage.trim() || !s?.smsEnabled}
              className="bg-green-600 hover:bg-green-500 text-white gap-2"
            >
              {smsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Smartphone className="w-4 h-4" />}
              {smsLoading ? "Yuborilmoqda..." : "SMS Yuborish"}
            </Button>
          </div>

          {smsError && (
            <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-600">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              {smsError}
            </div>
          )}

          {smsResult && (
            <div className={`rounded-xl border px-4 py-3 space-y-1 ${smsResult.failed === 0 ? "bg-green-500/10 border-green-500/20" : "bg-amber-500/10 border-amber-500/20"}`}>
              <div className="flex items-center gap-2 font-medium text-sm">
                <CheckCircle className="w-4 h-4 text-green-600" />
                Natija: {smsResult.sent} ta yuborildi, {smsResult.failed} ta xato
              </div>
              {smsResult.message && <p className="text-xs text-muted-foreground">{smsResult.message}</p>}
              {smsResult.errors && smsResult.errors.length > 0 && (
                <p className="text-xs text-red-600">Xato: {smsResult.errors.join("; ")}</p>
              )}
            </div>
          )}
        </Card>

        {/* GUIDE */}
        <Card className="p-5 border space-y-3">
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <BellRing className="w-4 h-4 text-muted-foreground" />
            Eslatmalar
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              { icon: "📱", title: "Telegram bot", desc: "Xodimlar botga /start yozib ro'yxatdan o'tishi kerak" },
              { icon: "📲", title: "SMS (Eskiz)", desc: "Barcha xodimlar telefon raqami orqali SMS oladi" },
              { icon: "⚡", title: "Tezlik", desc: "Telegram xabarlar bir vaqtda 20 ta / sek tezlikda ketadi" },
              { icon: "💰", title: "SMS narxi", desc: "Har SMS uchun Eskiz hisobingizdan kredit yechiladi" },
            ].map(item => (
              <div key={item.title} className="flex gap-3 p-3 rounded-xl bg-muted/40">
                <span className="text-xl flex-shrink-0">{item.icon}</span>
                <div>
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
