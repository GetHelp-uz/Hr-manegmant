import { Router, type IRouter } from "express";
import {
  db, companiesTable, adminsTable, employeesTable,
  attendanceTable, payrollTable, leaveRequestsTable, advanceRequestsTable,
} from "@workspace/db";
import { eq, and, sql, desc, count, ilike, or } from "drizzle-orm";
import os from "os";
import process from "process";
import { execSync } from "child_process";
import bcrypt from "bcryptjs";

const PLATFORM_LOGIN = process.env.PLATFORM_ADMIN_LOGIN || "im_yakuboff98";
const PLATFORM_PASSWORD = process.env.PLATFORM_ADMIN_PASSWORD || "wer5459865";

const router: IRouter = Router();

async function execRows(query: any): Promise<any[]> {
  const result = await db.execute(query) as any;
  return Array.isArray(result) ? result : (result?.rows || []);
}

function requirePlatformAuth(req: any, res: any, next: any) {
  if (!req.session?.isPlatformAdmin) {
    return res.status(401).json({ error: "unauthorized", message: "Platform admin auth required" });
  }
  next();
}

async function logAction(admin: string, action: string, targetType?: string, targetId?: number, details?: any) {
  try {
    await db.execute(sql`
      INSERT INTO admin_action_log (admin, action, target_type, target_id, details)
      VALUES (${admin}, ${action}, ${targetType || null}, ${targetId || null}, ${JSON.stringify(details || {})}::jsonb)
    `);
  } catch {}
}

// ── SETUP (internal use) ──────────────────────────────────────────────────────
router.post("/setup", async (req, res) => {
  const { key } = req.body;
  if (key !== PLATFORM_PASSWORD) return res.status(403).json({ error: "forbidden" });
  const { setupAdminTables } = await import("../lib/setup-db");
  await setupAdminTables();
  return res.json({ success: true });
});

// ── AUTH ──────────────────────────────────────────────────────────────────────
router.post("/login", async (req, res) => {
  const { login, password } = req.body;
  if (login !== PLATFORM_LOGIN || password !== PLATFORM_PASSWORD) {
    return res.status(401).json({ error: "invalid_credentials", message: "Login yoki parol noto'g'ri" });
  }
  (req as any).session.isPlatformAdmin = true;
  logAction(PLATFORM_LOGIN, "login").catch(() => {});
  return res.json({ success: true, login: PLATFORM_LOGIN });
});

router.post("/logout", (req, res) => {
  (req as any).session.isPlatformAdmin = false;
  return res.json({ success: true });
});

router.get("/me", (req, res) => {
  if (!(req as any).session?.isPlatformAdmin) return res.status(401).json({ error: "unauthorized" });
  return res.json({ login: PLATFORM_LOGIN });
});

// ── COMPANIES LIST ────────────────────────────────────────────────────────────
router.get("/companies", requirePlatformAuth, async (req, res) => {
  try {
    const { search } = req.query;
    const companies = await db.select().from(companiesTable).orderBy(desc(companiesTable.createdAt));

    const result = await Promise.all(companies.map(async (c) => {
      const [empCount] = await db.select({ count: count() }).from(employeesTable).where(eq(employeesTable.companyId, c.id));
      const [adminUser] = await db.select().from(adminsTable).where(and(eq(adminsTable.companyId, c.id), eq(adminsTable.role, "admin")));
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
        eq(leaveRequestsTable.companyId, c.id), eq(leaveRequestsTable.status, "pending"),
      ));

      // Integrations
      const intRows = await execRows(sql`SELECT type, enabled, connected_at FROM company_integrations WHERE company_id = ${c.id}`);
      const integrations: Record<string, any> = {};
      for (const row of intRows) integrations[row.type] = { enabled: row.enabled, connectedAt: row.connected_at };

      const status = (c as any).status || "active";
      return {
        id: c.id, name: c.name, email: c.email, phone: c.phone, address: c.address,
        subscriptionPlan: c.subscriptionPlan, createdAt: c.createdAt,
        status,
        notes: (c as any).notes || null,
        employeeCount: Number(empCount?.count || 0),
        todayAttendance: Number(todayAtt?.count || 0),
        monthAttendance: Number(monthAtt?.count || 0),
        pendingLeave: Number(pendingLeave?.count || 0),
        adminEmail: adminUser?.email || null,
        adminName: adminUser?.name || null,
        adminLogin: adminUser?.login || null,
        integrations,
      };
    }));

    let filtered = result;
    if (search) {
      const s = (search as string).toLowerCase();
      filtered = result.filter(c =>
        c.name.toLowerCase().includes(s) ||
        c.email?.toLowerCase().includes(s) ||
        c.phone?.includes(s) ||
        c.adminLogin?.toLowerCase().includes(s) ||
        c.adminName?.toLowerCase().includes(s)
      );
    }

    return res.json({ data: filtered, total: filtered.length, allTotal: result.length });
  } catch (err) { console.error(err); return res.status(500).json({ error: "server_error" }); }
});

