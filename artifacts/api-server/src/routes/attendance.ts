import { Router, type IRouter } from "express";
import { db, attendanceTable, employeesTable, companiesTable } from "@workspace/db";
import { eq, and, gte, lte, sql, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { sendTelegramMessage, sendTelegramPhoto } from "../lib/telegram-bot";

function calcLateMinutes(checkIn: Date, workStartTime: string, thresholdMinutes: number): number {
  const [h, m] = workStartTime.split(":").map(Number);
  const start = new Date(checkIn);
  start.setHours(h, m, 0, 0);
  const diffMs = checkIn.getTime() - start.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  return diffMin > thresholdMinutes ? diffMin : 0;
}

const router: IRouter = Router();

router.post("/scan", async (req, res) => {
  try {
    const { qrData, deviceId, photo } = req.body;
    if (!qrData) return res.status(400).json({ error: "invalid_qr", message: "QR data required" });

    let parsed: { employee_id: number; company_id: number };
    try {
      parsed = typeof qrData === "string" ? JSON.parse(qrData) : qrData;
    } catch {
      return res.status(400).json({ error: "invalid_qr", message: "Invalid QR code format" });
    }

    const { employee_id, company_id } = parsed;

    const [employee] = await db.select().from(employeesTable).where(
      and(eq(employeesTable.id, employee_id), eq(employeesTable.companyId, company_id))
    );
    if (!employee) return res.status(404).json({ error: "not_found", message: "Employee not found" });

    const [todayRecord] = await db.select().from(attendanceTable).where(
      and(
        eq(attendanceTable.employeeId, employee_id),
        eq(attendanceTable.companyId, company_id),
        sql`DATE(${attendanceTable.createdAt}) = CURRENT_DATE`
      )
    );

    const now = new Date();
    const [company] = await db.select().from(companiesTable).where(eq(companiesTable.id, company_id));
    const workStart = company?.workStartTime || "09:00";
    const threshold = parseInt(company?.lateThresholdMinutes?.toString() || "15");

    if (!todayRecord) {
      const lateMinutes = calcLateMinutes(now, workStart, threshold);
      const status = lateMinutes > 0 ? "late" : "present";

      const [newRecord] = await db.insert(attendanceTable).values({
        employeeId: employee_id, companyId: company_id, checkIn: now, lateMinutes, status,
        deviceId: deviceId || null, selfiePhoto: photo || null,
      }).returning();

      const date = now.toLocaleDateString("uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric" });
      const lateText = lateMinutes > 0 ? `\n⚠️ Kechikish: <b>${lateMinutes} daqiqa</b>` : "";

      if (employee.telegramId) {
        await sendTelegramMessage(employee.telegramId,
          `✅ <b>Ishga keldingiz!</b>\n\n👤 ${employee.fullName}\n🕐 Kelish vaqti: <b>${formatTime(now)}</b>\n📅 Sana: ${date}${lateText}`
        ).catch(() => {});
      }

      if (company?.telegramAdminId && photo) {
        const caption = `📸 <b>Keldi: ${employee.fullName}</b>\n🕐 ${formatTime(now)} — ${date}${lateText}`;
        await sendTelegramPhoto(company.telegramAdminId, photo, caption).catch(() => {});
      }

      return res.json({
        action: "check_in",
        employee: formatEmployee(employee),
        attendance: formatAttendance(newRecord, employee),
        message: `${employee.fullName} checked in at ${formatTime(now)}${lateMinutes > 0 ? ` (${lateMinutes} min late)` : ""}`,
        lateMinutes,
      });
    } else if (!todayRecord.checkOut) {
      const checkInTime = todayRecord.checkIn ? new Date(todayRecord.checkIn) : now;
      const workHours = (now.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);

      const [updated] = await db.update(attendanceTable)
        .set({ checkOut: now, workHours: workHours.toFixed(2), selfiePhoto: photo || todayRecord.selfiePhoto || null })
        .where(eq(attendanceTable.id, todayRecord.id))
        .returning();

      const date = now.toLocaleDateString("uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric" });

      if (employee.telegramId) {
        await sendTelegramMessage(employee.telegramId,
          `🏁 <b>Ish yakunlandi!</b>\n\n👤 ${employee.fullName}\n🕐 Ketish vaqti: <b>${formatTime(now)}</b>\n⏱ Ishlagan vaqt: <b>${workHours.toFixed(1)} soat</b>\n📅 Sana: ${date}`
        ).catch(() => {});
      }

      if (company?.telegramAdminId && photo) {
        const caption = `🏁 <b>Ketdi: ${employee.fullName}</b>\n🕐 ${formatTime(now)} — ${date}\n⏱ Ishlagan: <b>${workHours.toFixed(1)} soat</b>`;
        await sendTelegramPhoto(company.telegramAdminId, photo, caption).catch(() => {});
      }

      return res.json({
        action: "check_out",
        employee: formatEmployee(employee),
        attendance: formatAttendance(updated, employee),
        message: `${employee.fullName} checked out at ${formatTime(now)}. Worked ${workHours.toFixed(1)} hours`,
      });
    } else {
      return res.json({
        action: "already_checked_out",
        employee: formatEmployee(employee),
        attendance: formatAttendance(todayRecord, employee),
        message: `${employee.fullName} already checked out today`,
      });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server_error", message: "Internal server error" });
  }
});

