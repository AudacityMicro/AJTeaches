import { createHmac, timingSafeEqual } from "node:crypto";

const SESSION_COOKIE = "aj_teacher_session";

function getSecret() {
  return process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD || "";
}

function sessionToken() {
  const password = process.env.ADMIN_PASSWORD;
  const secret = getSecret();
  if (!password || !secret) return "";
  return createHmac("sha256", secret).update(`teacher:${password}`).digest("hex");
}

function readCookie(request: Request, name: string) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = cookieHeader.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  return match?.slice(name.length + 1) ?? "";
}

export function isTeacherRequest(request: Request) {
  const provided = readCookie(request, SESSION_COOKIE);
  const expected = sessionToken();
  if (!provided || !expected || provided.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
}

export function sessionCookie() {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${SESSION_COOKIE}=${sessionToken()}; HttpOnly; Path=/; SameSite=Lax; Max-Age=604800${secure}`;
}

export function clearedSessionCookie() {
  return `${SESSION_COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`;
}