// ── CREATE COMPANY ────────────────────────────────────────────────────────────
router.post("/companies", requirePlatformAuth, async (req, res) => {
  try {
    const { name, email, phone, address, plan, adminName, adminLogin, adminPassword } = req.body;
    if (!name || !email) return res.status(400).json({ error: "name_email_required" });

    const [existing] = await db.select({ id: adminsTable.id }).from(adminsTable).where(
      or(eq(adminsTable.email, email), adminLogin ? eq(adminsTable.login, adminLogin) : eq(adminsTable.email, email))
    );
    if (existing) return res.status(409).json({ error: "email_or_login_taken", message: "Bu email yoki login band" });

    const [company] = await db.insert(companiesTable).values({
      name, email, phone: phone || "", address: address || "",
      subscriptionPlan: plan || "free",
    }).returning();

    if (adminName && adminLogin && adminPassword) {
      const hash = await bcrypt.hash(adminPassword, 10);
      await db.insert(adminsTable).values({
        companyId: company.id, name: adminName, email, login: adminLogin,
        password: hash, role: "admin",
      });
    }

    logAction(PLATFORM_LOGIN, "create_company", "company", company.id, { name }).catch(() => {});
    return res.json({ success: true, company });
  } catch (err) { console.error(err); return res.status(500).json({ error: "server_error" }); }
});

// ── COMPANY DETAIL ────────────────────────────────────────────────────────────
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
      .where(eq(attendanceTable.companyId, id)).orderBy(desc(attendanceTable.createdAt)).limit(100);
    const payrolls = await db.select().from(payrollTable)
      .where(eq(payrollTable.companyId, id)).orderBy(desc(payrollTable.year), desc(payrollTable.month)).limit(200);
    const leaveReqs = await db.select().from(leaveRequestsTable)
      .where(eq(leaveRequestsTable.companyId, id)).orderBy(desc(leaveRequestsTable.createdAt)).limit(50);
    const advanceReqs = await db.select().from(advanceRequestsTable)
      .where(eq(advanceRequestsTable.companyId, id)).orderBy(desc(advanceRequestsTable.createdAt)).limit(50);

    const intRows = await execRows(sql`SELECT * FROM company_integrations WHERE company_id = ${id}`);
    const integrations: Record<string, any> = {};
    for (const row of intRows) integrations[row.type] = {
      enabled: row.enabled, connectedAt: row.connected_at,
      settings: row.settings, notes: row.notes,
    };

    const actionLog = await execRows(sql`
      SELECT * FROM admin_action_log WHERE target_id = ${id} AND target_type = 'company'
      ORDER BY created_at DESC LIMIT 20
    `);

    const empWithData = employees.map(emp => {
      const empPayrolls = payrolls.filter(p => p.employeeId === emp.id);
      const lastPayroll = empPayrolls[0];
      const empAtt = recentAttendance.filter(a => a.employeeId === emp.id);
      const totalPaid = empPayrolls.filter(p => p.status === "paid")
        .reduce((s, p) => s + parseFloat(p.netSalary?.toString() || p.grossSalary?.toString() || "0"), 0);
      return {
        id: emp.id, fullName: emp.fullName, position: emp.position, phone: emp.phone,
        salaryType: emp.salaryType,
        monthlySalary: emp.monthlySalary ? parseFloat(emp.monthlySalary.toString()) : null,
        hourlyRate: emp.hourlyRate ? parseFloat(emp.hourlyRate.toString()) : null,
        createdAt: emp.createdAt, attendanceDays: empAtt.length, totalPaidSalary: totalPaid,
        lastPayroll: lastPayroll ? {
          month: lastPayroll.month, year: lastPayroll.year,
          grossSalary: parseFloat(lastPayroll.grossSalary.toString()),
          netSalary: parseFloat(lastPayroll.netSalary?.toString() || "0"),
          status: lastPayroll.status,
        } : null,
      };
    });

    const attWithEmp = recentAttendance.slice(0, 100).map(a => {
      const emp = employees.find(e => e.id === a.employeeId);
      return {
        id: a.id, status: a.status, checkIn: a.checkIn, checkOut: a.checkOut,
        createdAt: a.createdAt, employeeName: emp?.fullName || "—",
        lateMinutes: a.lateMinutes, workHours: a.workHours,
      };
    });

    const totalPayrollPaid = payrolls.filter(p => p.status === "paid")
      .reduce((s, p) => s + parseFloat(p.netSalary?.toString() || p.grossSalary?.toString() || "0"), 0);

    return res.json({
      company: {
        id: company.id, name: company.name, email: company.email, phone: company.phone,
        address: company.address, subscriptionPlan: company.subscriptionPlan, createdAt: company.createdAt,
        status: (company as any).status || "active",
        notes: (company as any).notes || "",
      },
      admins, employees: empWithData, recentAttendance: attWithEmp,
      leaveRequests: leaveReqs, advanceRequests: advanceReqs, integrations, actionLog,
      stats: {
        totalEmployees: employees.length, totalAdmins: admins.length,
        totalAttendance: recentAttendance.length, totalPayrollPaid,
        pendingLeave: leaveReqs.filter(r => r.status === "pending").length,
        pendingAdvance: advanceReqs.filter(r => r.status === "pending").length,
        todayAttendance: recentAttendance.filter(a => new Date(a.createdAt).toDateString() === new Date().toDateString()).length,
      },
    });
  } catch (err) { console.error(err); return res.status(500).json({ error: "server_error" }); }
});

