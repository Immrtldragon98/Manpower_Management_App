import { AdminApp } from "@/app/page";
import { requireAdmin } from "@/lib/admin";
import AdminLogin from "./AdminLogin";
export const dynamic="force-dynamic";
export default async function AdminPage(){return await requireAdmin()?<AdminApp/>:<AdminLogin/>}
