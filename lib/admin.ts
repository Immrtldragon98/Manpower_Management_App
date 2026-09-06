import { env } from "cloudflare:workers";
import { cookies } from "next/headers";
import { verifyAdminToken } from "@/lib/security";
export async function requireAdmin(){const secret=(env as unknown as {SESSION_SECRET?:string}).SESSION_SECRET||"";const token=(await cookies()).get("admin_session")?.value;return await verifyAdminToken(token,secret)?{email:(env as unknown as {ADMIN_EMAIL?:string}).ADMIN_EMAIL||"vyvsyadav98@proton.me"}:null}
