import { Router, type IRouter } from "express";
import { db, adminsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { requireAdmin } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/", requireAdmin, async (req, res) => {
  try {
    const companyId = (req.session as any).companyId;
    const staff = await db.select({
      id: adminsTable.id,
      name: adminsTable.name,
      email: adminsTable.email,
      role: adminsTable.role,
      createdAt: adminsTable.createdAt,
    }).from(adminsTable).where(and(
      eq(adminsTable.companyId, companyId),
    ));
    return res.json({ data: staff, total: staff.length });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server_error" });
  }
});

router.post("/", requireAdmin, async (req, res) => {
  try {
    const companyId = (req.session as any).companyId;
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: "validation_error", message: "name, email and password required" });
    }
    const allowedRoles = ["accountant", "viewer"];
    const staffRole = allowedRoles.includes(role) ? role : "accountant";

    const [existing] = await db.select().from(adminsTable).where(eq(adminsTable.email, email));
    if (existing) {
      return res.status(400).json({ error: "duplicate", message: "Email already exists" });
    }

    const hashed = await bcrypt.hash(password, 10);
    const [created] = await db.insert(adminsTable).values({
      companyId, name, email, password: hashed, role: staffRole,
    }).returning({ id: adminsTable.id, name: adminsTable.name, email: adminsTable.email, role: adminsTable.role, createdAt: adminsTable.createdAt });

    return res.status(201).json({ data: created });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server_error" });
  }
});

router.patch("/:id", requireAdmin, async (req, res) => {
  try {
    const companyId = (req.session as any).companyId;
    const id = parseInt(req.params.id);
    const { name, password } = req.body;

    const [existing] = await db.select().from(adminsTable).where(and(
      eq(adminsTable.id, id),
      eq(adminsTable.companyId, companyId),
    ));
    if (!existing) return res.status(404).json({ error: "not_found" });
    if (existing.role === "admin" && (req.session as any).adminId !== id) {
      return res.status(403).json({ error: "forbidden", message: "Cannot modify another admin" });
    }

    const updates: any = {};
    if (name) updates.name = name;
    if (password) updates.password = await bcrypt.hash(password, 10);

    const [updated] = await db.update(adminsTable).set(updates)
      .where(and(eq(adminsTable.id, id), eq(adminsTable.companyId, companyId)))
      .returning({ id: adminsTable.id, name: adminsTable.name, email: adminsTable.email, role: adminsTable.role, createdAt: adminsTable.createdAt });

    return res.json({ data: updated });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server_error" });
  }
});

router.delete("/:id", requireAdmin, async (req, res) => {
  try {
    const companyId = (req.session as any).companyId;
    const id = parseInt(req.params.id);
    const adminId = (req.session as any).adminId;

    const [existing] = await db.select().from(adminsTable).where(and(
      eq(adminsTable.id, id),
      eq(adminsTable.companyId, companyId),
    ));
    if (!existing) return res.status(404).json({ error: "not_found" });
    if (existing.id === adminId) {
      return res.status(400).json({ error: "bad_request", message: "Cannot delete yourself" });
    }
    if (existing.role === "admin") {
      return res.status(403).json({ error: "forbidden", message: "Cannot delete main admin" });
    }

    await db.delete(adminsTable).where(and(eq(adminsTable.id, id), eq(adminsTable.companyId, companyId)));
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server_error" });
  }
});

export default router;
