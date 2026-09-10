import { z } from "zod";
import { adminToken,hashPin,staffToken } from "@/lib/security";
import { query } from "@/db";
const schema=z.object({companyCode:z.string().trim().optional().default(""),email:z.string().email(),password:z.string().min(8).max(100)});
export async function POST(request:Request){
 const parsed=schema.safeParse(await request.json());if(!parsed.success)return Response.json({error:"Enter a valid email and password."},{status:400});
 const cfg=process.env,secret=cfg.SESSION_SECRET||"";
 if(parsed.data.email.toLowerCase()===(cfg.ADMIN_EMAIL||"").toLowerCase()&&cfg.ADMIN_PASSWORD_HASH&&cfg.ADMIN_PASSWORD_SALT&&await hashPin(parsed.data.password,cfg.ADMIN_PASSWORD_SALT)===cfg.ADMIN_PASSWORD_HASH){const token=await adminToken(secret);return Response.json({ok:true},{headers:{"set-cookie":`admin_session=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=28800`}})}
 if(!parsed.data.companyCode)return Response.json({error:"Enter your company code."},{status:401});
 const r=await query('SELECT s.id,s.role,s.password_salt AS "passwordSalt",s.password_hash AS "passwordHash" FROM staff_accounts s JOIN companies c ON c.id=s.company_id WHERE c.code=$1 AND LOWER(s.email)=LOWER($2) AND s.active=TRUE AND c.active=TRUE',[parsed.data.companyCode.toUpperCase(),parsed.data.email]);const row=r.rows[0];
 if(!row||await hashPin(parsed.data.password,row.passwordSalt)!==row.passwordHash)return Response.json({error:"Company code, email or password is incorrect."},{status:401});
 const token=await staffToken(Number(row.id),row.role,secret);return Response.json({ok:true},{headers:{"set-cookie":`admin_session=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=28800`}})
}