router.post("/face-scan", async (req, res) => {
  try {
    const { employeeId, companyId, photo } = req.body;
    if (!employeeId || !companyId) return res.status(400).json({ error: "invalid", message: "employeeId va companyId kerak" });

    const [employee] = await db.select().from(employeesTable).where(
      and(eq(employeesTable.id, employeeId), eq(employeesTable.companyId, companyId))
    );
    if (!employee) return res.status(404).json({ error: "not_found", message: "Xodim topilmadi" });

    const [todayRecord] = await db.select().from(attendanceTable).where(
      and(
        eq(attendanceTable.employeeId, employeeId),
        eq(attendanceTable.companyId, companyId),
        sql`DATE(${attendanceTable.createdAt}) = CURRENT_DATE`
      )
    );

    const now = new Date();
    const [company] = await db.select().from(companiesTable).where(eq(companiesTable.id, companyId));
    const workStart = company?.workStartTime || "09:00";
    const threshold = parseInt(company?.lateThresholdMinutes?.toString() || "15");

    if (!todayRecord) {
      const lateMinutes = calcLateMinutes(now, workStart, threshold);
      const status = lateMinutes > 0 ? "late" : "present";
      const [newRecord] = await db.insert(attendanceTable).values({
        employeeId, companyId, checkIn: now, lateMinutes, status,
        deviceId: null, selfiePhoto: photo || null,
      }).returning();

      const date = now.toLocaleDateString("uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric" });
      const lateText = lateMinutes > 0 ? `\n⚠️ Kechikish: <b>${lateMinutes} daqiqa</b>` : "";
      if (employee.telegramId) {
        await sendTelegramMessage(employee.telegramId,
          `✅ <b>Ishga keldingiz!</b>\n\n👤 ${employee.fullName}\n🕐 Kelish vaqti: <b>${formatTime(now)}</b>\n📅 Sana: ${date}${lateText}\n🎭 Yuz tanish orqali`
        ).catch(() => {});
      }
      if (company?.telegramAdminId && photo) {
        const caption = `📸 <b>Yuz tanish — Keldi: ${employee.fullName}</b>\n🕐 ${formatTime(now)} — ${date}${lateText}`;
        await sendTelegramPhoto(company.telegramAdminId, photo, caption).catch(() => {});
      }

      return res.json({ action: "check_in", employee: formatEmployee(employee), attendance: formatAttendance(newRecord, employee), lateMinutes });
    } else if (!todayRecord.checkOut) {
      const checkInTime = todayRecord.checkIn ? new Date(todayRecord.checkIn) : now;
      const workHours = (now.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);
      const [updated] = await db.update(attendanceTable)
        .set({ checkOut: now, workHours: workHours.toFixed(2), selfiePhoto: photo || todayRecord.selfiePhoto || null })
        .where(eq(attendanceTable.id, todayRecord.id)).returning();

      const date = now.toLocaleDateString("uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric" });
      if (employee.telegramId) {
        await sendTelegramMessage(employee.telegramId,
          `🏁 <b>Ish yakunlandi!</b>\n\n👤 ${employee.fullName}\n🕐 Ketish vaqti: <b>${formatTime(now)}</b>\n⏱ Ishlagan vaqt: <b>${workHours.toFixed(1)} soat</b>\n📅 Sana: ${date}\n🎭 Yuz tanish orqali`
        ).catch(() => {});
      }
      return res.json({ action: "check_out", employee: formatEmployee(employee), attendance: formatAttendance(updated, employee) });
    } else {
      return res.json({ action: "already_checked_out", employee: formatEmployee(employee), attendance: formatAttendance(todayRecord, employee) });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server_error", message: "Ichki server xatosi" });
  }
});

