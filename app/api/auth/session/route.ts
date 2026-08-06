import { isTeacherRequest } from "../../../lib/auth";

export async function GET(request: Request) {
  return Response.json({ configured: Boolean(process.env.ADMIN_PASSWORD), authenticated: isTeacherRequest(request) });
}