// ── COMPANY ACTIONS ───────────────────────────────────────────────────────────
router.patch("/companies/:id/plan", requirePlatformAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { plan } = req.body;
    const valid = ["free", "starter", "business", "enterprise"];
    if (!valid.includes(plan)) return res.status(400).json({ error: "invalid_plan" });
    await db.update(companiesTable).set({ subscriptionPlan: plan }).where(eq(companiesTable.id, id));
    logAction(PLATFORM_LOGIN, "change_plan", "company", id, { plan }).catch(() => {});
    return res.json({ success: true });
  } catch (err) { return res.status(500).json({ error: "server_error" }); }
});

router.patch("/companies/:id/status", requirePlatformAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status } = req.body;
    const valid = ["active", "suspended", "blocked"];
    if (!valid.includes(status)) return res.status(400).json({ error: "invalid_status" });
    await db.execute(sql`UPDATE companies SET status = ${status} WHERE id = ${id}`);
    logAction(PLATFORM_LOGIN, `set_status_${status}`, "company", id).catch(() => {});
    return res.json({ success: true });
  } catch (err) { return res.status(500).json({ error: "server_error" }); }
});

router.patch("/companies/:id/notes", requirePlatformAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { notes } = req.body;
    await db.execute(sql`UPDATE companies SET notes = ${notes} WHERE id = ${id}`);
    return res.json({ success: true });
  } catch (err) { return res.status(500).json({ error: "server_error" }); }
});

router.post("/companies/:id/reset-password", requirePlatformAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { newPassword, adminId } = req.body;
    if (!newPassword || newPassword.length < 6) return res.status(400).json({ error: "password_too_short", message: "Kamida 6 ta belgi" });
    const hash = await bcrypt.hash(newPassword, 10);
    const whereClause = adminId
      ? and(eq(adminsTable.id, adminId), eq(adminsTable.companyId, id))
      : and(eq(adminsTable.companyId, id), eq(adminsTable.role, "admin"));
    await db.update(adminsTable).set({ password: hash }).where(whereClause);
    logAction(PLATFORM_LOGIN, "reset_password", "company", id, { adminId }).catch(() => {});
    return res.json({ success: true, message: "Parol yangilandi" });
  } catch (err) { console.error(err); return res.status(500).json({ error: "server_error" }); }
});

router.patch("/companies/:id/integrations/:type", requirePlatformAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const type = req.params.type;
    const { enabled, settings, notes } = req.body;
    const VALID_TYPES = ["1c", "uzasbo", "telegram", "sms", "email", "payment", "mybuh", "soliq"];
    if (!VALID_TYPES.includes(type)) return res.status(400).json({ error: "invalid_type" });

    await db.execute(sql`
      INSERT INTO company_integrations (company_id, type, enabled, settings, notes, connected_at, updated_at)
      VALUES (${id}, ${type}, ${enabled}, ${JSON.stringify(settings || {})}::jsonb, ${notes || null},
        ${enabled ? sql`NOW()` : sql`NULL`}, NOW())
      ON CONFLICT (company_id, type)
      DO UPDATE SET enabled = ${enabled}, settings = ${JSON.stringify(settings || {})}::jsonb,
        notes = COALESCE(${notes || null}, company_integrations.notes),
        connected_at = CASE WHEN ${enabled} THEN NOW() ELSE company_integrations.connected_at END,
        updated_at = NOW()
    `);
    logAction(PLATFORM_LOGIN, `integration_${enabled ? "on" : "off"}_${type}`, "company", id).catch(() => {});
    return res.json({ success: true });
  } catch (err) { console.error(err); return res.status(500).json({ error: "server_error" }); }
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
    await db.execute(sql`DELETE FROM company_integrations WHERE company_id = ${id}`);
    logAction(PLATFORM_LOGIN, "delete_company", "company", id).catch(() => {});
    return res.json({ success: true });
  } catch (err) { console.error(err); return res.status(500).json({ error: "server_error" }); }
});

