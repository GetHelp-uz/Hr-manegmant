import { Router, type IRouter } from "express";
import { db, companiesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { randomBytes } from "crypto";
import QRCode from "qrcode";

const router: IRouter = Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const companyId = (req.session as any).companyId;
    const [company] = await db.select().from(companiesTable).where(eq(companiesTable.id, companyId));
    if (!company) return res.status(404).json({ error: "Company not found" });
    const { password, ...safe } = company;
    return res.json(safe);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

router.put("/", requireAuth, async (req, res) => {
  try {
    const companyId = (req.session as any).companyId;
    const { name, workStartTime, workEndTime, lateThresholdMinutes, telegramAdminId } = req.body;

    const [updated] = await db.update(companiesTable)
      .set({ name, workStartTime, workEndTime, lateThresholdMinutes, telegramAdminId })
      .where(eq(companiesTable.id, companyId))
      .returning();

    const { password, ...safe } = updated;
    return res.json(safe);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

router.get("/qr-code", requireAuth, async (req, res) => {
  try {
    const companyId = (req.session as any).companyId;
    const [company] = await db.select().from(companiesTable).where(eq(companiesTable.id, companyId));
    if (!company) return res.status(404).json({ error: "Company not found" });

    let joinCode = company.joinCode;
    if (!joinCode) {
      joinCode = randomBytes(4).toString("hex").toUpperCase();
      await db.update(companiesTable).set({ joinCode }).where(eq(companiesTable.id, companyId));
    }

    const botUsername = process.env.TELEGRAM_BOT_USERNAME || "hr_workforce_bot";
    const deepLink = `https://t.me/${botUsername}?start=${joinCode}`;
    const qrDataUrl = await QRCode.toDataURL(deepLink, { width: 400, margin: 2 });

    return res.json({ joinCode, deepLink, qrCode: qrDataUrl });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

router.post("/regenerate-code", requireAuth, async (req, res) => {
  try {
    const companyId = (req.session as any).companyId;
    const joinCode = randomBytes(4).toString("hex").toUpperCase();
    await db.update(companiesTable).set({ joinCode }).where(eq(companiesTable.id, companyId));

    const botUsername = process.env.TELEGRAM_BOT_USERNAME || "hr_workforce_bot";
    const deepLink = `https://t.me/${botUsername}?start=${joinCode}`;
    const qrDataUrl = await QRCode.toDataURL(deepLink, { width: 400, margin: 2 });

    return res.json({ joinCode, deepLink, qrCode: qrDataUrl });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

export default router;
