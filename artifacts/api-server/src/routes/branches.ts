import { Router, type IRouter } from "express";
import { db, pool } from "@workspace/db";
import { branchesTable, employeesTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const companyId = (req.session as any).companyId;
    const client = await pool.connect();
    try {
      const { rows } = await client.query(`
        SELECT b.*,
          cs.name AS shift_name, cs.start_time AS shift_start, cs.end_time AS shift_end, cs.color AS shift_color,
          COUNT(e.id) FILTER (WHERE e.status = 'active') AS employee_count
        FROM branches b
        LEFT JOIN company_shifts cs ON cs.id = b.shift_id AND cs.company_id = $1
        LEFT JOIN employees e ON e.branch_id = b.id
        WHERE b.company_id = $1
        GROUP BY b.id, cs.name, cs.start_time, cs.end_time, cs.color
        ORDER BY b.created_at ASC
      `, [companyId]);
      return res.json(rows.map(r => ({
        ...r,
        employeeCount: parseInt(r.employee_count) || 0,
        shiftInfo: r.shift_name ? { name: r.shift_name, startTime: r.shift_start, endTime: r.shift_end, color: r.shift_color } : null,
      })));
    } finally { client.release(); }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server_error" });
  }
});

router.post("/", requireAdmin, async (req, res) => {
  try {
    const companyId = (req.session as any).companyId;
    const { name, address, phone, timezone, managerId, shiftId, notes } = req.body;
    if (!name) return res.status(400).json({ error: "validation_error", message: "name required" });
    const [branch] = await db.insert(branchesTable).values({
      companyId,
      name,
      address: address || null,
      phone: phone || null,
      timezone: timezone || "Asia/Tashkent",
      managerId: managerId ? parseInt(managerId) : null,
      shiftId: shiftId ? parseInt(shiftId) : null,
      notes: notes || null,
      status: "active",
    }).returning();
    return res.status(201).json(branch);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server_error" });
  }
});

router.put("/:id", requireAdmin, async (req, res) => {
  try {
    const companyId = (req.session as any).companyId;
    const { id } = req.params;
    const { name, address, phone, timezone, managerId, shiftId, notes, status } = req.body;
    const [updated] = await db.update(branchesTable)
      .set({
        name, address, phone, timezone,
        managerId: managerId ? parseInt(managerId) : null,
        shiftId: shiftId ? parseInt(shiftId) : null,
        notes, status,
      })
      .where(and(eq(branchesTable.id, parseInt(id)), eq(branchesTable.companyId, companyId)))
      .returning();
    if (!updated) return res.status(404).json({ error: "not_found" });
    return res.json(updated);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server_error" });
  }
});

router.delete("/:id", requireAdmin, async (req, res) => {
  try {
    const companyId = (req.session as any).companyId;
    const { id } = req.params;
    await db.delete(branchesTable).where(and(eq(branchesTable.id, parseInt(id)), eq(branchesTable.companyId, companyId)));
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server_error" });
  }
});

export default router;
