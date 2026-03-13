import TelegramBot from "node-telegram-bot-api";
import { db, employeesTable, attendanceTable, companiesTable, leaveRequestsTable, advanceRequestsTable, departmentsTable } from "@workspace/db";
import { eq, and, sql, desc, ilike } from "drizzle-orm";

function formatTimeBotLocal(d: Date): string {
  return d.toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" });
}

function calcLateBotMinutes(checkIn: Date, workStartTime: string, thresholdMinutes: number): number {
  const [h, m] = workStartTime.split(":").map(Number);
  const start = new Date(checkIn);
  start.setHours(h, m, 0, 0);
  const diffMs = checkIn.getTime() - start.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  return diffMin > thresholdMinutes ? diffMin : 0;
}

async function registerQrAttendance(bot: TelegramBot, chatId: string, employee: any) {
  try {
    const [company] = await db.select().from(companiesTable).where(eq(companiesTable.id, employee.companyId));
    const workStart = company?.workStartTime || "09:00";
    const threshold = parseInt(company?.lateThresholdMinutes?.toString() || "15");

    const [todayRecord] = await db.select().from(attendanceTable).where(
      and(
        eq(attendanceTable.employeeId, employee.id),
        sql`DATE(${attendanceTable.createdAt}) = CURRENT_DATE`
      )
    );

    const now = new Date();
    const date = now.toLocaleDateString("uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric" });

    if (!todayRecord) {
      const lateMinutes = calcLateBotMinutes(now, workStart, threshold);
      const status = lateMinutes > 0 ? "late" : "present";

      await db.insert(attendanceTable).values({
        employeeId: employee.id,
        companyId: employee.companyId,
        checkIn: now,
        lateMinutes,
        status,
      });

      const lateText = lateMinutes > 0 ? `\n⚠️ Kechikish: <b>${lateMinutes} daqiqa</b>` : "";
      await bot.sendMessage(
        chatId,
        `✅ <b>Ishga keldingiz!</b>\n\n` +
        `👤 ${employee.fullName}\n` +
        `🕐 Kelish vaqti: <b>${formatTimeBotLocal(now)}</b>\n` +
        `📅 Sana: ${date}${lateText}`,
        { parse_mode: "HTML", ...mainMenu() }
      );

      if (company?.telegramAdminId) {
        await bot.sendMessage(
          company.telegramAdminId,
          `📥 <b>${employee.fullName}</b> keldi\n🕐 ${formatTimeBotLocal(now)} — ${date}${lateText}`,
          { parse_mode: "HTML" }
        ).catch(() => {});
      }
    } else if (!todayRecord.checkOut) {
      const checkInTime = todayRecord.checkIn ? new Date(todayRecord.checkIn) : now;
      const workHours = (now.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);

      await db.update(attendanceTable)
        .set({ checkOut: now, workHours: workHours.toFixed(2) })
        .where(eq(attendanceTable.id, todayRecord.id));

      await bot.sendMessage(
        chatId,
        `🏁 <b>Ish yakunlandi!</b>\n\n` +
        `👤 ${employee.fullName}\n` +
        `🕐 Ketish vaqti: <b>${formatTimeBotLocal(now)}</b>\n` +
        `⏱ Ishlagan vaqt: <b>${workHours.toFixed(1)} soat</b>\n` +
        `📅 Sana: ${date}`,
        { parse_mode: "HTML", ...mainMenu() }
      );

      if (company?.telegramAdminId) {
        await bot.sendMessage(
          company.telegramAdminId,
          `📤 <b>${employee.fullName}</b> ketdi\n🕐 ${formatTimeBotLocal(now)} — ${date}\n⏱ Ishlagan: <b>${workHours.toFixed(1)} soat</b>`,
          { parse_mode: "HTML" }
        ).catch(() => {});
      }
    } else {
      const ci = formatTimeBotLocal(new Date(todayRecord.checkIn!));
      const co = formatTimeBotLocal(new Date(todayRecord.checkOut!));
      const wh = todayRecord.workHours ? parseFloat(todayRecord.workHours.toString()).toFixed(1) : "0";
      await bot.sendMessage(
        chatId,
        `ℹ️ <b>Bugun davomat allaqachon yakunlangan</b>\n\n` +
        `👤 ${employee.fullName}\n` +
        `🕐 Kelish: ${ci}\n🕐 Ketish: ${co}\n⏱ Ishlagan: ${wh} soat`,
        { parse_mode: "HTML", ...mainMenu() }
      );
    }
  } catch (err) {
    console.error("[Bot QR attendance]", err);
    await bot.sendMessage(chatId, "❌ Davomat qayd qilishda xatolik yuz berdi. Iltimos qayta urinib ko'ring.");
  }
}

