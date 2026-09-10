import { AdminApp } from "@/app/page";
import { requireAdmin } from "@/lib/admin";
import AdminLogin from "./AdminLogin";
export const dynamic="force-dynamic";
export default async function AdminPage(){const session=await requireAdmin();return session?<AdminApp session={session}/>:<AdminLogin/>}
