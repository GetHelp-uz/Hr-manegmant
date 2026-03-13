import { useEffect, useRef, useState, useCallback } from "react";
import { useLocation } from "wouter";
import { Html5Qrcode } from "html5-qrcode";
import { apiClient } from "@/lib/api-client";
import type { KioskConfig } from "./login";

const KIOSK_STORAGE_KEY = "hr_kiosk_config";

type Phase = "loading" | "idle" | "scanning" | "selfie" | "submitting" | "success" | "error";

function useClock() {
  const [time, setTime] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return time;
}

export default function KioskScan() {
  const [, setLocation] = useLocation();
  const time = useClock();

  const [phase, setPhase] = useState<Phase>("loading");
  const [config, setConfig] = useState<KioskConfig | null>(null);
  const [countdown, setCountdown] = useState(3);
  const [resultMsg, setResultMsg] = useState("");
  const [resultSub, setResultSub] = useState("");
  const [resultIsSuccess, setResultIsSuccess] = useState(true);
  const [todayCount, setTodayCount] = useState(0);
  const [lastEvent, setLastEvent] = useState<{ name: string; action: string; time: string } | null>(null);
  const [networkOk, setNetworkOk] = useState(true);

  const qrScannerRef = useRef<Html5Qrcode | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const countdownTimerRef = useRef<any>(null);
  const watchdogRef = useRef<any>(null);
  const keepaliveRef = useRef<any>(null);
  const phaseRef = useRef<Phase>("loading");
  const configRef = useRef<KioskConfig | null>(null);
  phaseRef.current = phase;
  configRef.current = config;

  const fmt = (d: Date) => d.toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" });
  const fmtDate = (d: Date) => d.toLocaleDateString("uz-UZ", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });

  const stopQrScanner = useCallback(async () => {
    if (qrScannerRef.current) {
      try { await qrScannerRef.current.stop(); } catch {}
      try { qrScannerRef.current.clear(); } catch {}
      qrScannerRef.current = null;
    }
  }, []);

  const stopSelfieStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const captureSelfie = useCallback((): string | null => {
    if (!videoRef.current || !canvasRef.current) return null;
    const v = videoRef.current;
    const c = canvasRef.current;
    c.width = v.videoWidth || 480;
    c.height = v.videoHeight || 640;
    const ctx = c.getContext("2d");
    if (!ctx) return null;
    ctx.save();
    ctx.translate(c.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(v, 0, 0);
    ctx.restore();
    return c.toDataURL("image/jpeg", 0.65);
  }, []);

  const startScanner = useCallback(async () => {
    if (phaseRef.current === "selfie" || phaseRef.current === "submitting") return;
    await stopQrScanner();
    setPhase("scanning");

    await new Promise((r) => setTimeout(r, 100));

    const scanner = new Html5Qrcode("kiosk-qr-div");
    qrScannerRef.current = scanner;

    try {
      await scanner.start(
        { facingMode: "environment" },
        { fps: 12, qrbox: { width: 280, height: 280 }, aspectRatio: 1.0 },
        async (decoded) => {
          if (phaseRef.current !== "scanning") return;
          await stopQrScanner();
          startSelfie(decoded);
        },
        () => {}
      );
    } catch {
      setPhase("idle");
      setTimeout(() => { if (phaseRef.current === "idle") startScanner(); }, 3000);
    }
  }, [stopQrScanner]);

  const submitAttendance = useCallback(async (qrData: string, photo: string | null) => {
    setPhase("submitting");
    const cfg = configRef.current;
    try {
      const result: any = await apiClient.post("/api/attendance/scan", {
        qrData, deviceId: cfg?.deviceId || null, photo,
      });
      const actionTxt =
        result.action === "check_in" ? "Keldi ✅" :
        result.action === "check_out" ? "Ketdi 🏁" :
        result.action === "already_checked_out" ? "Allaqachon chiqgan ℹ️" : "Qayd etildi";

      setResultMsg(result.employee?.fullName || "Xodim");
      setResultSub(`${actionTxt}  •  ${fmt(new Date())}`);
      setResultIsSuccess(true);

      setLastEvent({ name: result.employee?.fullName || "?", action: actionTxt, time: fmt(new Date()) });
      setTodayCount((c) => c + 1);
      setNetworkOk(true);
      setPhase("success");
    } catch (err: any) {
      setResultIsSuccess(false);
      setResultMsg(err?.message || "Xatolik yuz berdi");
      setResultSub("QR kodni qayta skaner qiling");
      setNetworkOk(false);
      setPhase("error");
    }
    setTimeout(async () => {
      stopSelfieStream();
      await startScanner();
    }, 4000);
  }, [stopSelfieStream, startScanner]);

  const startSelfie = useCallback(async (qrData: string) => {
    setCountdown(3);
    setPhase("selfie");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    } catch {
      stopSelfieStream();
      submitAttendance(qrData, null);
      return;
    }
    let cnt = 3;
    setCountdown(cnt);
    countdownTimerRef.current = setInterval(() => {
      cnt -= 1;
      setCountdown(cnt);
      if (cnt <= 0) {
        clearInterval(countdownTimerRef.current);
        const photo = captureSelfie();
        stopSelfieStream();
        submitAttendance(qrData, photo);
      }
    }, 1000);
  }, [captureSelfie, stopSelfieStream, submitAttendance]);

  const tryAutoLogin = useCallback(async (cfg: KioskConfig): Promise<boolean> => {
    try {
      await apiClient.post("/api/auth/login", { login: cfg.login, password: cfg.password });
      return true;
    } catch {
      return false;
    }
  }, []);

  const fetchTodayCount = useCallback(async () => {
    try {
      const result: any = await apiClient.get("/api/attendance/today");
      if (result?.total != null) setTodayCount(result.total);
    } catch {}
  }, []);

  useEffect(() => {
    const initKiosk = async () => {
      let cfg: KioskConfig | null = null;
      try {
        const saved = localStorage.getItem(KIOSK_STORAGE_KEY);
        if (saved) cfg = JSON.parse(saved);
      } catch {}

      if (!cfg) {
        setLocation("/kiosk");
        return;
      }
      setConfig(cfg);
      configRef.current = cfg;

      try {
        await apiClient.get("/api/auth/me");
      } catch (err: any) {
        if (err?.status === 401 || err?.status === 503) {
          const ok = await tryAutoLogin(cfg);
          if (!ok) {
            setLocation("/kiosk");
            return;
          }
        }
      }

      await fetchTodayCount();
      setPhase("idle");
      setTimeout(() => startScanner(), 300);
    };

    initKiosk();
  }, []);

  useEffect(() => {
    if (phase !== "loading") {
      watchdogRef.current = setInterval(() => {
        if (phaseRef.current === "idle" || phaseRef.current === "error") {
          startScanner();
        }
      }, 30000);

      keepaliveRef.current = setInterval(async () => {
        try {
          await apiClient.get("/api/auth/me");
          setNetworkOk(true);
        } catch (err: any) {
          if (err?.status === 401) {
            const cfg = configRef.current;
            if (cfg) await tryAutoLogin(cfg);
          } else {
            setNetworkOk(false);
          }
        }
        fetchTodayCount();
      }, 5 * 60 * 1000);
    }
    return () => {
      clearInterval(watchdogRef.current);
      clearInterval(keepaliveRef.current);
    };
  }, [phase !== "loading"]);

  useEffect(() => {
    let wakeLock: any = null;
    const acquire = async () => {
      try {
        wakeLock = await (navigator as any).wakeLock?.request("screen");
      } catch {}
    };
    acquire();
    const onVis = () => {
      if (document.visibilityState === "visible") acquire();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      wakeLock?.release?.().catch?.(() => {});
    };
  }, []);

  useEffect(() => {
    return () => {
      stopQrScanner();
      stopSelfieStream();
      clearInterval(countdownTimerRef.current);
      clearInterval(watchdogRef.current);
      clearInterval(keepaliveRef.current);
    };
  }, []);

  const isScanning = phase === "scanning";
  const isSelfie = phase === "selfie";
  const isSubmitting = phase === "submitting";
  const isSuccess = phase === "success";
  const isError = phase === "error";
  const isLoading = phase === "loading";

  const handleExit = async () => {
    await stopQrScanner();
    stopSelfieStream();
    clearInterval(countdownTimerRef.current);
    setLocation("/kiosk");
  };

  return (
    <div className="fixed inset-0 bg-gray-950 flex flex-col select-none overflow-hidden">

      <div className="flex items-center justify-between px-6 py-3 bg-gray-900 border-b border-gray-800 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-bold">QR</span>
          </div>
          <div className="min-w-0">
            <p className="text-white font-semibold text-sm truncate">{config?.companyName || "HR Kiosk"}</p>
            <p className="text-gray-500 text-xs truncate">{config?.deviceName || "Qurilma"}</p>
          </div>
        </div>

        <div className="text-center">
          <p className="text-white text-2xl font-mono font-bold tabular-nums leading-none">
            {time.toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </p>
          <p className="text-gray-500 text-xs mt-0.5">{fmtDate(time)}</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${networkOk ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`} />
            <span className="text-gray-400 text-xs hidden sm:inline">{networkOk ? "Ulangan" : "Ulanish yo'q"}</span>
          </div>
          <button onClick={handleExit}
            className="text-gray-600 hover:text-gray-400 text-xs border border-gray-700 hover:border-gray-600 px-3 py-1.5 rounded-lg transition-colors">
            Chiqish
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden">

        {isLoading && (
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 border-4 border-emerald-600/30 border-t-emerald-600 rounded-full animate-spin" />
            <p className="text-gray-400 text-lg">Tayyorlanmoqda...</p>
          </div>
        )}

        <div
          id="kiosk-qr-div"
          className="w-full h-full"
          style={{ display: isScanning ? "block" : "none" }}
        />

        {isSelfie && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black">
            <video
              ref={videoRef}
              autoPlay playsInline muted
              className="absolute inset-0 w-full h-full object-cover"
              style={{ transform: "scaleX(-1)" }}
            />
            <div className="relative z-10 flex flex-col items-center gap-6 pointer-events-none">
              <div className="w-64 h-64 rounded-full border-4 border-white/80 shadow-2xl" />
              <div className="bg-black/70 backdrop-blur-md rounded-3xl px-10 py-6 text-center">
                <p className="text-white/70 text-base font-medium mb-2">Selfie olinmoqda</p>
                <p className="text-white text-8xl font-bold leading-none tabular-nums">{countdown}</p>
              </div>
            </div>
          </div>
        )}

        {isSubmitting && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-950/90 backdrop-blur-sm gap-6">
            <div className="w-20 h-20 border-4 border-emerald-600/30 border-t-emerald-500 rounded-full animate-spin" />
            <p className="text-white text-xl font-medium">Qayd etilmoqda...</p>
          </div>
        )}

        {(isSuccess || isError) && (
          <div className={`absolute inset-0 flex flex-col items-center justify-center gap-8 p-8 animate-in fade-in zoom-in duration-300 ${isSuccess ? "bg-emerald-600" : "bg-red-600"}`}>
            {isSuccess ? (
              <>
                <div className="w-32 h-32 rounded-full bg-white/20 border-4 border-white/50 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" className="w-16 h-16">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="text-center">
                  <h2 className="text-5xl font-bold text-white mb-3">{resultMsg}</h2>
                  <p className="text-white/80 text-2xl">{resultSub}</p>
                </div>
              </>
            ) : (
              <>
                <div className="w-32 h-32 rounded-full bg-white/20 border-4 border-white/50 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" className="w-16 h-16">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <div className="text-center">
                  <h2 className="text-3xl font-bold text-white mb-3">{resultMsg}</h2>
                  <p className="text-white/80 text-xl">{resultSub}</p>
                </div>
              </>
            )}
          </div>
        )}

        {phase === "idle" && (
          <div className="flex flex-col items-center gap-6 text-center p-8">
            <div className="w-24 h-24 rounded-2xl bg-gray-800 border-2 border-gray-700 flex items-center justify-center">
              <div className="w-12 h-12 border-4 border-gray-600/30 border-t-gray-400 rounded-full animate-spin" />
            </div>
            <p className="text-gray-400 text-xl">Kamera ishga tushmoqda...</p>
          </div>
        )}
      </div>

      <div className="shrink-0 bg-gray-900 border-t border-gray-800 px-6 py-3">
        {isScanning ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-emerald-400 font-medium">QR kodni skanerlang</span>
              <span className="text-gray-600 text-sm hidden sm:inline">— QR kodingizni kameraga tutib turing</span>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <div className="text-center">
                <p className="text-gray-500 text-xs">Bugun</p>
                <p className="text-white font-bold text-lg leading-none">{todayCount}</p>
              </div>
              {lastEvent && (
                <div className="text-right hidden sm:block">
                  <p className="text-gray-500 text-xs">Oxirgi qayd</p>
                  <p className="text-white text-sm font-medium">{lastEvent.name} — {lastEvent.action}</p>
                  <p className="text-gray-600 text-xs">{lastEvent.time}</p>
                </div>
              )}
            </div>
          </div>
        ) : isSelfie ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
              <span className="text-blue-400 font-medium">Kameraga qarang — {countdown} soniya</span>
            </div>
            <p className="text-gray-500 text-sm">Selfie olinmoqda...</p>
          </div>
        ) : isSubmitting ? (
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse" />
            <span className="text-yellow-400 font-medium">Server bilan bog'lanmoqda...</span>
          </div>
        ) : isSuccess ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-emerald-500 rounded-full" />
              <span className="text-emerald-400 font-medium">Muvaffaqiyatli qayd etildi</span>
            </div>
            <p className="text-gray-500 text-sm">4 soniyada skaner davom etadi...</p>
          </div>
        ) : isError ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-red-500 rounded-full" />
              <span className="text-red-400 font-medium">Xatolik yuz berdi</span>
            </div>
            <p className="text-gray-500 text-sm">3 soniyada qayta uriniladi...</p>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-gray-600 rounded-full" />
            <span className="text-gray-500">Tayyorlanmoqda...</span>
          </div>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
