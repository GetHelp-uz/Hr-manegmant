import { Router, type IRouter } from "express";
import { db, companiesTable, adminsTable, employeesTable, attendanceTable, payrollTable, leaveRequestsTable, advanceRequestsTable } from "@workspace/db";
import { eq, and, sql, desc, count, ne } from "drizzle-orm";
import os from "os";
import process from "process";
import { execSync } from "child_process";

const PLATFORM_LOGIN = process.env.PLATFORM_ADMIN_LOGIN || "im_yakuboff98";
const PLATFORM_PASSWORD = process.env.PLATFORM_ADMIN_PASSWORD || "wer5459865";

const router: IRouter = Router();

function requirePlatformAuth(req: any, res: any, next: any) {
  if (!req.session?.isPlatformAdmin) {
    return res.status(401).json({ error: "unauthorized", message: "Platform admin auth required" });
  }
  next();
}

// ── AUTH ──────────────────────────────────────────────────────────────────────
router.post("/login", async (req, res) => {
  const { login, password } = req.body;
  if (login !== PLATFORM_LOGIN || password !== PLATFORM_PASSWORD) {
    return res.status(401).json({ error: "invalid_credentials", message: "Login yoki parol noto'g'ri" });
  }
  (req as any).session.isPlatformAdmin = true;
  return res.json({ success: true, login: PLATFORM_LOGIN });
});

router.post("/logout", (req, res) => {
  (req as any).session.isPlatformAdmin = false;
  return res.json({ success: true });
});

router.get("/me", (req, res) => {
  if (!(req as any).session?.isPlatformAdmin) {
    return res.status(401).json({ error: "unauthorized" });
  }
  return res.json({ login: PLATFORM_LOGIN });
});

// ── COMPANIES ─────────────────────────────────────────────────────────────────
router.get("/companies", requirePlatformAuth, async (req, res) => {
  try {
    const companies = await db.select().from(companiesTable).orderBy(desc(companiesTable.createdAt));
    const result = await Promise.all(companies.map(async (c) => {
      const [empCount] = await db.select({ count: count() }).from(employeesTable).where(eq(employeesTable.companyId, c.id));
      const [adminUser] = await db.select().from(adminsTable).where(and(
        eq(adminsTable.companyId, c.id),
        eq(adminsTable.role, "admin"),
      ));
      const [todayAtt] = await db.select({ count: count() }).from(attendanceTable).where(and(
        eq(attendanceTable.companyId, c.id),
        sql`DATE(${attendanceTable.createdAt}) = CURRENT_DATE`,
      ));
      const [monthAtt] = await db.select({ count: count() }).from(attendanceTable).where(and(
        eq(attendanceTable.companyId, c.id),
        sql`EXTRACT(MONTH FROM ${attendanceTable.createdAt}) = EXTRACT(MONTH FROM CURRENT_DATE)`,
        sql`EXTRACT(YEAR FROM ${attendanceTable.createdAt}) = EXTRACT(YEAR FROM CURRENT_DATE)`,
      ));
      const [pendingLeave] = await db.select({ count: count() }).from(leaveRequestsTable).where(and(
        eq(leaveRequestsTable.companyId, c.id),
        eq(leaveRequestsTable.status, "pending"),
      ));
      return {
        id: c.id, name: c.name, email: c.email, phone: c.phone, address: c.address,
        subscriptionPlan: c.subscriptionPlan, createdAt: c.createdAt,
        employeeCount: Number(empCount?.count || 0),
        todayAttendance: Number(todayAtt?.count || 0),
        monthAttendance: Number(monthAtt?.count || 0),
        pendingLeave: Number(pendingLeave?.count || 0),
        adminEmail: adminUser?.email || null,
        adminName: adminUser?.name || null,
        adminLogin: adminUser?.login || null,
      };
    }));
    return res.json({ data: result, total: result.length });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server_error" });
  }
});

