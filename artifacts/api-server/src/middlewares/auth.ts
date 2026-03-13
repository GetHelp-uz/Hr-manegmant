import type { Request, Response, NextFunction } from "express";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const session = (req as any).session;
  if (!session?.adminId) {
    return res.status(401).json({ error: "unauthorized", message: "Authentication required" });
  }
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const session = (req as any).session;
  if (!session?.adminId) {
    return res.status(401).json({ error: "unauthorized", message: "Authentication required" });
  }
  if (session.role !== "admin") {
    return res.status(403).json({ error: "forbidden", message: "Admin role required" });
  }
  next();
}

export function requireAccountant(req: Request, res: Response, next: NextFunction) {
  const session = (req as any).session;
  if (!session?.adminId) {
    return res.status(401).json({ error: "unauthorized", message: "Authentication required" });
  }
  if (session.role !== "accountant" && session.role !== "admin") {
    return res.status(403).json({ error: "forbidden", message: "Accountant or Admin role required" });
  }
  next();
}

export function requireHr(req: Request, res: Response, next: NextFunction) {
  const session = (req as any).session;
  if (!session?.adminId) {
    return res.status(401).json({ error: "unauthorized", message: "Authentication required" });
  }
  if (session.role !== "hr" && session.role !== "admin") {
    return res.status(403).json({ error: "forbidden", message: "HR or Admin role required" });
  }
  next();
}