let bot: TelegramBot | null = null;
let botUsername: string = process.env.TELEGRAM_BOT_USERNAME || "";

const userState: Record<string, { step: string; data: any }> = {};

export function initTelegramBot() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.warn("TELEGRAM_BOT_TOKEN not set, Telegram bot disabled");
    return null;
  }
  try {
    bot = new TelegramBot(token, { polling: true });
    bot.getMe().then((me) => {
      botUsername = me.username || "";
      if (!process.env.TELEGRAM_BOT_USERNAME) {
        process.env.TELEGRAM_BOT_USERNAME = botUsername;
      }
      console.log(`Telegram bot started successfully (@${botUsername})`);
    }).catch(() => {});
    setupHandlers(bot);
    return bot;
  } catch (err) {
    console.error("Failed to start Telegram bot:", err);
    return null;
  }
}

export function getBotUsername(): string {
  return botUsername || process.env.TELEGRAM_BOT_USERNAME || "HeadRecruiment_bot";
}

export function getBot(): TelegramBot | null {
  return bot;
}

export async function sendTelegramMessage(telegramId: string, message: string) {
  if (!bot) return;
  try {
    await bot.sendMessage(telegramId, message, { parse_mode: "HTML" });
  } catch (err) {
    console.error("Failed to send Telegram message:", err);
  }
}

export async function sendTelegramPhoto(telegramId: string, photoBase64: string, caption?: string) {
  if (!bot) return;
  try {
    const base64Data = photoBase64.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");
    await bot.sendPhoto(telegramId, buffer, { caption, parse_mode: "HTML" });
  } catch (err) {
    console.error("Failed to send Telegram photo:", err);
  }
}

async function getEmployee(chatId: string) {
  const [emp] = await db.select().from(employeesTable).where(eq(employeesTable.telegramId, chatId));
  return emp || null;
}

function mainMenu() {
  return {
    reply_markup: {
      keyboard: [
        [{ text: "📅 Bugungi davomat" }, { text: "💰 Oylik maosh" }],
        [{ text: "📊 Davomat tarixi" }, { text: "ℹ️ Ma'lumotlarim" }],
        [{ text: "🏖 Ta'til so'rash" }, { text: "🤒 Kasallik/Ruxsat" }],
        [{ text: "💵 Avans so'rash" }, { text: "📋 So'rovlarim" }],
        [{ text: "🚪 Hisobdan chiqish" }],
      ],
      resize_keyboard: true,
    },
  };
}

function logoutConfirmMenu() {
  return {
    reply_markup: {
      keyboard: [
        [{ text: "✅ Ha, chiqish" }, { text: "❌ Bekor qilish" }],
      ],
      resize_keyboard: true,
    },
  };
}

function cancelMenu() {
  return {
    reply_markup: {
      keyboard: [[{ text: "❌ Bekor qilish" }]],
      resize_keyboard: true,
    },
  };
}

