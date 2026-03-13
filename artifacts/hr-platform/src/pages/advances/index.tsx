import { useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, CheckCircle, XCircle, Clock, User } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { format } from "date-fns";

async function fetchAdvances(status: string) {
  const q = status !== "all" ? `?status=${status}` : "";
  const r = await apiClient.get(`/api/advances${q}`);
  return (r.data as any[]) || [];
}

const STATUS_MAP: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: "Kutilmoqda", color: "bg-amber-50 text-amber-600 border-amber-200", icon: Clock },
  approved: { label: "Tasdiqlandi", color: "bg-green-50 text-green-600 border-green-200", icon: CheckCircle },
  rejected: { label: "Rad etildi", color: "bg-red-50 text-red-600 border-red-200", icon: XCircle },
};

export default function Advances() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [selected, setSelected] = useState<any | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [action, setAction] = useState<"approved" | "rejected">("approved");

  const { data: advances = [], isLoading } = useQuery({
    queryKey: ["/api/advances", filter],
    queryFn: () => fetchAdvances(filter),
  });

  const reviewM = useMutation({
    mutationFn: ({ id, status, note }: any) => apiClient.patch(`/api/advances/${id}`, { status, adminNote: note }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/advances"] });
      setSelected(null);
      setAdminNote("");
      toast({ title: action === "approved" ? "✅ Tasdiqlandi" : "❌ Rad etildi" });
    },
    onError: () => toast({ title: "Xatolik", variant: "destructive" }),
  });

  const openAction = (item: any, type: "approved" | "rejected") => {
    setSelected(item);
    setAction(type);
    setAdminNote("");
  };

  const pendingCount = (advances as any[]).filter((a: any) => a.status === "pending").length;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold">Avans So'rovlari</h1>
            <p className="text-muted-foreground text-sm">Xodimlarning avans so'rovlarini boshqaring</p>
          </div>
          {pendingCount > 0 && (
            <Badge className="bg-amber-500 text-white text-base px-3 py-1">{pendingCount} yangi</Badge>
          )}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 flex-wrap">
          {(["all", "pending", "approved", "rejected"] as const).map(f => (
            <Button
              key={f}
              size="sm"
              variant={filter === f ? "default" : "outline"}
              className="rounded-full text-xs"
              onClick={() => setFilter(f)}
            >
              {f === "all" ? "Barchasi" : STATUS_MAP[f].label}
            </Button>
          ))}
        </div>

        {/* List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-24 bg-muted rounded-2xl animate-pulse" />)}
          </div>
        ) : (advances as any[]).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-4">
            <DollarSign className="w-12 h-12 opacity-30" />
            <p>So'rovlar mavjud emas</p>
          </div>
        ) : (
          <div className="space-y-3">
            {(advances as any[]).map((item: any) => {
              const st = STATUS_MAP[item.status] || STATUS_MAP.pending;
              const Icon = st.icon;
              return (
                <div key={item.id} className="bg-card border border-border/60 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{item.employee?.fullName || "—"}</p>
                      <p className="text-xs text-muted-foreground truncate">{item.employee?.position}</p>
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-lg font-bold text-primary">{Number(item.amount).toLocaleString()} so'm</p>
                    <p className="text-sm text-muted-foreground line-clamp-1">{item.reason}</p>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border ${st.color}`}>
                        <Icon className="w-3 h-3" />
                        {st.label}
                      </span>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(item.createdAt), "dd.MM.yyyy HH:mm")}
                      </p>
                    </div>

                    {item.status === "pending" && (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          className="rounded-xl bg-green-500 hover:bg-green-600 text-white h-9 px-3 text-xs"
                          onClick={() => openAction(item, "approved")}
                        >
                          <CheckCircle className="w-3.5 h-3.5 mr-1" /> Tasdiqlash
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="rounded-xl h-9 px-3 text-xs"
                          onClick={() => openAction(item, "rejected")}
                        >
                          <XCircle className="w-3.5 h-3.5 mr-1" /> Rad
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Confirm Dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {action === "approved" ? <CheckCircle className="w-5 h-5 text-green-500" /> : <XCircle className="w-5 h-5 text-red-500" />}
              {action === "approved" ? "Avansni tasdiqlash" : "Avansni rad etish"}
            </DialogTitle>
          </DialogHeader>

          {selected && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-xl p-3 space-y-1">
                <p className="font-semibold">{selected.employee?.fullName}</p>
                <p className="text-primary font-bold text-lg">{Number(selected.amount).toLocaleString()} so'm</p>
                <p className="text-sm text-muted-foreground">{selected.reason}</p>
              </div>
              <div className="space-y-1.5">
                <Label>Admin izohi (ixtiyoriy)</Label>
                <Textarea
                  value={adminNote}
                  onChange={e => setAdminNote(e.target.value)}
                  placeholder="Xodimga yuboriladi..."
                  rows={3}
                  className="rounded-xl resize-none"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)} className="rounded-xl">Bekor</Button>
            <Button
              className={`rounded-xl ${action === "approved" ? "bg-green-500 hover:bg-green-600" : "bg-red-500 hover:bg-red-600"} text-white`}
              onClick={() => reviewM.mutate({ id: selected.id, status: action, note: adminNote })}
              disabled={reviewM.isPending}
            >
              {reviewM.isPending ? "..." : action === "approved" ? "✅ Tasdiqlash" : "❌ Rad etish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