// ── BROADCAST / ANNOUNCEMENTS ─────────────────────────────────────────────────
router.post("/broadcast", requirePlatformAuth, async (req, res) => {
  try {
    const { title, message, targetCompanyId } = req.body;
    if (!title || !message) return res.status(400).json({ error: "title_message_required" });
    await db.execute(sql`
      INSERT INTO platform_announcements (title, message, target, target_company_id)
      VALUES (${title}, ${message}, ${targetCompanyId ? "company" : "all"}, ${targetCompanyId || null})
    `);
    logAction(PLATFORM_LOGIN, "broadcast", "announcement", undefined, { title, targetCompanyId }).catch(() => {});
    return res.json({ success: true });
  } catch (err) { return res.status(500).json({ error: "server_error" }); }
});

router.get("/announcements", requirePlatformAuth, async (req, res) => {
  try {
    const rows = await execRows(sql`
      SELECT * FROM platform_announcements ORDER BY created_at DESC LIMIT 50
    `);
    return res.json({ data: rows });
  } catch (err) { return res.status(500).json({ error: "server_error" }); }
});

// ── ALL EMPLOYEES ─────────────────────────────────────────────────────────────
router.get("/employees", requirePlatformAuth, async (req, res) => {
  try {
    const { search } = req.query;
    const employees = await db.select().from(employeesTable).orderBy(desc(employeesTable.createdAt));
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
  } catch (err) { return res.status(500).json({ error: "server_error" }); }
});

router.delete("/employees/:id", requirePlatformAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(attendanceTable).where(eq(attendanceTable.employeeId, id));
    await db.delete(payrollTable).where(eq(payrollTable.employeeId, id));
    await db.delete(employeesTable).where(eq(employeesTable.id, id));
    return res.json({ success: true });
  } catch (err) { return res.status(500).json({ error: "server_error" }); }
});

// ── STATS & CHARTS ────────────────────────────────────────────────────────────
router.get("/stats", requirePlatformAuth, async (req, res) => {
  try {
    const [companyCount] = await db.select({ count: count() }).from(companiesTable);
    const [employeeCount] = await db.select({ count: count() }).from(employeesTable);
    const [todayCount] = await db.select({ count: count() }).from(attendanceTable).where(
      sql`DATE(${attendanceTable.createdAt}) = CURRENT_DATE`
    );
    const planCounts = await execRows(sql`
      SELECT subscription_plan as plan, COUNT(*) as cnt FROM companies GROUP BY subscription_plan
    `);
    const monthlyGrowth = await execRows(sql`
      SELECT TO_CHAR(created_at, 'YYYY-MM') as month, COUNT(*) as cnt
      FROM companies
      WHERE created_at >= NOW() - INTERVAL '6 months'
      GROUP BY month ORDER BY month
    `);
    const empGrowth = await execRows(sql`
      SELECT TO_CHAR(created_at, 'YYYY-MM') as month, COUNT(*) as cnt
      FROM employees
      WHERE created_at >= NOW() - INTERVAL '6 months'
      GROUP BY month ORDER BY month
    `);
    const attByDay = await execRows(sql`
      SELECT TO_CHAR(created_at, 'YYYY-MM-DD') as day, COUNT(*) as cnt
      FROM attendance
      WHERE created_at >= NOW() - INTERVAL '14 days'
      GROUP BY day ORDER BY day
    `);
    const totalPayrollRows = await execRows(sql`
      SELECT SUM(net_salary) as total FROM payroll WHERE status = 'paid'
    `);
    const integrationStats = await execRows(sql`
      SELECT type, COUNT(*) FILTER (WHERE enabled = true) as enabled_count,
        COUNT(*) as total_count
      FROM company_integrations GROUP BY type
    `);

    return res.json({
      totals: {
        companies: Number(companyCount?.count || 0),
        employees: Number(employeeCount?.count || 0),
        todayAttendance: Number(todayCount?.count || 0),
        totalPayroll: parseFloat(totalPayrollRows[0]?.total || "0"),
      },
      planDistribution: planCounts,
      companyGrowth: monthlyGrowth,
      employeeGrowth: empGrowth,
      attendanceByDay: attByDay,
      integrationStats,
    });
  } catch (err) { console.error(err); return res.status(500).json({ error: "server_error" }); }
});

// ── ACTION LOG ────────────────────────────────────────────────────────────────
router.get("/action-log", requirePlatformAuth, async (req, res) => {
  try {
    const rows = await execRows(sql`
      SELECT * FROM admin_action_log ORDER BY created_at DESC LIMIT 100
    `);
    return res.json({ data: rows });
  } catch (err) { return res.status(500).json({ error: "server_error" }); }
});