function setupHandlers(bot: TelegramBot) {
  bot.on("message", async (msg) => {
    const chatId = msg.chat.id.toString();
    const text = msg.text?.trim() || "";

    if (text === "❌ Bekor qilish") {
      delete userState[chatId];
      const emp = await getEmployee(chatId);
      await bot.sendMessage(chatId, "✅ Bekor qilindi.", { ...(emp ? mainMenu() : {}), parse_mode: "HTML" });
      return;
    }

    if (text === "🚪 Hisobdan chiqish") {
      const emp = await getEmployee(chatId);
      if (!emp) {
        await bot.sendMessage(chatId, "❌ Siz hali tizimga ulanmagansiz.", { reply_markup: { remove_keyboard: true } });
        return;
      }
      userState[chatId] = { step: "logout_confirm", data: {} };
      await bot.sendMessage(chatId,
        `⚠️ <b>Hisobdan chiqish</b>\n\nSiz <b>${emp.fullName}</b> hisobidan chiqmoqchimisiz?\n\nChiqib ketganingizdan so'ng, qayta kirish uchun xodim kodingizni yoki QR kodni skanerdan o'tkazishingiz kerak bo'ladi.`,
        { parse_mode: "HTML", ...logoutConfirmMenu() }
      );
      return;
    }

    if (text === "✅ Ha, chiqish" && userState[chatId]?.step === "logout_confirm") {
      delete userState[chatId];
      const emp = await getEmployee(chatId);
      if (emp) {
        await db.update(employeesTable).set({ telegramId: null }).where(eq(employeesTable.id, emp.id));
        await bot.sendMessage(chatId,
          `✅ <b>Muvaffaqiyatli chiqdingiz!</b>\n\n<b>${emp.fullName}</b> hisobingiz bot bilan bog'liqligini uzib oldingiz.\n\nQayta ulanish uchun xodim kodingizni yoki kompaniya QR kodini yuboring.`,
          { parse_mode: "HTML", reply_markup: { remove_keyboard: true } }
        );
      } else {
        await bot.sendMessage(chatId, "✅ Chiqdingiz.", { reply_markup: { remove_keyboard: true } });
      }
      return;
    }

    if (userState[chatId]) {
      await handleConversation(bot, chatId, text, msg);
      return;
    }

    // Employee code: 6-digit number → attendance registration
    if (/^\d{6,7}$/.test(text)) {
      await handleEmployeeCode(bot, chatId, text);
      return;
    }

    // Admin broadcast command: /yubor
    if (text.startsWith("/yubor") || text.startsWith("📢 Yuborish")) {
      await handleAdminBroadcast(bot, chatId, text);
      return;
    }

    if (text.startsWith("/start")) {
      await handleStart(bot, chatId, text, msg);
    } else if (text === "/bugun" || text === "📅 Bugungi davomat") {
      await handleBugun(bot, chatId);
    } else if (text === "/oylik" || text === "💰 Oylik maosh") {
      await handleOylik(bot, chatId);
    } else if (text === "/tarix" || text === "📊 Davomat tarixi") {
      await handleTarix(bot, chatId);
    } else if (text === "/info" || text === "ℹ️ Ma'lumotlarim") {
      await handleInfo(bot, chatId);
    } else if (text === "/tatil" || text === "🏖 Ta'til so'rash") {
      await startLeaveRequest(bot, chatId, "vacation");
    } else if (text === "/ruxsat" || text === "🤒 Kasallik/Ruxsat") {
      await startLeaveRequest(bot, chatId, "sick");
    } else if (text === "/sorov" || text === "📋 So'rovlarim") {
      await handleSorov(bot, chatId);
    } else if (text === "/avans" || text === "💵 Avans so'rash") {
      await startAvansRequest(bot, chatId);
    } else if (text === "/help" || text === "/menu") {
      const emp = await getEmployee(chatId);
      if (emp) {
        await bot.sendMessage(chatId, `🏢 <b>HR Tizimi Bot</b>\n\nQuyidagi tugmalardan foydalaning:`, { parse_mode: "HTML", ...mainMenu() });
      } else {
        await bot.sendMessage(chatId, `🏢 <b>HR Tizimi Botiga Xush Kelibsiz!</b>\n\n🔢 Xodim kodingizni yuboring (6 raqamli) yoki QR kodni skanerlang.`, { parse_mode: "HTML" });
      }
    }
  });

  bot.on("polling_error", (err) => {
    console.error("Telegram polling error:", err.message);
  });
}

async function handleEmployeeCode(bot: TelegramBot, chatId: string, code: string) {
  try {
    const [employee] = await db.select().from(employeesTable)
      .where(eq(employeesTable.employeeCode, code));

    if (!employee) {
      await bot.sendMessage(chatId, `❌ <b>${code}</b> — bu kod tizimda topilmadi.\n\nAdminingizdan to'g'ri xodim kodini oling.`, { parse_mode: "HTML" });
      return;
    }

    if (!employee.telegramId) {
      await db.update(employeesTable).set({ telegramId: chatId }).where(eq(employeesTable.id, employee.id));
      const [company] = await db.select().from(companiesTable).where(eq(companiesTable.id, employee.companyId));
      await bot.sendMessage(chatId,
        `✅ <b>Muvaffaqiyatli ulandi!</b>\n\n👤 ${employee.fullName}\n🏢 ${company?.name || "—"}\n📋 ${employee.position}\n\n📲 Har kuni shu kodni yuboring — davomat qayd etiladi!`,
        { parse_mode: "HTML" }
      );
      const linkedEmp = { ...employee, telegramId: chatId };
      await registerQrAttendance(bot, chatId, linkedEmp);
      return;
    }

    if (employee.telegramId !== chatId) {
      await bot.sendMessage(chatId, `❌ Bu kod boshqa foydalanuvchiga bog'liq. Agar bu sizning kodingiz bo'lsa, adminга murojaat qiling.`);
      return;
    }

    await registerQrAttendance(bot, chatId, employee);
  } catch (err) {
    console.error("[handleEmployeeCode]", err);
    await bot.sendMessage(chatId, "❌ Xatolik yuz berdi. Qayta urinib ko'ring.");
  }
}

