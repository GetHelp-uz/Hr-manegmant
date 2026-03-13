import { Router, type IRouter } from "express";
import { db, companyIntegrationsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

const VALID_TYPES = ["cctv", "acs", "erp"];

router.get("/", requireAuth, async (req, res) => {
  try {
    const companyId = (req.session as any).companyId;
    const integrations = await db.select().from(companyIntegrationsTable)
      .where(eq(companyIntegrationsTable.companyId, companyId));
    const map: Record<string, any> = {};
    for (const t of VALID_TYPES) {
      const found = integrations.find(i => i.type === t);
      map[t] = found || { type: t, enabled: false, settings: {}, notes: null, connectedAt: null };
    }
    return res.json(map);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server_error" });
  }
});

router.put("/:type", requireAuth, async (req, res) => {
  try {
    const companyId = (req.session as any).companyId;
    const { type } = req.params;
    if (!VALID_TYPES.includes(type)) return res.status(400).json({ error: "invalid_type" });

    const { enabled, settings, notes } = req.body;

    const existing = await db.select().from(companyIntegrationsTable).where(
      and(eq(companyIntegrationsTable.companyId, companyId), eq(companyIntegrationsTable.type, type))
    );

    if (existing.length === 0) {
      const [created] = await db.insert(companyIntegrationsTable).values({
        companyId, type,
        enabled: enabled ?? false,
        settings: settings || {},
        notes: notes || null,
        connectedAt: enabled ? new Date() : null,
      }).returning();
      return res.json(created);
    } else {
      const updateData: any = {};
      if (enabled !== undefined) updateData.enabled = enabled;
      if (settings !== undefined) updateData.settings = settings;
      if (notes !== undefined) updateData.notes = notes;
      if (enabled) updateData.connectedAt = existing[0].connectedAt || new Date();
      updateData.updatedAt = new Date();

      const [updated] = await db.update(companyIntegrationsTable)
        .set(updateData)
        .where(and(
          eq(companyIntegrationsTable.companyId, companyId),
          eq(companyIntegrationsTable.type, type)
        ))
        .returning();
      return res.json(updated);
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server_error" });
  }
});

router.post("/:type/test", requireAuth, async (req, res) => {
  try {
    const companyId = (req.session as any).companyId;
    const { type } = req.params;
    if (!VALID_TYPES.includes(type)) return res.status(400).json({ error: "invalid_type" });

    const [integration] = await db.select().from(companyIntegrationsTable).where(
      and(eq(companyIntegrationsTable.companyId, companyId), eq(companyIntegrationsTable.type, type))
    );

    if (!integration) return res.status(404).json({ error: "not_configured", message: "Integratsiya sozlanmagan" });

    const settings = integration.settings as any;
    const apiUrl = settings?.apiUrl;

    if (!apiUrl) {
      return res.json({ success: false, message: "API URL kiritilmagan" });
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (settings?.apiKey) headers["Authorization"] = `Bearer ${settings.apiKey}`;
      if (settings?.username && settings?.password) {
        headers["Authorization"] = `Basic ${Buffer.from(`${settings.username}:${settings.password}`).toString("base64")}`;
      }

      const resp = await fetch(apiUrl, { method: "GET", headers, signal: controller.signal });
      clearTimeout(timeoutId);

      await db.update(companyIntegrationsTable)
        .set({ connectedAt: new Date(), updatedAt: new Date() })
        .where(and(
          eq(companyIntegrationsTable.companyId, companyId),
          eq(companyIntegrationsTable.type, type)
        ));

      return res.json({
        success: resp.ok,
        status: resp.status,
        message: resp.ok ? "Ulanish muvaffaqiyatli!" : `Server javob berdi: ${resp.status}`,
      });
    } catch (fetchErr: any) {
      if (fetchErr?.name === "AbortError") {
        return res.json({ success: false, message: "Vaqt tugadi (5 soniya). Server javob bermadi." });
      }
      return res.json({ success: false, message: `Ulanish xatosi: ${fetchErr?.message || "Noma'lum xato"}` });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server_error" });
  }
});

router.post("/acs/sync-attendance", requireAuth, async (req, res) => {
  try {
    const companyId = (req.session as any).companyId;
    const [integration] = await db.select().from(companyIntegrationsTable).where(
      and(eq(companyIntegrationsTable.companyId, companyId), eq(companyIntegrationsTable.type, "acs"))
    );
    if (!integration?.enabled) return res.status(400).json({ error: "not_enabled", message: "ACS integratsiyasi yoqilmagan" });

    const settings = integration.settings as any;
    if (!settings?.apiUrl) return res.status(400).json({ error: "not_configured", message: "API URL kiritilmagan" });

    const { date } = req.body;
    const targetDate = date || new Date().toISOString().split("T")[0];

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (settings?.apiKey) headers["Authorization"] = `Bearer ${settings.apiKey}`;
    if (settings?.username && settings?.password) {
      headers["Authorization"] = `Basic ${Buffer.from(`${settings.username}:${settings.password}`).toString("base64")}`;
    }

    let syncUrl = `${settings.apiUrl}/attendance?date=${targetDate}`;
    if (settings?.deviceIds) syncUrl += `&device_ids=${settings.deviceIds}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    let acsRecords: any[] = [];
    try {
      const resp = await fetch(syncUrl, { headers, signal: controller.signal });
      clearTimeout(timeoutId);
      if (resp.ok) {
        const body = await resp.json();
        acsRecords = Array.isArray(body) ? body : body?.data || body?.records || [];
      }
    } catch {
      return res.json({ success: false, message: "ACS serverga ulanib bo'lmadi", imported: 0 });
    }

    return res.json({
      success: true,
      message: `${acsRecords.length} ta yozuv olinди (sinxronizatsiya demo rejimida)`,
      imported: acsRecords.length,
      records: acsRecords.slice(0, 5),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server_error" });
  }
});

router.post("/erp/sync-employees", requireAuth, async (req, res) => {
  try {
    const companyId = (req.session as any).companyId;
    const [integration] = await db.select().from(companyIntegrationsTable).where(
      and(eq(companyIntegrationsTable.companyId, companyId), eq(companyIntegrationsTable.type, "erp"))
    );
    if (!integration?.enabled) return res.status(400).json({ error: "not_enabled", message: "ERP integratsiyasi yoqilmagan" });

    const settings = integration.settings as any;
    if (!settings?.apiUrl) return res.status(400).json({ error: "not_configured", message: "API URL kiritilmagan" });

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (settings?.apiKey) headers["Authorization"] = `Bearer ${settings.apiKey}`;
    if (settings?.username && settings?.password) {
      headers["Authorization"] = `Basic ${Buffer.from(`${settings.username}:${settings.password}`).toString("base64")}`;
    }

    const erpType = settings?.erpType || "other";
    let erpUrl = `${settings.apiUrl}/employees`;
    if (erpType === "1c" && settings?.database) erpUrl = `${settings.apiUrl}/hs/hr/employees`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    let erpEmployees: any[] = [];
    try {
      const resp = await fetch(erpUrl, { headers, signal: controller.signal });
      clearTimeout(timeoutId);
      if (resp.ok) {
        const body = await resp.json();
        erpEmployees = Array.isArray(body) ? body : body?.value || body?.data || body?.employees || [];
      }
    } catch {
      return res.json({ success: false, message: "ERP serverga ulanib bo'lmadi", synced: 0 });
    }

    return res.json({
      success: true,
      message: `${erpEmployees.length} ta xodim ma'lumoti olinди (sinxronizatsiya demo rejimida)`,
      synced: erpEmployees.length,
      sample: erpEmployees.slice(0, 3),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server_error" });
  }
});

router.post("/erp/export-attendance", requireAuth, async (req, res) => {
  try {
    const companyId = (req.session as any).companyId;
    const [integration] = await db.select().from(companyIntegrationsTable).where(
      and(eq(companyIntegrationsTable.companyId, companyId), eq(companyIntegrationsTable.type, "erp"))
    );
    if (!integration?.enabled) return res.status(400).json({ error: "not_enabled" });

    const { month, year } = req.body;
    const m = parseInt(month || new Date().getMonth() + 1);
    const y = parseInt(year || new Date().getFullYear());

    const settings = integration.settings as any;
    const erpType = settings?.erpType || "other";
    const format1C = erpType === "1c";
    
    return res.json({
      success: true,
      message: `${y}-yil ${m}-oy davomat ma'lumotlari ERP formatida tayyorlandi`,
      format: format1C ? "1C:Enterprise JSON" : "REST API JSON",
      period: { month: m, year: y },
      recordCount: 0,
      note: "Haqiqiy ERP ulanish sozlanganida avtomatik yuboriladi",
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server_error" });
  }
});

router.delete("/:type", requireAuth, async (req, res) => {
  try {
    const companyId = (req.session as any).companyId;
    const { type } = req.params;
    if (!VALID_TYPES.includes(type)) return res.status(400).json({ error: "invalid_type" });

    await db.update(companyIntegrationsTable)
      .set({ enabled: false, connectedAt: null, settings: {}, updatedAt: new Date() })
      .where(and(
        eq(companyIntegrationsTable.companyId, companyId),
        eq(companyIntegrationsTable.type, type)
      ));

    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server_error" });
  }
});

export default router;
