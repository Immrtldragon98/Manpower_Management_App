import { z } from "zod";
import { pool,query } from "@/db";
import { hashPin,randomSalt } from "@/lib/security";
import { audit } from "@/lib/account-security";

const schema=z.object({companyName:z.string().trim().min(2).max(120),adminName:z.string().trim().min(2).max(100),username:z.string().trim().min(2).max(50).regex(/^[A-Za-z0-9._-]+$/),email:z.string().email(),password:z.string().min(8).max(100)});
function companyCode(name:string){const base=name.toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,8)||"COMPANY";return `${base}-${randomSalt().slice(0,4).toUpperCase()}`}

export async function POST(request:Request){
 const parsed=schema.safeParse(await request.json());if(!parsed.success)return Response.json({error:"Complete every field. Password must be at least 8 characters."},{status:400});await query("SELECT 1");const v=parsed.data,salt=randomSalt(),hash=await hashPin(v.password,salt),client=await pool.connect();
 try{await client.query("BEGIN");let code="",companyId:number|undefined;for(let i=0;i<5;i++){code=companyCode(v.companyName);try{const company=await client.query("INSERT INTO companies(code,name) VALUES($1,$2) RETURNING id",[code,v.companyName]);companyId=Number(company.rows[0].id);break}catch(e){if(!String(e).includes("23505"))throw e}}if(!companyId)throw new Error("Unable to allocate company code");await client.query('INSERT INTO staff_accounts(company_id,username,email,name,role,scope_type,password_salt,password_hash) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[companyId,v.username.toLowerCase(),v.email.toLowerCase(),v.adminName,"Company Admin","Company",salt,hash]);await client.query("COMMIT");await audit({companyId,actorType:"Company Admin",actorId:v.username,action:"REGISTER",entityType:"Company",entityId:code,summary:"Registered company and administrator"});return Response.json({ok:true,companyCode:code},{status:201})}catch(e){await client.query("ROLLBACK");return Response.json({error:String(e).includes("23505")?"That username or email is already registered for this company.":"Company registration could not be completed."},{status:400})}finally{client.release()}
}