async function handleAdminBroadcast(bot: TelegramBot, chatId: string, text: string) {
  try {
    const company = await db.select().from(companiesTable)
      .where(eq(companiesTable.telegramAdminId, chatId))
      .then(r => r[0] || null);

    if (!company) {
      await bot.sendMessage(chatId, `❌ Ushbu buyruq faqat kompaniya adminlari uchun.\n\nAdmin sifatida sozlamalar bo'limida Telegram admin ID'ingizni kiriting.`);
      return;
    }

    const parts = text.replace("/yubor", "").trim().split(" ");
    const target = parts[0]?.toLowerCase() || "";
    const message = parts.slice(1).join(" ").trim();

    if (!message) {
      await bot.sendMessage(chatId,
        `📢 <b>Ommaviy xabar yuborish</b>\n\n` +
        `Foydalanish:\n` +
        `• <code>/yubor hammaga [matn]</code> — hamma xodimlarga\n` +
        `• <code>/yubor bolim [bolim nomi] [matn]</code> — bo'lim xodimlariga\n` +
        `• <code>/yubor [xodim kodi] [matn]</code> — bitta xodimga\n\n` +
        `Misol: <code>/yubor hammaga Bugun ish 9 da boshlanadi</code>`,
        { parse_mode: "HTML" }
      );
      return;
    }

    let employees: any[] = [];

    if (target === "hammaga") {
      employees = await db.select().from(employeesTable)
        .where(and(eq(employeesTable.companyId, company.id), eq(employeesTable.status, "active")));
    } else if (target === "bolim") {
      const deptName = parts[1]?.trim() || "";
      const msgText = parts.slice(2).join(" ").trim();
      if (!deptName || !msgText) {
        await bot.sendMessage(chatId, `❌ To'g'ri format: /yubor bolim [bo'lim nomi] [matn]`);
        return;
      }
      const [dept] = await db.select().from(departmentsTable)
        .where(and(eq(departmentsTable.companyId, company.id), ilike(departmentsTable.name, `%${deptName}%`)));
      if (!dept) {
        await bot.sendMessage(chatId, `❌ "<b>${deptName}</b>" nomli bo'lim topilmadi.`, { parse_mode: "HTML" });
        return;
      }
      employees = await db.select().from(employeesTable)
        .where(and(eq(employeesTable.companyId, company.id), eq(employeesTable.departmentId, dept.id), eq(employeesTable.status, "active")));
      const finalMsg = msgText;
      let sent = 0, failed = 0;
      for (const emp of employees) {
        if (!emp.telegramId) continue;
        try { await bot.sendMessage(emp.telegramId, `📢 ${finalMsg}`, { parse_mode: "HTML" }); sent++; }
        catch { failed++; }
        await new Promise(r => setTimeout(r, 60));
      }
      await bot.sendMessage(chatId, `✅ <b>${dept.name}</b> bo'limiga yuborildi\n📤 Yuborildi: ${sent}\n❌ Yuborilmadi: ${failed}`, { parse_mode: "HTML" });
      return;
    } else if (/^\d{6,7}$/.test(target)) {
      const [emp] = await db.select().from(employeesTable)
        .where(and(eq(employeesTable.employeeCode, target), eq(employeesTable.companyId, company.id)));
      if (!emp) {
        await bot.sendMessage(chatId, `❌ <b>${target}</b> kodli xodim topilmadi.`, { parse_mode: "HTML" });
        return;
      }
      if (!emp.telegramId) {
        await bot.sendMessage(chatId, `❌ Bu xodim hali botga ulanmagan.`);
        return;
      }
      await bot.sendMessage(emp.telegramId, `📢 ${message}`, { parse_mode: "HTML" });
      await bot.sendMessage(chatId, `✅ <b>${emp.fullName}</b> ga xabar yuborildi.`, { parse_mode: "HTML" });
      return;
    } else {
      await bot.sendMessage(chatId,
        `❌ Noto'g'ri buyruq.\n\nMisol:\n• <code>/yubor hammaga [matn]</code>\n• <code>/yubor bolim [nom] [matn]</code>\n• <code>/yubor [xodim kodi] [matn]</code>`,
        { parse_mode: "HTML" }
      );
      return;
    }

    let sent = 0, failed = 0;
    for (const emp of employees) {
      if (!emp.telegramId) continue;
      try { await bot.sendMessage(emp.telegramId, `📢 ${message}`, { parse_mode: "HTML" }); sent++; }
      catch { failed++; }
      await new Promise(r => setTimeout(r, 60));
    }
    const total = employees.filter(e => e.telegramId).length;
    await bot.sendMessage(chatId,
      `✅ <b>Xabar yuborildi</b>\n\n📤 Yuborildi: ${sent}\n❌ Yuborilmadi: ${failed}\n👥 Jami bot ulangan: ${total}`,
      { parse_mode: "HTML" }
    );
  } catch (err) {
    console.error("[handleAdminBroadcast]", err);
    await bot.sendMessage(chatId, "❌ Xatolik yuz berdi.");
  }
}