router.get("/companies/:id", requirePlatformAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [company] = await db.select().from(companiesTable).where(eq(companiesTable.id, id));
    if (!company) return res.status(404).json({ error: "not_found" });

    const employees = await db.select().from(employeesTable).where(eq(employeesTable.companyId, id));
    const admins = await db.select({
      id: adminsTable.id, name: adminsTable.name, email: adminsTable.email,
      login: adminsTable.login, role: adminsTable.role, createdAt: adminsTable.createdAt,
    }).from(adminsTable).where(eq(adminsTable.companyId, id));

    const recentAttendance = await db.select().from(attendanceTable)
      .where(eq(attendanceTable.companyId, id))
      .orderBy(desc(attendanceTable.createdAt)).limit(100);

    const payrolls = await db.select().from(payrollTable)
      .where(eq(payrollTable.companyId, id))
      .orderBy(desc(payrollTable.year), desc(payrollTable.month)).limit(200);

    const leaveReqs = await db.select().from(leaveRequestsTable)
      .where(eq(leaveRequestsTable.companyId, id))
      .orderBy(desc(leaveRequestsTable.createdAt)).limit(50);

    const advanceReqs = await db.select().from(advanceRequestsTable)
      .where(eq(advanceRequestsTable.companyId, id))
      .orderBy(desc(advanceRequestsTable.createdAt)).limit(50);

    const empWithPayroll = employees.map(emp => {
      const empPayrolls = payrolls.filter(p => p.employeeId === emp.id);
      const lastPayroll = empPayrolls[0];
      const empAtt = recentAttendance.filter(a => a.employeeId === emp.id);
      const totalPaid = empPayrolls
        .filter(p => p.status === "paid")
        .reduce((s, p) => s + parseFloat(p.netSalary?.toString() || p.grossSalary?.toString() || "0"), 0);
      return {
        id: emp.id, fullName: emp.fullName, position: emp.position, phone: emp.phone,
        salaryType: emp.salaryType,
        monthlySalary: emp.monthlySalary ? parseFloat(emp.monthlySalary.toString()) : null,
        hourlyRate: emp.hourlyRate ? parseFloat(emp.hourlyRate.toString()) : null,
        createdAt: emp.createdAt,
        attendanceDays: empAtt.length,
        totalPaidSalary: totalPaid,
        lastPayroll: lastPayroll ? {
          month: lastPayroll.month, year: lastPayroll.year,
          grossSalary: parseFloat(lastPayroll.grossSalary.toString()),
          netSalary: parseFloat(lastPayroll.netSalary?.toString() || "0"),
          status: lastPayroll.status,
        } : null,
      };
    });

    const attWithEmp = recentAttendance.slice(0, 50).map(a => {
      const emp = employees.find(e => e.id === a.employeeId);
      return {
        id: a.id, status: a.status, checkIn: a.checkIn, checkOut: a.checkOut,
        createdAt: a.createdAt, employeeName: emp?.fullName || "—",
        lateMinutes: a.lateMinutes, workHours: a.workHours,
      };
    });

    const totalPayrollPaid = payrolls
      .filter(p => p.status === "paid")
      .reduce((s, p) => s + parseFloat(p.netSalary?.toString() || p.grossSalary?.toString() || "0"), 0);

    return res.json({
      company: {
        id: company.id, name: company.name, email: company.email, phone: company.phone,
        address: company.address, subscriptionPlan: company.subscriptionPlan, createdAt: company.createdAt,
      },
      admins,
      employees: empWithPayroll,
      recentAttendance: attWithEmp,
      leaveRequests: leaveReqs,
      advanceRequests: advanceReqs,
      stats: {
        totalEmployees: employees.length,
        totalAdmins: admins.length,
        totalAttendance: recentAttendance.length,
        totalPayrollPaid,
        pendingLeave: leaveReqs.filter(r => r.status === "pending").length,
        pendingAdvance: advanceReqs.filter(r => r.status === "pending").length,
        todayAttendance: recentAttendance.filter(a => {
          const d = new Date(a.createdAt);
          return d.toDateString() === new Date().toDateString();
        }).length,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server_error" });
  }
});

router.patch("/companies/:id/plan", requirePlatformAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { plan } = req.body;
    const validPlans = ["free", "starter", "business", "enterprise"];
    if (!validPlans.includes(plan)) {
      return res.status(400).json({ error: "invalid_plan" });
    }
    await db.update(companiesTable).set({ subscriptionPlan: plan }).where(eq(companiesTable.id, id));
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server_error" });
  }
});

