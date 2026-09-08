import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { query, pool } from "@/db";
import { cookieValue, verifyWorkerToken } from "@/lib/security";

const shiftSchema=z.object({kind:z.literal("shift"),requestedShift:z.enum(["A","B","C","G"]),effectiveDate:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),reason:z.string().trim().min(3).max(300)});
const workSchema=z.object({kind:z.literal("work"),workAssignmentId:z.number().int().positive(),requestedDate:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),reason:z.string().trim().min(3).max(300)});

export async function GET(request:Request){
 const workerId=await verifyWorkerToken(cookieValue(request,"mp_session"),process.env.SESSION_SECRET||"");
 if(workerId){
  const [shifts,work]=await Promise.all([
   query('SELECT id,current_shift AS "currentShift",requested_shift AS "requestedShift",effective_date::text AS "effectiveDate",reason,status,requested_at AS "requestedAt" FROM shift_change_requests WHERE manpower_id=$1 ORDER BY requested_at DESC',[workerId]),
   query('SELECT r.id,r.work_assignment_id AS "workAssignmentId",w.title,r.requested_date::text AS "requestedDate",r.reason,r.status,r.requested_at AS "requestedAt" FROM work_change_requests r JOIN work_assignments w ON w.id=r.work_assignment_id WHERE r.manpower_id=$1 ORDER BY r.requested_at DESC',[workerId])]);
  return Response.json({shiftRequests:shifts.rows,workRequests:work.rows});
 }
 if(!await requireAdmin())return Response.json({error:"Sign in required."},{status:401});
 const [shifts,work]=await Promise.all([
  query('SELECT r.id,r.manpower_id AS "manpowerId",m.name,m.employee_id AS "employeeId",r.current_shift AS "currentShift",r.requested_shift AS "requestedShift",r.effective_date::text AS "effectiveDate",r.reason,r.status FROM shift_change_requests r JOIN manpower m ON m.id=r.manpower_id ORDER BY r.requested_at DESC'),
  query('SELECT r.id,r.manpower_id AS "manpowerId",m.name,m.employee_id AS "employeeId",r.work_assignment_id AS "workAssignmentId",w.title,r.requested_date::text AS "requestedDate",r.reason,r.status FROM work_change_requests r JOIN manpower m ON m.id=r.manpower_id JOIN work_assignments w ON w.id=r.work_assignment_id ORDER BY r.requested_at DESC')]);
 return Response.json({shiftRequests:shifts.rows,workRequests:work.rows});
}

export async function POST(request:Request){
 const workerId=await verifyWorkerToken(cookieValue(request,"mp_session"),process.env.SESSION_SECRET||"");
 if(!workerId)return Response.json({error:"Sign in again."},{status:401});
 const body=await request.json();
 if(body.kind==="shift"){
  const parsed=shiftSchema.safeParse(body); if(!parsed.success)return Response.json({error:"Complete the shift change request."},{status:400});
  if(parsed.data.effectiveDate<new Date().toISOString().slice(0,10))return Response.json({error:"Effective date cannot be in the past."},{status:400});
  const current=await query("SELECT shift FROM manpower WHERE id=$1",[workerId]);
  await query("INSERT INTO shift_change_requests (manpower_id,current_shift,requested_shift,effective_date,reason) VALUES ($1,$2,$3,$4,$5)",[workerId,current.rows[0].shift,parsed.data.requestedShift,parsed.data.effectiveDate,parsed.data.reason]);
 }else{
  const parsed=workSchema.safeParse(body); if(!parsed.success)return Response.json({error:"Complete the work change request."},{status:400});
  const owned=await query("SELECT id FROM work_assignments WHERE id=$1 AND manpower_id=$2",[parsed.data.workAssignmentId,workerId]);
  if(!owned.rowCount)return Response.json({error:"Work assignment not found."},{status:404});
  await query("INSERT INTO work_change_requests (manpower_id,work_assignment_id,requested_date,reason) VALUES ($1,$2,$3,$4)",[workerId,parsed.data.workAssignmentId,parsed.data.requestedDate,parsed.data.reason]);
 }
 return Response.json({ok:true},{status:201});
}

export async function PATCH(request:Request){
 const admin=await requireAdmin(); if(!admin)return Response.json({error:"Admin sign-in required."},{status:401});
 const body=(await request.json()) as {kind?:string;id?:number;status?:string};
 if(!body.id||!["shift","work"].includes(body.kind||"")||!["Approved","Rejected"].includes(body.status||""))return Response.json({error:"Invalid request."},{status:400});
 const client=await pool.connect();
 try{await client.query("BEGIN");
  if(body.kind==="shift"){
   const r=await client.query("UPDATE shift_change_requests SET status=$1,reviewed_at=NOW(),reviewed_by=$2 WHERE id=$3 AND status='Pending' RETURNING manpower_id,requested_shift",[body.status,admin.email,body.id]);
   if(body.status==="Approved"&&r.rows[0])await client.query("UPDATE manpower SET shift=$1 WHERE id=$2",[r.rows[0].requested_shift,r.rows[0].manpower_id]);
  }else{
   const r=await client.query("UPDATE work_change_requests SET status=$1,reviewed_at=NOW(),reviewed_by=$2 WHERE id=$3 AND status='Pending' RETURNING work_assignment_id,requested_date",[body.status,admin.email,body.id]);
   if(body.status==="Approved"&&r.rows[0])await client.query("UPDATE work_assignments SET scheduled_date=$1 WHERE id=$2",[r.rows[0].requested_date,r.rows[0].work_assignment_id]);
  }
  await client.query("COMMIT"); return Response.json({ok:true});
 }catch(e){await client.query("ROLLBACK");console.error(e);return Response.json({error:"Unable to review request."},{status:500})}finally{client.release()}
}
