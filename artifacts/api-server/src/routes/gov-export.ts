import { Router } from "express";
import { db, companiesTable, employeesTable, payrollTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { pool } from "@workspace/db";

const router = Router();

function requireAuth(req: any, res: any, next: any) {
  if (!(req.session as any)?.companyId) return res.status(401).json({ error: "Unauthorized" });
  next();
}

router.get("/settings", requireAuth, async (req, res) => {
  const companyId = Number((req.session as any).companyId);
  try {
    const { rows } = await pool.query(
      `SELECT stir, director_name, accountant_name, legal_address, oked,
              soliq_api_key, inps_login,
              CASE WHEN inps_password IS NOT NULL THEN '***' ELSE NULL END AS inps_password_hint
       FROM companies WHERE id = $1`, [companyId]
    );
    res.json(rows[0] || {});
  } catch (err) {
    res.status(500).json({ error: "DB error" });
  }
});

router.post("/settings", requireAuth, async (req, res) => {
  const companyId = Number((req.session as any).companyId);
  const { stir, directorName, accountantName, legalAddress, oked, soliqApiKey, inpsLogin, inpsPassword } = req.body;
  try {
    const updates: string[] = [];
    const values: any[] = [];
    let idx = 1;
    if (stir !== undefined) { updates.push(`stir = $${idx++}`); values.push(stir); }
    if (directorName !== undefined) { updates.push(`director_name = $${idx++}`); values.push(directorName); }
    if (accountantName !== undefined) { updates.push(`accountant_name = $${idx++}`); values.push(accountantName); }
    if (legalAddress !== undefined) { updates.push(`legal_address = $${idx++}`); values.push(legalAddress); }
    if (oked !== undefined) { updates.push(`oked = $${idx++}`); values.push(oked); }
    if (soliqApiKey !== undefined) { updates.push(`soliq_api_key = $${idx++}`); values.push(soliqApiKey); }
    if (inpsLogin !== undefined) { updates.push(`inps_login = $${idx++}`); values.push(inpsLogin); }
    if (inpsPassword && inpsPassword !== "***") { updates.push(`inps_password = $${idx++}`); values.push(inpsPassword); }
    if (updates.length === 0) return res.json({ ok: true });
    values.push(companyId);
    await pool.query(`UPDATE companies SET ${updates.join(", ")} WHERE id = $${idx}`, values);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "DB error" });
  }
});

async function getPayrollData(companyId: number, month: number, year: number) {
  const { rows } = await pool.query(`
    SELECT p.*, e.full_name, e.position, e.phone,
           COALESCE(e.jshshir, '') as jshshir,
           COALESCE(e.passport_series, '') as passport_series
    FROM payroll p
    JOIN employees e ON e.id = p.employee_id
    WHERE p.company_id = $1 AND p.month = $2 AND p.year = $3
      AND p.status IN ('approved','paid')
    ORDER BY e.full_name
  `, [companyId, month, year]);
  return rows;
}

async function getCompany(companyId: number) {
  const { rows } = await pool.query(`SELECT * FROM companies WHERE id = $1`, [companyId]);
  return rows[0];
}