router.delete("/companies/:id", requirePlatformAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(attendanceTable).where(eq(attendanceTable.companyId, id));
    await db.delete(payrollTable).where(eq(payrollTable.companyId, id));
    await db.delete(leaveRequestsTable).where(eq(leaveRequestsTable.companyId, id));
    await db.delete(advanceRequestsTable).where(eq(advanceRequestsTable.companyId, id));
    await db.delete(employeesTable).where(eq(employeesTable.companyId, id));
    await db.delete(adminsTable).where(eq(adminsTable.companyId, id));
    await db.delete(companiesTable).where(eq(companiesTable.id, id));
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server_error" });
  }
});

// ── ALL EMPLOYEES (cross-company) ─────────────────────────────────────────────
router.get("/employees", requirePlatformAuth, async (req, res) => {
  try {
    const { search } = req.query;
    const employees = await db.select({
      id: employeesTable.id,
      fullName: employeesTable.fullName,
      position: employeesTable.position,
      phone: employeesTable.phone,
      salaryType: employeesTable.salaryType,
      monthlySalary: employeesTable.monthlySalary,
      companyId: employeesTable.companyId,
      createdAt: employeesTable.createdAt,
    }).from(employeesTable).orderBy(desc(employeesTable.createdAt));

    const companies = await db.select({ id: companiesTable.id, name: companiesTable.name }).from(companiesTable);
    const companyMap = new Map(companies.map(c => [c.id, c.name]));

    const [todayAtt] = await db.select({ count: count() }).from(attendanceTable).where(
      sql`DATE(${attendanceTable.createdAt}) = CURRENT_DATE`
    );

    let result = employees.map(emp => ({
      ...emp,
      monthlySalary: emp.monthlySalary ? parseFloat(emp.monthlySalary.toString()) : null,
      companyName: companyMap.get(emp.companyId) || "—",
    }));

    if (search) {
      const s = (search as string).toLowerCase();
      result = result.filter(e =>
        e.fullName.toLowerCase().includes(s) ||
        e.position?.toLowerCase().includes(s) ||
        e.phone?.includes(s) ||
        e.companyName.toLowerCase().includes(s)
      );
    }

    return res.json({ data: result, total: result.length, todayActive: Number(todayAtt?.count || 0) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server_error" });
  }
});

router.delete("/employees/:id", requirePlatformAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(attendanceTable).where(eq(attendanceTable.employeeId, id));
    await db.delete(payrollTable).where(eq(payrollTable.employeeId, id));
    await db.delete(employeesTable).where(eq(employeesTable.id, id));
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server_error" });
  }
});

