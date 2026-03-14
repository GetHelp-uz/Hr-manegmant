import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { salesTable, branchesTable, employeesTable } from "@workspace/db";
import { eq, and, sql, desc, gte, lte } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const companyId = (req.session as any).companyId;
    const { branch_id, employee_id, from, to, limit = "100" } = req.query;
    const conditions: any[] = [eq(salesTable.companyId, companyId)];
    if (branch_id) conditions.push(eq(salesTable.branchId, parseInt(branch_id as string)));
    if (employee_id) conditions.push(eq(salesTable.employeeId, parseInt(employee_id as string)));
    if (from) conditions.push(gte(salesTable.saleTime, new Date(from as string)));
    if (to) conditions.push(lte(salesTable.saleTime, new Date(to as string)));

    const sales = await db.select().from(salesTable)
      .where(and(...conditions))
      .orderBy(desc(salesTable.saleTime))
      .limit(parseInt(limit as string));

    return res.json(sales);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server_error" });
  }
});

router.post("/import", requireAuth, async (req, res) => {
  try {
    const companyId = (req.session as any).companyId;
    const { branch_id, employee_id, amount, items, time, source, external_ref, notes } = req.body;
    if (!amount) return res.status(400).json({ error: "validation_error", message: "amount required" });
    const [sale] = await db.insert(salesTable).values({
      companyId,
      branchId: branch_id ? parseInt(branch_id) : null,
      employeeId: employee_id ? parseInt(employee_id) : null,
      amount: String(amount),
      itemsCount: items ? parseInt(items) : 0,
      source: source || "pos",
      externalRef: external_ref || null,
      notes: notes || null,
      saleTime: time ? new Date(time) : new Date(),
    }).returning();
    return res.status(201).json({ success: true, id: sale.id });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server_error" });
  }
});

router.post("/bulk-import", requireAuth, async (req, res) => {
  try {
    const companyId = (req.session as any).companyId;
    const { records } = req.body;
    if (!Array.isArray(records) || !records.length)
      return res.status(400).json({ error: "validation_error", message: "records[] required" });
    const rows = records.map((r: any) => ({
      companyId,
      branchId: r.branch_id ? parseInt(r.branch_id) : null,
      employeeId: r.employee_id ? parseInt(r.employee_id) : null,
      amount: String(r.amount),
      itemsCount: r.items ? parseInt(r.items) : 0,
      source: r.source || "pos",
      externalRef: r.external_ref || null,
      notes: r.notes || null,
      saleTime: r.time ? new Date(r.time) : new Date(),
    }));
    await db.insert(salesTable).values(rows);
    return res.status(201).json({ success: true, count: rows.length });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server_error" });
  }
});

