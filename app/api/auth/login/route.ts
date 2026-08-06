import { sessionCookie } from "../../../lib/auth";

export async function POST(request: Request) {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return Response.json({ error: "Teacher login is not configured yet." }, { status: 503 });
  const body = await request.json().catch(() => null) as { password?: string } | null;
  if (!body?.password || body.password !== password) return Response.json({ error: "That password didn’t match. Try again." }, { status: 401 });
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json", "Set-Cookie": sessionCookie() } });
}
