import { useEffect, useRef, useState, useCallback } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { Html5Qrcode } from "html5-qrcode";
import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, XCircle, Camera, QrCode, User, Loader2 } from "lucide-react";
import { apiClient } from "@/lib/api-client";

type Phase = "idle" | "scanning" | "selfie" | "submitting" | "success" | "error";

export default function Scanner() {
  const { data: devicesData } = useQuery({
    queryKey: ["/api/devices"],
    queryFn: () => apiClient.get("/api/devices"),
  });
  const devices = (devicesData as any)?.data || [];
  const [deviceId, setDeviceId] = useState<number | null>(null);

  const [phase, setPhase] = useState<Phase>("idle");
  const [countdown, setCountdown] = useState(3);
  const [resultMsg, setResultMsg] = useState("");
  const [resultEmployee, setResultEmployee] = useState<any>(null);
  const [pendingQr, setPendingQr] = useState<string | null>(null);

  const qrScannerRef = useRef<Html5Qrcode | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const countdownRef = useRef<any>(null);
  const phaseRef = useRef<Phase>("idle");
  phaseRef.current = phase;

  const stopQrScanner = useCallback(async () => {
    if (qrScannerRef.current) {
      try { await qrScannerRef.current.stop(); } catch {}
      try { qrScannerRef.current.clear(); } catch {}
      qrScannerRef.current = null;
    }
  }, []);

  const stopSelfieStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const captureSelfie = useCallback((): string | null => {
    if (!videoRef.current || !canvasRef.current) return null;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.save();
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);
    ctx.restore();
    return canvas.toDataURL("image/jpeg", 0.6);
  }, []);

  const submitAttendance = useCallback(async (qrData: string, photo: string | null) => {
    setPhase("submitting");
    try {
      const result: any = await apiClient.post("/api/attendance/scan", {
        qrData, deviceId, photo,
      });
      setResultEmployee(result.employee);
      const action = result.action === "check_in" ? "✅ Keldi" : result.action === "check_out" ? "🏁 Ketdi" : "Qayd etildi";
      setResultMsg(`${action}: ${result.employee?.fullName}`);
      setPhase("success");
    } catch (err: any) {
      setResultMsg(err?.message || "Xatolik yuz berdi");
      setPhase("error");
    }
    setTimeout(() => {
      setResultEmployee(null);
      setPhase("scanning");
    }, 4000);
  }, [deviceId]);

  const startSelfie = useCallback(async (qrData: string) => {
    setPendingQr(qrData);
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
      const photo = null;
      stopSelfieStream();
      submitAttendance(qrData, photo);
      return;
    }

    let count = 3;
    setCountdown(count);
    countdownRef.current = setInterval(() => {
      count -= 1;
      setCountdown(count);
      if (count <= 0) {
        clearInterval(countdownRef.current);
        const photo = captureSelfie();
        stopSelfieStream();
        submitAttendance(qrData, photo);
      }
    }, 1000);
  }, [captureSelfie, stopSelfieStream, submitAttendance]);

  const startScanner = useCallback(async () => {
    if (!deviceId) return;
    await stopQrScanner();
    setPhase("scanning");

    const scanner = new Html5Qrcode("qr-reader-div");
    qrScannerRef.current = scanner;

    try {
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 260, height: 260 } },
        async (decodedText) => {
          if (phaseRef.current !== "scanning") return;
          await stopQrScanner();
          startSelfie(decodedText);
        },
        () => {}
      );
    } catch (err) {
      console.error("QR scanner start failed:", err);
      setPhase("idle");
    }
  }, [deviceId, stopQrScanner, startSelfie]);

  useEffect(() => {
    if (phase === "scanning" && deviceId) {
    }
    return () => {
      clearInterval(countdownRef.current);
    };
  }, []);

  useEffect(() => {
    if (deviceId && phase === "idle") {
      startScanner();
    }
  }, [deviceId]);

  useEffect(() => {
    if (devices.length && !deviceId) {
      setDeviceId(devices[0].id);
    }
  }, [devicesData]);

  useEffect(() => {
    return () => {
      stopQrScanner();
      stopSelfieStream();
      clearInterval(countdownRef.current);
    };
  }, []);

  const handleDeviceChange = (val: string) => {
    stopQrScanner();
    stopSelfieStream();
    clearInterval(countdownRef.current);
    setPhase("idle");
    setDeviceId(Number(val));
    setTimeout(() => startScanner(), 200);
  };

  const isResult = phase === "success" || phase === "error";
  const isSelfie = phase === "selfie";
  const isSubmitting = phase === "submitting";
  const isScanning = phase === "scanning";

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-display font-bold">QR Scanner</h1>
          <p className="text-muted-foreground mt-1 text-sm">QR kodni skanerlang — selfie avtomatik olinadi</p>
        </div>

        <div className="w-full max-w-xs mx-auto">
          <Select value={deviceId?.toString() || ""} onValueChange={handleDeviceChange}>
            <SelectTrigger className="rounded-xl h-11">
              <SelectValue placeholder="Qurilmani tanlang" />
            </SelectTrigger>
            <SelectContent>
              {devices.map((d: any) => (
                <SelectItem key={d.id} value={d.id.toString()}>{d.deviceName} ({d.location})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="relative w-full rounded-3xl overflow-hidden bg-black shadow-2xl" style={{ minHeight: 420 }}>

          {/* Phase: No device selected */}
          {!deviceId && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-muted/80 z-10">
              <QrCode className="w-16 h-16 text-muted-foreground" />
              <p className="font-medium text-muted-foreground">Qurilmani tanlang</p>
            </div>
          )}

          {/* QR Scanner container - always rendered so scanner can attach */}
          <div
            id="qr-reader-div"
            className="w-full"
            style={{ display: isScanning ? "block" : "none", minHeight: 420 }}
          />

          {/* Phase: Selfie Preview */}
          {isSelfie && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                style={{ transform: "scaleX(-1)" }}
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 pointer-events-none">
                <div className="w-56 h-56 rounded-full border-4 border-white/80 shadow-2xl" />
                <div className="bg-black/60 backdrop-blur-md rounded-2xl px-8 py-4 text-center">
                  <p className="text-white text-sm font-medium mb-1">Selfie olinmoqda</p>
                  <p className="text-white text-6xl font-bold leading-none">{countdown}</p>
                </div>
              </div>
            </div>
          )}

          {/* Phase: Submitting */}
          {isSubmitting && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md gap-4">
              <Loader2 className="w-16 h-16 text-white animate-spin" />
              <p className="text-white text-lg font-medium">Qayd etilmoqda...</p>
            </div>
          )}

          {/* Phase: Result overlay */}
          {isResult && (
            <div className={`absolute inset-0 z-30 flex flex-col items-center justify-center gap-5 p-8 animate-in fade-in zoom-in duration-300
              ${phase === "success" ? "bg-green-500/95" : "bg-red-500/95"}`}>
              {phase === "success" ? (
                <>
                  {resultEmployee?.qrCode ? (
                    <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-white shadow-2xl bg-white">
                      <img src={resultEmployee.qrCode} alt="QR" className="w-full h-full object-contain" />
                    </div>
                  ) : (
                    <div className="w-28 h-28 rounded-full bg-white/20 border-4 border-white flex items-center justify-center">
                      <User className="w-14 h-14 text-white" />
                    </div>
                  )}
                  <CheckCircle2 className="w-16 h-16 text-white drop-shadow-lg" />
                  <div className="text-center">
                    <h2 className="text-3xl font-bold text-white drop-shadow-lg">{resultMsg}</h2>
                    <p className="text-white/80 text-lg mt-1">Muvaffaqiyatli qayd etildi</p>
                  </div>
                </>
              ) : (
                <>
                  <XCircle className="w-24 h-24 text-white drop-shadow-lg" />
                  <div className="text-center">
                    <h2 className="text-2xl font-bold text-white drop-shadow-lg">Xatolik</h2>
                    <p className="text-white/90 text-base mt-2">{resultMsg}</p>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Phase: Idle with device but not yet scanning */}
          {phase === "idle" && deviceId && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-muted/60 z-10">
              <Camera className="w-16 h-16 text-muted-foreground animate-pulse" />
              <p className="font-medium text-muted-foreground">Kamera ishga tushmoqda...</p>
            </div>
          )}
        </div>

        {/* Status indicator */}
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <span className={`w-2 h-2 rounded-full ${isScanning ? "bg-green-500 animate-pulse" : isSelfie ? "bg-blue-500 animate-pulse" : isSubmitting ? "bg-yellow-500 animate-pulse" : "bg-muted-foreground"}`} />
          {isScanning && "QR kod kutilmoqda..."}
          {isSelfie && `Selfie olinmoqda — ${countdown} soniya`}
          {isSubmitting && "Serverga yuborilmoqda..."}
          {phase === "success" && "✅ Muvaffaqiyatli"}
          {phase === "error" && "❌ Xatolik yuz berdi"}
          {phase === "idle" && "Tayyorlanmoqda..."}
        </div>

        {/* Hidden canvas for selfie capture */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </AppLayout>
  );
}