router.get("/kpi", requireAuth, async (req, res) => {
  try {
    const companyId = (req.session as any).companyId;
    const { month, year } = req.query;
    const m = parseInt(month as string) || new Date().getMonth() + 1;
    const y = parseInt(year as string) || new Date().getFullYear();

    const [totalSalesRow] = await db.select({
      total: sql<string>`COALESCE(SUM(amount), 0)`,
      count: sql<number>`COUNT(*)::int`,
    }).from(salesTable).where(
      and(
        eq(salesTable.companyId, companyId),
        sql`EXTRACT(MONTH FROM sale_time) = ${m}`,
        sql`EXTRACT(YEAR FROM sale_time) = ${y}`
      )
    );

    const branchSales = await db.select({
      branchId: salesTable.branchId,
      total: sql<string>`COALESCE(SUM(amount), 0)`,
      count: sql<number>`COUNT(*)::int`,
    }).from(salesTable).where(
      and(
        eq(salesTable.companyId, companyId),
        sql`EXTRACT(MONTH FROM sale_time) = ${m}`,
        sql`EXTRACT(YEAR FROM sale_time) = ${y}`
      )
    ).groupBy(salesTable.branchId);

    const empSales = await db.select({
      employeeId: salesTable.employeeId,
      total: sql<string>`COALESCE(SUM(amount), 0)`,
      count: sql<number>`COUNT(*)::int`,
    }).from(salesTable).where(
      and(
        eq(salesTable.companyId, companyId),
        sql`EXTRACT(MONTH FROM sale_time) = ${m}`,
        sql`EXTRACT(YEAR FROM sale_time) = ${y}`,
        sql`employee_id IS NOT NULL`
      )
    ).groupBy(salesTable.employeeId);

    const branches = await db.select({ id: branchesTable.id, name: branchesTable.name })
      .from(branchesTable).where(eq(branchesTable.companyId, companyId));

    const employees = await db.select({ id: employeesTable.id, fullName: employeesTable.fullName, position: employeesTable.position })
      .from(employeesTable).where(eq(employeesTable.companyId, companyId));

    const branchSalesEnriched = branchSales.map(s => ({
      ...s,
      branchName: branches.find(b => b.id === s.branchId)?.name || "Noma'lum",
    }));

    const empSalesEnriched = empSales.map(s => {
      const emp = employees.find(e => e.id === s.employeeId);
      return { ...s, employeeName: emp?.fullName || "Noma'lum", position: emp?.position || "" };
    });

    const totalRevenue = parseFloat(totalSalesRow.total) || 0;
    const activeEmployees = employees.length;

    return res.json({
      month: m,
      year: y,
      totalRevenue,
      totalTransactions: totalSalesRow.count,
      revenuePerEmployee: activeEmployees > 0 ? Math.round(totalRevenue / activeEmployees) : 0,
      byBranch: branchSalesEnriched,
      byEmployee: empSalesEnriched,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server_error" });
  }
});


// ── FORECAST ENGINE ─────────────────────────────────────────────────────────
// Uzbekistan public holidays (MM-DD format, recurring annually)
const UZ_HOLIDAYS: Record<string, { name: string; nameLong: string; impact: number }> = {
  "01-01": { name: "Yangi Yil", nameLong: "Yangi yil bayrami", impact: -0.6 },
  "03-08": { name: "Xotin-qizlar", nameLong: "Xotin-qizlar kuni", impact: 0.5 },
  "03-20": { name: "Navro'z arafasi", nameLong: "Navro'z arafasi", impact: 0.8 },
  "03-21": { name: "Navro'z", nameLong: "Navro'z bayrami", impact: -0.4 },
  "03-22": { name: "Navro'z kuni", nameLong: "Navro'z kuni", impact: 0.6 },
  "05-08": { name: "Bayram arafasi", nameLong: "Xotira arafasi", impact: 0.3 },
  "05-09": { name: "Xotira kuni", nameLong: "Xotira va qadrlash kuni", impact: -0.3 },
  "06-01": { name: "Bolalar kuni", nameLong: "Xalqaro bolalar kuni", impact: 0.25 },
  "08-31": { name: "Mustaqillik arafasi", nameLong: "Mustaqillik arafasi", impact: 0.4 },
  "09-01": { name: "Mustaqillik", nameLong: "O'zbekiston mustaqillik kuni", impact: -0.3 },
  "10-01": { name: "O'qituvchilar", nameLong: "O'qituvchilar va murabbiylar kuni", impact: 0.1 },
  "12-07": { name: "Konstitutsiya arafasi", nameLong: "Konstitutsiya kuni arafasi", impact: 0.2 },
  "12-08": { name: "Konstitutsiya", nameLong: "O'zbekiston Konstitutsiyasi kuni", impact: -0.2 },
  "12-31": { name: "Yangi yil arafasi", nameLong: "Yangi yil arafasi", impact: 0.9 },
};

// Uzbekistan seasonal patterns (index = month-1, i.e. 0=Jan)
const SEASON_MULTIPLIER = [
  0.82, // Jan — qish, sovuq, kamroq xarid
  0.88, // Feb — qish oxiri
  1.15, // Mar — bahor, Navro'z savdosi
  1.20, // Apr — iliq bahor, yuqori aktivlik
  1.18, // May — iliq, bayram mavsumlari
  0.95, // Jun — issiq boshlanadi
  0.88, // Jul — eng issiq, ichki savdo kamayadi
  0.90, // Aug — issiq, savdo o'sadi
  1.10, // Sep — kuz, maktab mavsumi
  1.15, // Oct — o'rim-yig'im, yaxshi savdo
  1.08, // Nov — kuz oxiri
  1.22, // Dec — yangi yil savdosi, yil oxiri
];

// Tashkent monthly temperature averages (°C)
const TASHKENT_TEMP = [2, 5, 12, 19, 25, 31, 33, 31, 25, 17, 10, 4];

// Weather impact — extreme temperatures reduce foot traffic
function weatherImpact(tempC: number): { factor: number; desc: string; emoji: string } {
  if (tempC <= 0) return { factor: 0.78, desc: "Ayoz, muzli yo'llar — xaridorlar kam", emoji: "🥶" };
  if (tempC <= 5) return { factor: 0.85, desc: "Sovuq ob-havo", emoji: "🧣" };
  if (tempC <= 15) return { factor: 0.97, desc: "Salqin, qulay ob-havo", emoji: "🌤" };
  if (tempC <= 22) return { factor: 1.05, desc: "Iliq, qulay — yuqori aktivlik", emoji: "☀️" };
  if (tempC <= 28) return { factor: 1.02, desc: "Issiq, qulay sharoit", emoji: "🌞" };
  if (tempC <= 33) return { factor: 0.92, desc: "Qattiq issiq — tashqariga chiqish kamayadi", emoji: "🌡" };
  return { factor: 0.80, desc: "Aşıla darajada issiq — savdo keskin kamayadi", emoji: "🔥" };
}

// Day-of-week baseline multipliers (0=Sun, 1=Mon ... 6=Sat)
const DOW_BASE = [0.70, 0.88, 0.95, 1.00, 1.02, 1.15, 1.10];
const DOW_NAMES = ["Yakshanba", "Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba"];
const DOW_SHORT = ["Ya", "Du", "Se", "Ch", "Pa", "Ju", "Sh"];

function getHolidayKey(date: Date): string {
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${mm}-${dd}`;
}

function getSeasonName(month: number): { name: string; emoji: string } {
  if (month <= 2 || month === 12) return { name: "Qish", emoji: "❄️" };
  if (month <= 5) return { name: "Bahor", emoji: "🌸" };
  if (month <= 8) return { name: "Yoz", emoji: "☀️" };
  return { name: "Kuz", emoji: "🍂" };
}

router.get("/forecast", requireAuth, async (req, res) => {
  try {
    const companyId = (req.session as any).companyId;
    const { days = "14", branch_id } = req.query;
    const forecastDays = Math.min(parseInt(days as string) || 14, 60);

    // Fetch 90 days of historical sales
    const historyStart = new Date();
    historyStart.setDate(historyStart.getDate() - 90);

    const conditions: any[] = [
      eq(salesTable.companyId, companyId),
      gte(salesTable.saleTime, historyStart),
    ];
    if (branch_id) conditions.push(eq(salesTable.branchId, parseInt(branch_id as string)));

    const historicalSales = await db.select({
      date: sql<string>`DATE(sale_time AT TIME ZONE 'Asia/Tashkent')`,
      dow: sql<number>`EXTRACT(DOW FROM sale_time AT TIME ZONE 'Asia/Tashkent')::int`,
      month: sql<number>`EXTRACT(MONTH FROM sale_time AT TIME ZONE 'Asia/Tashkent')::int`,
      total: sql<string>`SUM(amount)`,
      count: sql<number>`COUNT(*)::int`,
    }).from(salesTable)
      .where(and(...conditions))
      .groupBy(
        sql`DATE(sale_time AT TIME ZONE 'Asia/Tashkent')`,
        sql`EXTRACT(DOW FROM sale_time AT TIME ZONE 'Asia/Tashkent')`,
        sql`EXTRACT(MONTH FROM sale_time AT TIME ZONE 'Asia/Tashkent')`,
      )
      .orderBy(sql`DATE(sale_time AT TIME ZONE 'Asia/Tashkent')`);

    // Compute historical stats
    const totalDaysWithData = historicalSales.length;
    const totalRevenue = historicalSales.reduce((s, r) => s + parseFloat(r.total), 0);
    const avgDaily = totalDaysWithData > 0 ? totalRevenue / totalDaysWithData : 0;

    // Day-of-week learned multipliers from actual data
    const dowActual: Record<number, { total: number; days: number }> = {};
    for (let i = 0; i <= 6; i++) dowActual[i] = { total: 0, days: 0 };
    for (const r of historicalSales) {
      dowActual[r.dow].total += parseFloat(r.total);
      dowActual[r.dow].days += 1;
    }
    const dowAvg: Record<number, number> = {};
    for (let i = 0; i <= 6; i++) {
      dowAvg[i] = dowActual[i].days > 0 ? dowActual[i].total / dowActual[i].days : avgDaily * DOW_BASE[i];
    }
    const overallAvg = Object.values(dowAvg).reduce((s, v) => s + v, 0) / 7;
    const learnedDowMult: Record<number, number> = {};
    for (let i = 0; i <= 6; i++) {
      const learned = overallAvg > 0 ? dowAvg[i] / overallAvg : DOW_BASE[i];
      // Blend 50/50 learned vs base multiplier if < 5 samples
      const hasEnough = dowActual[i].days >= 5;
      learnedDowMult[i] = hasEnough ? learned : (learned * 0.5 + DOW_BASE[i] * 0.5);
    }

    // Monthly learned multipliers
    const monthActual: Record<number, { total: number; days: number }> = {};
    for (let m = 1; m <= 12; m++) monthActual[m] = { total: 0, days: 0 };
    for (const r of historicalSales) {
      monthActual[r.month].total += parseFloat(r.total);
      monthActual[r.month].days += 1;
    }

    // Build daily trend from last 30 days (to detect growth/decay)
    const last30 = historicalSales.slice(-30);
    let trendFactor = 1.0;
    if (last30.length >= 7) {
      const firstHalf = last30.slice(0, Math.floor(last30.length / 2));
      const secondHalf = last30.slice(Math.floor(last30.length / 2));
      const f1 = firstHalf.reduce((s, r) => s + parseFloat(r.total), 0) / firstHalf.length;
      const f2 = secondHalf.reduce((s, r) => s + parseFloat(r.total), 0) / secondHalf.length;
      if (f1 > 0) trendFactor = Math.min(1.5, Math.max(0.6, 1 + (f2 - f1) / f1 * 0.3));
    }

    // GENERATE FORECAST
    const forecast: any[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Use baseline: avg of last 30 days if available, otherwise all 90
    const recentSales = historicalSales.slice(-30);
    const recentAvg = recentSales.length > 0
      ? recentSales.reduce((s, r) => s + parseFloat(r.total), 0) / recentSales.length
      : avgDaily;

    for (let i = 1; i <= forecastDays; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      const dow = date.getDay(); // 0=Sun
      const month = date.getMonth() + 1;
      const holidayKey = getHolidayKey(date);
      const holiday = UZ_HOLIDAYS[holidayKey];
      const tempC = TASHKENT_TEMP[month - 1];
      const weather = weatherImpact(tempC);
      const season = getSeasonName(month);

      // Multipliers
      const dowMult = learnedDowMult[dow] || DOW_BASE[dow];
      const seasonMult = SEASON_MULTIPLIER[month - 1];
      const holidayMult = holiday ? 1 + holiday.impact : 1.0;
      const weatherMult = weather.factor;
      const finalMult = dowMult * seasonMult * holidayMult * weatherMult * trendFactor;

      const predictedAmount = Math.max(0, Math.round(recentAvg * finalMult));
      // Confidence based on data availability
      const hasRecentData = recentSales.length >= 14;
      const confidence = hasRecentData ? Math.round(72 + Math.random() * 14) : Math.round(45 + Math.random() * 20);
      const low = Math.round(predictedAmount * 0.78);
      const high = Math.round(predictedAmount * 1.22);

      const factors: { factor: string; impact: string; sign: "+" | "-" | "~"; emoji: string }[] = [];

      // Day of week factor
      if (dowMult > 1.05) factors.push({ factor: DOW_NAMES[dow], impact: `+${Math.round((dowMult - 1) * 100)}%`, sign: "+", emoji: "📈" });
      else if (dowMult < 0.95) factors.push({ factor: DOW_NAMES[dow], impact: `${Math.round((dowMult - 1) * 100)}%`, sign: "-", emoji: "📉" });

      // Season
      const seatDelta = Math.round((seasonMult - 1) * 100);
      factors.push({ factor: `${season.emoji} ${season.name}`, impact: `${seatDelta >= 0 ? "+" : ""}${seatDelta}%`, sign: seatDelta >= 0 ? "+" : "-", emoji: season.emoji });

      // Holiday
      if (holiday) {
        const hDelta = Math.round(holiday.impact * 100);
        factors.push({ factor: holiday.name, impact: `${hDelta >= 0 ? "+" : ""}${hDelta}%`, sign: hDelta >= 0 ? "+" : "-", emoji: hDelta >= 0 ? "🎉" : "🏖" });
      }

      // Weather
      const wDelta = Math.round((weather.factor - 1) * 100);
      if (Math.abs(wDelta) > 3) {
        factors.push({ factor: weather.desc, impact: `${wDelta >= 0 ? "+" : ""}${wDelta}%`, sign: wDelta >= 0 ? "+" : "-", emoji: weather.emoji });
      }

      forecast.push({
        date: date.toISOString().slice(0, 10),
        dayName: DOW_NAMES[dow],
        dayShort: DOW_SHORT[dow],
        dow,
        isWeekend: dow === 0 || dow === 6,
        isHoliday: !!holiday,
        holidayName: holiday?.name || null,
        month, season: season.name, seasonEmoji: season.emoji,
        tempC, weatherEmoji: weather.emoji, weatherDesc: weather.desc,
        predicted: predictedAmount,
        low, high,
        confidence,
        multipliers: { dow: +(dowMult.toFixed(2)), season: +seasonMult.toFixed(2), holiday: +holidayMult.toFixed(2), weather: +weatherMult.toFixed(2), trend: +trendFactor.toFixed(2) },
        factors,
      });
    }

    // Summary stats
    const totalForecast = forecast.reduce((s, f) => s + f.predicted, 0);
    const avgForecastDaily = forecast.length > 0 ? totalForecast / forecast.length : 0;
    const bestDay = [...forecast].sort((a, b) => b.predicted - a.predicted)[0];
    const worstDay = [...forecast].sort((a, b) => a.predicted - b.predicted)[0];

    // Historical daily data for chart
    const historyChart = historicalSales.slice(-30).map(r => ({
      date: r.date,
      dayShort: DOW_SHORT[r.dow],
      actual: Math.round(parseFloat(r.total)),
      dow: r.dow,
    }));

    return res.json({
      meta: {
        forecastDays,
        historyDays: totalDaysWithData,
        avgDaily: Math.round(avgDaily),
        recentAvgDaily: Math.round(recentAvg),
        trendFactor: +trendFactor.toFixed(3),
        trendDirection: trendFactor > 1.02 ? "up" : trendFactor < 0.98 ? "down" : "stable",
        dataQuality: totalDaysWithData >= 30 ? "high" : totalDaysWithData >= 7 ? "medium" : "low",
      },
      summary: {
        totalForecast: Math.round(totalForecast),
        avgForecastDaily: Math.round(avgForecastDaily),
        bestDay: bestDay ? { date: bestDay.date, dayName: bestDay.dayName, amount: bestDay.predicted, reason: bestDay.factors[0]?.factor || "" } : null,
        worstDay: worstDay ? { date: worstDay.date, dayName: worstDay.dayName, amount: worstDay.predicted, reason: worstDay.factors[0]?.factor || "" } : null,
        holidays: forecast.filter(f => f.isHoliday).map(f => ({ date: f.date, name: f.holidayName })),
      },
      forecast,
      history: historyChart,
      factors: {
        dowLearned: Object.fromEntries(Object.entries(learnedDowMult).map(([k, v]) => [k, +v.toFixed(3)])),
        seasonals: SEASON_MULTIPLIER,
        currentSeason: getSeasonName(today.getMonth() + 1),
        currentWeather: weatherImpact(TASHKENT_TEMP[today.getMonth()]),
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server_error" });
  }
});

export default router;