async function handleStart(bot: TelegramBot, chatId: string, text: string, msg: any) {
  const parts = text.split(" ");
  const param = parts[1]?.trim();

  if (param) {
    // Employee personal QR / Telegram deeplink: emp_{employeeId}
    if (param.startsWith("emp_")) {
      const empIdStr = param.slice(4);
      const empId = parseInt(empIdStr);
      if (!empId || isNaN(empId)) {
        await bot.sendMessage(chatId, `❌ QR kod noto'g'ri. Admin bilan bog'laning.`);
        return;
      }
      const [employee] = await db.select().from(employeesTable).where(eq(employeesTable.id, empId));

      if (!employee) {
        await bot.sendMessage(chatId, `❌ QR kod noto'g'ri yoki muddati o'tgan. Admin bilan bog'laning.`);
        return;
      }

      // Already linked to this chat — register attendance via QR
      if (employee.telegramId && employee.telegramId === chatId) {
        await registerQrAttendance(bot, chatId, employee);
        return;
      }

      // Not linked yet — link employee to this Telegram account
      await db.update(employeesTable).set({ telegramId: chatId }).where(eq(employeesTable.id, employee.id));
      const [company] = await db.select().from(companiesTable).where(eq(companiesTable.id, employee.companyId));

      await bot.sendMessage(
        chatId,
        `✅ <b>Muvaffaqiyatli ulandi!</b>\n\n` +
        `👤 Xodim: <b>${employee.fullName}</b>\n` +
        `🏢 Kompaniya: <b>${company?.name || "—"}</b>\n` +
        `📋 Lavozim: ${employee.position}\n\n` +
        `📲 Endi QR kodingizni har kuni skanerlang — davomat avtomatik qayd etiladi!`,
        { parse_mode: "HTML" }
      );
      // Also register attendance right now on first link
      const linkedEmployee = { ...employee, telegramId: chatId };
      await registerQrAttendance(bot, chatId, linkedEmployee);
      return;
    }

    // Unknown param
    await bot.sendMessage(chatId, `❌ Noto'g'ri QR kod. Admin bilan bog'laning.`);
    return;
  }

  const emp = await getEmployee(chatId);
  if (emp) {
    await bot.sendMessage(chatId, `👋 Xush kelibsiz, <b>${emp.fullName}</b>!\n\nQuyidagi menyudan foydalaning:`, { parse_mode: "HTML", ...mainMenu() });
  } else {
    await bot.sendMessage(
      chatId,
      `🏢 <b>HR Tizimi Botiga Xush Kelibsiz!</b>\n\n` +
      `🔢 Botdan foydalanish uchun:\n` +
      `1. Admindan <b>6 raqamli xodim kodingizni</b> oling\n` +
      `2. Shu kodni botga yuboring\n` +
      `3. Yoki QR kodni skanerlang\n\n` +
      `📱 Telegram ID: <code>${chatId}</code>`,
      { parse_mode: "HTML" }
    );
  }
}

