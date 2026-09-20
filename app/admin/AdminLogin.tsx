"use client";
import { FormEvent,useState } from "react";
import { HardHat,LogIn } from "lucide-react";
import RecoveryRequest from "@/app/RecoveryRequest";
export default function AdminLogin(){
 const [error,setError]=useState(""),[busy,setBusy]=useState(false);
 async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();setBusy(true);setError("");const r=await fetch("/api/admin/login",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(Object.fromEntries(new FormData(e.currentTarget)))});const out=await r.json();setBusy(false);if(!r.ok)return setError(out.error);location.reload()}
 return <div className="loginpage"><section className="loginbox"><div className="brand dark"><span><HardHat/></span><div><b>Workforce Hub Lite</b><small>TEAM ACCESS</small></div></div><h1>Team sign in</h1><p>Company administrators, HR, supervisors, managers and safety officers sign in here.</p>{error&&<div className="formerror">{error}</div>}<form onSubmit={submit}><label className="field"><span>Company code</span><input name="companyCode" autoCapitalize="characters" placeholder="Example: WORKFORCE"/></label><label className="field"><span>Username or email</span><input name="login" autoComplete="username" required/></label><label className="field"><span>Password</span><input name="password" type="password" autoComplete="current-password" required/></label><button className="primary" disabled={busy}><LogIn/>{busy?"Signing in…":"Sign in"}</button></form><RecoveryRequest type="Team"/><a href="/register">Register a new company</a><a href="/">Worker sign in</a></section></div>
}