// ─── SOLIQ XML (JSHR 12%) ───────────────────────────────────────────────────
router.get("/soliq-xml", requireAuth, async (req, res) => {
  const companyId = Number((req.session as any).companyId);
  const month = Number(req.query.month) || new Date().getMonth() + 1;
  const year = Number(req.query.year) || new Date().getFullYear();
  try {
    const company = await getCompany(companyId);
    const payrolls = await getPayrollData(companyId, month, year);
    const JSHR_RATE = 0.12;
    const INPS_RATE = 0.04;
    const totalGross = payrolls.reduce((s, p) => s + Number(p.gross_salary), 0);
    const totalTax = payrolls.reduce((s, p) => s + Number(p.gross_salary) * JSHR_RATE, 0);
    const monthNames = ["","Yanvar","Fevral","Mart","Aprel","May","Iyun","Iyul","Avgust","Sentabr","Oktabr","Noyabr","Dekabr"];
    const lines = payrolls.map((p, i) => {
      const gross = Number(p.gross_salary);
      const tax = gross * JSHR_RATE;
      const inpsDed = gross * INPS_RATE;
      const net = gross - tax - inpsDed;
      return `    <Xodim TartibRaqam="${i + 1}">
      <JSHSHIR>${p.jshshir || "00000000000000"}</JSHSHIR>
      <FIO>${escXml(p.full_name)}</FIO>
      <Lavozim>${escXml(p.position)}</Lavozim>
      <DaromadSummasi>${gross.toFixed(2)}</DaromadSummasi>
      <SoliqBazasi>${gross.toFixed(2)}</SoliqBazasi>
      <JSHRSummasi>${tax.toFixed(2)}</JSHRSummasi>
      <INPSSummasi>${inpsDed.toFixed(2)}</INPSSummasi>
      <QoʻlgaBerilgan>${net.toFixed(2)}</QoʻlgaBerilgan>
    </Xodim>`;
    }).join("\n");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<SoliqHisoboti Versiya="1.0">
  <SoliqTolovchi>
    <STIR>${company?.stir || "000000000"}</STIR>
    <Nomi>${escXml(company?.name || "")}</Nomi>
    <YuridikManzil>${escXml(company?.legal_address || company?.address || "")}</YuridikYuridikManzil>
    <OKED>${company?.oked || ""}</OKED>
    <Rahbar>${escXml(company?.director_name || "")}</Rahbar>
    <BoshHisobchi>${escXml(company?.accountant_name || "")}</BoshHisobchi>
  </SoliqTolovchi>
  <HisobotDavrasi>
    <Oy>${month}</Oy>
    <Yil>${year}</Yil>
    <OyNomi>${monthNames[month]}</OyNomi>
  </HisobotDavrasi>
  <XodimlarRoʻyxati JamiXodim="${payrolls.length}">
${lines}
  </XodimlarRoʻyxati>
  <Jami>
    <JamiDaromad>${totalGross.toFixed(2)}</JamiDaromad>
    <JamiJSHR>${totalTax.toFixed(2)}</JamiJSHR>
  </Jami>
  <SanaVaqt>${new Date().toISOString()}</SanaVaqt>
</SoliqHisoboti>`;

    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="JSHR_${year}_${String(month).padStart(2,"0")}.xml"`);
    res.send(xml);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Export xatosi" });
  }
});

// ─── INPS XML (Pensiya 4%) ──────────────────────────────────────────────────
router.get("/inps-xml", requireAuth, async (req, res) => {
  const companyId = Number((req.session as any).companyId);
  const month = Number(req.query.month) || new Date().getMonth() + 1;
  const year = Number(req.query.year) || new Date().getFullYear();
  try {
    const company = await getCompany(companyId);
    const payrolls = await getPayrollData(companyId, month, year);
    const INPS_RATE = 0.04;
    const totalBase = payrolls.reduce((s, p) => s + Number(p.gross_salary), 0);
    const totalInps = totalBase * INPS_RATE;

    const lines = payrolls.map((p, i) => {
      const base = Number(p.gross_salary);
      const contribution = base * INPS_RATE;
      return `    <Qatnashuvchi TartibRaqam="${i + 1}">
      <JSHSHIR>${p.jshshir || "00000000000000"}</JSHSHIR>
      <FIO>${escXml(p.full_name)}</FIO>
      <PensiyaBazasi>${base.toFixed(2)}</PensiyaBazasi>
      <PensiyaAjratmasi>${contribution.toFixed(2)}</PensiyaAjratmasi>
    </Qatnashuvchi>`;
    }).join("\n");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<INPSHisoboti Versiya="1.0">
  <Korxona>
    <STIR>${company?.stir || "000000000"}</STIR>
    <Nomi>${escXml(company?.name || "")}</Nomi>
    <Rahbar>${escXml(company?.director_name || "")}</Rahbar>
    <Login>${company?.inps_login || ""}</Login>
  </Korxona>
  <HisobotDavrasi>
    <Oy>${month}</Oy>
    <Yil>${year}</Yil>
  </HisobotDavrasi>
  <QatnashuvchilarRoʻyxati JamiQatnashuvchi="${payrolls.length}">
${lines}
  </QatnashuvchilarRoʻyxati>
  <Jami>
    <JamiAsos>${totalBase.toFixed(2)}</JamiAsos>
    <JamiAjratma>${totalInps.toFixed(2)}</JamiAjratma>
  </Jami>
  <SanaVaqt>${new Date().toISOString()}</SanaVaqt>
</INPSHisoboti>`;

    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="INPS_${year}_${String(month).padStart(2,"0")}.xml"`);
    res.send(xml);
  } catch (err) {
    res.status(500).json({ error: "Export xatosi" });
  }
});

