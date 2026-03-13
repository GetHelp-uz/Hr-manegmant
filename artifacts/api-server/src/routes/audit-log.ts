import { Router, type IRouter } from "express";
import { pool } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const companyId = (req.session as any).companyId;
    const { page = "1", limit = "50", action } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = Math.min(parseInt(limit as string), 200);
    const offset = (pageNum - 1) * limitNum;

    const client = await pool.connect();
    try {
      let where = `WHERE company_id = $1`;
      const params: any[] = [companyId];
      if (action) {
        params.push(action);
        where += ` AND action = $${params.length}`;
      }

      const { rows } = await client.query(
        `SELECT * FROM company_audit_log ${where} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limitNum, offset]
      );
      const { rows: countRows } = await client.query(
        `SELECT COUNT(*)::int as count FROM company_audit_log ${where}`,
        params
      );
      return res.json({ data: rows, total: countRows[0]?.count || 0, page: pageNum, limit: limitNum });
    } finally { client.release(); }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server_error" });
  }
});

export async function logCompanyAction(
  companyId: number,
  userLogin: string,
  action: string,
  targetType?: string,
  targetId?: number,
  details?: Record<string, any>,
  ip?: string
) {
  try {
    const client = await pool.connect();
    try {
      await client.query(
        `INSERT INTO company_audit_log (company_id, user_login, action, target_type, target_id, details, ip)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [companyId, userLogin, action, targetType || null, targetId || null, JSON.stringify(details || {}), ip || null]
      );
    } finally { client.release(); }
  } catch (err) {
    console.error("[audit-log]", err);
  }
}

export default router;