// ── ACTIVITY ─────────────────────────────────────────────────────────────────
router.get("/activity", requirePlatformAuth, async (req, res) => {
  try {
    const recentCompanies = await db.select({ id: companiesTable.id, name: companiesTable.name, createdAt: companiesTable.createdAt })
      .from(companiesTable).orderBy(desc(companiesTable.createdAt)).limit(5);
    const recentEmployees = await db.select({ id: employeesTable.id, fullName: employeesTable.fullName, companyId: employeesTable.companyId, position: employeesTable.position, createdAt: employeesTable.createdAt })
      .from(employeesTable).orderBy(desc(employeesTable.createdAt)).limit(10);
    const recentAttendance = await db.select({ id: attendanceTable.id, status: attendanceTable.status, companyId: attendanceTable.companyId, employeeId: attendanceTable.employeeId, createdAt: attendanceTable.createdAt })
      .from(attendanceTable).orderBy(desc(attendanceTable.createdAt)).limit(15);

    const companies = await db.select({ id: companiesTable.id, name: companiesTable.name }).from(companiesTable);
    const employees = await db.select({ id: employeesTable.id, fullName: employeesTable.fullName }).from(employeesTable);
    const companyMap = new Map(companies.map(c => [c.id, c.name]));
    const empMap = new Map(employees.map(e => [e.id, e.fullName]));

    const feed = [
      ...recentCompanies.map(c => ({ type: "company_created", time: c.createdAt, text: `Yangi korxona: ${c.name}`, icon: "building" })),
      ...recentEmployees.map(e => ({ type: "employee_created", time: e.createdAt, text: `Yangi xodim: ${e.fullName} (${companyMap.get(e.companyId) || "—"})`, icon: "user" })),
      ...recentAttendance.map(a => ({ type: "attendance", time: a.createdAt, text: `Davomat: ${empMap.get(a.employeeId) || "—"} — ${a.status === "present" ? "keldi" : a.status === "late" ? "kechikdi" : a.status}`, icon: "clock" })),
    ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 30);

    return res.json({ feed });
  } catch (err) { return res.status(500).json({ error: "server_error" }); }
});

// ── SYSTEM ────────────────────────────────────────────────────────────────────
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

    let diskTotal = 0, diskUsed = 0, diskFree = 0;
    try {
      const dfOut = execSync("df -BM / 2>/dev/null | tail -1", { timeout: 3000 }).toString();
      const parts = dfOut.trim().split(/\s+/);
      diskTotal = parseInt(parts[1]) || 0; diskUsed = parseInt(parts[2]) || 0; diskFree = parseInt(parts[3]) || 0;
    } catch {}

    let dbSizeMB = 0, tableStats: any[] = [];
    try {
      const dbSzRows = await execRows(sql`SELECT pg_database_size(current_database()) as size`);
      dbSizeMB = Math.round((dbSzRows[0]?.size || 0) / 1024 / 1024);
      const rows = await execRows(sql`
        SELECT tablename,
          pg_size_pretty(pg_total_relation_size(quote_ident(tablename))) as size
        FROM pg_tables WHERE schemaname = 'public'
        ORDER BY pg_total_relation_size(quote_ident(tablename)) DESC LIMIT 10
      `);
      tableStats = rows.map((r: any) => ({ table: r.tablename, size: r.size }));
    } catch {}

    const [companyCount] = await db.select({ count: count() }).from(companiesTable);
    const [employeeCount] = await db.select({ count: count() }).from(employeesTable);
    const [attendanceCount] = await db.select({ count: count() }).from(attendanceTable);
    const [payrollCount] = await db.select({ count: count() }).from(payrollTable);
    const [todayCount] = await db.select({ count: count() }).from(attendanceTable).where(
      sql`DATE(${attendanceTable.createdAt}) = CURRENT_DATE`
    );

    const uptimeDays = Math.floor(uptime / 86400);
    const uptimeHours = Math.floor(uptime / 3600);
    const uptimeMinutes = Math.floor((uptime % 3600) / 60);
    const memUsedPercent = Math.round((1 - freeMem / totalMem) * 100);
    const heapPercent = Math.round((mem.heapUsed / mem.heapTotal) * 100);
    const diskUsedPercent = diskTotal > 0 ? Math.round((diskUsed / diskTotal) * 100) : 0;
    const cpuLoad = Math.round((loadAvg[0] / cpus.length) * 100);

    return res.json({
      server: {
        uptime: uptimeDays > 0 ? `${uptimeDays}k ${uptimeHours % 24}s ${uptimeMinutes}d` : `${uptimeHours}s ${uptimeMinutes}d`,
        uptimeSeconds: uptime, nodeVersion: process.version,
        platform: process.platform, environment: process.env.NODE_ENV || "development",
        startedAt: new Date(Date.now() - uptime * 1000).toISOString(),
      },
      memory: {
        heapUsed: Math.round(mem.heapUsed / 1024 / 1024), heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
        heapPercent, rss: Math.round(mem.rss / 1024 / 1024), external: Math.round(mem.external / 1024 / 1024),
        systemTotal: Math.round(totalMem / 1024 / 1024), systemFree: Math.round(freeMem / 1024 / 1024),
        systemUsed: Math.round((totalMem - freeMem) / 1024 / 1024), systemUsedPercent: memUsedPercent,
      },
      cpu: {
        count: cpus.length, model: cpus[0]?.model?.trim() || "Unknown", speed: cpus[0]?.speed || 0,
        loadAvg1: loadAvg[0].toFixed(2), loadAvg5: loadAvg[1].toFixed(2), loadAvg15: loadAvg[2].toFixed(2),
        loadPercent: cpuLoad,
      },
      disk: { total: diskTotal, used: diskUsed, free: diskFree, usedPercent: diskUsedPercent },
      database: { latencyMs: dbLatency, status: dbLatency < 50 ? "excellent" : dbLatency < 150 ? "good" : dbLatency < 500 ? "slow" : "critical", sizeMB: dbSizeMB, tables: tableStats },
      stats: {
        companies: Number(companyCount?.count || 0), employees: Number(employeeCount?.count || 0),
        totalAttendance: Number(attendanceCount?.count || 0), totalPayrolls: Number(payrollCount?.count || 0),
        todayAttendance: Number(todayCount?.count || 0),
      },
      health: buildHealthChecks(cpuLoad, memUsedPercent, heapPercent, diskUsedPercent, dbLatency, dbSizeMB),
      recommendations: buildRecommendations(cpuLoad, memUsedPercent, heapPercent, diskUsedPercent, dbLatency),
    });
  } catch (err) { console.error(err); return res.status(500).json({ error: "server_error" }); }
});

