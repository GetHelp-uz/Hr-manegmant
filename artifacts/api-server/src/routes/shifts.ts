import { Router, type IRouter } from "express";
import { pool } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const companyId = (req.session as any).companyId;
    const client = await pool.connect();
    try {
      const { rows } = await client.query(
        `SELECT * FROM company_shifts WHERE company_id = $1 ORDER BY is_default DESC, created_at ASC`,
        [companyId]
      );
      return res.json(rows);
    } finally { client.release(); }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server_error" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const companyId = (req.session as any).companyId;
    const { name, startTime, endTime, days, isDefault, color } = req.body;
    if (!name || !startTime || !endTime) return res.status(400).json({ error: "required_fields" });

    const client = await pool.connect();
    try {
      if (isDefault) {
        await client.query(`UPDATE company_shifts SET is_default = false WHERE company_id = $1`, [companyId]);
      }
      const { rows } = await client.query(
        `INSERT INTO company_shifts (company_id, name, start_time, end_time, days, is_default, color)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [companyId, name, startTime, endTime, days || "1,2,3,4,5", isDefault || false, color || "#3b82f6"]
      );
      return res.json(rows[0]);
    } finally { client.release(); }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server_error" });
  }
});

router.put("/:id", requireAuth, async (req, res) => {
  try {
    const companyId = (req.session as any).companyId;
    const id = parseInt(req.params.id);
    const { name, startTime, endTime, days, isDefault, color } = req.body;

    const client = await pool.connect();
    try {
      if (isDefault) {
        await client.query(`UPDATE company_shifts SET is_default = false WHERE company_id = $1`, [companyId]);
      }
      const { rows } = await client.query(
        `UPDATE company_shifts SET name=$1, start_time=$2, end_time=$3, days=$4, is_default=$5, color=$6
         WHERE id=$7 AND company_id=$8 RETURNING *`,
        [name, startTime, endTime, days || "1,2,3,4,5", isDefault || false, color || "#3b82f6", id, companyId]
      );
      if (!rows[0]) return res.status(404).json({ error: "not_found" });
      return res.json(rows[0]);
    } finally { client.release(); }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server_error" });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const companyId = (req.session as any).companyId;
    const id = parseInt(req.params.id);
    const client = await pool.connect();
    try {
      await client.query(`DELETE FROM company_shifts WHERE id=$1 AND company_id=$2`, [id, companyId]);
      return res.json({ success: true });
    } finally { client.release(); }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server_error" });
  }
});

export default router;
