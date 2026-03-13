import { Router, type IRouter } from "express";
import { db, companiesTable, adminsTable } from "@workspace/db";
import { eq, or } from "drizzle-orm";
import bcrypt from "bcryptjs";

const router: IRouter = Router();

const withTimeout = <T>(p: Promise<T>, ms: number): Promise<T> =>
  Promise.race([p, new Promise<T>((_, reject) => setTimeout(() => reject(new Error("DB_TIMEOUT")), ms))]);

router.post("/login", async (req, res) => {
  try {
    const { email, login, password } = req.body;
    const identifier = login || email;
    if (!identifier || !password) {
      return res.status(400).json({ error: "validation_error", message: "Login va parol majburiy" });
    }

    let admin: any;
    try {
      [admin] = await withTimeout(
        db.select().from(adminsTable).where(
          or(eq(adminsTable.email, identifier), eq(adminsTable.login, identifier))
        ),
        5000
      );
    } catch (dbErr: any) {
      if (dbErr.message === "DB_TIMEOUT" || dbErr.message?.includes("timeout") || dbErr.message?.includes("terminated")) {
        return res.status(503).json({
          error: "db_unavailable",
          message: "Ma'lumotlar bazasi vaqtincha ishlamayapti. Iltimos, bir necha daqiqadan so'ng qayta urinib ko'ring.",
        });
      }
      throw dbErr;
    }

    if (!admin) {
      return res.status(401).json({ error: "invalid_credentials", message: "Login yoki parol noto'g'ri" });
    }

    const isValid = await bcrypt.compare(password, admin.password);
    if (!isValid) {
      return res.status(401).json({ error: "invalid_credentials", message: "Login yoki parol noto'g'ri" });
    }

    let company: any;
    try {
      [company] = await withTimeout(
        db.select().from(companiesTable).where(eq(companiesTable.id, admin.companyId)),
        5000
      );
    } catch {
      company = { id: admin.companyId, name: "—", phone: "", email: "", address: "", logo: null, subscriptionPlan: "free", createdAt: new Date() };
    }

    if (!company) {
      return res.status(404).json({ error: "not_found", message: "Kompaniya topilmadi" });
    }

    const session = (req as any).session;
    session.adminId = admin.id;
    session.companyId = admin.companyId;
    session.role = admin.role;
    session.adminName = admin.name;
    session.adminEmail = admin.email;
    session.adminLogin = admin.login;
    session.companyName = company.name;

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

    if (!/^[a-zA-Z0-9_]{3,30}$/.test(login)) {
      return res.status(400).json({ error: "validation_error", message: "Login: 3-30 ta harf/raqam, faqat _ belgisi" });
    }

    try {
      const [existingEmail] = await withTimeout(
        db.select().from(companiesTable).where(eq(companiesTable.email, email)),
        5000
      );
      if (existingEmail) {
        return res.status(400).json({ error: "duplicate", message: "Bu email allaqachon ro'yxatdan o'tgan" });
      }

      const [existingLogin] = await withTimeout(
        db.select().from(adminsTable).where(eq(adminsTable.login, login)),
        5000
      );
      if (existingLogin) {
        return res.status(400).json({ error: "duplicate", message: "Bu login band, boshqa tanlang" });
      }
    } catch (dbErr: any) {
      if (dbErr.message === "DB_TIMEOUT" || dbErr.message?.includes("timeout") || dbErr.message?.includes("terminated")) {
        return res.status(503).json({
          error: "db_unavailable",
          message: "Ma'lumotlar bazasi vaqtincha ishlamayapti. Iltimos, keyinroq urinib ko'ring.",
        });
      }
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
    session.adminName = admin.name;
    session.adminEmail = admin.email;
    session.adminLogin = admin.login;
    session.companyName = company.name;

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

    try {
      const [admin] = await withTimeout(
        db.select().from(adminsTable).where(eq(adminsTable.id, session.adminId)),
        4000
      );
      if (!admin) {
        return res.status(401).json({ error: "unauthorized", message: "Sessiya noto'g'ri" });
      }

      let company: any;
      try {
        [company] = await withTimeout(
          db.select().from(companiesTable).where(eq(companiesTable.id, admin.companyId)),
          4000
        );
      } catch {
        company = null;
      }

      return res.json({
        user: { id: admin.id, companyId: admin.companyId, name: admin.name, email: admin.email, login: admin.login, role: admin.role },
        company: company
          ? { id: company.id, name: company.name, phone: company.phone, email: company.email, address: company.address, logo: company.logo, subscriptionPlan: company.subscriptionPlan, createdAt: company.createdAt }
          : { id: session.companyId, name: session.companyName || "—", phone: "", email: "", address: "", logo: null, subscriptionPlan: "free", createdAt: new Date() },
      });
    } catch (dbErr: any) {
      if (session.adminName) {
        return res.json({
          user: { id: session.adminId, companyId: session.companyId, name: session.adminName, email: session.adminEmail || "", login: session.adminLogin || "", role: session.role },
          company: { id: session.companyId, name: session.companyName || "—", phone: "", email: "", address: "", logo: null, subscriptionPlan: "free", createdAt: new Date() },
        });
      }
      return res.status(503).json({ error: "db_unavailable", message: "Ma'lumotlar bazasi vaqtincha ishlamayapti" });
    }
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
