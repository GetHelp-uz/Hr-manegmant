import app from "./app";
import { initTelegramBot } from "./lib/telegram-bot";
import { setupAdminTables } from "./lib/setup-db";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
  setTimeout(() => {
    setupAdminTables().catch(err => {
      console.error("[setup-db] Failed, retrying in 10s:", err.message);
      setTimeout(() => setupAdminTables().catch(console.error), 10000);
    });
  }, 3000);
  initTelegramBot();
});
