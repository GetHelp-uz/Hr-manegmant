import TelegramBot from "node-telegram-bot-api";
import { db, employeesTable, attendanceTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";

let bot: TelegramBot | null = null;

export function initTelegramBot() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.warn("TELEGRAM_BOT_TOKEN not set, Telegram bot disabled");
    return null;
  }

  try {
    bot = new TelegramBot(token, { polling: true });
    console.log("Telegram bot started successfully");
    setupHandlers(bot);
    return bot;
  } catch (err) {
    console.error("Failed to start Telegram bot:", err);
    return null;
  }
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

function setupHandlers(bot: TelegramBot) {
  bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    await bot.sendMessage(
      chatId,
      `🏢 <b>HR Tizimi Botiga Xush Kelibsiz!</b>\n\n` +
      `Quyidagi buyruqlardan foydalanishingiz mumkin:\n\n` +
      `📅 /bugun - Bugungi ishlagan vaqtingiz\n` +
      `💰 /oylik - Oylik maoshingiz\n` +
      `📊 /tarix - Davomat tarixingiz\n` +
      `ℹ️ /info - Shaxsiy ma'lumotlaringiz\n\n` +
      `Telegram ID: <code>${chatId}</code>\n` +
      `Bu ID ni xodim profiliga kiriting.`,
      { parse_mode: "HTML" }
    );
  });

  bot.onText(/\/bugun/, async (msg) => {
    const chatId = msg.chat.id.toString();
    try {
      const employee = await db.query.employeesTable.findFirst({
        where: eq(employeesTable.telegramId, chatId),
      });

      if (!employee) {
        await bot.sendMessage(
          msg.chat.id,
          `❌ Siz tizimda ro'yxatdan o'tmagansiz.\nTelegram ID: <code>${chatId}</code>\nBu ID ni kompaniya administratoriga bering.`,
          { parse_mode: "HTML" }
        );
        return;
      }

      const todayRecord = await db.query.attendanceTable.findFirst({
        where: and(
          eq(attendanceTable.employeeId, employee.id),
          sql`DATE(${attendanceTable.createdAt}) = CURRENT_DATE`
        ),
      });

      if (!todayRecord) {
        await bot.sendMessage(
          msg.chat.id,
          `📅 <b>Bugungi davomat</b>\n\nSiz bugun hali kirmaganlar ro'yxatidasiz.`,
          { parse_mode: "HTML" }
        );
        return;
      }

      const checkIn = todayRecord.checkIn ? new Date(todayRecord.checkIn).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" }) : "-";
      const checkOut = todayRecord.checkOut ? new Date(todayRecord.checkOut).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" }) : "Hali ketmadingiz";
      const hours = todayRecord.workHours ? parseFloat(todayRecord.workHours.toString()).toFixed(1) : "-";

      await bot.sendMessage(
        msg.chat.id,
        `📅 <b>Bugungi davomat</b>\n\n` +
        `👤 Xodim: ${employee.fullName}\n` +
        `🕐 Kelish: ${checkIn}\n` +
        `🕐 Ketish: ${checkOut}\n` +
        `⏱ Ishlagan vaqt: ${hours} soat`,
        { parse_mode: "HTML" }
      );
    } catch (err) {
      console.error(err);
      await bot.sendMessage(msg.chat.id, "❌ Xatolik yuz berdi. Qaytadan urinib ko'ring.");
    }
  });

  bot.onText(/\/oylik/, async (msg) => {
    const chatId = msg.chat.id.toString();
    try {
      const employee = await db.query.employeesTable.findFirst({
        where: eq(employeesTable.telegramId, chatId),
      });

      if (!employee) {
        await bot.sendMessage(
          msg.chat.id,
          `❌ Siz tizimda ro'yxatdan o'tmagansiz.\nTelegram ID: <code>${chatId}</code>`,
          { parse_mode: "HTML" }
        );
        return;
      }

      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();

      const records = await db.query.attendanceTable.findMany({
        where: and(
          eq(attendanceTable.employeeId, employee.id),
          sql`EXTRACT(MONTH FROM ${attendanceTable.createdAt}) = ${month}`,
          sql`EXTRACT(YEAR FROM ${attendanceTable.createdAt}) = ${year}`,
        ),
      });

      const totalHours = records.reduce((sum, r) => sum + (r.workHours ? parseFloat(r.workHours.toString()) : 0), 0);
      const totalDays = records.filter(r => r.checkIn).length;

      let salary = 0;
      let salaryInfo = "";
      if (employee.salaryType === "hourly" && employee.hourlyRate) {
        salary = totalHours * parseFloat(employee.hourlyRate.toString());
        salaryInfo = `Soatlik stavka: ${parseFloat(employee.hourlyRate.toString()).toLocaleString()} so'm`;
      } else if (employee.salaryType === "monthly" && employee.monthlySalary) {
        const workingDays = 22;
        salary = (parseFloat(employee.monthlySalary.toString()) / workingDays) * totalDays;
        salaryInfo = `Oylik maosh: ${parseFloat(employee.monthlySalary.toString()).toLocaleString()} so'm`;
      }

      const monthNames = ["Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun", "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr"];

      await bot.sendMessage(
        msg.chat.id,
        `💰 <b>${monthNames[month - 1]} ${year} - Maosh hisobi</b>\n\n` +
        `👤 Xodim: ${employee.fullName}\n` +
        `📋 Lavozim: ${employee.position}\n` +
        `📅 Ish kunlari: ${totalDays} kun\n` +
        `⏱ Jami soat: ${totalHours.toFixed(1)} soat\n` +
        `${salaryInfo}\n` +
        `💵 Hisoblangan maosh: <b>${Math.round(salary).toLocaleString()} so'm</b>`,
        { parse_mode: "HTML" }
      );
    } catch (err) {
      console.error(err);
      await bot.sendMessage(msg.chat.id, "❌ Xatolik yuz berdi.");
    }
  });

  bot.onText(/\/tarix/, async (msg) => {
    const chatId = msg.chat.id.toString();
    try {
      const employee = await db.query.employeesTable.findFirst({
        where: eq(employeesTable.telegramId, chatId),
      });

      if (!employee) {
        await bot.sendMessage(msg.chat.id, `❌ Siz tizimda ro'yxatdan o'tmagansiz.\nTelegram ID: <code>${chatId}</code>`, { parse_mode: "HTML" });
        return;
      }

      const records = await db.query.attendanceTable.findMany({
        where: eq(attendanceTable.employeeId, employee.id),
        orderBy: (att, { desc }) => [desc(att.createdAt)],
        limit: 7,
      });

      if (records.length === 0) {
        await bot.sendMessage(msg.chat.id, "📊 Davomat tarixi mavjud emas.");
        return;
      }

      let text = `📊 <b>So'nggi 7 kun davomati</b>\n\n`;
      for (const r of records) {
        const date = new Date(r.createdAt).toLocaleDateString("uz-UZ", { day: "2-digit", month: "2-digit" });
        const ci = r.checkIn ? new Date(r.checkIn).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" }) : "-";
        const co = r.checkOut ? new Date(r.checkOut).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" }) : "-";
        const h = r.workHours ? parseFloat(r.workHours.toString()).toFixed(1) : "-";
        text += `📅 ${date}: ${ci} → ${co} (${h}h)\n`;
      }

      await bot.sendMessage(msg.chat.id, text, { parse_mode: "HTML" });
    } catch (err) {
      console.error(err);
      await bot.sendMessage(msg.chat.id, "❌ Xatolik yuz berdi.");
    }
  });

  bot.onText(/\/info/, async (msg) => {
    const chatId = msg.chat.id.toString();
    try {
      const employee = await db.query.employeesTable.findFirst({
        where: eq(employeesTable.telegramId, chatId),
      });

      if (!employee) {
        await bot.sendMessage(msg.chat.id, `❌ Siz tizimda ro'yxatdan o'tmagansiz.\nTelegram ID: <code>${chatId}</code>`, { parse_mode: "HTML" });
        return;
      }

      const salaryInfo = employee.salaryType === "hourly"
        ? `Soatlik: ${parseFloat(employee.hourlyRate?.toString() || "0").toLocaleString()} so'm`
        : `Oylik: ${parseFloat(employee.monthlySalary?.toString() || "0").toLocaleString()} so'm`;

      await bot.sendMessage(
        msg.chat.id,
        `ℹ️ <b>Shaxsiy ma'lumotlar</b>\n\n` +
        `👤 Ism: ${employee.fullName}\n` +
        `📋 Lavozim: ${employee.position}\n` +
        `📱 Telefon: ${employee.phone}\n` +
        `💰 Maosh: ${salaryInfo}`,
        { parse_mode: "HTML" }
      );
    } catch (err) {
      console.error(err);
      await bot.sendMessage(msg.chat.id, "❌ Xatolik yuz berdi.");
    }
  });

  bot.on("polling_error", (err) => {
    console.error("Telegram polling error:", err.message);
  });
}