// ── SYSTEM INFRASTRUCTURE ─────────────────────────────────────────────────────
router.get("/system", requirePlatformAuth, async (req, res) => {
  try {
    const uptime = process.uptime();
    const mem = process.memoryUsage();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const cpus = os.cpus();
    const loadAvg = os.loadavg();

    // DB latency
    const dbStart = Date.now();
    await db.select({ count: count() }).from(companiesTable);
    const dbLatency = Date.now() - dbStart;

    // Disk usage via df
    let diskTotal = 0, diskUsed = 0, diskFree = 0;
    try {
      const dfOut = execSync("df -BM / 2>/dev/null | tail -1", { timeout: 3000 }).toString();
      const parts = dfOut.trim().split(/\s+/);
      diskTotal = parseInt(parts[1]) || 0;
      diskUsed = parseInt(parts[2]) || 0;
      diskFree = parseInt(parts[3]) || 0;
    } catch {}

    // DB size
    let dbSizeMB = 0;
    try {
      const [dbSz] = await db.execute(sql`SELECT pg_database_size(current_database()) as size`) as any;
      dbSizeMB = Math.round((dbSz?.size || 0) / 1024 / 1024);
    } catch {}

    // DB table sizes
    let tableStats: any[] = [];
    try {
      const rows = await db.execute(sql`
        SELECT schemaname, tablename,
          pg_size_pretty(pg_total_relation_size(quote_ident(tablename))) as size,
          (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = tablename) as cols
        FROM pg_tables WHERE schemaname = 'public'
        ORDER BY pg_total_relation_size(quote_ident(tablename)) DESC
        LIMIT 10
      `) as any;
      tableStats = rows.map((r: any) => ({ table: r.tablename, size: r.size }));
    } catch {}

    // Counts
    const [companyCount] = await db.select({ count: count() }).from(companiesTable);
    const [employeeCount] = await db.select({ count: count() }).from(employeesTable);
    const [attendanceCount] = await db.select({ count: count() }).from(attendanceTable);
    const [payrollCount] = await db.select({ count: count() }).from(payrollTable);
    const [todayCount] = await db.select({ count: count() }).from(attendanceTable).where(
      sql`DATE(${attendanceTable.createdAt}) = CURRENT_DATE`
    );

    const uptimeHours = Math.floor(uptime / 3600);
    const uptimeMinutes = Math.floor((uptime % 3600) / 60);
    const uptimeDays = Math.floor(uptime / 86400);
    const memUsedPercent = Math.round((1 - freeMem / totalMem) * 100);
    const heapPercent = Math.round((mem.heapUsed / mem.heapTotal) * 100);
    const diskUsedPercent = diskTotal > 0 ? Math.round((diskUsed / diskTotal) * 100) : 0;
    const cpuLoad = Math.round((loadAvg[0] / cpus.length) * 100);

    return res.json({
      server: {
        uptime: uptimeDays > 0 ? `${uptimeDays}k ${uptimeHours % 24}s ${uptimeMinutes}d` : `${uptimeHours}s ${uptimeMinutes}d`,
        uptimeSeconds: uptime,
        nodeVersion: process.version,
        platform: process.platform,
        environment: process.env.NODE_ENV || "development",
        startedAt: new Date(Date.now() - uptime * 1000).toISOString(),
      },
      memory: {
        heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
        heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
        heapPercent,
        rss: Math.round(mem.rss / 1024 / 1024),
        external: Math.round(mem.external / 1024 / 1024),
        systemTotal: Math.round(totalMem / 1024 / 1024),
        systemFree: Math.round(freeMem / 1024 / 1024),
        systemUsed: Math.round((totalMem - freeMem) / 1024 / 1024),
        systemUsedPercent: memUsedPercent,
      },
      cpu: {
        count: cpus.length,
        model: cpus[0]?.model?.trim() || "Unknown",
        speed: cpus[0]?.speed || 0,
        loadAvg1: loadAvg[0].toFixed(2),
        loadAvg5: loadAvg[1].toFixed(2),
        loadAvg15: loadAvg[2].toFixed(2),
        loadPercent: cpuLoad,
      },
      disk: {
        total: diskTotal,
        used: diskUsed,
        free: diskFree,
        usedPercent: diskUsedPercent,
      },
      database: {
        latencyMs: dbLatency,
        status: dbLatency < 50 ? "excellent" : dbLatency < 150 ? "good" : dbLatency < 500 ? "slow" : "critical",
        sizeMB: dbSizeMB,
        tables: tableStats,
      },
      stats: {
        companies: Number(companyCount?.count || 0),
        employees: Number(employeeCount?.count || 0),
        totalAttendance: Number(attendanceCount?.count || 0),
        totalPayrolls: Number(payrollCount?.count || 0),
        todayAttendance: Number(todayCount?.count || 0),
      },
      health: buildHealthChecks(cpuLoad, memUsedPercent, heapPercent, diskUsedPercent, dbLatency, dbSizeMB),
      recommendations: buildRecommendations(cpuLoad, memUsedPercent, heapPercent, diskUsedPercent, dbLatency),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server_error" });
  }
});

// ── ACTIVITY ─────────────────────────────────────────────────────────────────
router.get("/activity", requirePlatformAuth, async (req, res) => {
  try {
    const recentCompanies = await db.select({
      id: companiesTable.id, name: companiesTable.name, createdAt: companiesTable.createdAt,
    }).from(companiesTable).orderBy(desc(companiesTable.createdAt)).limit(5);

    const recentEmployees = await db.select({
      id: employeesTable.id, fullName: employeesTable.fullName, companyId: employeesTable.companyId,
      position: employeesTable.position, createdAt: employeesTable.createdAt,
    }).from(employeesTable).orderBy(desc(employeesTable.createdAt)).limit(10);

    const recentAttendance = await db.select({
      id: attendanceTable.id, status: attendanceTable.status, companyId: attendanceTable.companyId,
      employeeId: attendanceTable.employeeId, createdAt: attendanceTable.createdAt,
      checkIn: attendanceTable.checkIn,
    }).from(attendanceTable).orderBy(desc(attendanceTable.createdAt)).limit(15);

    const companies = await db.select({ id: companiesTable.id, name: companiesTable.name }).from(companiesTable);
    const employees = await db.select({ id: employeesTable.id, fullName: employeesTable.fullName }).from(employeesTable);
    const companyMap = new Map(companies.map(c => [c.id, c.name]));
    const empMap = new Map(employees.map(e => [e.id, e.fullName]));

    const feed = [
      ...recentCompanies.map(c => ({ type: "company_created", time: c.createdAt, text: `Yangi korxona: ${c.name}`, icon: "building" })),
      ...recentEmployees.map(e => ({ type: "employee_created", time: e.createdAt, text: `Yangi xodim: ${e.fullName} (${companyMap.get(e.companyId) || "—"})`, icon: "user" })),
      ...recentAttendance.map(a => ({ type: "attendance", time: a.createdAt, text: `Davomat: ${empMap.get(a.employeeId) || "—"} — ${a.status === "present" ? "keldi" : a.status}`, icon: "clock" })),
    ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 25);

    return res.json({ feed });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server_error" });
  }
});

// ── HELPERS ───────────────────────────────────────────────────────────────────
function buildHealthChecks(cpu: number, mem: number, heap: number, disk: number, dbMs: number, dbMB: number) {
  return [
    { name: "CPU", value: `${cpu}%`, status: cpu > 80 ? "critical" : cpu > 50 ? "warning" : "ok", detail: `Yuklanish darajasi` },
    { name: "RAM", value: `${mem}%`, status: mem > 85 ? "critical" : mem > 70 ? "warning" : "ok", detail: `Tizim xotirasi` },
    { name: "Heap", value: `${heap}%`, status: heap > 80 ? "warning" : "ok", detail: `Node.js heap` },
    { name: "Disk", value: `${disk}%`, status: disk > 90 ? "critical" : disk > 75 ? "warning" : "ok", detail: `Disk maydoni` },
    { name: "DB Ping", value: `${dbMs}ms`, status: dbMs > 500 ? "critical" : dbMs > 150 ? "warning" : "ok", detail: `Ma'lumotlar bazasi` },
    { name: "DB Hajm", value: `${dbMB}MB`, status: dbMB > 4000 ? "warning" : "ok", detail: `Baza o'lchami` },
  ];
}

function buildRecommendations(cpu: number, mem: number, heap: number, disk: number, dbMs: number) {
  const recs: Array<{ level: "ok" | "warning" | "critical"; text: string }> = [];

  if (cpu > 80) recs.push({ level: "critical", text: "CPU juda band — server hajmini oshiring (vCPU qo'shing) yoki yukni taqsimlang" });
  else if (cpu > 50) recs.push({ level: "warning", text: "CPU yuklanishi o'rtacha — kuzatishni davom ettiring" });
  else recs.push({ level: "ok", text: "CPU yuklanishi normal" });

  if (mem > 85) recs.push({ level: "critical", text: "RAM to'layapti — serverni restart qiling yoki RAM hajmini oshiring" });
  else if (mem > 70) recs.push({ level: "warning", text: "RAM ishlatilishi yuqori — kuzatishni davom ettiring" });
  else recs.push({ level: "ok", text: "RAM holati yaxshi" });

  if (heap > 80) recs.push({ level: "warning", text: "Node.js heap to'layapti — xotira sizib chiqishini tekshiring, processni restart qiling" });
  else recs.push({ level: "ok", text: "Node.js heap normal" });

  if (disk > 90) recs.push({ level: "critical", text: "Disk to'lib qolayapti — keraksiz fayllarni o'chiring yoki disk kengaytiring" });
  else if (disk > 75) recs.push({ level: "warning", text: "Disk 75%+ to'lgan — kuzatishni davom ettiring" });
  else recs.push({ level: "ok", text: "Disk maydoni yetarli" });

  if (dbMs > 500) recs.push({ level: "critical", text: "DB kechikishi juda yuqori — indekslar, connection pool yoki server resurslarini tekshiring" });
  else if (dbMs > 150) recs.push({ level: "warning", text: "DB birozgina sekin — query optimallashtirish tavsiya etiladi" });
  else recs.push({ level: "ok", text: "Ma'lumotlar bazasi tez ishlayapti" });

  return recs;
}

export default router;
