import { z } from "zod";
import { query } from "@/db";
import { canManage, requireAdmin, scopeFilter } from "@/lib/admin";
import { cookieValue, verifyWorkerToken } from "@/lib/security";

const passTypes = ["Work at height","Confined space","Electrical safety","LOTO","Fire safety","Hot work","First aid","Lifting & rigging","Contractor induction"] as const;
const requestSchema=z.object({passType:z.enum(passTypes),requestKind:z.enum(["Training","Test","Renewal"]),note:z.string().trim().max(300).optional().default("")});
const passSchema=z.object({action:z.literal("pass"),manpowerId:z.number().int().positive(),passType:z.enum(passTypes),issuedOn:z.string().optional(),expiresOn:z.string().optional(),status:z.enum(["Valid","Pending","Expired","Suspended"]),certificateRef:z.string().trim().max(180).optional().default(""),notes:z.string().trim().max(300).optional().default("")});
const reviewSchema=z.object({action:z.literal("review"),id:z.number().int().positive(),status:z.enum(["Approved","Rejected"])});

export async function GET(request:Request){
 const workerId=await verifyWorkerToken(cookieValue(request,"mp_session"),process.env.SESSION_SECRET||"");
 if(workerId){
  const [passes,requests]=await Promise.all([
   query('SELECT id,pass_type AS "passType",issued_on AS "issuedOn",expires_on AS "expiresOn",status,certificate_ref AS "certificateRef",notes FROM safety_passes WHERE manpower_id=$1 ORDER BY expires_on NULLS FIRST,pass_type',[workerId]),
   query('SELECT id,pass_type AS "passType",request_kind AS "requestKind",note,status,requested_at AS "requestedAt" FROM safety_requests WHERE manpower_id=$1 ORDER BY id DESC',[workerId])
  ]);return Response.json({passes:passes.rows,requests:requests.rows,passTypes});
 }
 const admin=await requireAdmin();if(!admin)return Response.json({error:"Sign-in required."},{status:401});
 const scope=scopeFilter(admin);const [passes,requests]=await Promise.all([
  query(`SELECT p.id,p.manpower_id AS "manpowerId",m.employee_id AS "employeeId",m.name,p.pass_type AS "passType",p.issued_on AS "issuedOn",p.expires_on AS "expiresOn",p.status,p.certificate_ref AS "certificateRef",p.notes FROM safety_passes p JOIN manpower m ON m.id=p.manpower_id WHERE ${scope.sql} ORDER BY p.expires_on NULLS FIRST,m.name`,scope.values),
  query(`SELECT r.id,r.manpower_id AS "manpowerId",m.employee_id AS "employeeId",m.name,r.pass_type AS "passType",r.request_kind AS "requestKind",r.note,r.status,r.requested_at AS "requestedAt" FROM safety_requests r JOIN manpower m ON m.id=r.manpower_id WHERE ${scope.sql} ORDER BY r.id DESC`,scope.values)
 ]);return Response.json({passes:passes.rows,requests:requests.rows,passTypes});
}
export async function POST(request:Request){
 const workerId=await verifyWorkerToken(cookieValue(request,"mp_session"),process.env.SESSION_SECRET||"");
 if(!workerId)return Response.json({error:"Worker sign-in required."},{status:401});const parsed=requestSchema.safeParse(await request.json());if(!parsed.success)return Response.json({error:"Choose a pass and request type."},{status:400});const p=parsed.data;await query('INSERT INTO safety_requests(manpower_id,pass_type,request_kind,note) VALUES($1,$2,$3,$4)',[workerId,p.passType,p.requestKind,p.note]);return Response.json({ok:true},{status:201});
}
export async function PATCH(request:Request){
 const admin=await requireAdmin();if(!admin||!canManage(admin,"safety"))return Response.json({error:"Safety access required."},{status:403});const body=await request.json();
 if(body.action==="review"){const p=reviewSchema.safeParse(body);if(!p.success)return Response.json({error:"Invalid review."},{status:400});await query('UPDATE safety_requests SET status=$1,reviewed_at=NOW(),reviewed_by=$2 WHERE id=$3',[p.data.status,admin.email,p.data.id]);return Response.json({ok:true});}
 const p=passSchema.safeParse(body);if(!p.success)return Response.json({error:"Complete the pass details."},{status:400});const v=p.data;const scope=scopeFilter(admin);const allowed=await query(`SELECT id FROM manpower m WHERE id=$1 AND ${scope.sql.replaceAll(/\$(\d+)/g,(_,n)=>'$'+(Number(n)+1))}`,[v.manpowerId,...scope.values]);if(!allowed.rowCount)return Response.json({error:"Worker is outside your scope."},{status:403});await query(`INSERT INTO safety_passes(manpower_id,pass_type,issued_on,expires_on,status,certificate_ref,notes,updated_by) VALUES($1,$2,NULLIF($3,'')::date,NULLIF($4,'')::date,$5,$6,$7,$8) ON CONFLICT(manpower_id,pass_type) DO UPDATE SET issued_on=EXCLUDED.issued_on,expires_on=EXCLUDED.expires_on,status=EXCLUDED.status,certificate_ref=EXCLUDED.certificate_ref,notes=EXCLUDED.notes,updated_at=NOW(),updated_by=EXCLUDED.updated_by`,[v.manpowerId,v.passType,v.issuedOn||"",v.expiresOn||"",v.status,v.certificateRef,v.notes,admin.email]);return Response.json({ok:true});
}
