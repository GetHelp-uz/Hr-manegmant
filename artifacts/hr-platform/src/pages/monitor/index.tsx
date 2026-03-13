import { useEffect, useState, useRef } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { format } from "date-fns";
import { User, Clock, LogIn, LogOut, AlertTriangle, RefreshCw, MonitorPlay } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";

function useLiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; border: string; icon: any }> = {
  present: { label: "Keldi", color: "bg-green-500/15 text-green-600", border: "border-green-400/40", icon: LogIn },
  late: { label: "Kechikdi", color: "bg-amber-500/15 text-amber-600", border: "border-amber-400/40", icon: AlertTriangle },
  checked_out: { label: "Ketdi", color: "bg-blue-500/15 text-blue-500", border: "border-blue-400/40", icon: LogOut },
};

export default function Monitor() {
  const now = useLiveClock();
  const [selectedPhoto, setSelectedPhoto] = useState<{ src: string; name: string } | null>(null);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["/api/attendance/today"],
    queryFn: () => apiClient.get("/api/attendance/today"),
    refetchInterval: 15000,
  });

  useEffect(() => {
    setLastUpdate(new Date());
  }, [data]);

  const records: any[] = (data as any)?.data || [];
  const presentCount = records.filter((r: any) => r.status === "present" || r.status === "late").length;
  const lateCount = records.filter((r: any) => r.status === "late").length;
  const checkedOutCount = records.filter((r: any) => r.checkOut).length;
  const withSelfie = records.filter((r: any) => r.selfiePhoto).length;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <MonitorPlay className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold">Davomat Nazorati</h1>
              <p className="text-sm text-muted-foreground">
                {format(now, "dd MMMM yyyy")} — <span className="font-mono font-semibold text-foreground">{format(now, "HH:mm:ss")}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex gap-2">
              <Badge className="bg-green-500/10 text-green-600 border border-green-200 px-3 py-1">
                ✅ Keldi: {presentCount}
              </Badge>
              <Badge className="bg-amber-500/10 text-amber-600 border border-amber-200 px-3 py-1">
                ⚠️ Kechikdi: {lateCount}
              </Badge>
              <Badge className="bg-blue-500/10 text-blue-600 border border-blue-200 px-3 py-1">
                🏁 Ketdi: {checkedOutCount}
              </Badge>
              <Badge className="bg-purple-500/10 text-purple-600 border border-purple-200 px-3 py-1">
                📸 Rasmi: {withSelfie}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <RefreshCw className="w-3 h-3" />
              <span>Yangilandi: {format(lastUpdate, "HH:mm:ss")}</span>
              <Button size="sm" variant="outline" className="h-7 px-2 rounded-lg text-xs" onClick={() => refetch()}>
                Yangilash
              </Button>
            </div>
          </div>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : records.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-muted-foreground">
            <Clock className="w-16 h-16 opacity-20" />
            <p className="text-lg font-medium">Bugun hali davomat yo'q</p>
            <p className="text-sm">QR scanner orqali xodimlar skanerlashi kerak</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {records.map((record: any) => {
              const status = record.checkOut ? "checked_out" : record.status;
              const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.present;
              const Icon = cfg.icon;
              const emp = record.employee;
              const hasPhoto = !!record.selfiePhoto;

              return (
                <div
                  key={record.id}
                  className={`relative rounded-2xl border-2 ${cfg.border} bg-card overflow-hidden flex flex-col shadow-sm hover:shadow-md transition-all cursor-pointer group`}
                  onClick={() => hasPhoto && setSelectedPhoto({ src: record.selfiePhoto, name: emp?.fullName || "Xodim" })}
                >
                  {/* Photo or Avatar */}
                  <div className="relative aspect-square bg-muted overflow-hidden">
                    {hasPhoto ? (
                      <img
                        src={record.selfiePhoto}
                        alt={emp?.fullName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <User className="w-12 h-12 text-muted-foreground/40" />
                      </div>
                    )}
                    {/* Status badge overlay */}
                    <div className={`absolute bottom-1 left-1 inline-flex items-center gap-1 text-xs font-semibold px-1.5 py-0.5 rounded-full ${cfg.color} backdrop-blur-sm`}>
                      <Icon className="w-2.5 h-2.5" />
                      {cfg.label}
                    </div>
                    {/* Enlarge hint */}
                    {hasPhoto && (
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <span className="text-white text-xs font-medium bg-black/50 rounded-lg px-2 py-1">Kattalashtirish</span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-2 flex flex-col gap-0.5">
                    <p className="font-semibold text-xs truncate leading-tight">{emp?.fullName || "—"}</p>
                    <p className="text-xs text-muted-foreground truncate">{emp?.position || "—"}</p>
                    <div className="flex flex-col gap-0.5 mt-1">
                      {record.checkIn && (
                        <div className="flex items-center gap-1 text-xs text-green-600">
                          <LogIn className="w-2.5 h-2.5 flex-shrink-0" />
                          <span className="font-mono">{format(new Date(record.checkIn), "HH:mm")}</span>
                          {record.lateMinutes > 0 && (
                            <span className="text-amber-500 text-xs">+{record.lateMinutes}d</span>
                          )}
                        </div>
                      )}
                      {record.checkOut && (
                        <div className="flex items-center gap-1 text-xs text-blue-500">
                          <LogOut className="w-2.5 h-2.5 flex-shrink-0" />
                          <span className="font-mono">{format(new Date(record.checkOut), "HH:mm")}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Auto-refresh indicator */}
        <div className="text-center text-xs text-muted-foreground/60">
          Sahifa har 15 soniyada avtomatik yangilanadi
        </div>
      </div>

      {/* Photo fullscreen dialog */}
      <Dialog open={!!selectedPhoto} onOpenChange={(o) => !o && setSelectedPhoto(null)}>
        <DialogContent className="max-w-lg p-0 overflow-hidden rounded-2xl">
          {selectedPhoto && (
            <div className="relative">
              <img src={selectedPhoto.src} alt={selectedPhoto.name} className="w-full object-contain max-h-[80vh]" />
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                <p className="text-white font-bold text-lg">{selectedPhoto.name}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
