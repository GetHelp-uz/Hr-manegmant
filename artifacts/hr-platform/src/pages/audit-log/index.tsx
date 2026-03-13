import { useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Shield, Search, ChevronLeft, ChevronRight, User, Clock } from "lucide-react";

const ACTION_LABELS: Record<string, { label: string; cls: string }> = {
  login: { label: "Kirish", cls: "bg-green-100 text-green-700" },
  logout: { label: "Chiqish", cls: "bg-gray-100 text-gray-600" },
  create_employee: { label: "Xodim qo'shildi", cls: "bg-blue-100 text-blue-700" },
  update_employee: { label: "Xodim yangilandi", cls: "bg-amber-100 text-amber-700" },
  delete_employee: { label: "Xodim o'chirildi", cls: "bg-red-100 text-red-700" },
  approve_leave: { label: "Ta'til tasdiqlandi", cls: "bg-emerald-100 text-emerald-700" },
  reject_leave: { label: "Ta'til rad etildi", cls: "bg-red-100 text-red-700" },
  approve_advance: { label: "Avans tasdiqlandi", cls: "bg-emerald-100 text-emerald-700" },
  reject_advance: { label: "Avans rad etildi", cls: "bg-red-100 text-red-700" },
  calculate_payroll: { label: "Maosh hisoblandi", cls: "bg-violet-100 text-violet-700" },
  update_settings: { label: "Sozlamalar yangilandi", cls: "bg-orange-100 text-orange-700" },
};

export default function AuditLogPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const limit = 30;

  const { data, isLoading } = useQuery({
    queryKey: ["/api/audit-log", page],
    queryFn: async () => {
      const r: any = await apiClient.get(`/api/audit-log?page=${page}&limit=${limit}`);
      return r;
    },
  });

  const logs = Array.isArray(data?.data) ? data.data : [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  const filtered = search
    ? logs.filter((l: any) =>
        l.action?.toLowerCase().includes(search.toLowerCase()) ||
        l.user_login?.toLowerCase().includes(search.toLowerCase()) ||
        l.target_type?.toLowerCase().includes(search.toLowerCase())
      )
    : logs;

  function formatDate(d: string) {
    const date = new Date(d);
    return date.toLocaleString("uz-UZ", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit"
    });
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Audit Jurnali</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Tizimda amalga oshirilgan barcha amallar</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted px-3 py-1.5 rounded-lg">
            <Shield className="w-4 h-4" />
            Jami: {total} amal
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Amal yoki foydalanuvchi bo'yicha qidirish..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="bg-white border border-border rounded-xl overflow-hidden">
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Yuklanmoqda...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <Shield className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">Audit jurnali bo'sh</p>
              <p className="text-sm text-muted-foreground/60 mt-1">Amalga oshirilgan amallar bu yerda ko'rsatiladi</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((log: any) => {
                const badge = ACTION_LABELS[log.action] || { label: log.action, cls: "bg-gray-100 text-gray-600" };
                return (
                  <div key={log.id} className="flex items-start gap-4 px-5 py-3.5 hover:bg-muted/30 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                      <User className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badge.cls}`}>
                          {badge.label}
                        </span>
                        {log.user_login && (
                          <span className="text-sm font-medium text-foreground">{log.user_login}</span>
                        )}
                        {log.target_type && log.target_id && (
                          <span className="text-xs text-muted-foreground">#{log.target_id} ({log.target_type})</span>
                        )}
                      </div>
                      {log.details && Object.keys(log.details).length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          {Object.entries(log.details).map(([k, v]) => `${k}: ${v}`).join(" · ")}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                      <Clock className="w-3 h-3" />
                      {formatDate(log.created_at)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{page}/{totalPages} bet</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
