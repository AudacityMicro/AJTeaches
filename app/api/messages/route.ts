import { isDatabaseConfigured, saveMessage } from "../../lib/database";
import { notifyAdminOfMessage } from "../../lib/email";

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) return Response.json({ error: "The message service is not configured yet." }, { status: 503 });
  const body = await request.json().catch(() => null) as { name?: string; message?: string } | null;
  const message = body?.message?.trim() ?? "";
  const name = body?.name?.trim() ?? "";
  if (!message) return Response.json({ error: "A message is required." }, { status: 400 });
  try {
    await saveMessage(name, message);
    const notification = await notifyAdminOfMessage(name, message);
    return Response.json({ ok: true, notificationConfigured: notification.sent });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "The note could not be sent." }, { status: 503 });
  }
}
