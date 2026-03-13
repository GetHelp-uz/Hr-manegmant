import { Router, type IRouter } from "express";
import { db, employeesTable, attendanceTable, payrollTable, leaveRequestsTable, advanceRequestsTable, companiesTable, departmentsTable } from "@workspace/db";
import { eq, and, sql, desc, gte, lte } from "drizzle-orm";
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

    const departments = await db.select().from(departmentsTable).where(eq(departmentsTable.companyId, companyId));

    const monthAttendance = await db.select().from(attendanceTable).where(
      and(
        eq(attendanceTable.companyId, companyId),
        sql`EXTRACT(MONTH FROM ${attendanceTable.createdAt}) = ${m}`,
        sql`EXTRACT(YEAR FROM ${attendanceTable.createdAt}) = ${y}`
      )
    );

    const prevM = m === 1 ? 12 : m - 1;
    const prevY = m === 1 ? y - 1 : y;
    const prevMonthAttendance = await db.select().from(attendanceTable).where(
      and(
        eq(attendanceTable.companyId, companyId),
        sql`EXTRACT(MONTH FROM ${attendanceTable.createdAt}) = ${prevM}`,
        sql`EXTRACT(YEAR FROM ${attendanceTable.createdAt}) = ${prevY}`
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

    const totalDays = monthAttendance.length;
    const lateDays = monthAttendance.filter(a => a.lateMinutes && a.lateMinutes > 0).length;
    const totalHours = monthAttendance.reduce((s, a) => s + parseFloat(a.workHours?.toString() || "0"), 0);
    const avgHoursPerDay = totalDays > 0 ? (totalHours / totalDays) : 0;
    const lateRate = totalDays > 0 ? ((lateDays / totalDays) * 100) : 0;

    const totalPayroll = payrolls.reduce((s, p) => s + parseFloat(p.netSalary?.toString() || p.grossSalary?.toString() || "0"), 0);
    const paidPayrolls = payrolls.filter(p => p.status === "paid");
    const pendingPayrolls = payrolls.filter(p => p.status === "draft" || p.status === "approved");

    // Per-employee stats
    const empStats = employees.map(emp => {
      const empAtt = monthAttendance.filter(a => a.employeeId === emp.id);
      const empPrevAtt = prevMonthAttendance.filter(a => a.employeeId === emp.id);
      const empHours = empAtt.reduce((s, a) => s + parseFloat(a.workHours?.toString() || "0"), 0);
      const empLate = empAtt.filter(a => a.lateMinutes && a.lateMinutes > 0).length;
      const empPrevLate = empPrevAtt.filter(a => a.lateMinutes && a.lateMinutes > 0).length;
      const lateRateNum = empAtt.length > 0 ? ((empLate / empAtt.length) * 100) : 0;
      const prevLateRateNum = empPrevAtt.length > 0 ? ((empPrevLate / empPrevAtt.length) * 100) : 0;
      const attendanceDrop = empPrevAtt.length > 0 && empAtt.length < empPrevAtt.length * 0.7;
      return {
        id: emp.id,
        name: emp.fullName,
        position: emp.position,
        departmentId: emp.departmentId,
        salaryType: emp.salaryType,
        days: empAtt.length,
        hours: empHours,
        lateDays: empLate,
        lateRate: lateRateNum.toFixed(0),
        prevDays: empPrevAtt.length,
        prevLateRate: prevLateRateNum.toFixed(0),
        attendanceDrop,
      };
    }).sort((a, b) => b.days - a.days);

    // ── HR RISK DETECTOR ──────────────────────────────────────────────────────
    const workingDaysInMonth = 22;
    const hrRisks = employees.map(emp => {
      const stats = empStats.find(e => e.id === emp.id)!;
      const lateR = parseInt(stats.lateRate);
      const prevLateR = parseInt(stats.prevLateRate);
      let score = 0;
      const factors: string[] = [];

      if (stats.days === 0 && stats.prevDays > 0) {
        score += 50;
        factors.push("Bu oy hech kelmagan");
      }
      if (stats.days < workingDaysInMonth * 0.35 && stats.days > 0) {
        score += 30;
        factors.push(`Juda kam kelmoqda (${stats.days} kun)`);
      } else if (stats.days < workingDaysInMonth * 0.6 && stats.days > 0) {
        score += 15;
        factors.push(`Kam kelmoqda (${stats.days} kun)`);
      }
      if (lateR > 40) {
        score += 25;
        factors.push(`Yuqori kechikish: ${lateR}%`);
      } else if (lateR > 25) {
        score += 12;
        factors.push(`Kechikish: ${lateR}%`);
      }
      if (stats.attendanceDrop) {
        score += 20;
        factors.push(`O'tgan oyga nisbatan ${Math.round(100 - (stats.days / stats.prevDays) * 100)}% kamaydi`);
      }
      if (lateR > prevLateR + 15 && prevLateR > 0) {
        score += 10;
        factors.push("Kechikish o'sib bormoqda");
      }
      const dept = departments.find(d => d.id === stats.departmentId);
      return {
        id: emp.id,
        name: emp.fullName,
        position: emp.position,
        department: dept?.name || "Bo'limsiz",
        riskScore: Math.min(score, 100),
        riskLevel: score >= 55 ? "high" : score >= 25 ? "medium" : "low",
        factors,
      };
    })
      .filter(e => e.riskScore > 0)
      .sort((a, b) => b.riskScore - a.riskScore);

    // ── SMART HIRING ──────────────────────────────────────────────────────────
    const hiringRecommendations: Array<{
      department: string;
      urgency: "high" | "medium" | "low";
      reason: string;
      suggestedCount: number;
      currentCount: number;
    }> = [];

    const deptEmpMap = new Map<number, typeof employees>();
    for (const emp of employees) {
      if (!emp.departmentId) continue;
      if (!deptEmpMap.has(emp.departmentId)) deptEmpMap.set(emp.departmentId, []);
      deptEmpMap.get(emp.departmentId)!.push(emp);
    }

    for (const dept of departments) {
      const deptEmps = deptEmpMap.get(dept.id) || [];
      const deptAtt = monthAttendance.filter(a => deptEmps.some(e => e.id === a.employeeId));
      const deptLate = deptAtt.filter(a => a.lateMinutes && a.lateMinutes > 0).length;
      const deptLateRate = deptAtt.length > 0 ? (deptLate / deptAtt.length) * 100 : 0;
      const avgDaysPerEmp = deptEmps.length > 0
        ? deptAtt.length / deptEmps.length : 0;

      if (deptEmps.length === 0) {
        hiringRecommendations.push({
          department: dept.name,
          urgency: "high",
          reason: "Bo'limda hech qanday xodim yo'q",
          suggestedCount: 2,
          currentCount: 0,
        });
      } else if (deptEmps.length < 3 && avgDaysPerEmp > 15) {
        hiringRecommendations.push({
          department: dept.name,
          urgency: "high",
          reason: `Kam xodim (${deptEmps.length} ta) lekin yuqori ish yuki — xodimlar charchayapti`,
          suggestedCount: 2,
          currentCount: deptEmps.length,
        });
      } else if (deptLateRate > 30 && deptEmps.length < 5) {
        hiringRecommendations.push({
          department: dept.name,
          urgency: "medium",
          reason: `Kechikish darajasi yuqori (${deptLateRate.toFixed(0)}%) — ish yuki ortiqcha bo'lishi mumkin`,
          suggestedCount: 1,
          currentCount: deptEmps.length,
        });
      } else if (deptEmps.length < 2) {
        hiringRecommendations.push({
          department: dept.name,
          urgency: "low",
          reason: "Bo'limni kuchaytirish tavsiya etiladi",
          suggestedCount: 1,
          currentCount: deptEmps.length,
        });
      }
    }

    // Late offenders analysis for hiring context
    const lateHotspots = empStats
      .filter(e => parseInt(e.lateRate) > 30)
      .map(e => e.name);
    if (lateHotspots.length >= 3) {
      hiringRecommendations.push({
        department: "Umumiy",
        urgency: "medium",
        reason: `${lateHotspots.length} ta xodim tez-tez kechikmoqda — ular ustiga qo'shimcha xodim zarur bo'lishi mumkin`,
        suggestedCount: 1,
        currentCount: lateHotspots.length,
      });
    }

    // Risks
    const risks = [];
    if (lateRate > 20) risks.push({ type: "warning", title: "Yuqori kechikish darajasi", desc: `${lateRate.toFixed(0)}% davomatda kechikish aniqlandi. Ish boshlanish vaqtini tekshiring.` });
    if (pendingPayrolls.length > 0 && pendingPayrolls.length >= totalEmployees * 0.5) risks.push({ type: "warning", title: "Oylik hisoblash kutilmoqda", desc: `${pendingPayrolls.length} ta xodimning oylik hisoblash holati "qoralama" yoki "tasdiqlanmagan".` });
    if (leaveReqs.length > 0) risks.push({ type: "info", title: "Ko'rib chiqilmagan so'rovlar", desc: `${leaveReqs.length} ta ta'til/ruxsat so'rovi kutilmoqda.` });
    if (advanceReqs.length > 0) risks.push({ type: "info", title: "Avans so'rovlari", desc: `${advanceReqs.length} ta avans so'rovi ko'rib chiqilmagan.` });
    const highLateCounts = empStats.filter(e => parseInt(e.lateRate) > 30);
    if (highLateCounts.length > 0) risks.push({ type: "danger", title: "Tez-tez kechadigan xodimlar", desc: `${highLateCounts.map(e => e.name).join(", ")} — 30%+ kechikish darajasi.` });
    const lowAttendance = empStats.filter(e => e.days < 10 && e.days > 0);
    if (lowAttendance.length > 0) risks.push({ type: "warning", title: "Kam kelgan xodimlar", desc: `${lowAttendance.map(e => `${e.name} (${e.days} kun)`).join(", ")}` });

    // Recommendations
    const recommendations: string[] = [];
    if (lateRate > 10) recommendations.push("Kechikish muammosini hal qilish uchun xodimlar bilan individual suhbat o'tkazing");
    if (totalEmployees > 0 && monthAttendance.length === 0) recommendations.push("Bu oy uchun hali davomat ma'lumotlari kiritilmagan — QR tizimini tekshiring");
    if (pendingPayrolls.length > 0) recommendations.push("Oylik hisob-kitoblarni tasdiqlang va to'lovlarni amalga oshiring");
    if (leaveReqs.length > 3) recommendations.push("Ko'p so'rovlar kutilmoqda — HR jarayonini tezlashtiring");
    recommendations.push("Har hafta davomat hisobotini ko'rib chiqing va trend'larni kuzating");
    recommendations.push("Xodimlarni Telegram botga ulang — ular o'z ma'lumotlarini o'zlari ko'ra oladi");

    // Trend (last 7 days)
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
      hrRisks,
      hiringRecommendations,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server_error" });
  }
});

