import { Router, type IRouter } from "express";
import { db, companiesTable, adminsTable } from "@workspace/db";
import { eq, or } from "drizzle-orm";
import bcrypt from "bcryptjs";

const router: IRouter = Router();

router.post("/login", async (req, res) => {
  try {
    const { email, login, password } = req.body;
    const identifier = login || email;
    if (!identifier || !password) {
      return res.status(400).json({ error: "validation_error", message: "Login va parol majburiy" });
    }

    // Support login with email OR login username
    const [admin] = await db.select().from(adminsTable).where(
      or(eq(adminsTable.email, identifier), eq(adminsTable.login, identifier))
    );
    if (!admin) {
      return res.status(401).json({ error: "invalid_credentials", message: "Login yoki parol noto'g'ri" });
    }

    const isValid = await bcrypt.compare(password, admin.password);
    if (!isValid) {
      return res.status(401).json({ error: "invalid_credentials", message: "Login yoki parol noto'g'ri" });
    }

    const [company] = await db.select().from(companiesTable).where(eq(companiesTable.id, admin.companyId));
    if (!company) {
      return res.status(404).json({ error: "not_found", message: "Kompaniya topilmadi" });
    }

    const session = (req as any).session;
    session.adminId = admin.id;
    session.companyId = admin.companyId;
    session.role = admin.role;

    return res.json({
      success: true,
      user: { id: admin.id, companyId: admin.companyId, name: admin.name, email: admin.email, login: admin.login, role: admin.role },
      company: { id: company.id, name: company.name, phone: company.phone, email: company.email, address: company.address, logo: company.logo, subscriptionPlan: company.subscriptionPlan, createdAt: company.createdAt },
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "server_error", message: "Ichki server xatosi" });
  }
});

router.post("/register", async (req, res) => {
  try {
    const { companyName, phone, email, password, adminName, login, address } = req.body;
    if (!companyName || !phone || !email || !password || !adminName || !login) {
      return res.status(400).json({ error: "validation_error", message: "Barcha maydonlar to'ldirilishi shart" });
    }

    // Validate login format (alphanumeric + underscore, no spaces)
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(login)) {
      return res.status(400).json({ error: "validation_error", message: "Login: 3-30 ta harf/raqam, faqat _ belgisi" });
    }

    const [existingEmail] = await db.select().from(companiesTable).where(eq(companiesTable.email, email));
    if (existingEmail) {
      return res.status(400).json({ error: "duplicate", message: "Bu email allaqachon ro'yxatdan o'tgan" });
    }

    const [existingLogin] = await db.select().from(adminsTable).where(eq(adminsTable.login, login));
    if (existingLogin) {
      return res.status(400).json({ error: "duplicate", message: "Bu login band, boshqa tanlang" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const [company] = await db.insert(companiesTable).values({
      name: companyName, phone, email, password: hashedPassword,
      address: address || null, subscriptionPlan: "free",
    }).returning();

    const [admin] = await db.insert(adminsTable).values({
      companyId: company.id, name: adminName, email, login, password: hashedPassword, role: "admin",
    }).returning();

    const session = (req as any).session;
    session.adminId = admin.id;
    session.companyId = company.id;
    session.role = admin.role;

    return res.status(201).json({
      success: true,
      user: { id: admin.id, companyId: admin.companyId, name: admin.name, email: admin.email, login: admin.login, role: admin.role },
      company: { id: company.id, name: company.name, phone: company.phone, email: company.email, address: company.address, logo: company.logo, subscriptionPlan: company.subscriptionPlan, createdAt: company.createdAt },
    });
  } catch (err) {
    console.error("Register error:", err);
    return res.status(500).json({ error: "server_error", message: "Ichki server xatosi" });
  }
});

router.get("/me", async (req, res) => {
  try {
    const session = (req as any).session;
    if (!session?.adminId) {
      return res.status(401).json({ error: "unauthorized", message: "Tizimga kirmagan" });
    }

    const [admin] = await db.select().from(adminsTable).where(eq(adminsTable.id, session.adminId));
    if (!admin) {
      return res.status(401).json({ error: "unauthorized", message: "Sessiya noto'g'ri" });
    }

    const [company] = await db.select().from(companiesTable).where(eq(companiesTable.id, admin.companyId));

    return res.json({
      user: { id: admin.id, companyId: admin.companyId, name: admin.name, email: admin.email, login: admin.login, role: admin.role },
      company: { id: company!.id, name: company!.name, phone: company!.phone, email: company!.email, address: company!.address, logo: company!.logo, subscriptionPlan: company!.subscriptionPlan, createdAt: company!.createdAt },
    });
  } catch (err) {
    console.error("GetMe error:", err);
    return res.status(500).json({ error: "server_error", message: "Ichki server xatosi" });
  }
});

router.post("/logout", (req, res) => {
  (req as any).session.destroy(() => {
    res.json({ success: true, message: "Chiqildi" });
  });
});

export default router;