async function handleConversation(bot: TelegramBot, chatId: string, text: string, msg: any) {
  const state = userState[chatId];

  if (state.step === "leave_start_date") {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text) && !/^\d{2}\.\d{2}\.\d{4}$/.test(text)) {
      await bot.sendMessage(chatId, `❌ Noto'g'ri format. Misol: 2025-04-10`, cancelMenu() as any);
      return;
    }
    const dateStr = text.includes(".") ? text.split(".").reverse().join("-") : text;
    userState[chatId].step = "leave_end_date";
    userState[chatId].data.startDate = dateStr;
    await bot.sendMessage(chatId, `📅 Oxirgi sana (YYYY-MM-DD):\n<i>Misol: 2025-04-15</i>`, { parse_mode: "HTML", ...cancelMenu() as any });
    return;
  }

  if (state.step === "leave_end_date") {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text) && !/^\d{2}\.\d{2}\.\d{4}$/.test(text)) {
      await bot.sendMessage(chatId, `❌ Noto'g'ri format. Misol: 2025-04-15`, cancelMenu() as any);
      return;
    }
    const dateStr = text.includes(".") ? text.split(".").reverse().join("-") : text;
    const start = new Date(userState[chatId].data.startDate);
    const end = new Date(dateStr);
    if (end < start) {
      await bot.sendMessage(chatId, `❌ Oxirgi sana boshlanish sanasidan oldin bo'lolmaydi.`, cancelMenu() as any);
      return;
    }
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    userState[chatId].step = "leave_reason";
    userState[chatId].data.endDate = dateStr;
    userState[chatId].data.days = days;
    await bot.sendMessage(chatId, `📝 Sabab yozing (yoki /skip bosing):`, { parse_mode: "HTML", ...cancelMenu() as any });
    return;
  }

  if (state.step === "leave_reason") {
    const reason = text === "/skip" ? null : text;
    const { type, startDate, endDate, days, employeeId, companyId } = state.data;
    delete userState[chatId];

    try {
      await db.insert(leaveRequestsTable).values({
        employeeId, companyId, type, startDate, endDate, days, reason, status: "pending",
      }).returning();

      const [company] = await db.select().from(companiesTable).where(eq(companiesTable.id, companyId));
      if (company?.telegramAdminId) {
        const [emp] = await db.select().from(employeesTable).where(eq(employeesTable.id, employeeId));
        const typeNames: Record<string, string> = { vacation: "Ta'til", sick: "Kasallik", other: "Boshqa" };
        await sendTelegramMessage(
          company.telegramAdminId,
          `🔔 <b>Yangi so'rov!</b>\n\n👤 ${emp?.fullName}\n📋 Tur: ${typeNames[type] || type}\n📅 ${startDate} — ${endDate} (${days} kun)\n📝 ${reason || "Sabab ko'rsatilmagan"}\n\nDashboard orqali tasdiqlang.`
        ).catch(() => {});
      }

      const typeLabel: Record<string, string> = { vacation: "Ta'til", sick: "Kasallik", other: "Boshqa" };
      await bot.sendMessage(
        chatId,
        `✅ <b>So'rov yuborildi!</b>\n\n📋 Tur: ${typeLabel[type] || type}\n📅 ${startDate} — ${endDate}\n⏱ ${days} kun\n📝 ${reason || "—"}\n\n⏳ Admin tasdiqlashini kuting.`,
        { parse_mode: "HTML", ...mainMenu() }
      );
    } catch (err) {
      console.error(err);
      await bot.sendMessage(chatId, "❌ Xatolik yuz berdi.", mainMenu() as any);
    }
    return;
  }

  if (state.step === "avans_amount") {
    const amount = parseFloat(text.replace(/\s/g, "").replace(",", "."));
    if (isNaN(amount) || amount <= 0) {
      await bot.sendMessage(chatId, `❌ Noto'g'ri miqdor. Raqam kiriting:\n<i>Misol: 500000</i>`, { parse_mode: "HTML", ...cancelMenu() as any });
      return;
    }
    userState[chatId].step = "avans_reason";
    userState[chatId].data.amount = amount;
    await bot.sendMessage(chatId, `📝 Avans sababini yozing:`, cancelMenu() as any);
    return;
  }

  if (state.step === "avans_reason") {
    const { amount, employeeId, companyId } = state.data;
    const reason = text;
    delete userState[chatId];

    try {
      await db.insert(advanceRequestsTable).values({
        employeeId, companyId, amount: amount.toString(), reason, status: "pending",
      });

      const [company] = await db.select().from(companiesTable).where(eq(companiesTable.id, companyId));
      const [emp] = await db.select().from(employeesTable).where(eq(employeesTable.id, employeeId));

      if (company?.telegramAdminId) {
        await sendTelegramMessage(
          company.telegramAdminId,
          `💵 <b>Avans so'rovi!</b>\n\n👤 ${emp?.fullName}\n💰 Miqdor: <b>${Number(amount).toLocaleString()} so'm</b>\n📝 Sabab: ${reason}\n\n✅ Admin paneldan tasdiqlang.`
        ).catch(() => {});
      }

      await bot.sendMessage(
        chatId,
        `✅ <b>Avans so'rovi yuborildi!</b>\n\n💰 Miqdor: <b>${Number(amount).toLocaleString()} so'm</b>\n📝 Sabab: ${reason}\n\n⏳ Admin tasdiqlashini kuting.`,
        { parse_mode: "HTML", ...mainMenu() }
      );
    } catch (err) {
      console.error(err);
      await bot.sendMessage(chatId, "❌ Xatolik yuz berdi.", mainMenu() as any);
    }
    return;
  }
}

async function startLeaveRequest(bot: TelegramBot, chatId: string, type: "vacation" | "sick" | "other") {
  const emp = await getEmployee(chatId);
  if (!emp) {
    await bot.sendMessage(chatId, `❌ Siz tizimga ulanmagansiz. Kompaniya QR kodini skanerlang.`);
    return;
  }

  userState[chatId] = { step: "leave_start_date", data: { type, employeeId: emp.id, companyId: emp.companyId } };
  const typeLabel: Record<string, string> = { vacation: "Ta'til", sick: "Kasallik/Ruxsat", other: "Boshqa" };
  await bot.sendMessage(
    chatId,
    `📋 <b>${typeLabel[type]} so'rovi</b>\n\nBoshlash sanasini kiriting (YYYY-MM-DD):\n<i>Misol: 2025-04-10</i>`,
    { parse_mode: "HTML", ...cancelMenu() as any }
  );
}

