import { env } from "cloudflare:workers";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";

const workSchema=z.object({ title:z.string().trim().min(2).max(140), area:z.string().trim().min(2).max(100), manpowerId:z.number().int().positive().nullable(), scheduledDate:z.string().min(8).max(10), startTime:z.string().min(4).max(5), endTime:z.string().min(4).max(5), instructions:z.string().trim().max(500).optional().default("") });
export async function GET(){
 if(!await requireAdmin()) return Response.json({error:"Admin sign-in required."},{status:401});
 try{const data=await env.DB.prepare("SELECT w.id,w.title,w.area,w.manpower_id AS manpowerId,w.scheduled_date AS scheduledDate,w.start_time AS startTime,w.end_time AS endTime,w.instructions,w.status,m.name AS manpowerName,m.employee_id AS employeeId FROM work_assignments w LEFT JOIN manpower m ON m.id=w.manpower_id ORDER BY w.scheduled_date DESC,w.id DESC").all();return Response.json(data.results)}
 catch(error){console.error("work list failed",error);return Response.json({error:"Unable to load assignments."},{status:500})}
}
export async function POST(request:Request){
 if(!await requireAdmin()) return Response.json({error:"Admin sign-in required."},{status:401});
 try{const parsed=workSchema.safeParse(await request.json());if(!parsed.success)return Response.json({error:"Check the required work fields."},{status:400});const w=parsed.data;await env.DB.prepare("INSERT INTO work_assignments (title,area,manpower_id,scheduled_date,start_time,end_time,instructions,status,created_at) VALUES (?,?,?,?,?,?,?,?,?)").bind(w.title,w.area,w.manpowerId,w.scheduledDate,w.startTime,w.endTime,w.instructions,"Not started",new Date().toISOString()).run();return Response.json({ok:true},{status:201})}
 catch(error){console.error("work create failed",error);return Response.json({error:"Unable to create assignment."},{status:500})}
}
