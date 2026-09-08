import { z } from "zod";
import { cookieValue, sign, verifyWorkerToken } from "@/lib/security";
import { requireAdmin } from "@/lib/admin";
import { query } from "@/db";

const isoToday = () => new Date().toISOString().slice(0, 10);
const requestSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  type: z.enum(["Attendance", "Leave"]),
  shift: z.enum(["A", "B", "C", "G"]),
  code: z.string().trim().optional().default(""),
  reason: z.string().trim().max(300).optional().default(""),
});
async function dailyCode(secret: string) {
  return (await sign(`plant-operations:${isoToday()}`, secret))
    .slice(0, 6)
    .toUpperCase();
}
function lastAllowedDate() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 2, 0))
    .toISOString()
    .slice(0, 10);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const secret = process.env.SESSION_SECRET || "";
  if (url.searchParams.get("mine") === "1") {
    const workerId = await verifyWorkerToken(
      cookieValue(request, "mp_session"),
      secret,
    );
    if (!workerId)
      return Response.json({ error: "Sign in again." }, { status: 401 });
    const data = await query(
      "SELECT id, attendance_date::text AS \"attendanceDate\", status, request_type AS \"requestType\", shift_code AS shift, reason FROM attendance WHERE manpower_id=$1 AND attendance_date >= (CURRENT_DATE - INTERVAL '1 month')::date AND attendance_date <= (date_trunc('month', CURRENT_DATE) + INTERVAL '2 months - 1 day')::date ORDER BY attendance_date",
      [workerId],
    );
    const leaves = await query(
      `SELECT a.id,a.attendance_date::text AS "attendanceDate",a.shift_code AS shift,m.name,m.employee_id AS "employeeId"
       FROM attendance a JOIN manpower m ON m.id=a.manpower_id
       WHERE a.request_type='Leave' AND a.status='Approved'
       AND a.attendance_date >= date_trunc('month', CURRENT_DATE)::date
       AND a.attendance_date <= (date_trunc('month', CURRENT_DATE) + INTERVAL '2 months - 1 day')::date
       ORDER BY a.attendance_date,m.name`,
    );
    return Response.json({ records: data.rows, colleagueLeaves: leaves.rows });
  }
  const admin = await requireAdmin();
  if (!admin)
    return Response.json({ error: "Admin sign-in required." }, { status: 401 });
  const data = await query(
    'SELECT a.id,a.manpower_id AS "manpowerId",a.attendance_date::text AS "attendanceDate",a.requested_at AS "requestedAt",a.status,a.request_type AS "requestType",a.shift_code AS shift,a.reason,m.name,m.employee_id AS "employeeId",m.contractor FROM attendance a JOIN manpower m ON m.id=a.manpower_id ORDER BY a.attendance_date DESC,a.requested_at DESC',
  );
  return Response.json({
    records: data.rows,
    workplaceCode: await dailyCode(secret),
  });
}

export async function POST(request: Request) {
  const secret = process.env.SESSION_SECRET || "";
  const workerId = await verifyWorkerToken(
    cookieValue(request, "mp_session"),
    secret,
  );
  if (!workerId)
    return Response.json({ error: "Sign in again." }, { status: 401 });
  const parsed = requestSchema.safeParse(await request.json());
  if (!parsed.success)
    return Response.json(
      { error: "Choose a valid date, request type, and shift." },
      { status: 400 },
    );
  const item = parsed.data;
  if (item.date < isoToday() || item.date > lastAllowedDate())
    return Response.json(
      { error: "Choose a date from today through the end of next month." },
      { status: 400 },
    );
  if (
    item.type === "Attendance" &&
    item.date === isoToday() &&
    item.code.toUpperCase() !== (await dailyCode(secret))
  )
    return Response.json(
      { error: "Workplace QR code is invalid or expired." },
      { status: 400 },
    );
  try {
    await query(
      "INSERT INTO attendance (manpower_id,attendance_date,requested_at,status,request_type,shift_code,reason) VALUES ($1,$2,$3,$4,$5,$6,$7)",
      [
        workerId,
        item.date,
        new Date().toISOString(),
        "Pending",
        item.type,
        item.shift,
        item.reason || null,
      ],
    );
    return Response.json({ ok: true }, { status: 201 });
  } catch (error) {
    const duplicate = String(error).includes("23505");
    return Response.json(
      {
        error: duplicate
          ? "A request already exists for this date."
          : "Unable to submit this request.",
      },
      { status: duplicate ? 409 : 500 },
    );
  }
}

export async function PATCH(request: Request) {
  const admin = await requireAdmin();
  if (!admin)
    return Response.json({ error: "Admin sign-in required." }, { status: 401 });
  const body = (await request.json()) as { id?: number; status?: string };
  if (!body.id || !["Approved", "Rejected"].includes(body.status || ""))
    return Response.json({ error: "Invalid request." }, { status: 400 });
  await query(
    "UPDATE attendance SET status=$1,reviewed_at=$2,reviewed_by=$3 WHERE id=$4",
    [body.status, new Date().toISOString(), admin.email, body.id],
  );
  return Response.json({ ok: true });
}
