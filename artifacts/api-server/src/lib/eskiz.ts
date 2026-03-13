const ESKIZ_BASE = "https://notify.eskiz.uz/api";

let cachedToken: string | null = null;
let tokenExpiry = 0;

export async function getEskizToken(email: string, password: string): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;

  const form = new URLSearchParams();
  form.append("email", email);
  form.append("password", password);

  const resp = await fetch(`${ESKIZ_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });

  if (!resp.ok) throw new Error(`Eskiz auth xatosi: ${resp.status}`);
  const data = await resp.json() as any;
  const token = data?.data?.token;
  if (!token) throw new Error("Eskiz token olinmadi: " + JSON.stringify(data));

  cachedToken = token;
  tokenExpiry = Date.now() + 23 * 60 * 60 * 1000;
  return token;
}

export function clearEskizToken() {
  cachedToken = null;
  tokenExpiry = 0;
}

export interface SendSmsOptions {
  email: string;
  password: string;
  phone: string;
  message: string;
  senderId?: string;
  testMode?: boolean;
}

export async function sendSmsViaEskiz(opts: SendSmsOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const token = await getEskizToken(opts.email, opts.password);
    const phone = opts.phone.replace(/\D/g, "");
    const normalizedPhone = phone.startsWith("998") ? phone : `998${phone}`;

    const form = new URLSearchParams();
    form.append("mobile_phone", normalizedPhone);
    form.append("message", opts.message);
    form.append("from", opts.senderId || "4546");
    if (opts.testMode) form.append("test", "1");

    const resp = await fetch(`${ESKIZ_BASE}/message/sms/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Bearer ${token}`,
      },
      body: form.toString(),
    });

    const data = await resp.json() as any;
    if (data?.status === "waiting" || data?.id) {
      return { success: true, messageId: data.id || data.message_id };
    }
    return { success: false, error: JSON.stringify(data) };
  } catch (err: any) {
    clearEskizToken();
    return { success: false, error: err.message };
  }
}

export interface BulkSmsMessage {
  phone: string;
  message: string;
}

export async function sendBulkSmsViaEskiz(
  email: string,
  password: string,
  messages: BulkSmsMessage[],
  senderId = "4546",
  testMode = false
): Promise<{ sent: number; failed: number; errors: string[] }> {
  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const msg of messages) {
    const result = await sendSmsViaEskiz({
      email,
      password,
      phone: msg.phone,
      message: msg.message,
      senderId,
      testMode,
    });
    if (result.success) sent++;
    else {
      failed++;
      errors.push(`${msg.phone}: ${result.error}`);
    }
    await new Promise(r => setTimeout(r, 100));
  }

  return { sent, failed, errors };
}

export async function testEskizConnection(email: string, password: string): Promise<{ success: boolean; balance?: string; error?: string }> {
  try {
    clearEskizToken();
    const token = await getEskizToken(email, password);

    const resp = await fetch(`${ESKIZ_BASE}/user/get-limit`, {
      headers: { "Authorization": `Bearer ${token}` },
    });
    const data = await resp.json() as any;
    const balance = data?.data?.balance ?? data?.balance;
    return { success: true, balance: balance?.toString() || "OK" };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
