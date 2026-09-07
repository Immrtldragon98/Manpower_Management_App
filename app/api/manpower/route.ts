import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { hashPin, randomSalt } from "@/lib/security";
import { query } from "@/db";

const workerSchema = z.object({
  employeeId: z.string().trim().min(2).max(30), name: z.string().trim().min(2).max(100),
  contractor: z.string().trim().min(2).max(100), trade: z.string().trim().min(2).max(80),
  skillLevel: z.enum(["Basic", "Skilled", "Advanced", "Certified"]), shift: z.enum(["A", "B", "C", "General"]),
  phone: z.string().trim().max(20).optional().default(""),
  pin: z.string().regex(/^\d{4,8}$/),
});

export async function GET(){
  if(!await requireAdmin()) return Response.json({error:"Admin sign-in required."},{status:401});
  try { const data=await query('SELECT id, employee_id AS "employeeId", name, contractor, trade, skill_level AS "skillLevel", shift, phone, active, created_at AS "createdAt" FROM manpower ORDER BY id DESC'); return Response.json(data.rows); }
  catch(error){ console.error("manpower list failed",error); return Response.json({error:"Unable to load manpower."},{status:500}); }
}
export async function POST(request:Request){
  if(!await requireAdmin()) return Response.json({error:"Admin sign-in required."},{status:401});
  try { const parsed=workerSchema.safeParse(await request.json()); if(!parsed.success)return Response.json({error:"Complete all fields and use a 4–8 digit PIN."},{status:400}); const p=parsed.data;const salt=randomSalt();const pinHash=await hashPin(p.pin,salt); await query("INSERT INTO manpower (employee_id,name,contractor,trade,skill_level,shift,phone,pin_salt,pin_hash,active,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)",[p.employeeId,p.name,p.contractor,p.trade,p.skillLevel,p.shift,p.phone,salt,pinHash,true,new Date().toISOString()]); return Response.json({ok:true},{status:201}); }
  catch(error){ console.error("manpower create failed",error); const duplicate=String(error).includes("23505")||String(error).toLowerCase().includes("unique"); return Response.json({error:duplicate?"Employee ID already exists.":"Unable to add manpower."},{status:duplicate?409:500}); }
}
