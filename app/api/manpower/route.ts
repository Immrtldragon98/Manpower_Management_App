import { z } from "zod";
import { requireAdmin,scopeFilter,selectedScopeAllowed } from "@/lib/admin";
import { hashPin, randomSalt } from "@/lib/security";
import { query } from "@/db";

const workerSchema = z.object({
  employeeId: z.string().trim().min(2).max(30),
  name: z.string().trim().min(2).max(100),
  contractor: z.string().trim().min(2).max(100),
  trade: z.string().trim().min(2).max(80),
  skillLevel: z.enum(["Basic", "Skilled", "Advanced", "Certified"]),
  shift: z.enum(["A", "B", "C", "G"]),
  phone: z.string().trim().max(20).optional().default(""),
  pin: z.string().regex(/^\d{4,8}$/),
  plantId: z.number().int().positive(),
  departmentId: z.number().int().positive(),
  subdepartmentId: z.number().int().positive(),
  disciplineId: z.number().int().positive(),
});

export async function GET() {
  const admin=await requireAdmin();
  if (!admin)
    return Response.json({ error: "Admin sign-in required." }, { status: 401 });
  try {
    const scope=scopeFilter(admin);const data = await query(
      `SELECT m.id,m.employee_id AS "employeeId",m.name,m.contractor,m.trade,m.skill_level AS "skillLevel",m.shift,m.phone,m.active,m.created_at AS "createdAt",p.name AS plant,d.name AS department,s.name AS "subdepartment",x.name AS discipline FROM manpower m LEFT JOIN organization_units p ON p.id=m.plant_id LEFT JOIN organization_units d ON d.id=m.department_id LEFT JOIN organization_units s ON s.id=m.subdepartment_id LEFT JOIN organization_units x ON x.id=m.discipline_id WHERE ${scope.sql} ORDER BY m.id DESC`,scope.values);
    return Response.json(data.rows);
  } catch (error) {
    console.error("manpower list failed", error);
    return Response.json(
      { error: "Unable to load manpower." },
      { status: 500 },
    );
  }
}
export async function POST(request: Request) {
  const admin=await requireAdmin();
  if (!admin||admin.role==="Safety Officer")
    return Response.json({ error: "Admin sign-in required." }, { status: 401 });
  try {
    const parsed = workerSchema.safeParse(await request.json());
    if (!parsed.success)
      return Response.json(
        { error: "Complete all fields and use a 4–8 digit PIN." },
        { status: 400 },
      );
    const p = parsed.data;
    if(!selectedScopeAllowed(admin,p))return Response.json({error:"This worker is outside your assigned scope."},{status:403});
    const salt = randomSalt();
    const pinHash = await hashPin(p.pin, salt);
    await query(
      "INSERT INTO manpower (employee_id,name,contractor,trade,skill_level,shift,phone,pin_salt,pin_hash,active,created_at,company_id,plant_id,department_id,subdepartment_id,discipline_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,(SELECT id FROM companies ORDER BY id LIMIT 1),$12,$13,$14,$15)",
      [
        p.employeeId,
        p.name,
        p.contractor,
        p.trade,
        p.skillLevel,
        p.shift,
        p.phone,
        salt,
        pinHash,
        true,
        new Date().toISOString(),
        p.plantId,
        p.departmentId,
        p.subdepartmentId,
        p.disciplineId,
      ],
    );
    return Response.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error("manpower create failed", error);
    const duplicate =
      String(error).includes("23505") ||
      String(error).toLowerCase().includes("unique");
    return Response.json(
      {
        error: duplicate
          ? "Employee ID already exists."
          : "Unable to add manpower.",
      },
      { status: duplicate ? 409 : 500 },
    );
  }
}
export async function PATCH(request: Request) {
  const admin=await requireAdmin();if (!admin||admin.role==="Safety Officer") return Response.json({ error: "Manager access required." }, { status: 403 });
  const body = (await request.json()) as { id?: number; shift?: string };
  if (!body.id || !["A", "B", "C", "G"].includes(body.shift || ""))
    return Response.json({ error: "Choose a valid worker and shift." }, { status: 400 });
  const scope=scopeFilter(admin);await query(`UPDATE manpower m SET shift=$1 WHERE id=$2 AND ${scope.sql.replace("$1","$3")}`, [body.shift, body.id,...scope.values]);
  return Response.json({ ok: true });
}