// ─── CSV (Universal 1C / SAP) ───────────────────────────────────────────────
router.get("/csv", requireAuth, async (req, res) => {
  const companyId = Number((req.session as any).companyId);
  const month = Number(req.query.month) || new Date().getMonth() + 1;
  const year = Number(req.query.year) || new Date().getFullYear();
  try {
    const payrolls = await getPayrollData(companyId, month, year);
    const JSHR = 0.12, INPS_EMP = 0.04;
    const header = "T/r;JSHSHIR;F.I.SH;Lavozim;Yalpi maosh;JSHR (12%);INPS (4%);Qo'lga berilgan;Oy;Yil";
    const rows = payrolls.map((p, i) => {
      const gross = Number(p.gross_salary);
      const tax = gross * JSHR;
      const inps = gross * INPS_EMP;
      const net = gross - tax - inps;
      return [i+1, p.jshshir||"", p.full_name, p.position, gross.toFixed(0), tax.toFixed(0), inps.toFixed(0), net.toFixed(0), month, year].join(";");
    });
    const csv = "\uFEFF" + [header, ...rows].join("\n");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="Maosh_${year}_${String(month).padStart(2,"0")}.csv"`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: "Export xatosi" });
  }
});

// ─── Hisobot sahifasi uchun preview ─────────────────────────────────────────
router.get("/preview", requireAuth, async (req, res) => {
  const companyId = Number((req.session as any).companyId);
  const month = Number(req.query.month) || new Date().getMonth() + 1;
  const year = Number(req.query.year) || new Date().getFullYear();
  try {
    const company = await getCompany(companyId);
    const payrolls = await getPayrollData(companyId, month, year);
    const JSHR = 0.12, INPS = 0.04;
    const rows = payrolls.map(p => {
      const gross = Number(p.gross_salary);
      return {
        fullName: p.full_name,
        position: p.position,
        jshshir: p.jshshir || null,
        gross,
        jshr: +(gross * JSHR).toFixed(0),
        inps: +(gross * INPS).toFixed(0),
        net: +(gross - gross * JSHR - gross * INPS).toFixed(0),
      };
    });
    const totalGross = rows.reduce((s, r) => s + r.gross, 0);
    res.json({
      company: { stir: company?.stir, name: company?.name, directorName: company?.director_name, accountantName: company?.accountant_name },
      month, year,
      rows,
      totals: {
        gross: totalGross,
        jshr: +(totalGross * JSHR).toFixed(0),
        inps: +(totalGross * INPS).toFixed(0),
        net: +(totalGross * (1 - JSHR - INPS)).toFixed(0),
      },
      count: rows.length,
      hasMissingJshshir: rows.some(r => !r.jshshir),
    });
  } catch (err) {
    res.status(500).json({ error: "DB error" });
  }
});

function escXml(s: string) {
  return String(s || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

export default router;
