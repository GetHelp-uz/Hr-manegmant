import { Router, type IRouter } from "express";
import { db, employeesTable, attendanceTable, payrollTable, leaveRequestsTable, advanceRequestsTable, companiesTable } from "@workspace/db";
import { eq, and, sql, desc, count } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/overview", requireAuth, async (req, res) => {
  try {
    const companyId = (req.session as any).companyId;
    const { month, year } = req.query;
    const m = parseInt(month as string) || new Date().getMonth() + 1;
    const y = parseInt(year as string) || new Date().getFullYear();

    const employees = await db.select().from(employeesTable).where(eq(employeesTable.companyId, companyId));
    const totalEmployees = employees.length;

    const monthAttendance = await db.select().from(attendanceTable).where(
      and(
        eq(attendanceTable.companyId, companyId),
        sql`EXTRACT(MONTH FROM ${attendanceTable.createdAt}) = ${m}`,
        sql`EXTRACT(YEAR FROM ${attendanceTable.createdAt}) = ${y}`
      )
    );

    const payrolls = await db.select().from(payrollTable).where(
      and(eq(payrollTable.companyId, companyId), eq(payrollTable.month, m), eq(payrollTable.year, y))
    );

    const leaveReqs = await db.select().from(leaveRequestsTable).where(
      and(eq(leaveRequestsTable.companyId, companyId), eq(leaveRequestsTable.status, "pending"))
    );

    const advanceReqs = await db.select().from(advanceRequestsTable).where(
      and(eq(advanceRequestsTable.companyId, companyId), eq(advanceRequestsTable.status, "pending"))
    );

    const [company] = await db.select().from(companiesTable).where(eq(companiesTable.id, companyId));

    // Calculate stats
    const totalDays = monthAttendance.length;
    const lateDays = monthAttendance.filter(a => a.lateMinutes && a.lateMinutes > 0).length;
    const totalHours = monthAttendance.reduce((s, a) => s + parseFloat(a.workHours?.toString() || "0"), 0);
    const avgHoursPerDay = totalDays > 0 ? (totalHours / totalDays) : 0;
    const lateRate = totalDays > 0 ? ((lateDays / totalDays) * 100) : 0;

    const totalPayroll = payrolls.reduce((s, p) => s + parseFloat(p.netSalary?.toString() || p.grossSalary?.toString() || "0"), 0);
    const paidPayrolls = payrolls.filter(p => p.status === "paid");
    const pendingPayrolls = payrolls.filter(p => p.status === "draft" || p.status === "approved");

    // Attendance per employee
    const empStats = employees.map(emp => {
      const empAtt = monthAttendance.filter(a => a.employeeId === emp.id);
      const empHours = empAtt.reduce((s, a) => s + parseFloat(a.workHours?.toString() || "0"), 0);
      const empLate = empAtt.filter(a => a.lateMinutes && a.lateMinutes > 0).length;
      return {
        id: emp.id, name: emp.fullName, position: emp.position,
        days: empAtt.length, hours: empHours, lateDays: empLate,
        lateRate: empAtt.length > 0 ? ((empLate / empAtt.length) * 100).toFixed(0) : "0"
      };
    }).sort((a, b) => b.days - a.days);

    // Risk analysis
    const risks = [];
    if (lateRate > 20) risks.push({ type: "warning", title: "Yuqori kechikish darajasi", desc: `${lateRate.toFixed(0)}% davomatda kechikish aniqlandi. Ish boshlanish vaqtini tekshiring.` });
    if (pendingPayrolls.length > 0 && pendingPayrolls.length >= totalEmployees * 0.5) risks.push({ type: "warning", title: "Oylik hisoblash kutilmoqda", desc: `${pendingPayrolls.length} ta xodimning oylik hisoblash holati "qoralama" yoki "tasdiqlanmagan".` });
    if (leaveReqs.length > 0) risks.push({ type: "info", title: "Ko'rib chiqilmagan so'rovlar", desc: `${leaveReqs.length} ta ta'til/ruxsat so'rovi kutilmoqda.` });
    if (advanceReqs.length > 0) risks.push({ type: "info", title: "Avans so'rovlari", desc: `${advanceReqs.length} ta avans so'rovi ko'rib chiqilmagan.` });

    const highLateCounts = empStats.filter(e => parseInt(e.lateRate) > 30);
    if (highLateCounts.length > 0) {
      risks.push({ type: "danger", title: "Tez-tez kechadigan xodimlar", desc: `${highLateCounts.map(e => e.name).join(", ")} — 30%+ kechikish darajasi.` });
    }

    const lowAttendance = empStats.filter(e => e.days < 10 && e.days > 0);
    if (lowAttendance.length > 0) {
      risks.push({ type: "warning", title: "Kam kelgan xodimlar", desc: `${lowAttendance.map(e => `${e.name} (${e.days} kun)`).join(", ")}` });
    }

    // Recommendations
    const recommendations = [];
    if (lateRate > 10) recommendations.push("Kechikish muammosini hal qilish uchun xodimlar bilan individual suhbat o'tkazing");
    if (totalEmployees > 0 && monthAttendance.length === 0) recommendations.push("Bu oy uchun hali davomat ma'lumotlari kiritilmagan — QR tizimini tekshiring");
    if (pendingPayrolls.length > 0) recommendations.push("Oylik hisob-kitoblarni tasdiqlang va to'lovlarni amalga oshiring");
    if (leaveReqs.length > 3) recommendations.push("Ko'p so'rovlar kutilmoqda — HR jarayonini tezlashtiring");
    recommendations.push("Har hafta davomat hisobotini ko'rib chiqing va trend'larni kuzating");
    recommendations.push("Xodimlarni Telegram botga ulang — ular o'z ma'lumotlarini o'zlari ko'ra oladi");

    // Trend data (last 7 days)
    const last7 = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStr = d.toISOString().split("T")[0];
      const dayAtt = monthAttendance.filter(a => {
        const attDate = new Date(a.createdAt).toISOString().split("T")[0];
        return attDate === dayStr;
      });
      last7.push({
        date: d.toLocaleDateString("uz-UZ", { weekday: "short", day: "numeric" }),
        present: dayAtt.filter(a => a.checkIn).length,
        late: dayAtt.filter(a => a.lateMinutes && a.lateMinutes > 0).length,
        hours: dayAtt.reduce((s, a) => s + parseFloat(a.workHours?.toString() || "0"), 0),
      });
    }

    return res.json({
      period: { month: m, year: y },
      company: { id: company.id, name: company.name },
      overview: {
        totalEmployees,
        totalDays,
        totalHours: totalHours.toFixed(1),
        avgHoursPerDay: avgHoursPerDay.toFixed(1),
        lateRate: lateRate.toFixed(1),
        lateDays,
        pendingLeave: leaveReqs.length,
        pendingAdvance: advanceReqs.length,
        totalPayroll,
        paidPayrolls: paidPayrolls.length,
        pendingPayrolls: pendingPayrolls.length,
      },
      employeeStats: empStats,
      risks,
      recommendations,
      trend: last7,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server_error" });
  }
});

export default router;
