import { cookies } from "next/headers";
import { verifyAdminToken } from "@/lib/security";
export async function requireAdmin(){const secret=process.env.SESSION_SECRET||"";const token=(await cookies()).get("admin_session")?.value;return await verifyAdminToken(token,secret)?{email:process.env.ADMIN_EMAIL||""}:null}
