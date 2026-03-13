import { Router, type IRouter } from "express";
import { db, devicesTable, companiesTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

function generateLogin(companyId: number, deviceId: number): string {
  return `kiosk_${companyId}_${deviceId}`;
}

function generatePassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let pass = "";
  for (let i = 0; i < 8; i++) {
    pass += chars[Math.floor(Math.random() * chars.length)];
  }
  return pass;
}

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
      return res.status(400).json({ error: "validation_error", message: "deviceName va location kerak" });
    }

    const tempPassword = generatePassword();
    const [device] = await db.insert(devicesTable)
      .values({ companyId, deviceName, location, deviceLogin: "", devicePassword: tempPassword })
      .returning();

    const login = generateLogin(companyId, device.id);
    const [updated] = await db.update(devicesTable)
      .set({ deviceLogin: login })
      .where(eq(devicesTable.id, device.id))
      .returning();

    return res.status(201).json(updated);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server_error" });
  }
});

router.post("/:id/regenerate-password", requireAuth, async (req, res) => {
  try {
    const companyId = (req.session as any).companyId;
    const id = parseInt(req.params.id);

    const [existing] = await db.select().from(devicesTable)
      .where(and(eq(devicesTable.id, id), eq(devicesTable.companyId, companyId)));
    if (!existing) return res.status(404).json({ error: "not_found" });

    const newPassword = generatePassword();
    const [updated] = await db.update(devicesTable)
      .set({ devicePassword: newPassword })
      .where(eq(devicesTable.id, id))
      .returning();
    return res.json(updated);
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

    const [updated] = await db.update(devicesTable)
      .set({ deviceName, location })
      .where(eq(devicesTable.id, id))
      .returning();
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

router.post("/auth", async (req, res) => {
  try {
    const { login, password } = req.body;
    if (!login || !password) {
      return res.status(400).json({ error: "validation_error", message: "Login va parol kerak" });
    }

    const [device] = await db.select().from(devicesTable)
      .where(eq(devicesTable.deviceLogin, login.trim()));

    if (!device) {
      return res.status(401).json({ error: "invalid_credentials", message: "Login yoki parol noto'g'ri" });
    }

    if (device.devicePassword !== password.trim()) {
      return res.status(401).json({ error: "invalid_credentials", message: "Login yoki parol noto'g'ri" });
    }

    const [company] = await db.select().from(companiesTable)
      .where(eq(companiesTable.id, device.companyId));

    if (!company) {
      return res.status(404).json({ error: "company_not_found" });
    }

    return res.json({
      success: true,
      device: {
        id: device.id,
        deviceName: device.deviceName,
        location: device.location,
      },
      company: {
        id: company.id,
        name: company.name,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server_error" });
  }
});

export default router;
