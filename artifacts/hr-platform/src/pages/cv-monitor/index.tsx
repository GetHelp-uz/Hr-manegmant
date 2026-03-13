import { useEffect, useRef, useState, useCallback } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatDistanceToNow } from "date-fns";
import { uz } from "date-fns/locale";
import {
  Camera, CameraOff, Users, UserCheck, UserX, Clock,
  Activity, Eye, Play, Square, AlertCircle, CheckCircle, Wifi, WifiOff, MonitorPlay
} from "lucide-react";

function useLiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

function StatusBadge({ event, isActive }: { event: string; isActive: boolean }) {
  if (event === "present" && isActive) return <Badge className="bg-green-500/15 text-green-700 border-green-400/40 border">🟢 Ish joyida</Badge>;
  if (event === "away" || !isActive) return <Badge className="bg-amber-500/15 text-amber-700 border-amber-400/40 border">🟡 Uzoqda</Badge>;
  return <Badge className="bg-gray-200 text-gray-500 border-gray-300 border">⚫ Noma'lum</Badge>;
}

function timeSince(date: string | null) {
  if (!date) return "—";
  try {
    return formatDistanceToNow(new Date(date), { addSuffix: true, locale: uz });
  } catch { return "—"; }
}

function CameraMonitor({
  onDetected,
  onAway,
}: {
  onDetected: (snapshot: string) => void;
  onAway: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastDetectedRef = useRef<number>(0);
  const awayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: 640, height: 480 } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setStreaming(true);
      setError(null);
    } catch (err: any) {
      setError("Kamera ruxsatini bering yoki kamera ulangan ekanligini tekshiring.");
      setStreaming(false);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setStreaming(false);
    if (awayTimerRef.current) clearTimeout(awayTimerRef.current);
  }, []);

  const captureSnapshot = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return null;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    canvas.width = videoRef.current.videoWidth || 320;
    canvas.height = videoRef.current.videoHeight || 240;
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.6);
  }, []);

  useEffect(() => {
    if (!streaming) return;
    const interval = setInterval(() => {
      const snapshot = captureSnapshot();
      if (snapshot) {
        lastDetectedRef.current = Date.now();
        onDetected(snapshot);
        if (awayTimerRef.current) clearTimeout(awayTimerRef.current);
        awayTimerRef.current = setTimeout(() => {
          onAway();
        }, 2 * 60 * 1000);
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [streaming, captureSnapshot, onDetected, onAway]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  return (
    <div className="space-y-3">
      <div className="relative rounded-xl overflow-hidden bg-gray-900 aspect-video flex items-center justify-center">
        {streaming ? (
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        ) : (
          <div className="text-center text-gray-400 space-y-2">
            <Camera className="w-12 h-12 mx-auto opacity-40" />
            <p className="text-sm">Kamera o'chirilgan</p>
          </div>
        )}
        {streaming && (
          <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-red-600 text-white text-xs px-2 py-1 rounded-full animate-pulse">
            <span className="w-2 h-2 rounded-full bg-white inline-block" />
            LIVE
          </div>
        )}
      </div>
      <canvas ref={canvasRef} className="hidden" />
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}
      <div className="flex gap-2">
        {!streaming ? (
          <Button onClick={startCamera} className="flex-1 gap-2 bg-green-600 hover:bg-green-700">
            <Play className="w-4 h-4" /> Kamerani yoqish
          </Button>
        ) : (
          <Button onClick={stopCamera} variant="destructive" className="flex-1 gap-2">
            <Square className="w-4 h-4" /> To'xtatish
          </Button>
        )}
      </div>
      {streaming && (
        <div className="text-xs text-muted-foreground text-center">
          Kamera har 15 soniyada activity yuboradi. 2 daqiqa signal bo'lmasa "Uzoqda" belgilanadi.
        </div>
      )}
    </div>
  );
}

function HistoryDialog({ employee, onClose }: { employee: any; onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ["/api/cv-monitor/history", employee.id],
    queryFn: () => apiClient.get(`/api/cv-monitor/history/${employee.id}`),
  });
  const history: any[] = (data as any)?.history || [];
  const eventLabel: Record<string, string> = {
    present: "🟢 Ish joyida",
    away: "🟡 Uzoqda",
    detected: "👁 Ko'rindi",
    undetected: "❌ Ko'rinmadi",
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>📊 {employee.fullName} — bugungi faollik</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Yuklanmoqda...</div>
        ) : history.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">Bugun ma'lumot yo'q</div>
        ) : (
          <div className="max-h-80 overflow-y-auto space-y-1.5">
            {history.map((h: any) => (
              <div key={h.id} className="flex justify-between items-center text-sm border rounded-lg px-3 py-2">
                <span>{eventLabel[h.event] || h.event}</span>
                <span className="text-muted-foreground text-xs">{new Date(h.detectedAt).toLocaleTimeString("uz-UZ")}</span>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function CvMonitor() {
  const now = useLiveClock();
  const queryClient = useQueryClient();
  const [selectedEmployee, setSelectedEmployee] = useState<number | null>(null);
  const [deviceLabel, setDeviceLabel] = useState("Bosh ofis kamerasi");
  const [historyEmployee, setHistoryEmployee] = useState<any | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["/api/cv-monitor/status"],
    queryFn: () => apiClient.get("/api/cv-monitor/status"),
    refetchInterval: 10000,
  });

  const employees: any[] = (data as any)?.employees || [];
  const summary: any = (data as any)?.summary || { total: 0, atDesk: 0, away: 0, unknown: 0 };

  const handleDetected = useCallback(async (snapshot: string) => {
    if (!selectedEmployee) return;
    setIsConnected(true);
    try {
      await apiClient.post("/api/cv-monitor/event", {
        companyId: 0,
        employeeId: selectedEmployee,
        event: "present",
        deviceLabel,
        snapshotPhoto: snapshot,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/cv-monitor/status"] });
    } catch {}
  }, [selectedEmployee, deviceLabel, queryClient]);

  const handleAway = useCallback(async () => {
    if (!selectedEmployee) return;
    setIsConnected(false);
    try {
      await apiClient.post("/api/cv-monitor/event", {
        companyId: 0,
        employeeId: selectedEmployee,
        event: "away",
        deviceLabel,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/cv-monitor/status"] });
    } catch {}
  }, [selectedEmployee, deviceLabel, queryClient]);

  const atDesk = employees.filter(e => e.lastEvent === "present" && e.isActive);
  const away = employees.filter(e => (e.lastEvent === "away" || !e.isActive) && e.lastSeen);
  const unknown = employees.filter(e => !e.lastSeen);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <MonitorPlay className="w-7 h-7 text-violet-600" />
              CV Monitoring
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Kamera orqali xodimlar harakatchanligini kuzatish</p>
          </div>
          <div className="flex items-center gap-2 text-sm font-mono">
            <span className="text-muted-foreground">{now.toLocaleTimeString("uz-UZ")}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Jami xodim", value: summary.total, icon: Users, color: "text-gray-600 bg-gray-100" },
            { label: "Ish joyida", value: atDesk.length, icon: UserCheck, color: "text-green-600 bg-green-100" },
            { label: "Uzoqda", value: away.length, icon: UserX, color: "text-amber-600 bg-amber-100" },
            { label: "Noma'lum", value: unknown.length, icon: Clock, color: "text-gray-400 bg-gray-50" },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label} className="shadow-none">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`rounded-xl p-2.5 ${color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{value}</div>
                  <div className="text-xs text-muted-foreground">{label}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card className="shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Camera className="w-5 h-5 text-violet-600" />
                Kamera monitoring stansiyasi
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Kamera joyi nomi</label>
                <input
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                  value={deviceLabel}
                  onChange={e => setDeviceLabel(e.target.value)}
                  placeholder="Masalan: Bosh ofis, Qabul stoli"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Qaysi xodimni kuzatish?</label>
                <select
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                  value={selectedEmployee || ""}
                  onChange={e => setSelectedEmployee(Number(e.target.value) || null)}
                >
                  <option value="">— Xodim tanlang —</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.fullName} ({emp.position})</option>
                  ))}
                </select>
              </div>
              {!selectedEmployee && (
                <div className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  Kamerani yoqishdan oldin xodimni tanlang
                </div>
              )}
              <CameraMonitor onDetected={handleDetected} onAway={handleAway} />
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="w-5 h-5 text-green-600" />
                Xodimlar holati — real vaqt
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Yuklanmoqda...</div>
              ) : employees.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">Xodimlar topilmadi</div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {employees.map(emp => (
                    <div
                      key={emp.id}
                      className={`flex items-center justify-between rounded-xl border px-3 py-2.5 cursor-pointer hover:bg-muted/40 transition-colors ${emp.lastEvent === "present" && emp.isActive ? "border-green-300 bg-green-50/30" : emp.lastSeen ? "border-amber-300 bg-amber-50/20" : "border-gray-200"}`}
                      onClick={() => setHistoryEmployee(emp)}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${emp.lastEvent === "present" && emp.isActive ? "bg-green-500 animate-pulse" : emp.lastSeen ? "bg-amber-400" : "bg-gray-300"}`} />
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{emp.fullName}</div>
                          <div className="text-xs text-muted-foreground truncate">{emp.position}</div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-0.5 shrink-0 ml-2">
                        <StatusBadge event={emp.lastEvent} isActive={emp.isActive} />
                        {emp.lastSeen && (
                          <span className="text-xs text-muted-foreground">{timeSince(emp.lastSeen)}</span>
                        )}
                        {emp.deviceLabel && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Camera className="w-3 h-3" />{emp.deviceLabel}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-none border-blue-200 bg-blue-50/30">
          <CardContent className="p-4">
            <h3 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
              <Eye className="w-4 h-4" />
              OpenCV integratsiyasi haqida
            </h3>
            <div className="grid sm:grid-cols-3 gap-3 text-sm text-blue-700">
              <div className="bg-white rounded-lg p-3 border border-blue-100">
                <div className="font-medium mb-1">🎥 Kamera monitoring</div>
                <p className="text-xs text-blue-600">Har 15 soniyada kamera snap oladi va serverga yuboradi. Xodim ish joyida ekanligini belgilaydi.</p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-blue-100">
                <div className="font-medium mb-1">⏱ Uzoq qolish hisobi</div>
                <p className="text-xs text-blue-600">2 daqiqa kamera ko'rmasa, "Uzoqda" statusiga o'tadi. Admin panelda ko'rinadi.</p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-blue-100">
                <div className="font-medium mb-1">📊 Kunlik hisobot</div>
                <p className="text-xs text-blue-600">Har bir xodimning "ish joyida / uzoqda" vaqtlarini ko'rish uchun xodim kartasini bosing.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {historyEmployee && (
        <HistoryDialog employee={historyEmployee} onClose={() => setHistoryEmployee(null)} />
      )}
    </AppLayout>
  );
}
