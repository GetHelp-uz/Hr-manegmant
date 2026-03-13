import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useAppStore } from "@/store/use-store";
import { AppLayout } from "@/components/layout/app-layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { User, Clock, CalendarDays, Banknote, TrendingUp, CheckCircle2, AlertTriangle, XCircle, ChevronRight } from "lucide-react";

const MONTHS = ["Yanvar","Fevral","Mart","Aprel","May","Iyun","Iyul","Avgust","Sentabr","Oktabr","Noyabr","Dekabr"];

const STATUS_MAP: Record<string, { label: string; cls: string; icon: any }> = {
  present: { label: "Keldi", cls: "bg-green-100 text-green-700", icon: CheckCircle2 },
  late: { label: "Kechikdi", cls: "bg-amber-100 text-amber-700", icon: AlertTriangle },
  absent: { label: "Kelmadi", cls: "bg-red-100 text-red-700", icon: XCircle },
};

const LEAVE_STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: "Kutilmoqda", cls: "bg-amber-100 text-amber-700" },
  approved: { label: "Tasdiqlandi", cls: "bg-green-100 text-green-700" },
  rejected: { label: "Rad etildi", cls: "bg-red-100 text-red-700" },
};

export default function MePage() {
  const { userRole } = useAppStore();
  const [empId, setEmpId] = useState("");
  const [compId, setCompId] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["/api/me", empId, compId],
    queryFn: async () => {
      const r = await apiClient.get(`/api/me?employee_id=${empId}&company_id=${compId}`);
      return r as any;
    },
    enabled: submitted && !!empId && !!compId,
    retry: false,
  });

  function fmtTime(d: string | null) {
    if (!d) return "—";
    return new Date(d).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" });
  }

  function fmtDate(d: string | null) {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric" });
  }

  if (!submitted) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[80vh] p-6">
          <div className="bg-white border border-border rounded-2xl p-8 w-full max-w-sm shadow-sm">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
              <User className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-xl font-display font-bold mb-1">Xodim o'z sahifasi</h1>
            <p className="text-sm text-muted-foreground mb-6">Ma'lumotlaringizni ko'rish uchun ma'lumotlaringizni kiriting</p>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">Xodim ID</label>
                <Input value={empId} onChange={e => setEmpId(e.target.value)} placeholder="123" className="mt-1" type="number" />
              </div>
              <div>
                <label className="text-sm font-medium">Korxona ID</label>
                <Input value={compId} onChange={e => setCompId(e.target.value)} placeholder="456" className="mt-1" type="number" />
              </div>
              <Button className="w-full mt-2" onClick={() => setSubmitted(true)} disabled={!empId || !compId}>
                Ko'rish <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center mt-4">ID ni Telegram bot yoki admin tomonidan bilib olishingiz mumkin</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-display font-bold">Mening sahifam</h1>
          <Button variant="outline" size="sm" onClick={() => { setSubmitted(false); setEmpId(""); setCompId(""); }}>
            Boshqa xodim
          </Button>
        </div>

        {isLoading && <div className="text-center py-12 text-muted-foreground">Yuklanmoqda...</div>}
        {isError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <XCircle className="w-10 h-10 text-red-400 mx-auto mb-2" />
            <p className="font-medium text-red-700">Xodim topilmadi</p>
            <p className="text-sm text-red-500 mt-1">ID larni tekshiring</p>
          </div>
        )}

        {data && (
          <>
            <div className="bg-white border border-border rounded-xl p-5">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">
                  {data.employee.fullName.charAt(0)}
                </div>
                <div>
                  <h2 className="text-xl font-display font-bold">{data.employee.fullName}</h2>
                  <p className="text-sm text-muted-foreground">{data.employee.position}</p>
                  <p className="text-xs text-muted-foreground/60 mt-0.5">{data.employee.phone}</p>
                </div>
                <div className="ml-auto text-right">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${data.employee.status === "active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                    {data.employee.status === "active" ? "Faol" : "Nofaol"}
                  </span>
                  {data.employee.employeeCode && (
                    <p className="text-xs text-muted-foreground mt-1.5">Kod: <strong>{data.employee.employeeCode}</strong></p>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white border border-border rounded-xl p-4 text-center">
                <TrendingUp className="w-5 h-5 text-green-500 mx-auto mb-1" />
                <p className="text-2xl font-display font-bold text-foreground">{data.stats.presentDays}</p>
                <p className="text-xs text-muted-foreground">Kelgan kun ({MONTHS[(data.stats.month || 1) - 1]})</p>
              </div>
              <div className="bg-white border border-border rounded-xl p-4 text-center">
                <AlertTriangle className="w-5 h-5 text-amber-500 mx-auto mb-1" />
                <p className="text-2xl font-display font-bold text-foreground">{data.stats.lateDays}</p>
                <p className="text-xs text-muted-foreground">Kechikgan kun</p>
              </div>
              <div className="bg-white border border-border rounded-xl p-4 text-center">
                <Clock className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                <p className="text-2xl font-display font-bold text-foreground">{data.stats.totalHours}</p>
                <p className="text-xs text-muted-foreground">Jami soat</p>
              </div>
            </div>

            {data.todayAttendance && (
              <div className="bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 rounded-xl p-4">
                <p className="text-sm font-semibold text-primary mb-2">Bugungi davomat</p>
                <div className="flex gap-4 text-sm">
                  <div><span className="text-muted-foreground">Kelish:</span> <strong>{fmtTime(data.todayAttendance.checkIn)}</strong></div>
                  <div><span className="text-muted-foreground">Ketish:</span> <strong>{fmtTime(data.todayAttendance.checkOut)}</strong></div>
                  {data.todayAttendance.workHours && <div><span className="text-muted-foreground">Ishlagan:</span> <strong>{parseFloat(data.todayAttendance.workHours).toFixed(1)}s</strong></div>}
                </div>
              </div>
            )}

            <div className="bg-white border border-border rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-border flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-muted-foreground" />
                <h3 className="font-semibold text-sm">Davomat tarixi ({MONTHS[(data.stats.month || 1) - 1]})</h3>
              </div>
              {data.recentAttendance.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">Bu oy davomat yo'q</div>
              ) : (
                <div className="divide-y divide-border">
                  {data.recentAttendance.map((a: any) => {
                    const s = STATUS_MAP[a.status] || STATUS_MAP.absent;
                    const Icon = s.icon;
                    return (
                      <div key={a.id} className="flex items-center px-5 py-3 gap-4">
                        <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                          <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{fmtDate(a.createdAt)}</p>
                          {a.lateMinutes > 0 && <p className="text-xs text-amber-600">{a.lateMinutes} daqiqa kechikish</p>}
                        </div>
                        <div className="text-sm text-right">
                          <p>{fmtTime(a.checkIn)} – {fmtTime(a.checkOut)}</p>
                          {a.workHours && <p className="text-xs text-muted-foreground">{parseFloat(a.workHours).toFixed(1)}s</p>}
                        </div>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${s.cls}`}>{s.label}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {data.leaveRequests.length > 0 && (
              <div className="bg-white border border-border rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-border">
                  <h3 className="font-semibold text-sm">Ta'til so'rovlarim</h3>
                </div>
                <div className="divide-y divide-border">
                  {data.leaveRequests.map((l: any) => {
                    const s = LEAVE_STATUS[l.status] || LEAVE_STATUS.pending;
                    return (
                      <div key={l.id} className="px-5 py-3 flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-medium">{l.type === "vacation" ? "Ta'til" : l.type === "sick" ? "Kasal" : l.type}</p>
                          <p className="text-xs text-muted-foreground">{l.startDate} – {l.endDate} · {l.days} kun</p>
                          {l.adminNote && <p className="text-xs text-muted-foreground italic mt-0.5">{l.adminNote}</p>}
                        </div>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${s.cls}`}>{s.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {data.advances.length > 0 && (
              <div className="bg-white border border-border rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-border">
                  <h3 className="font-semibold text-sm">Avans so'rovlarim</h3>
                </div>
                <div className="divide-y divide-border">
                  {data.advances.map((a: any) => {
                    const s = LEAVE_STATUS[a.status] || LEAVE_STATUS.pending;
                    return (
                      <div key={a.id} className="px-5 py-3 flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-medium">{a.amount.toLocaleString()} so'm</p>
                          <p className="text-xs text-muted-foreground">{a.reason || "Sabab ko'rsatilmagan"} · {fmtDate(a.createdAt)}</p>
                        </div>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${s.cls}`}>{s.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
