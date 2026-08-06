import { isDatabaseConfigured, saveSubscriber } from "../../lib/database";

type RetentionOption = "week" | "two-weeks" | "month" | "custom";

function expirationDate(option: RetentionOption, customDate?: string) {
  const date = new Date();
  if (option === "week") date.setDate(date.getDate() + 7);
  if (option === "two-weeks") date.setDate(date.getDate() + 14);
  if (option === "month") date.setMonth(date.getMonth() + 1);
  if (option === "custom") {
    if (!customDate) return null;
    const parsed = new Date(`${customDate}T23:59:59`);
    if (Number.isNaN(parsed.getTime()) || parsed <= new Date()) return null;
    return parsed;
  }
  return date;
}

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) return Response.json({ error: "The notification service is not configured yet." }, { status: 503 });
  const body = await request.json().catch(() => null) as { email?: string; retention?: RetentionOption; customDate?: string } | null;
  const email = body?.email?.trim().toLowerCase() ?? "";
  const retention = body?.retention;
  if (!/^\S+@\S+\.\S+$/.test(email) || !retention || !["week", "two-weeks", "month", "custom"].includes(retention)) {
    return Response.json({ error: "A valid email and retention option are required." }, { status: 400 });
  }
  const expiresAt = expirationDate(retention, body.customDate);
  if (!expiresAt) return Response.json({ error: "Choose a future removal date." }, { status: 400 });
  try {
    await saveSubscriber(email, expiresAt);
    return Response.json({ ok: true, expiresAt: expiresAt.toISOString() });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "The signup could not be saved." }, { status: 503 });
  }
}
