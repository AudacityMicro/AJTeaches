import { isTeacherRequest } from "../../lib/auth";
import { getContent, isDatabaseConfigured, saveContent } from "../../lib/database";
import { notifySubscribersOfUpdate } from "../../lib/email";
import type { ContentSection } from "../../lib/content";

function sectionFrom(value: string | null): ContentSection | null {
  return value === "resources" ? "resources" : value === "board" || value === null ? "board" : null;
}

export async function GET(request: Request) {
  const section = sectionFrom(new URL(request.url).searchParams.get("section"));
  if (!section) return Response.json({ error: "Unknown content section." }, { status: 400 });
  if (!isDatabaseConfigured()) return Response.json({ configured: false, section });
  try {
    const content = await getContent(section);
    return Response.json({ configured: true, section, ...content });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "The content service is unavailable." }, { status: 503 });
  }
}

export async function PUT(request: Request) {
  if (!isTeacherRequest(request)) return Response.json({ error: "Teacher login required." }, { status: 401 });
  if (!isDatabaseConfigured()) return Response.json({ error: "DATABASE_URL is not configured yet." }, { status: 503 });
  const body = await request.json().catch(() => null) as { section?: ContentSection; markdown?: string; notifySubscribers?: boolean } | null;
  if (!body || (body.section !== "board" && body.section !== "resources") || typeof body.markdown !== "string" || !body.markdown.trim()) {
    return Response.json({ error: "A content section and Markdown value are required." }, { status: 400 });
  }
  try {
    const content = await saveContent(body.section, body.markdown);
    const notification = body.section === "board" && body.notifySubscribers !== false ? await notifySubscribersOfUpdate(body.markdown) : undefined;
    return Response.json({ ok: true, ...content, notification });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "The content could not be saved." }, { status: 503 });
  }
}
