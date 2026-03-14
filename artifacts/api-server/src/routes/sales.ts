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

export default router;
