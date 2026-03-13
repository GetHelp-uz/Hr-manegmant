import { Router, type IRouter } from "express";
import { db, devicesTable } from "@workspace/db";
import { eq, and, sql, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const companyId = (req.session as any).companyId;
    const devices = await db.select().from(devicesTable)
      .where(eq(devicesTable.companyId, companyId))
      .orderBy(desc(devicesTable.createdAt));

    return res.json({ data: devices, total: devices.length });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server_error" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const companyId = (req.session as any).companyId;
    const { deviceName, location } = req.body;
    if (!deviceName || !location) {
      return res.status(400).json({ error: "validation_error", message: "deviceName and location required" });
    }

    const [device] = await db.insert(devicesTable).values({ companyId, deviceName, location }).returning();
    return res.status(201).json(device);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server_error" });
  }
});

router.put("/:id", requireAuth, async (req, res) => {
  try {
    const companyId = (req.session as any).companyId;
    const id = parseInt(req.params.id);
    const { deviceName, location } = req.body;

    const [existing] = await db.select().from(devicesTable)
      .where(and(eq(devicesTable.id, id), eq(devicesTable.companyId, companyId)));
    if (!existing) return res.status(404).json({ error: "not_found" });

    const [updated] = await db.update(devicesTable).set({ deviceName, location })
      .where(eq(devicesTable.id, id)).returning();
    return res.json(updated);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server_error" });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const companyId = (req.session as any).companyId;
    const id = parseInt(req.params.id);

    const [existing] = await db.select().from(devicesTable)
      .where(and(eq(devicesTable.id, id), eq(devicesTable.companyId, companyId)));
    if (!existing) return res.status(404).json({ error: "not_found" });

    await db.delete(devicesTable).where(eq(devicesTable.id, id));
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server_error" });
  }
});

export default router;
