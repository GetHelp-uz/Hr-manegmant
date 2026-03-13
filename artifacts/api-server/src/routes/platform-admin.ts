import { Router, type IRouter } from "express";
import { db, companiesTable, adminsTable, employeesTable, attendanceTable, payrollTable } from "@workspace/db";
import { eq, and, sql, desc, count } from "drizzle-orm";
import os from "os";
import process from "process";

const PLATFORM_LOGIN = process.env.PLATFORM_ADMIN_LOGIN || "im_yakuboff98";
const PLATFORM_PASSWORD = process.env.PLATFORM_ADMIN_PASSWORD || "wer5459865";

const router: IRouter = Router();

function requirePlatformAuth(req: any, res: any, next: any) {
  if (!req.session?.isPlatformAdmin) {
    return res.status(401).json({ error: "unauthorized", message: "Platform admin auth required" });
  }
  next();
}

router.post("/login", async (req, res) => {
  try {
    const { login, password } = req.body;
    if (login !== PLATFORM_LOGIN || password !== PLATFORM_PASSWORD) {
      return res.status(401).json({ error: "invalid_credentials", message: "Login yoki parol noto'g'ri" });
    }
    (req as any).session.isPlatformAdmin = true;
    return res.json({ success: true, login: PLATFORM_LOGIN });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server_error" });
  }
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

router.get("/companies", requirePlatformAuth, async (req, res) => {
  try {
    const companies = await db.select().from(companiesTable).orderBy(desc(companiesTable.createdAt));
    const result = await Promise.all(companies.map(async (c) => {
      const [empCount] = await db.select({ count: count() }).from(employeesTable).where(eq(employeesTable.companyId, c.id));
      const [admins] = await db.select().from(adminsTable).where(and(
        eq(adminsTable.companyId, c.id),
        eq(adminsTable.role, "admin"),
      ));
      const [todayAtt] = await db.select({ count: count() }).from(attendanceTable).where(and(
        eq(attendanceTable.companyId, c.id),
        sql`DATE(${attendanceTable.createdAt}) = CURRENT_DATE`,
      ));
      return {
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        subscriptionPlan: c.subscriptionPlan,
        createdAt: c.createdAt,
        employeeCount: Number(empCount?.count || 0),
        todayAttendance: Number(todayAtt?.count || 0),
        adminEmail: admins?.email || null,
        adminName: admins?.name || null,
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
      id: adminsTable.id, name: adminsTable.name, email: adminsTable.email, role: adminsTable.role, createdAt: adminsTable.createdAt,
    }).from(adminsTable).where(eq(adminsTable.companyId, id));

    const recentAttendance = await db.select().from(attendanceTable)
      .where(eq(attendanceTable.companyId, id))
      .orderBy(desc(attendanceTable.createdAt))
      .limit(50);

    const payrolls = await db.select().from(payrollTable)
      .where(eq(payrollTable.companyId, id))
      .orderBy(desc(payrollTable.year), desc(payrollTable.month))
      .limit(100);

    const empWithPayroll = employees.map(emp => {
      const empPayrolls = payrolls.filter(p => p.employeeId === emp.id);
      const lastPayroll = empPayrolls[0];
      return {
        id: emp.id, fullName: emp.fullName, position: emp.position, phone: emp.phone,
        salaryType: emp.salaryType,
        monthlySalary: emp.monthlySalary ? parseFloat(emp.monthlySalary.toString()) : null,
        hourlyRate: emp.hourlyRate ? parseFloat(emp.hourlyRate.toString()) : null,
        createdAt: emp.createdAt,
        lastPayroll: lastPayroll ? {
          month: lastPayroll.month, year: lastPayroll.year,
          grossSalary: parseFloat(lastPayroll.grossSalary.toString()),
          status: lastPayroll.status,
        } : null,
      };
    });

    const attWithEmp = recentAttendance.map(a => {
      const emp = employees.find(e => e.id === a.employeeId);
      return {
        id: a.id, status: a.status, checkIn: a.checkIn, checkOut: a.checkOut,
        createdAt: a.createdAt, employeeName: emp?.fullName || "—",
        lateMinutes: a.lateMinutes,
      };
    });

    return res.json({
      company: {
        id: company.id, name: company.name, email: company.email, phone: company.phone,
        subscriptionPlan: company.subscriptionPlan, createdAt: company.createdAt,
      },
      admins,
      employees: empWithPayroll,
      recentAttendance: attWithEmp,
      stats: {
        totalEmployees: employees.length,
        totalPayroll: payrolls.reduce((sum, p) => sum + (p.status === "paid" ? parseFloat(p.grossSalary.toString()) : 0), 0),
        todayAttendance: recentAttendance.filter(a => {
          const d = new Date(a.createdAt);
          const now = new Date();
          return d.toDateString() === now.toDateString();
        }).length,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server_error" });
  }
});

router.get("/system", requirePlatformAuth, async (req, res) => {
  try {
    const uptime = process.uptime();
    const mem = process.memoryUsage();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const cpus = os.cpus();
    const loadAvg = os.loadavg();

    const dbStart = Date.now();
    await db.select({ count: count() }).from(companiesTable);
    const dbLatency = Date.now() - dbStart;

    const [companyCount] = await db.select({ count: count() }).from(companiesTable);
    const [employeeCount] = await db.select({ count: count() }).from(employeesTable);
    const [attendanceCount] = await db.select({ count: count() }).from(attendanceTable);
    const [todayCount] = await db.select({ count: count() }).from(attendanceTable).where(
      sql`DATE(${attendanceTable.createdAt}) = CURRENT_DATE`
    );

    const uptimeHours = Math.floor(uptime / 3600);
    const uptimeMinutes = Math.floor((uptime % 3600) / 60);

    return res.json({
      server: {
        uptime: `${uptimeHours}h ${uptimeMinutes}m`,
        uptimeSeconds: uptime,
        nodeVersion: process.version,
        platform: process.platform,
        environment: process.env.NODE_ENV || "development",
      },
      memory: {
        heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
        heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
        rss: Math.round(mem.rss / 1024 / 1024),
        systemTotal: Math.round(totalMem / 1024 / 1024),
        systemFree: Math.round(freeMem / 1024 / 1024),
        systemUsedPercent: Math.round((1 - freeMem / totalMem) * 100),
      },
      cpu: {
        count: cpus.length,
        model: cpus[0]?.model || "Unknown",
        loadAvg1: loadAvg[0].toFixed(2),
        loadAvg5: loadAvg[1].toFixed(2),
        loadAvg15: loadAvg[2].toFixed(2),
        loadPercent: Math.round((loadAvg[0] / cpus.length) * 100),
      },
      database: {
        latencyMs: dbLatency,
        status: dbLatency < 100 ? "yaxshi" : dbLatency < 500 ? "normal" : "sekin",
      },
      stats: {
        companies: Number(companyCount?.count || 0),
        employees: Number(employeeCount?.count || 0),
        totalAttendance: Number(attendanceCount?.count || 0),
        todayAttendance: Number(todayCount?.count || 0),
      },
      recommendations: buildRecommendations(loadAvg[0], cpus.length, totalMem, freeMem, mem),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server_error" });
  }
});

function buildRecommendations(load: number, cpuCount: number, totalMem: number, freeMem: number, mem: NodeJS.MemoryUsage) {
  const recs: string[] = [];
  const loadPercent = (load / cpuCount) * 100;
  const memUsedPercent = (1 - freeMem / totalMem) * 100;
  const heapPercent = (mem.heapUsed / mem.heapTotal) * 100;

  if (loadPercent > 80) recs.push("🔴 CPU yuklanishi juda yuqori — serverni ko'paytiring (scale up)");
  else if (loadPercent > 50) recs.push("🟡 CPU yuklanishi o'rtacha — kuzatishni davom ettiring");
  else recs.push("🟢 CPU yuklanishi normal");

  if (memUsedPercent > 85) recs.push("🔴 RAM to'lib qolayapti — server xotirasini oshiring yoki restart qiling");
  else if (memUsedPercent > 70) recs.push("🟡 RAM ishlatilishi yuqori — kuzatishni davom ettiring");
  else recs.push("🟢 RAM holati yaxshi");

  if (heapPercent > 80) recs.push("🟡 Node.js heap to'layapti — xotira sizib chiqishini tekshiring");
  else recs.push("🟢 Node.js xotirasi normal");

  return recs;
}

export default router;
