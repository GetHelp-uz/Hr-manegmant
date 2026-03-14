import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { branchesTable, employeesTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const companyId = (req.session as any).companyId;
    const branches = await db.select().from(branchesTable).where(eq(branchesTable.companyId, companyId));
    const withStats = await Promise.all(branches.map(async (b) => {
      const [{ count }] = await db.select({ count: sql<number>`count(*)::int` })
        .from(employeesTable)
        .where(and(eq(employeesTable.branchId, b.id), eq(employeesTable.status, "active")));
      return { ...b, employeeCount: count || 0 };
    }));
    return res.json(withStats);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server_error" });
  }
});

router.post("/", requireAdmin, async (req, res) => {
  try {
    const companyId = (req.session as any).companyId;
    const { name, address, phone, timezone, managerId, notes } = req.body;
    if (!name) return res.status(400).json({ error: "validation_error", message: "name required" });
    const [branch] = await db.insert(branchesTable).values({
      companyId,
      name,
      address: address || null,
      phone: phone || null,
      timezone: timezone || "Asia/Tashkent",
      managerId: managerId ? parseInt(managerId) : null,
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
    const { name, address, phone, timezone, managerId, notes, status } = req.body;
    const [updated] = await db.update(branchesTable)
      .set({ name, address, phone, timezone, managerId: managerId ? parseInt(managerId) : null, notes, status })
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
