import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { Nfc, CheckCircle2, XCircle, ArrowLeft, Smartphone, Wifi, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiClient } from "@/lib/api-client";

type ScanResult = {
  granted: boolean;
  action?: string;
  employee?: { id: number; fullName: string; position: string };
  device?: { name: string };
  message?: string;
  lateMinutes?: number;
};

const NFC_SUPPORTED = typeof window !== "undefined" && "NDEFReader" in window;

export default function NfcScan() {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [direction, setDirection] = useState<"in" | "out">("in");
  const [deviceToken, setDeviceToken] = useState(() => localStorage.getItem("skud_device_token") || "");
  const [manualCardId, setManualCardId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const readerRef = useRef<any>(null);
  const resultTimerRef = useRef<any>(null);

  const showResult = (r: ScanResult) => {
    setResult(r);
    setScanning(false);
    clearTimeout(resultTimerRef.current);
    resultTimerRef.current = setTimeout(() => {
      setResult(null);
      if (NFC_SUPPORTED && scanning) startNfcScan();
    }, 4000);
  };

  const checkCard = async (cardId: string) => {
    if (!deviceToken.trim()) {
      setError("Device token kiritilmagan");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const r = await fetch(`${window.location.origin}/api/skud/check`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-device-token": deviceToken,
        },
        body: JSON.stringify({ cardId, direction }),
      });
      const data = await r.json();
      showResult(data);
    } catch {
      setError("Server bilan bog'lanib bo'lmadi");
    } finally {
      setLoading(false);
    }
  };

  const startNfcScan = async () => {
    if (!NFC_SUPPORTED) return;
    try {
      const reader = new (window as any).NDEFReader();
      readerRef.current = reader;
      await reader.scan();
      setScanning(true);
      setResult(null);
      setError("");

      reader.addEventListener("reading", ({ serialNumber }: any) => {
        const cardId = serialNumber?.replace(/:/g, "")?.toUpperCase() || "";
        if (cardId) checkCard(cardId);
      });
      reader.addEventListener("readingerror", () => {
        setError("NFC o'qishda xatolik");
      });
    } catch (e: any) {
      if (e.name === "NotAllowedError") {
        setError("NFC ruxsati berilmagan. Brauzer sozlamalarida ruxsat bering.");
      } else {
        setError("NFC ishga tushmadi: " + e.message);
      }
      setScanning(false);
    }
  };

  const stopNfcScan = () => {
    setScanning(false);
    readerRef.current = null;
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCardId.trim()) {
      checkCard(manualCardId.trim().toUpperCase());
    }
  };

  useEffect(() => {
    if (deviceToken) localStorage.setItem("skud_device_token", deviceToken);
  }, [deviceToken]);

  useEffect(() => () => { clearTimeout(resultTimerRef.current); }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">

        {/* Header */}
        <div className="text-center">
          <Link href="/skud">
            <button className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm mb-4 mx-auto">
              <ArrowLeft className="w-4 h-4" /> Orqaga
            </button>
          </Link>
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-3">
            <Nfc className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-xl font-display font-bold">Telefon NFC — СКУД</h1>
          <p className="text-sm text-muted-foreground mt-1">Telefoningizni СКУД kartrideri yoniga qo'ying</p>
        </div>

        {/* Device token */}
        <div className="bg-white border border-border rounded-2xl p-4 space-y-2">
          <Label className="text-xs text-muted-foreground">Qurilma API Token</Label>
          <Input
            type="password"
            value={deviceToken}
            onChange={e => setDeviceToken(e.target.value)}
            placeholder="Qurilma tokenini kiriting..."
            className="rounded-xl font-mono text-sm"
          />
        </div>

        {/* Direction selector */}
        <div className="bg-white border border-border rounded-2xl p-4">
          <Label className="text-xs text-muted-foreground mb-2 block">Yo'nalish</Label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setDirection("in")}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                direction === "in" ? "bg-primary text-white border-primary" : "border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              Kirish
            </button>
            <button
              onClick={() => setDirection("out")}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                direction === "out" ? "bg-slate-700 text-white border-slate-700" : "border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              Chiqish
            </button>
          </div>
        </div>

        {/* NFC Scan area */}
        {NFC_SUPPORTED ? (
          <div
            onClick={!scanning ? startNfcScan : stopNfcScan}
            className={`relative rounded-3xl border-2 cursor-pointer transition-all duration-300 p-10 text-center ${
              scanning
                ? "border-primary bg-primary/5 shadow-lg shadow-primary/20"
                : "border-dashed border-border hover:border-primary/40 bg-white hover:bg-primary/5"
            }`}
          >
            {scanning && (
              <>
                <div className="absolute inset-0 rounded-3xl border-2 border-primary/30 animate-ping" />
                <div className="absolute inset-4 rounded-2xl border border-primary/20 animate-pulse" />
              </>
            )}
            <Nfc className={`w-14 h-14 mx-auto mb-3 ${scanning ? "text-primary animate-pulse" : "text-muted-foreground/40"}`} />
            <p className="font-semibold text-foreground">
              {scanning ? "Kartani yaqinlashtiring..." : "Bosib NFC skanerni yoqing"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {scanning ? "Telefoningizni kartrideri yoniga qo'ying" : "NFC kartangizni skanerlash uchun bosing"}
            </p>
            {loading && (
              <div className="mt-3">
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            )}
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-center">
            <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
            <p className="text-sm font-semibold text-amber-800">Web NFC qo'llab-quvvatlanmaydi</p>
            <p className="text-xs text-amber-700 mt-1">
              Faqat Android Chrome brauzeri Web NFC'ni qo'llab-quvvatlaydi. Quyida qo'lda UID kiriting.
            </p>
          </div>
        )}

        {/* Manual input */}
        <form onSubmit={handleManualSubmit} className="bg-white border border-border rounded-2xl p-4 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Qo'lda UID kiriting</p>
          <div className="flex gap-2">
            <Input
              value={manualCardId}
              onChange={e => setManualCardId(e.target.value)}
              placeholder="A4BC1234"
              className="rounded-xl font-mono flex-1"
            />
            <Button type="submit" disabled={!manualCardId.trim() || loading} className="rounded-xl px-4 flex-shrink-0">
              Yuborish
            </Button>
          </div>
        </form>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3 text-sm text-red-700">
            <XCircle className="w-5 h-5 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Result */}
        {result && (
          <div className={`rounded-2xl border p-5 text-center transition-all animate-in fade-in slide-in-from-bottom-2 duration-300 ${
            result.granted
              ? "bg-emerald-50 border-emerald-200"
              : "bg-red-50 border-red-200"
          }`}>
            {result.granted ? (
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            ) : (
              <XCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
            )}
            <p className={`font-display font-bold text-lg ${result.granted ? "text-emerald-800" : "text-red-800"}`}>
              {result.granted ? "✅ Ruxsat berildi" : "❌ Ruxsat yo'q"}
            </p>
            {result.employee && (
              <p className="text-sm text-emerald-700 mt-1 font-semibold">{result.employee.fullName}</p>
            )}
            {result.employee?.position && (
              <p className="text-xs text-emerald-600 mt-0.5">{result.employee.position}</p>
            )}
            {result.lateMinutes && result.lateMinutes > 0 && (
              <div className="mt-2 bg-amber-100 border border-amber-200 rounded-xl px-3 py-1.5 text-xs text-amber-800 font-medium">
                ⚠️ Kechikish: {result.lateMinutes} daqiqa
              </div>
            )}
            {!result.granted && result.message && (
              <p className="text-xs text-red-600 mt-2">{result.message}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