router.get("/predict", requireAuth, async (req, res) => {
  try {
    const companyId = (req.session as any).companyId;
    const now = new Date();

    const prevMonths = [1, 2, 3].map(n => {
      const d = new Date(now.getFullYear(), now.getMonth() - n, 1);
      return { month: d.getMonth() + 1, year: d.getFullYear() };
    });

    const monthlyData = await Promise.all(prevMonths.map(async ({ month, year }) => {
      const firstDay = new Date(year, month - 1, 1);
      const lastDay = new Date(year, month, 0, 23, 59, 59);

      const [att] = await db.select({
        totalDays: sql<number>`count(*)::int`,
        lateDays: sql<number>`sum(case when ${attendanceTable.lateMinutes} > 0 then 1 else 0 end)::int`,
        totalHours: sql<number>`coalesce(sum(${attendanceTable.workHours}::numeric), 0)`,
      }).from(attendanceTable).where(
        and(
          eq(attendanceTable.companyId, companyId),
          gte(attendanceTable.createdAt, firstDay),
          lte(attendanceTable.createdAt, lastDay),
        )
      );

      return { month, year, ...att };
    }));

    const avgDays = monthlyData.reduce((s, m) => s + (m.totalDays || 0), 0) / 3;
    const avgLate = monthlyData.reduce((s, m) => s + (m.lateDays || 0), 0) / 3;
    const avgHours = monthlyData.reduce((s, m) => s + parseFloat(String(m.totalHours || 0)), 0) / 3;
    const avgLateRate = avgDays > 0 ? (avgLate / avgDays) * 100 : 0;

    const employees = await db.select().from(employeesTable).where(
      and(eq(employeesTable.companyId, companyId), eq(employeesTable.status, "active"))
    );
    const totalEmp = employees.length;

    const daysInNextMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0).getDate();
    const workDays = Math.round(daysInNextMonth * 5 / 7);

    const predictedAttendancePct = Math.max(60, Math.min(100, 100 - avgLateRate * 0.3));
    const predictedPresentDays = Math.round((predictedAttendancePct / 100) * totalEmp * workDays);

    const payrollEstimates = employees.map(e => {
      let base = 0;
      if (e.salaryType === "monthly") base = parseFloat(String(e.monthlySalary || 0));
      else if (e.salaryType === "hourly") base = parseFloat(String(e.hourlyRate || 0)) * (avgHours / Math.max(1, totalEmp));
      else if (e.salaryType === "daily") base = parseFloat(String(e.dailyRate || 0)) * workDays;
      return base;
    });
    const predictedPayroll = payrollEstimates.reduce((s, v) => s + v, 0);

    const lateRateTrend = monthlyData.map((m, i) => ({
      label: `${i + 1} oy oldin`,
      rate: m.totalDays > 0 ? ((m.lateDays || 0) / m.totalDays * 100).toFixed(1) : "0",
    }));

    const predictedLateRate = (parseFloat(lateRateTrend[0]?.rate || "0") * 0.4 +
      parseFloat(lateRateTrend[1]?.rate || "0") * 0.35 +
      parseFloat(lateRateTrend[2]?.rate || "0") * 0.25);

    const nextMonthName = new Date(now.getFullYear(), now.getMonth() + 1, 1)
      .toLocaleDateString("uz-UZ", { month: "long", year: "numeric" });

    return res.json({
      period: { nextMonth: nextMonthName, workDays },
      attendance: {
        predictedPresentDays,
        predictedAttendancePct: predictedAttendancePct.toFixed(1),
        predictedLateRate: predictedLateRate.toFixed(1),
        avgPast3Months: avgDays.toFixed(0),
      },
      payroll: {
        predictedTotal: Math.round(predictedPayroll),
        perEmployee: totalEmp > 0 ? Math.round(predictedPayroll / totalEmp) : 0,
        currency: "so'm",
      },
      trends: {
        lateRates: lateRateTrend,
        hoursPerMonth: monthlyData.map((m, i) => ({
          label: `${i + 1} oy oldin`,
          hours: parseFloat(String(m.totalHours || 0)).toFixed(1),
        })),
      },
      warnings: [
        ...(predictedLateRate > 20 ? [{ type: "high_late_rate", message: `Keyingi oyda kechikish darajasi ${predictedLateRate.toFixed(1)}% bo'lishi kutilmoqda`, level: "danger" }] : []),
        ...(predictedLateRate > 10 && predictedLateRate <= 20 ? [{ type: "medium_late_rate", message: `Kechikish darajasi o'rtacha: ${predictedLateRate.toFixed(1)}%`, level: "warning" }] : []),
        ...(predictedPayroll > 0 ? [{ type: "payroll_forecast", message: `Taxminiy maosh fondi: ${Math.round(predictedPayroll).toLocaleString("uz-UZ")} so'm`, level: "info" }] : []),
      ],
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server_error" });
  }
});

export default router;
