import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { query } from "@/db";

const companySchema=z.object({action:z.literal("company"),name:z.string().trim().min(2).max(120),code:z.string().trim().min(3).max(20).regex(/^[A-Za-z0-9-]+$/)});
const unitSchema=z.object({action:z.literal("unit"),type:z.enum(["Plant","Department","Sub-department","Discipline"]),name:z.string().trim().min(2).max(100),parentId:z.number().int().positive().nullable()});

export async function GET(){
 if(!await requireAdmin())return Response.json({error:"Admin sign-in required."},{status:401});
 const company=await query("SELECT id,code,name,timezone FROM companies ORDER BY id LIMIT 1");
 const units=await query('SELECT id,unit_type AS type,name,parent_id AS "parentId" FROM organization_units WHERE company_id=$1 AND active=TRUE ORDER BY CASE unit_type WHEN \'Plant\' THEN 1 WHEN \'Department\' THEN 2 WHEN \'Sub-department\' THEN 3 ELSE 4 END,name',[company.rows[0].id]);
 return Response.json({company:company.rows[0],units:units.rows});
}
export async function POST(request:Request){
 const admin=await requireAdmin();if(!admin||admin.role!=="Company Admin")return Response.json({error:"Company admin access required."},{status:403});
 const body=await request.json();
 if(body.action==="company"){
  const p=companySchema.safeParse(body);if(!p.success)return Response.json({error:"Enter a valid company name and code."},{status:400});
  try{const current=await query("SELECT id FROM companies ORDER BY id LIMIT 1");await query("UPDATE companies SET name=$1,code=$2 WHERE id=$3",[p.data.name,p.data.code.toUpperCase(),current.rows[0].id]);return Response.json({ok:true})}catch(e){return Response.json({error:String(e).includes("23505")?"Company code is already used.":"Unable to save company."},{status:400})}
 }
 const p=unitSchema.safeParse(body);if(!p.success)return Response.json({error:"Complete the organization level."},{status:400});
 const requiredParent:{[key:string]:string|null}={Plant:null,Department:"Plant","Sub-department":"Department",Discipline:"Sub-department"};
 if(requiredParent[p.data.type]===null&&p.data.parentId)return Response.json({error:"Plants do not need a parent."},{status:400});
 if(requiredParent[p.data.type]){const parent=await query("SELECT unit_type FROM organization_units WHERE id=$1",[p.data.parentId]);if(parent.rows[0]?.unit_type!==requiredParent[p.data.type])return Response.json({error:`Choose a ${requiredParent[p.data.type]} first.`},{status:400})}
 const company=await query("SELECT id FROM companies ORDER BY id LIMIT 1");
 try{await query("INSERT INTO organization_units(company_id,unit_type,name,parent_id) VALUES($1,$2,$3,$4)",[company.rows[0].id,p.data.type,p.data.name,p.data.parentId]);return Response.json({ok:true},{status:201})}catch(e){return Response.json({error:String(e).includes("23505")?"This level already exists.":"Unable to add organization level."},{status:400})}
}
