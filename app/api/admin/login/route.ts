import { z } from "zod";
import { adminToken,hashPin,staffToken } from "@/lib/security";
import { query } from "@/db";
import { audit,clearFailures,loginAllowed,loginKey,recordFailure } from "@/lib/account-security";
const schema=z.object({companyCode:z.string().trim().optional().default(""),login:z.string().trim().min(2).max(120),password:z.string().min(8).max(100)});
export async function POST(request:Request){
 const parsed=schema.safeParse(await request.json());if(!parsed.success)return Response.json({error:"Enter your username or email and password."},{status:400});
 const p=parsed.data,cfg=process.env,secret=cfg.SESSION_SECRET||"",key=loginKey("staff",p.companyCode||"PRIMARY",p.login),allowed=await loginAllowed(key);
 if(!allowed.allowed)return Response.json({error:`Too many attempts. Try again in ${Math.ceil((allowed.retryAfter||60)/60)} minutes.`},{status:429,headers:{"retry-after":String(allowed.retryAfter||60)}});
 if(p.login.toLowerCase()===(cfg.ADMIN_EMAIL||"").toLowerCase()&&cfg.ADMIN_PASSWORD_HASH&&cfg.ADMIN_PASSWORD_SALT&&await hashPin(p.password,cfg.ADMIN_PASSWORD_SALT)===cfg.ADMIN_PASSWORD_HASH){await clearFailures(key);await audit({actorType:"Company Admin",actorId:p.login,action:"LOGIN",entityType:"Session",summary:"Company admin signed in"});const token=await adminToken(secret);return Response.json({ok:true},{headers:{"set-cookie":`admin_session=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=28800`}})}
 if(!p.companyCode){const locked=await recordFailure(key);return Response.json({error:locked?"Account locked for 15 minutes after repeated attempts.":"Enter your company code."},{status:locked?429:401})}
 const r=await query('SELECT s.id,s.company_id AS "companyId",s.role,s.manpower_id AS "manpowerId",s.password_salt AS "passwordSalt",s.password_hash AS "passwordHash" FROM staff_accounts s JOIN companies c ON c.id=s.company_id WHERE c.code=$1 AND (LOWER(s.email)=LOWER($2) OR LOWER(s.username)=LOWER($2)) AND s.active=TRUE AND c.active=TRUE',[p.companyCode.toUpperCase(),p.login]);const row=r.rows[0];
 if(!row||await hashPin(p.password,row.passwordSalt)!==row.passwordHash){const locked=await recordFailure(key);return Response.json({error:locked?"Account locked for 15 minutes after repeated attempts.":"Company code, username/email or password is incorrect."},{status:locked?429:401})}
 await clearFailures(key);await audit({companyId:Number(row.companyId),actorType:row.role,actorId:String(row.id),action:"LOGIN",entityType:"Session",summary:`${row.role} signed in`});const token=await staffToken(Number(row.id),row.role,secret);return Response.json({ok:true},{headers:{"set-cookie":`admin_session=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=28800`}})
}
