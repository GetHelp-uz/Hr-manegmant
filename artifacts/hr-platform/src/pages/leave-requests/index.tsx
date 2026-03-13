import { useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { CalendarDays, CheckCircle, XCircle, Clock, Filter, MessageSquare } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { format } from "date-fns";

async function fetchLeaves() {
  const r = await apiClient.get("/api/leave-requests");
  return r.data as any[];
}
async function updateStatus(id: number, status: string, adminNote: string) {
  const r = await apiClient.put(`/api/leave-requests/${id}/status`, { status, adminNote });
  return r.data;
}

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  vacation: { label: "Ta'til", color: "bg-blue-500/10 text-blue-500" },
  sick: { label: "Kasallik", color: "bg-amber-500/10 text-amber-600" },
  other: { label: "Boshqa", color: "bg-gray-500/10 text-gray-500" },
};
const STATUS_LABELS: Record<string, { label: string; icon: any; color: string }> = {
  pending: { label: "Kutilmoqda", icon: Clock, color: "text-amber-500" },
  approved: { label: "Tasdiqlandi", icon: CheckCircle, color: "text-green-500" },
  rejected: { label: "Rad etildi", icon: XCircle, color: "text-red-500" },
};

export default function LeaveRequests() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [actionId, setActionId] = useState<number | null>(null);
  const [actionType, setActionType] = useState<"approved" | "rejected">("approved");
  const [adminNote, setAdminNote] = useState("");

  const { data: leaves = [], isLoading } = useQuery({ queryKey: ["/api/leave-requests"], queryFn: fetchLeaves });

  const statusM = useMutation({
    mutationFn: ({ id, status, note }: any) => updateStatus(id, status, note),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/leave-requests"] });
      setActionId(null);
      setAdminNote("");
      toast({ title: "Holat yangilandi. Xodimga Telegram xabari yuborildi." });
    },
    onError: () => toast({ variant: "destructive", title: "Xatolik" }),
  });

  const filtered = filter === "all" ? leaves : leaves.filter((l: any) => l.status === filter);
  const pendingCount = leaves.filter((l: any) => l.status === "pending").length;

  function openAction(id: number, type: "approved" | "rejected") {
    setActionId(id);
    setActionType(type);
    setAdminNote("");
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <CalendarDays className="w-6 h-6 text-blue-500" /> Ta'til va Ruxsat So'rovlari
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Xodimlar Telegram orqali yuborgan so'rovlar
              {pendingCount > 0 && <span className="ml-2 px-2 py-0.5 bg-amber-500 text-white text-xs rounded-full">{pendingCount} yangi</span>}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {(["all", "pending", "approved", "rejected"] as const).map(s => (
              <Button key={s} size="sm" variant={filter === s ? "default" : "outline"} onClick={() => setFilter(s)}>
                {s === "all" ? "Barchasi" : STATUS_LABELS[s]?.label}
              </Button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 border border-dashed rounded-xl text-muted-foreground">
            <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">So'rovlar yo'q</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((req: any) => {
              const st = STATUS_LABELS[req.status] || STATUS_LABELS.pending;
              const tp = TYPE_LABELS[req.type] || TYPE_LABELS.other;
              const St = st.icon;
              return (
                <div key={req.id} className="bg-card border border-border rounded-xl p-5 flex items-start justify-between gap-4 flex-wrap">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-base">{req.employee?.fullName || "—"}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${tp.color}`}>{tp.label}</span>
                      <span className={`flex items-center gap-1 text-xs font-medium ${st.color}`}>
                        <St className="w-3.5 h-3.5" />{st.label}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      📅 {req.startDate} — {req.endDate} &nbsp;•&nbsp; {req.days} kun
                    </p>
                    {req.reason && <p className="text-sm">📝 {req.reason}</p>}
                    {req.adminNote && <p className="text-sm text-blue-500">💬 Admin: {req.adminNote}</p>}
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(req.createdAt), "dd.MM.yyyy HH:mm")} da yuborildi
                    </p>
                  </div>
                  {req.status === "pending" && (
                    <div className="flex gap-2 flex-shrink-0">
                      <Button size="sm" className="bg-green-600 hover:bg-green-500 gap-1" onClick={() => openAction(req.id, "approved")}>
                        <CheckCircle className="w-3.5 h-3.5" /> Tasdiqlash
                      </Button>
                      <Button size="sm" variant="outline" className="border-red-500/30 text-red-500 hover:bg-red-500/10 gap-1" onClick={() => openAction(req.id, "rejected")}>
                        <XCircle className="w-3.5 h-3.5" /> Rad etish
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={actionId !== null} onOpenChange={v => { if (!v) setActionId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{actionType === "approved" ? "✅ Tasdiqlash" : "❌ Rad etish"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-muted-foreground text-sm">Xodimga Telegram orqali bildirishnoma yuboriladi.</p>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5"><MessageSquare className="w-4 h-4" /> Izoh (ixtiyoriy)</Label>
              <Textarea
                value={adminNote}
                onChange={e => setAdminNote(e.target.value)}
                placeholder="Xodimga xabar..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionId(null)}>Bekor</Button>
            <Button
              onClick={() => statusM.mutate({ id: actionId, status: actionType, note: adminNote })}
              disabled={statusM.isPending}
              className={actionType === "approved" ? "bg-green-600 hover:bg-green-500" : "bg-red-600 hover:bg-red-500"}
            >
              {statusM.isPending ? "..." : actionType === "approved" ? "Tasdiqlash" : "Rad etish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
