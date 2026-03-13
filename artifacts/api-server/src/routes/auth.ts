import { Router, type IRouter } from "express";
import { db, companiesTable, adminsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

const router: IRouter = Router();

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "validation_error", message: "Email and password required" });
    }

    const [admin] = await db.select().from(adminsTable).where(eq(adminsTable.email, email));
    if (!admin) {
      return res.status(401).json({ error: "invalid_credentials", message: "Invalid email or password" });
    }

    const isValid = await bcrypt.compare(password, admin.password);
    if (!isValid) {
      return res.status(401).json({ error: "invalid_credentials", message: "Invalid email or password" });
    }

    const [company] = await db.select().from(companiesTable).where(eq(companiesTable.id, admin.companyId));
    if (!company) {
      return res.status(404).json({ error: "not_found", message: "Company not found" });
    }

    const session = (req as any).session;
    session.adminId = admin.id;
    session.companyId = admin.companyId;

    return res.json({
      success: true,
      user: { id: admin.id, companyId: admin.companyId, name: admin.name, email: admin.email, role: admin.role },
      company: { id: company.id, name: company.name, phone: company.phone, email: company.email, logo: company.logo, subscriptionPlan: company.subscriptionPlan, createdAt: company.createdAt },
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "server_error", message: "Internal server error" });
  }
});

router.post("/register", async (req, res) => {
  try {
    const { companyName, phone, email, password, adminName } = req.body;
    if (!companyName || !phone || !email || !password || !adminName) {
      return res.status(400).json({ error: "validation_error", message: "All fields required" });
    }

    const [existing] = await db.select().from(companiesTable).where(eq(companiesTable.email, email));
    if (existing) {
      return res.status(400).json({ error: "duplicate", message: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const [company] = await db.insert(companiesTable).values({
      name: companyName, phone, email, password: hashedPassword, subscriptionPlan: "free",
    }).returning();

    const [admin] = await db.insert(adminsTable).values({
      companyId: company.id, name: adminName, email, password: hashedPassword, role: "admin",
    }).returning();

    const session = (req as any).session;
    session.adminId = admin.id;
    session.companyId = company.id;

    return res.status(201).json({
      success: true,
      user: { id: admin.id, companyId: admin.companyId, name: admin.name, email: admin.email, role: admin.role },
      company: { id: company.id, name: company.name, phone: company.phone, email: company.email, logo: company.logo, subscriptionPlan: company.subscriptionPlan, createdAt: company.createdAt },
    });
  } catch (err) {
    console.error("Register error:", err);
    return res.status(500).json({ error: "server_error", message: "Internal server error" });
  }
});

router.get("/me", async (req, res) => {
  try {
    const session = (req as any).session;
    if (!session?.adminId) {
      return res.status(401).json({ error: "unauthorized", message: "Not authenticated" });
    }

    const [admin] = await db.select().from(adminsTable).where(eq(adminsTable.id, session.adminId));
    if (!admin) {
      return res.status(401).json({ error: "unauthorized", message: "Session invalid" });
    }

    const [company] = await db.select().from(companiesTable).where(eq(companiesTable.id, admin.companyId));

    return res.json({
      user: { id: admin.id, companyId: admin.companyId, name: admin.name, email: admin.email, role: admin.role },
      company: { id: company!.id, name: company!.name, phone: company!.phone, email: company!.email, logo: company!.logo, subscriptionPlan: company!.subscriptionPlan, createdAt: company!.createdAt },
    });
  } catch (err) {
    console.error("GetMe error:", err);
    return res.status(500).json({ error: "server_error", message: "Internal server error" });
  }
});

router.post("/logout", (req, res) => {
  (req as any).session.destroy(() => {
    res.json({ success: true, message: "Logged out" });
  });
});

export default router;
