import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { cookieValue, verifyWorkerToken } from "@/lib/security";
import { query } from "@/db";

const workSchema=z.object({ title:z.string().trim().min(2).max(140), area:z.string().trim().min(2).max(100), manpowerId:z.number().int().positive().nullable(), scheduledDate:z.string().min(8).max(10), startTime:z.string().min(4).max(5), endTime:z.string().min(4).max(5), instructions:z.string().trim().max(500).optional().default("") });
export async function GET(request:Request){
 const url=new URL(request.url);
 if(url.searchParams.get("mine")==="1"){
  const workerId=await verifyWorkerToken(cookieValue(request,"mp_session"),process.env.SESSION_SECRET||"");
  if(!workerId)return Response.json({error:"Sign in again."},{status:401});
  const data=await query('SELECT id,title,area,scheduled_date::text AS "scheduledDate",start_time AS "startTime",end_time AS "endTime",instructions,status FROM work_assignments WHERE manpower_id=$1 ORDER BY scheduled_date DESC,id DESC',[workerId]);
  return Response.json(data.rows);
 }
 if(!await requireAdmin()) return Response.json({error:"Admin sign-in required."},{status:401});
 try{const data=await query('SELECT w.id,w.title,w.area,w.manpower_id AS "manpowerId",w.scheduled_date AS "scheduledDate",w.start_time AS "startTime",w.end_time AS "endTime",w.instructions,w.status,m.name AS "manpowerName",m.employee_id AS "employeeId" FROM work_assignments w LEFT JOIN manpower m ON m.id=w.manpower_id ORDER BY w.scheduled_date DESC,w.id DESC');return Response.json(data.rows)}
 catch(error){console.error("work list failed",error);return Response.json({error:"Unable to load assignments."},{status:500})}
}
export async function POST(request:Request){
 if(!await requireAdmin()) return Response.json({error:"Admin sign-in required."},{status:401});
 try{const parsed=workSchema.safeParse(await request.json());if(!parsed.success)return Response.json({error:"Check the required work fields."},{status:400});const w=parsed.data;await query("INSERT INTO work_assignments (title,area,manpower_id,scheduled_date,start_time,end_time,instructions,status,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)",[w.title,w.area,w.manpowerId,w.scheduledDate,w.startTime,w.endTime,w.instructions,"Not started",new Date().toISOString()]);return Response.json({ok:true},{status:201})}
 catch(error){console.error("work create failed",error);return Response.json({error:"Unable to create assignment."},{status:500})}
}