async function startAvansRequest(bot: TelegramBot, chatId: string) {
  const emp = await getEmployee(chatId);
  if (!emp) {
    await bot.sendMessage(chatId, `❌ Siz tizimga ulanmagansiz. Kompaniya QR kodini skanerlang.`);
    return;
  }
  userState[chatId] = { step: "avans_amount", data: { employeeId: emp.id, companyId: emp.companyId } };
  await bot.sendMessage(
    chatId,
    `💵 <b>Avans so'rovi</b>\n\nSo'ramoqchi bo'lgan miqdorni kiriting (so'mda):\n<i>Misol: 500000</i>`,
    { parse_mode: "HTML", ...cancelMenu() as any }
  );
}

async function handleSorov(bot: TelegramBot, chatId: string) {
  const emp = await getEmployee(chatId);
  if (!emp) {
    await bot.sendMessage(chatId, `❌ Siz tizimga ulanmagansiz.`);
    return;
  }

  const requests = await db.select().from(leaveRequestsTable)
    .where(eq(leaveRequestsTable.employeeId, emp.id))
    .orderBy(desc(leaveRequestsTable.createdAt))
    .limit(5);

  if (!requests.length) {
    await bot.sendMessage(chatId, `📋 So'rovlar mavjud emas.`, mainMenu() as any);
    return;
  }

  const typeLabel: Record<string, string> = { vacation: "Ta'til", sick: "Kasallik", other: "Boshqa" };
  const statusLabel: Record<string, string> = { pending: "⏳ Kutilmoqda", approved: "✅ Tasdiqlandi", rejected: "❌ Rad etildi" };

  let text = `📋 <b>So'nggi so'rovlar</b>\n\n`;
  for (const r of requests) {
    text += `${statusLabel[r.status] || r.status}\n`;
    text += `📋 ${typeLabel[r.type] || r.type} • ${r.startDate} — ${r.endDate} (${r.days} kun)\n`;
    if (r.adminNote) text += `📝 Admin: ${r.adminNote}\n`;
    text += "\n";
  }

  await bot.sendMessage(chatId, text, { parse_mode: "HTML", ...mainMenu() });
}

async function handleBugun(bot: TelegramBot, chatId: string) {
  try {
    const employee = await getEmployee(chatId);
    if (!employee) {
      await bot.sendMessage(chatId, `❌ Siz tizimga ulanmagansiz.\nKompaniya QR kodini skanerlang.`);
      return;
    }

    const [todayRecord] = await db.select().from(attendanceTable).where(
      and(eq(attendanceTable.employeeId, employee.id), sql`DATE(${attendanceTable.createdAt}) = CURRENT_DATE`)
    );

    if (!todayRecord) {
      await bot.sendMessage(chatId, `📅 <b>Bugungi davomat</b>\n\nSiz bugun hali kirmaganlar ro'yxatidasiz.`, { parse_mode: "HTML", ...mainMenu() });
      return;
    }

    const checkIn = todayRecord.checkIn ? new Date(todayRecord.checkIn).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" }) : "-";
    const checkOut = todayRecord.checkOut ? new Date(todayRecord.checkOut).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" }) : "Hali ketmadingiz";
    const hours = todayRecord.workHours ? parseFloat(todayRecord.workHours.toString()).toFixed(1) : "-";
    const lateText = todayRecord.lateMinutes && todayRecord.lateMinutes > 0 ? `\n⚠️ Kechikish: ${todayRecord.lateMinutes} daqiqa` : "";

    await bot.sendMessage(
      chatId,
      `📅 <b>Bugungi davomat</b>\n\n👤 ${employee.fullName}\n🕐 Kelish: ${checkIn}\n🕐 Ketish: ${checkOut}\n⏱ Ishlagan: ${hours} soat${lateText}`,
      { parse_mode: "HTML", ...mainMenu() }
    );
  } catch (err) {
    console.error(err);
    await bot.sendMessage(chatId, "❌ Xatolik yuz berdi.");
  }
}