function buildHealthChecks(cpu: number, mem: number, heap: number, disk: number, dbMs: number, dbMB: number) {
  return [
    { name: "CPU", value: `${cpu}%`, status: cpu > 80 ? "critical" : cpu > 50 ? "warning" : "ok", detail: "Yuklanish darajasi" },
    { name: "RAM", value: `${mem}%`, status: mem > 85 ? "critical" : mem > 70 ? "warning" : "ok", detail: "Tizim xotirasi" },
    { name: "Heap", value: `${heap}%`, status: heap > 80 ? "warning" : "ok", detail: "Node.js heap" },
    { name: "Disk", value: `${disk}%`, status: disk > 90 ? "critical" : disk > 75 ? "warning" : "ok", detail: "Disk maydoni" },
    { name: "DB Ping", value: `${dbMs}ms`, status: dbMs > 500 ? "critical" : dbMs > 150 ? "warning" : "ok", detail: "Ma'lumotlar bazasi" },
    { name: "DB Hajm", value: `${dbMB}MB`, status: dbMB > 4000 ? "warning" : "ok", detail: "Baza o'lchami" },
  ];
}
function buildRecommendations(cpu: number, mem: number, heap: number, disk: number, dbMs: number) {
  const recs: Array<{ level: "ok" | "warning" | "critical"; text: string }> = [];
  if (cpu > 80) recs.push({ level: "critical", text: "CPU juda band — server hajmini oshiring yoki yukni taqsimlang" });
  else if (cpu > 50) recs.push({ level: "warning", text: "CPU yuklanishi o'rtacha — kuzatishni davom ettiring" });
  else recs.push({ level: "ok", text: "CPU yuklanishi normal" });
  if (mem > 85) recs.push({ level: "critical", text: "RAM to'layapti — serverni restart qiling yoki RAM hajmini oshiring" });
  else if (mem > 70) recs.push({ level: "warning", text: "RAM ishlatilishi yuqori — kuzatishni davom ettiring" });
  else recs.push({ level: "ok", text: "RAM holati yaxshi" });
  if (heap > 80) recs.push({ level: "warning", text: "Node.js heap to'layapti — xotira sizib chiqishini tekshiring" });
  else recs.push({ level: "ok", text: "Node.js heap normal" });
  if (disk > 90) recs.push({ level: "critical", text: "Disk to'lib qolayapti — keraksiz fayllarni o'chiring yoki disk kengaytiring" });
  else if (disk > 75) recs.push({ level: "warning", text: "Disk 75%+ to'lgan — kuzatishni davom ettiring" });
  else recs.push({ level: "ok", text: "Disk maydoni yetarli" });
  if (dbMs > 500) recs.push({ level: "critical", text: "DB kechikishi juda yuqori — indekslar va connection pool'ni tekshiring" });
  else if (dbMs > 150) recs.push({ level: "warning", text: "DB birozgina sekin — query optimallashtirish tavsiya etiladi" });
  else recs.push({ level: "ok", text: "Ma'lumotlar bazasi tez ishlayapti" });
  return recs;
}

