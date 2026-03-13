import { Router, type IRouter } from "express";
import { sendTelegramMessage } from "../lib/telegram-bot";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.post("/send", requireAuth, async (req, res) => {
  try {
    const { telegramId, message } = req.body;
    if (!telegramId || !message) {
      return res.status(400).json({ error: "validation_error", message: "telegramId and message required" });
    }
    await sendTelegramMessage(telegramId, message);
    return res.json({ success: true, message: "Message sent" });
  } catch (err) {
    return res.status(500).json({ error: "server_error" });
  }
});

export default router;
