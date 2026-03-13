import { useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { format } from "date-fns";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { User, LogIn, LogOut, AlertTriangle, Search, Camera, ExternalLink } from "lucide-react";
import { useLocation } from "wouter";

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  present: { label: "Keldi", color: "bg-green-500/10 text-green-600" },
  late: { label: "Kechikdi", color: "bg-amber-500/10 text-amber-600" },
  absent: { label: "Kelmadi", color: "bg-red-500/10 text-red-600" },
};

export default function Attendance() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setDate(1); return d.toISOString().split("T")[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split("T")[0]);
  const [selectedPhoto, setSelectedPhoto] = useState<{ src: string; name: string; time: string } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["/api/attendance", dateFrom, dateTo],
    queryFn: () => apiClient.get(`/api/attendance?date_from=${dateFrom}&date_to=${dateTo}&limit=200`),
  });

  const records: any[] = ((data as any)?.data || []).filter((r: any) => {
    if (!search) return true;
    return r.employee?.fullName?.toLowerCase().includes(search.toLowerCase());
  });

  const withSelfie = records.filter((r: any) => r.selfiePhoto).length;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold">Davomat</h1>
            <p className="text-muted-foreground text-sm">Xodimlar keldi/ketdi jurnali • {withSelfie > 0 && `${withSelfie} ta rasm mavjud`}</p>
          </div>
          <Button
            variant="outline"
            className="gap-2 rounded-xl"
            onClick={() => navigate("/monitor")}
          >
            <ExternalLink className="w-4 h-4" /> Real-time Monitor
          </Button>
        </div>

        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Ism bo'yicha qidirish..."
              className="pl-9 rounded-xl h-10"
            />
          </div>
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="rounded-xl h-10 w-40" />
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="rounded-xl h-10 w-40" />
        </div>

        {/* Stats row */}
        {!isLoading && records.length > 0 && (
          <div className="flex gap-3 flex-wrap">
            <Badge className="bg-green-500/10 text-green-600 border border-green-200 px-3 py-1">
              ✅ Keldi: {records.filter(r => r.status === "present").length}
            </Badge>
            <Badge className="bg-amber-500/10 text-amber-600 border border-amber-200 px-3 py-1">
              ⚠️ Kechikdi: {records.filter(r => r.status === "late").length}
            </Badge>
            <Badge className="bg-blue-500/10 text-blue-600 border border-blue-200 px-3 py-1">
              🏁 Ketdi: {records.filter(r => r.checkOut).length}
            </Badge>
            <Badge className="bg-purple-500/10 text-purple-600 border border-purple-200 px-3 py-1">
              📸 Rasmi bor: {withSelfie}
            </Badge>
          </div>
        )}

        {/* Table */}
        <Card className="rounded-2xl border-border/50 shadow-sm overflow-hidden bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-semibold">
                <tr>
                  <th className="px-4 py-3 w-14">Rasm</th>
                  <th className="px-4 py-3">Sana</th>
                  <th className="px-4 py-3">Xodim</th>
                  <th className="px-4 py-3">Holat</th>
                  <th className="px-4 py-3">Keldi</th>
                  <th className="px-4 py-3">Ketdi</th>
                  <th className="px-4 py-3 text-right">Soat</th>
                  <th className="px-4 py-3 text-right">Kechikish</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {isLoading ? (
                  <tr><td colSpan={8} className="px-6 py-8 text-center text-muted-foreground">Yuklanmoqda...</td></tr>
                ) : records.length === 0 ? (
                  <tr><td colSpan={8} className="px-6 py-12 text-center text-muted-foreground">Ma'lumot topilmadi</td></tr>
                ) : (
                  records.map((record: any) => {
                    const st = STATUS_MAP[record.status] || STATUS_MAP.present;
                    return (
                      <tr key={record.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-2">
                          {record.selfiePhoto ? (
                            <button
                              onClick={() => setSelectedPhoto({
                                src: record.selfiePhoto,
                                name: record.employee?.fullName || "Xodim",
                                time: record.checkIn ? format(new Date(record.checkIn), "HH:mm dd.MM") : "",
                              })}
                              className="w-10 h-10 rounded-xl overflow-hidden ring-2 ring-primary/20 hover:ring-primary/60 transition-all"
                            >
                              <img src={record.selfiePhoto} alt="" className="w-full h-full object-cover" />
                            </button>
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                              <User className="w-4 h-4 text-muted-foreground/50" />
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-muted-foreground text-xs">
                          {format(new Date(record.createdAt), "dd.MM.yyyy")}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-foreground leading-tight">{record.employee?.fullName || "—"}</div>
                          <div className="text-xs text-muted-foreground">{record.employee?.position}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${st.color}`}>{st.label}</span>
                        </td>
                        <td className="px-4 py-3">
                          {record.checkIn ? (
                            <div className="flex items-center gap-1.5 text-green-600">
                              <LogIn className="w-3.5 h-3.5" />
                              <span className="font-mono text-sm font-semibold">{format(new Date(record.checkIn), "HH:mm")}</span>
                            </div>
                          ) : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          {record.checkOut ? (
                            <div className="flex items-center gap-1.5 text-blue-500">
                              <LogOut className="w-3.5 h-3.5" />
                              <span className="font-mono text-sm font-semibold">{format(new Date(record.checkOut), "HH:mm")}</span>
                            </div>
                          ) : <span className="text-muted-foreground text-xs">Hali ketmagan</span>}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold">
                          {record.workHours ? `${Number(record.workHours).toFixed(1)}h` : "—"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {record.lateMinutes > 0 ? (
                            <div className="flex items-center justify-end gap-1 text-amber-500">
                              <AlertTriangle className="w-3 h-3" />
                              <span className="text-xs font-medium">{record.lateMinutes} daq</span>
                            </div>
                          ) : <span className="text-muted-foreground text-xs">—</span>}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Photo dialog */}
      <Dialog open={!!selectedPhoto} onOpenChange={o => !o && setSelectedPhoto(null)}>
        <DialogContent className="max-w-sm p-0 rounded-2xl overflow-hidden">
          {selectedPhoto && (
            <div className="relative">
              <img src={selectedPhoto.src} alt={selectedPhoto.name} className="w-full object-cover max-h-[70vh]" />
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                <p className="text-white font-bold">{selectedPhoto.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Camera className="w-3.5 h-3.5 text-white/70" />
                  <p className="text-white/80 text-sm">{selectedPhoto.time}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