// ── AI SETTINGS ───────────────────────────────────────────────────────────────
const withTimeout = <T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> =>
  Promise.race([promise, new Promise<T>(resolve => setTimeout(() => resolve(fallback), ms))]);

router.get("/ai-settings", requirePlatformAuth, async (req, res) => {
  try {
    const rows = await withTimeout(
      execRows(sql`SELECT id, provider, model, enabled, settings, notes, api_key_hint, created_at, updated_at FROM platform_ai_settings ORDER BY created_at DESC`).catch(() => []),
      6000, []
    );
    const access = await withTimeout(
      execRows(sql`SELECT ca.*, c.name as company_name FROM company_ai_access ca JOIN companies c ON c.id = ca.company_id ORDER BY c.name`).catch(() => []),
      6000, []
    );
    return res.json({ providers: rows, companyAccess: access });
  } catch (err) { console.error(err); return res.status(500).json({ error: "server_error" }); }
});

router.post("/ai-settings", requirePlatformAuth, async (req, res) => {
  try {
    const { provider, apiKey, model, enabled, notes } = req.body;
    if (!provider) return res.status(400).json({ error: "provider_required" });
    const hint = apiKey ? apiKey.substring(0, 8) + "•••••••••••••••" : null;
    await db.execute(sql`
      INSERT INTO platform_ai_settings (provider, api_key, api_key_hint, model, enabled, notes)
      VALUES (${provider}, ${apiKey || null}, ${hint}, ${model || null}, ${!!enabled}, ${notes || null})
    `);
    logAction(PLATFORM_LOGIN, "ai_settings_add", "ai", undefined, { provider }).catch(() => {});
    return res.json({ success: true });
  } catch (err) { console.error(err); return res.status(500).json({ error: "server_error" }); }
});

router.patch("/ai-settings/:id", requirePlatformAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { provider, apiKey, model, enabled, notes } = req.body;
    if (apiKey) {
      const hint = apiKey.substring(0, 8) + "•••••••••••••••";
      await db.execute(sql`UPDATE platform_ai_settings SET provider=${provider||sql`provider`}, api_key=${apiKey}, api_key_hint=${hint}, model=${model||sql`model`}, enabled=${!!enabled}, notes=${notes||sql`notes`}, updated_at=NOW() WHERE id=${id}`);
    } else {
      await db.execute(sql`UPDATE platform_ai_settings SET provider=${provider||sql`provider`}, model=${model||sql`model`}, enabled=${!!enabled}, notes=${notes||sql`notes`}, updated_at=NOW() WHERE id=${id}`);
    }
    return res.json({ success: true });
  } catch (err) { console.error(err); return res.status(500).json({ error: "server_error" }); }
});

router.patch("/ai-settings/:id/toggle", requirePlatformAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.execute(sql`UPDATE platform_ai_settings SET enabled = NOT enabled, updated_at = NOW() WHERE id = ${id}`);
    return res.json({ success: true });
  } catch (err) { return res.status(500).json({ error: "server_error" }); }
});

router.delete("/ai-settings/:id", requirePlatformAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.execute(sql`DELETE FROM platform_ai_settings WHERE id = ${id}`);
    logAction(PLATFORM_LOGIN, "ai_settings_delete", "ai", id).catch(() => {});
    return res.json({ success: true });
  } catch (err) { return res.status(500).json({ error: "server_error" }); }
});

router.patch("/ai-access/:companyId", requirePlatformAuth, async (req, res) => {
  try {
    const companyId = parseInt(req.params.companyId);
    const { enabled, monthlyLimit } = req.body;
    await db.execute(sql`
      INSERT INTO company_ai_access (company_id, enabled, monthly_limit)
      VALUES (${companyId}, ${!!enabled}, ${monthlyLimit || 500})
      ON CONFLICT (company_id) DO UPDATE SET enabled = ${!!enabled}, monthly_limit = ${monthlyLimit || 500}
    `);
    logAction(PLATFORM_LOGIN, `ai_access_${enabled ? "on" : "off"}`, "company", companyId).catch(() => {});
    return res.json({ success: true });
  } catch (err) { return res.status(500).json({ error: "server_error" }); }
});

