import type { Request, Response, NextFunction } from "express";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const session = (req as any).session;
  if (!session?.adminId) {
    return res.status(401).json({ error: "unauthorized", message: "Authentication required" });
  }
  next();
}