async function handleOylik(bot: TelegramBot, chatId: string) {
  try {
    const employee = await getEmployee(chatId);
    if (!employee) {
      await bot.sendMessage(chatId, `❌ Siz tizimga ulanmagansiz.`);
      return;
    }

    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    const records = await db.select().from(attendanceTable).where(
      and(
        eq(attendanceTable.employeeId, employee.id),
        sql`EXTRACT(MONTH FROM ${attendanceTable.createdAt}) = ${month}`,
        sql`EXTRACT(YEAR FROM ${attendanceTable.createdAt}) = ${year}`,
      )
    );

    const totalHours = records.reduce((sum, r) => sum + (r.workHours ? parseFloat(r.workHours.toString()) : 0), 0);
    const totalDays = records.filter(r => r.checkIn).length;
    const lateDays = records.filter(r => r.lateMinutes && r.lateMinutes > 0).length;

    let salary = 0;
    let salaryInfo = "";
    if (employee.salaryType === "hourly" && employee.hourlyRate) {
      salary = totalHours * parseFloat(employee.hourlyRate.toString());
      salaryInfo = `Soatlik: ${parseFloat(employee.hourlyRate.toString()).toLocaleString()} so'm/soat`;
    } else if (employee.salaryType === "monthly" && employee.monthlySalary) {
      const workingDays = 22;
      salary = (parseFloat(employee.monthlySalary.toString()) / workingDays) * totalDays;
      salaryInfo = `Oylik: ${parseFloat(employee.monthlySalary.toString()).toLocaleString()} so'm`;
    }

    const monthNames = ["Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun", "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr"];
    await bot.sendMessage(
      chatId,
      `💰 <b>${monthNames[month - 1]} ${year}</b>\n\n👤 ${employee.fullName}\n📅 Ish kunlari: ${totalDays} kun\n⏱ Jami soat: ${totalHours.toFixed(1)} soat\n⚠️ Kechikish: ${lateDays} kun\n${salaryInfo}\n💵 Hisoblangan: <b>${Math.round(salary).toLocaleString()} so'm</b>`,
      { parse_mode: "HTML", ...mainMenu() }
    );
  } catch (err) {
    console.error(err);
    await bot.sendMessage(chatId, "❌ Xatolik yuz berdi.");
  }
}

async function handleTarix(bot: TelegramBot, chatId: string) {
  try {
    const employee = await getEmployee(chatId);
    if (!employee) {
      await bot.sendMessage(chatId, `❌ Siz tizimga ulanmagansiz.`);
      return;
    }

    const records = await db.select().from(attendanceTable)
      .where(eq(attendanceTable.employeeId, employee.id))
      .orderBy(desc(attendanceTable.createdAt))
      .limit(10);

    if (!records.length) {
      await bot.sendMessage(chatId, "📊 Davomat tarixi mavjud emas.", mainMenu() as any);
      return;
    }

    let text = `📊 <b>So'nggi 10 kun davomati</b>\n\n`;
    for (const r of records) {
      const date = new Date(r.createdAt).toLocaleDateString("uz-UZ", { day: "2-digit", month: "2-digit" });
      const ci = r.checkIn ? new Date(r.checkIn).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" }) : "-";
      const co = r.checkOut ? new Date(r.checkOut).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" }) : "-";
      const h = r.workHours ? parseFloat(r.workHours.toString()).toFixed(1) : "-";
      const late = r.lateMinutes && r.lateMinutes > 0 ? ` ⚠️${r.lateMinutes}d` : "";
      text += `📅 ${date}: ${ci}→${co} (${h}s)${late}\n`;
    }

    await bot.sendMessage(chatId, text, { parse_mode: "HTML", ...mainMenu() });
  } catch (err) {
    console.error(err);
    await bot.sendMessage(chatId, "❌ Xatolik yuz berdi.");
  }
}

async function handleInfo(bot: TelegramBot, chatId: string) {
  try {
    const employee = await getEmployee(chatId);
    if (!employee) {
      await bot.sendMessage(chatId, `❌ Siz tizimga ulanmagansiz.`);
      return;
    }

    const salaryInfo = employee.salaryType === "hourly"
      ? `Soatlik: ${parseFloat(employee.hourlyRate?.toString() || "0").toLocaleString()} so'm`
      : `Oylik: ${parseFloat(employee.monthlySalary?.toString() || "0").toLocaleString()} so'm`;

    await bot.sendMessage(
      chatId,
      `ℹ️ <b>Shaxsiy ma'lumotlar</b>\n\n👤 ${employee.fullName}\n📋 Lavozim: ${employee.position}\n📱 Telefon: ${employee.phone}\n💰 ${salaryInfo}`,
      { parse_mode: "HTML", ...mainMenu() }
    );
  } catch (err) {
    console.error(err);
    await bot.sendMessage(chatId, "❌ Xatolik yuz berdi.");
  }
}