router.post("/ai-test", requirePlatformAuth, async (req, res) => {
  try {
    const { settingsId } = req.body;
    const rows = await execRows(sql`SELECT * FROM platform_ai_settings WHERE id = ${settingsId}`);
    if (!rows[0]) return res.status(404).json({ error: "not_found" });
    const setting = rows[0];
    if (!setting.api_key) return res.status(400).json({ error: "no_api_key", message: "API kalit topilmadi" });

    const startMs = Date.now();
    try {
      let testResult = "";
      if (setting.provider === "openai") {
        const resp = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { "Authorization": `Bearer ${setting.api_key}`, "Content-Type": "application/json" },
          body: JSON.stringify({ model: setting.model || "gpt-4o-mini", messages: [{ role: "user", content: "Say 'API test OK' in Uzbek" }], max_tokens: 20 }),
        });
        const data = await resp.json() as any;
        testResult = data.choices?.[0]?.message?.content || JSON.stringify(data);
      } else if (setting.provider === "anthropic") {
        const resp = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "x-api-key": setting.api_key, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
          body: JSON.stringify({ model: setting.model || "claude-3-haiku-20240307", max_tokens: 20, messages: [{ role: "user", content: "Say 'API test OK' in Uzbek" }] }),
        });
        const data = await resp.json() as any;
        testResult = data.content?.[0]?.text || JSON.stringify(data);
      } else if (setting.provider === "gemini") {
        const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${setting.model || "gemini-1.5-flash"}:generateContent?key=${setting.api_key}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: "Say 'API test OK' in Uzbek" }] }] }),
        });
        const data = await resp.json() as any;
        testResult = data.candidates?.[0]?.content?.parts?.[0]?.text || JSON.stringify(data);
      } else {
        testResult = `${setting.provider} uchun test amalga oshirilmadi`;
      }
      return res.json({ success: true, result: testResult, latencyMs: Date.now() - startMs });
    } catch (apiErr: any) {
      return res.json({ success: false, error: apiErr.message, latencyMs: Date.now() - startMs });
    }
  } catch (err) { return res.status(500).json({ error: "server_error" }); }
});

// ─── SMS ESKIZ SETTINGS ───────────────────────────────────────────
router.get("/sms-settings", requirePlatformAuth, async (req, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT id, provider, email, sender_id, enabled, test_mode, notes, created_at, updated_at
      FROM platform_sms_settings
      LIMIT 1
    `);
    const row = (rows as any).rows?.[0] || null;
    return res.json({ settings: row });
  } catch (err) {
    return res.json({ settings: null });
  }
});

router.put("/sms-settings", requirePlatformAuth, async (req, res) => {
  try {
    const { email, password, senderId, enabled, testMode, notes } = req.body;
    if (!email) return res.status(400).json({ error: "Email kiritilishi shart" });

    const existing = await db.execute(sql`SELECT id FROM platform_sms_settings LIMIT 1`);
    const existingRow = (existing as any).rows?.[0];

    if (existingRow) {
      if (password && password.trim()) {
        await db.execute(sql`
          UPDATE platform_sms_settings
          SET email = ${email}, password = ${password}, sender_id = ${senderId || "4546"},
              enabled = ${!!enabled}, test_mode = ${!!testMode}, notes = ${notes || null}, updated_at = NOW()
          WHERE id = ${existingRow.id}
        `);
      } else {
        await db.execute(sql`
          UPDATE platform_sms_settings
          SET email = ${email}, sender_id = ${senderId || "4546"},
              enabled = ${!!enabled}, test_mode = ${!!testMode}, notes = ${notes || null}, updated_at = NOW()
          WHERE id = ${existingRow.id}
        `);
      }
    } else {
      await db.execute(sql`
        INSERT INTO platform_sms_settings (provider, email, password, sender_id, enabled, test_mode, notes)
        VALUES ('eskiz', ${email}, ${password || null}, ${senderId || "4546"}, ${!!enabled}, ${!!testMode}, ${notes || null})
      `);
    }

    logAction("platform_admin", "sms_settings_updated", "sms_settings", null, { email }).catch(() => {});
    return res.json({ success: true });
  } catch (err) {
    console.error("SMS settings save error:", err);
    return res.status(500).json({ error: "server_error" });
  }
});

router.post("/sms-test", requirePlatformAuth, async (req, res) => {
  try {
    const { testEskizConnection } = await import("../lib/eskiz");
    const rows = await db.execute(sql`SELECT email, password FROM platform_sms_settings WHERE enabled = true LIMIT 1`);
    const row = (rows as any).rows?.[0];
    if (!row?.email || !row?.password) {
      return res.json({ success: false, error: "SMS sozlamalar topilmadi yoki to'ldirilmagan" });
    }
    const result = await testEskizConnection(row.email, row.password);
    return res.json(result);
  } catch (err: any) {
    return res.json({ success: false, error: err.message });
  }
});

export default router;