router.get("/today", requireAuth, async (req, res) => {
  try {
    const companyId = (req.session as any).companyId;

    const records = await db.select().from(attendanceTable).where(
      and(eq(attendanceTable.companyId, companyId), sql`DATE(${attendanceTable.createdAt}) = CURRENT_DATE`)
    ).orderBy(desc(attendanceTable.checkIn));

    const withEmployees = await Promise.all(records.map(async (r) => {
      const [emp] = await db.select().from(employeesTable).where(eq(employeesTable.id, r.employeeId));
      return formatAttendance(r, emp);
    }));

    return res.json({ data: withEmployees, total: withEmployees.length, page: 1, limit: withEmployees.length });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server_error" });
  }
});

router.get("/", requireAuth, async (req, res) => {
  try {
    const companyId = (req.session as any).companyId;
    const { employee_id, date_from, date_to, page = "1", limit = "20" } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    const conditions: any[] = [eq(attendanceTable.companyId, companyId)];
    if (employee_id) conditions.push(eq(attendanceTable.employeeId, parseInt(employee_id as string)));
    if (date_from) conditions.push(gte(attendanceTable.createdAt, new Date(date_from as string)));
    if (date_to) {
      const dateTo = new Date(date_to as string);
      dateTo.setHours(23, 59, 59, 999);
      conditions.push(lte(attendanceTable.createdAt, dateTo));
    }

    const records = await db.select().from(attendanceTable)
      .where(and(...conditions))
      .orderBy(desc(attendanceTable.createdAt))
      .limit(limitNum)
      .offset(offset);

    const withEmployees = await Promise.all(records.map(async (r) => {
      const [emp] = await db.select().from(employeesTable).where(eq(employeesTable.id, r.employeeId));
      return formatAttendance(r, emp);
    }));

    const [countResult] = await db.select({ count: sql<number>`count(*)::int` })
      .from(attendanceTable).where(and(...conditions));

    return res.json({
      data: withEmployees,
      total: countResult?.count ?? 0,
      page: pageNum,
      limit: limitNum,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server_error" });
  }
});

function formatEmployee(e: any) {
  return {
    id: e.id, companyId: e.companyId, fullName: e.fullName, phone: e.phone,
    position: e.position, salaryType: e.salaryType,
    hourlyRate: e.hourlyRate ? parseFloat(e.hourlyRate) : null,
    monthlySalary: e.monthlySalary ? parseFloat(e.monthlySalary) : null,
    qrCode: e.qrCode, telegramId: e.telegramId, createdAt: e.createdAt,
  };
}

function formatAttendance(a: any, employee: any) {
  return {
    id: a.id, employeeId: a.employeeId, companyId: a.companyId,
    checkIn: a.checkIn, checkOut: a.checkOut,
    workHours: a.workHours ? parseFloat(a.workHours) : null,
    lateMinutes: a.lateMinutes || 0, status: a.status,
    deviceId: a.deviceId, selfiePhoto: a.selfiePhoto || null,
    createdAt: a.createdAt,
    employee: employee ? formatEmployee(employee) : null,
  };
}

function formatTime(date: Date) {
  return date.toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" });
}

export default router;
