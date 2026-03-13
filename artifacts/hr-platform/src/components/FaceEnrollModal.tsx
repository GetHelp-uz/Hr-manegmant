import { useEffect, useRef, useState, useCallback } from "react";
import { apiClient } from "@/lib/api-client";
import { loadFaceModels, detectFaceDescriptor, DETECTOR_OPTIONS } from "@/lib/face-recognition";
import * as faceapi from "face-api.js";

interface Props {
  employee: { id: number; fullName: string; hasFace?: boolean };
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type Step = "loading" | "ready" | "detecting" | "captured" | "saving" | "done" | "error";

export default function FaceEnrollModal({ employee, open, onClose, onSuccess }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectionLoopRef = useRef<any>(null);

  const [step, setStep] = useState<Step>("loading");
  const [message, setMessage] = useState("Modellar yuklanmoqda...");
  const [faceCount, setFaceCount] = useState(0);
  const [capturedDescriptor, setCapturedDescriptor] = useState<Float32Array | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    clearInterval(detectionLoopRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setStep("detecting");
      setMessage("Yuzingizni kameraga qarating...");
    } catch {
      setStep("error");
      setMessage("Kamera ochilmadi. Ruxsat bering.");
    }
  }, []);

  const runDetectionLoop = useCallback(() => {
    detectionLoopRef.current = setInterval(async () => {
      if (!videoRef.current || !overlayRef.current) return;
      const video = videoRef.current;
      if (video.readyState < 2) return;

      try {
        const detections = await faceapi
          .detectAllFaces(video, DETECTOR_OPTIONS)
          .withFaceLandmarks(true)
          .withFaceDescriptors();

        const overlay = overlayRef.current;
        const ctx = overlay.getContext("2d");
        if (!ctx) return;

        overlay.width = video.videoWidth || 640;
        overlay.height = video.videoHeight || 480;
        ctx.clearRect(0, 0, overlay.width, overlay.height);

        setFaceCount(detections.length);

        if (detections.length === 1) {
          const box = detections[0].detection.box;
          ctx.strokeStyle = "#10b981";
          ctx.lineWidth = 3;

          const pad = 20;
          const bx = box.x - pad, by = box.y - pad;
          const bw = box.width + pad * 2, bh = box.height + pad * 2;

          const r = 15;
          ctx.beginPath();
          ctx.moveTo(bx + r, by); ctx.lineTo(bx + bw - r, by);
          ctx.arcTo(bx + bw, by, bx + bw, by + r, r);
          ctx.lineTo(bx + bw, by + bh - r);
          ctx.arcTo(bx + bw, by + bh, bx + bw - r, by + bh, r);
          ctx.lineTo(bx + r, by + bh);
          ctx.arcTo(bx, by + bh, bx, by + bh - r, r);
          ctx.lineTo(bx, by + r);
          ctx.arcTo(bx, by, bx + r, by, r);
          ctx.closePath();
          ctx.stroke();

          setMessage("Yuz aniqlandi! Surat olish uchun tugmani bosing");
        } else if (detections.length > 1) {
          ctx.strokeStyle = "#f59e0b";
          ctx.lineWidth = 2;
          detections.forEach((d) => {
            const b = d.detection.box;
            ctx.strokeRect(b.x, b.y, b.width, b.height);
          });
          setMessage(`${detections.length} ta yuz aniqlandi — faqat bitta kishi bo'lsin`);
        } else {
          setMessage("Yuzingizni kameraga qarating...");
        }
      } catch {}
    }, 300);
  }, []);

  const captureFace = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;

    clearInterval(detectionLoopRef.current);

    const detection = await faceapi
      .detectSingleFace(video, DETECTOR_OPTIONS)
      .withFaceLandmarks(true)
      .withFaceDescriptor();

    if (!detection) {
      setMessage("Yuz aniqlanmadi. Qayta urinib ko'ring.");
      setStep("detecting");
      runDetectionLoop();
      return;
    }

    const c = canvasRef.current;
    c.width = video.videoWidth;
    c.height = video.videoHeight;
    const ctx = c.getContext("2d");
    if (ctx) {
      ctx.save();
      ctx.translate(c.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0);
      ctx.restore();
    }
    const photo = c.toDataURL("image/jpeg", 0.8);

    setCapturedDescriptor(detection.descriptor);
    setCapturedPhoto(photo);
    setStep("captured");
    setMessage("Yuz muvaffaqiyatli olindi!");
    stopCamera();
  }, [runDetectionLoop, stopCamera]);

  const saveDescriptor = useCallback(async () => {
    if (!capturedDescriptor) return;
    setStep("saving");
    setMessage("Saqlanmoqda...");
    try {
      await apiClient.post(`/api/employees/${employee.id}/enroll-face`, {
        descriptor: Array.from(capturedDescriptor),
      });
      setStep("done");
      setMessage("Yuz muvaffaqiyatli ro'yxatdan o'tkazildi!");
      setTimeout(() => { onSuccess(); onClose(); }, 1500);
    } catch (err: any) {
      setStep("error");
      setMessage(err?.message || "Xatolik yuz berdi");
    }
  }, [capturedDescriptor, employee.id, onSuccess, onClose]);

  const retake = useCallback(() => {
    setCapturedDescriptor(null);
    setCapturedPhoto(null);
    setStep("detecting");
    setMessage("Yuzingizni kameraga qarating...");
    startCamera().then(() => runDetectionLoop());
  }, [startCamera, runDetectionLoop]);

  useEffect(() => {
    if (!open) return;
    setStep("loading");
    setMessage("Modellar yuklanmoqda...");
    setCapturedDescriptor(null);
    setCapturedPhoto(null);

    loadFaceModels()
      .then(() => {
        setStep("ready");
        setMessage("Kamera ishga tushirilmoqda...");
        return startCamera();
      })
      .then(() => runDetectionLoop())
      .catch(() => { setStep("error"); setMessage("Modellar yuklanmadi"); });

    return () => { stopCamera(); };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="font-bold text-lg">Yuz ro'yxatdan o'tkazish</h2>
            <p className="text-sm text-muted-foreground">{employee.fullName}</p>
          </div>
          <button onClick={() => { stopCamera(); onClose(); }}
            className="w-8 h-8 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center text-muted-foreground transition-colors">
            ✕
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="relative rounded-2xl overflow-hidden bg-black aspect-video">
            {step === "loading" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                <p className="text-white/70 text-sm">Yuklanmoqda...</p>
              </div>
            )}

            {(step === "detecting" || step === "ready") && (
              <>
                <video
                  ref={videoRef}
                  autoPlay playsInline muted
                  className="w-full h-full object-cover"
                  style={{ transform: "scaleX(-1)" }}
                />
                <canvas
                  ref={overlayRef}
                  className="absolute inset-0 w-full h-full"
                  style={{ transform: "scaleX(-1)" }}
                />
                <div className="absolute bottom-3 left-0 right-0 flex justify-center">
                  <div className={`px-3 py-1.5 rounded-full text-xs font-medium backdrop-blur-sm ${faceCount === 1 ? "bg-emerald-500/80 text-white" : "bg-black/60 text-white/80"}`}>
                    {faceCount === 1 ? "✓ Yuz aniqlandi" : faceCount > 1 ? `${faceCount} ta yuz` : "Yuz kutilmoqda..."}
                  </div>
                </div>
              </>
            )}

            {step === "captured" && capturedPhoto && (
              <div className="relative w-full h-full">
                <img src={capturedPhoto} alt="captured" className="w-full h-full object-cover" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center shadow-2xl">
                    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" className="w-8 h-8">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
              </div>
            )}

            {step === "done" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-emerald-500/20">
                <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" className="w-8 h-8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-emerald-400 font-semibold">Saqlandi!</p>
              </div>
            )}

            {step === "error" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center">
                  <span className="text-3xl">⚠️</span>
                </div>
                <p className="text-red-400 text-sm text-center px-4">{message}</p>
              </div>
            )}

            <canvas ref={canvasRef} className="hidden" />
          </div>

          <p className="text-sm text-muted-foreground text-center">{message}</p>

          <div className="flex gap-3">
            {step === "detecting" && faceCount === 1 && (
              <button onClick={captureFace}
                className="flex-1 h-11 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-semibold transition-colors">
                📸 Surat olish
              </button>
            )}
            {step === "captured" && (
              <>
                <button onClick={retake}
                  className="flex-1 h-11 border border-border hover:bg-muted rounded-xl font-medium transition-colors">
                  🔄 Qaytadan
                </button>
                <button onClick={saveDescriptor}
                  className="flex-1 h-11 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold transition-colors">
                  ✅ Saqlash
                </button>
              </>
            )}
            {step === "saving" && (
              <div className="flex-1 h-11 bg-muted rounded-xl flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                <span className="text-sm text-muted-foreground">Saqlanmoqda...</span>
              </div>
            )}
            {step === "error" && (
              <button onClick={retake}
                className="flex-1 h-11 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-semibold transition-colors">
                Qayta urinish
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
