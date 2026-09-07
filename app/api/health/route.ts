import { query } from "@/db";

export async function GET() {
  try {
    await query("SELECT 1");
    return Response.json({ status: "ok" });
  } catch (error) {
    console.error("health check failed", error);
    return Response.json({ status: "unavailable" }, { status: 503 });
  }
}
