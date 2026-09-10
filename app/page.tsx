"use client";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  CalendarCheck,
  CalendarDays,
  ClipboardList,
  DoorOpen,
  HardHat,
  LayoutDashboard,
  KeyRound,
  LogIn,
  Menu,
  QrCode,
  Search,
  ShieldCheck,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
type Tab =
  | "Dashboard"
  | "Organization"
  | "Team access"
  | "Manpower"
  | "Schedule planner"
  | "Work"
  | "Gate passes"
  | "Skills";
type Person = {
  id: number;
  employeeId: string;
  name: string;
  contractor: string;
  trade: string;
  skillLevel: string;
  shift: string;
  phone?: string;
  active: boolean;
  plant?: string;
  department?: string;
  subdepartment?: string;
  discipline?: string;
  companyName?: string;
  companyCode?: string;
};
type OrgUnit={id:number;type:"Plant"|"Department"|"Sub-department"|"Discipline";name:string;parentId:number|null};
type OrgData={company:{id:number;name:string;code:string;timezone:string};units:OrgUnit[]};
type AdminSession={email:string;name:string;role:"Company Admin"|"Manager"|"Safety Officer";companyId:number|null;scopeType:string;scopeId:number|null};
type Job = {
  id: number;
  title: string;
  area: string;
  manpowerId: number | null;
  manpowerName?: string;
  employeeId?: string;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  instructions?: string;
  status: string;
};
const nav: [Tab, typeof Users][] = [
  ["Dashboard", LayoutDashboard],
  ["Organization", Building2],
  ["Team access", KeyRound],
  ["Manpower", Users],
  ["Schedule planner", CalendarCheck],
  ["Work", BriefcaseBusiness],
  ["Gate passes", DoorOpen],
  ["Skills", BadgeCheck],
];
export function AdminApp({session}:{session:AdminSession}) {
  const [tab, setTab] = useState<Tab>("Dashboard"),
    [open, setOpen] = useState(false),
    [people, setPeople] = useState<Person[]>([]),
    [jobs, setJobs] = useState<Job[]>([]),
    [organization,setOrganization]=useState<OrgData|null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [query, setQuery] = useState(""),
    [form, setForm] = useState<"person" | "work" | null>(null),
    [importBusy,setImportBusy]=useState(false),
    [notice, setNotice] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [p, w, o] = await Promise.all([
        fetch("/api/manpower"),
        fetch("/api/work"),
        fetch("/api/organization"),
      ]);
      if (!p.ok || !w.ok || !o.ok) throw new Error();
      setPeople(await p.json());
      setJobs(await w.json());
      setOrganization(await o.json());
    } catch {
      setError("Records could not be loaded. Try again.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  const tell = (s: string) => {
    setNotice(s);
    setTimeout(() => setNotice(""), 2500);
  };
  const rows = useMemo(
    () =>
      people.filter((p) =>
        (p.employeeId + p.name + p.contractor + p.trade)
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [people, query],
  );
  function downloadTemplate(){const header="Employee ID,Name,Contractor,Trade,Skill Level,Shift,Phone,PIN,Plant,Department,Sub-department,Discipline\n";const url=URL.createObjectURL(new Blob([header],{type:"text/csv"}));const a=document.createElement("a");a.href=url;a.download="Workforce-Hub-Manpower-Template.csv";a.click();URL.revokeObjectURL(url)}
  async function importCsv(file:File){setImportBusy(true);setError("");const lines=(await file.text()).replace(/^\uFEFF/,"").split(/\r?\n/).filter(Boolean),headers=lines.shift()?.split(",").map(x=>x.trim())||[],expected=["Employee ID","Name","Contractor","Trade","Skill Level","Shift","Phone","PIN","Plant","Department","Sub-department","Discipline"];if(expected.some((x,i)=>headers[i]!==x)){setImportBusy(false);return setError("Use the Workforce Hub template without changing its column order.")}const data=lines.map(line=>{const c=line.split(",").map(x=>x.trim());return{employeeId:c[0],name:c[1],contractor:c[2],trade:c[3],skillLevel:c[4],shift:c[5],phone:c[6],pin:c[7],plant:c[8],department:c[9],subdepartment:c[10],discipline:c[11]}});const r=await fetch("/api/manpower/import",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({rows:data})}),out=await r.json();setImportBusy(false);if(!r.ok)return setError(out.error);tell(`${out.imported} workers imported`);load()}
  return (
    <div className="shell">
      {open && (
        <button
          className="scrim"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
        />
      )}
      <aside className={open ? "side open" : "side"}>
        <div className="brand">
          <span>
            <HardHat />
          </span>
          <div>
            <b>Workforce</b>
            <small>HUB</small>
          </div>
        </div>
        <button className="x" onClick={() => setOpen(false)}>
          <X />
        </button>
        <div className="plant">
          <Building2 />
          <div>
            <small>WORKSITE</small>
            <b>Plant Operations</b>
          </div>
        </div>
        <nav>
          {nav.filter(([n])=>session.role==="Company Admin"||!["Organization","Team access"].includes(n)).filter(([n])=>session.role!=="Safety Officer"||!["Schedule planner","Work"].includes(n)).map(([n, I]) => (
            <button
              key={n}
              className={tab === n ? "active" : ""}
              onClick={() => {
                setTab(n);
                setOpen(false);
                setForm(null);
              }}
            >
              <I />
              {n}
            </button>
          ))}
        </nav>
        <div className="access">
          <ShieldCheck />
          <div>
            <b>{session.role}</b>
            <small>{session.scopeType}{session.scopeId?" scope":" access"}</small>
          </div>
        </div>
      </aside>
      <main>
        <header>
          <button className="menu" onClick={() => setOpen(true)}>
            <Menu />
          </button>
          <div>
            <h1>{tab}</h1>
            <p>Contractor manpower operations</p>
          </div>
          <button
            className="admin"
            onClick={async () => {
              await fetch("/api/admin/logout", { method: "POST" });
              location.reload();
            }}
          >
            Sign out
          </button>
        </header>
        <div className="content">
          {error && (
            <div className="error">
              {error}
              <button onClick={load}>Try again</button>
            </div>
          )}
          {tab === "Dashboard" && (
            <Dashboard
              people={people}
              jobs={jobs}
              loading={loading}
              go={setTab}
            />
          )}
          {tab === "Manpower" && (
            <section className="panel page">
              {form === "person" ? (
                <PersonForm
                  organization={organization}
                  close={() => setForm(null)}
                  done={() => {
                    setForm(null);
                    load();
                    tell("Manpower added");
                  }}
                />
              ) : (
                <>
                  <div className="tools">
                    <label>
                      <Search />
                      <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search ID, name, contractor or trade"
                      />
                    </label>
                    <div className="tool-actions"><button
                      className="primary"
                      onClick={() => setForm("person")}
                    >
                      + Add manpower
                    </button>
                    <button className="secondary" onClick={downloadTemplate}>Download Excel template</button>
                    <label className="secondary file-button">{importBusy?"Importing…":"Import filled template"}<input type="file" accept=".csv,text/csv" disabled={importBusy} onChange={e=>e.target.files?.[0]&&importCsv(e.target.files[0])}/></label>
                    </div>
                  </div>
                  {loading ? (
                    <Loading />
                  ) : rows.length ? (
                    <PeopleTable rows={rows} />
                  ) : (
                    <Empty
                      icon={Users}
                      title="No manpower added"
                      text="Add the first contractor worker to begin."
                      button="Add manpower"
                      action={() => setForm("person")}
                    />
                  )}
                </>
              )}
            </section>
          )}
          {tab === "Organization" && <OrganizationSetup data={organization} reload={load}/>} 
          {tab === "Team access" && <TeamAccess organization={organization}/>} 
          {tab === "Work" && (
            <section className="panel page">
              {form === "work" ? (
                <WorkForm
                  people={people}
                  close={() => setForm(null)}
                  done={() => {
                    setForm(null);
                    load();
                    tell("Work assigned");
                  }}
                />
              ) : (
                <>
                  <div className="tools">
                    <div>
                      <h3>Work assignments</h3>
                      <p>Assign work to available manpower.</p>
                    </div>
                    <button className="primary" onClick={() => setForm("work")}>
                      + New assignment
                    </button>
                  </div>
                  {loading ? (
                    <Loading />
                  ) : jobs.length ? (
                    <JobList rows={jobs} />
                  ) : (
                    <Empty
                      icon={BriefcaseBusiness}
                      title="No work assigned"
                      text={
                        people.length
                          ? "Create the first work assignment."
                          : "Add manpower first, then allot work."
                      }
                      button={
                        people.length ? "New assignment" : "Go to manpower"
                      }
                      action={() =>
                        people.length ? setForm("work") : setTab("Manpower")
                      }
                    />
                  )}
                </>
              )}
            </section>
          )}
          {tab === "Schedule planner" && <SchedulePlanner people={people} refreshPeople={load} />}
          {tab === "Gate passes" && (
            <Empty
              icon={DoorOpen}
              title="No gate-pass requests"
              text="Worker gate-pass requests will appear here."
            />
          )}
          {tab === "Skills" && (
            <Empty
              icon={BadgeCheck}
              title="No skills recorded"
              text="Skills added to manpower profiles will appear here."
            />
          )}
        </div>
      </main>
      {notice && (
        <div className="toast">
          <BadgeCheck />
          {notice}
        </div>
      )}
    </div>
  );
}
function Dashboard({
  people,
  jobs,
  loading,
  go,
}: {
  people: Person[];
  jobs: Job[];
  loading: boolean;
  go: (t: Tab) => void;
}) {
  return (
    <>
      {!people.length && !loading ? (
        <section className="start">
          <span>
            <Users />
          </span>
          <div>
            <small>START HERE</small>
            <h2>Build your manpower register</h2>
            <p>
              Add contractor workers first. Then you can allot work and manage
              attendance.
            </p>
          </div>
          <button className="primary" onClick={() => go("Manpower")}>
            Add manpower
          </button>
        </section>
      ) : (
        <section className="hero">
          <div>
            <small>OPERATIONS OVERVIEW</small>
            <h2>Manpower dashboard</h2>
            <p>Current contractor manpower and work deployment.</p>
          </div>
          <button onClick={() => go("Work")}>
            <BriefcaseBusiness />
            Allot work
          </button>
        </section>
      )}
      <section className="metrics">
        <Metric
          icon={Users}
          label="Total manpower"
          value={loading ? "—" : String(people.length)}
          note="Active records"
        />
        <Metric
          icon={UserCheck}
          label="Present today"
          value="0"
          note="No approved attendance"
        />
        <Metric
          icon={CalendarCheck}
          label="Pending approval"
          value="0"
          note="No requests"
        />
        <Metric
          icon={BriefcaseBusiness}
          label="Assigned work"
          value={loading ? "—" : String(jobs.length)}
          note="All assignments"
        />
      </section>
      <section className="twocol">
        <div className="panel">
          <Head title="Recent manpower" sub="Latest added workers" />
          {people.length ? (
            people.slice(0, 4).map((p) => (
              <div className="row" key={p.id}>
                <span className="face">
                  {p.name
                    .split(" ")
                    .map((x) => x[0])
                    .join("")}
                </span>
                <div className="grow">
                  <b>{p.name}</b>
                  <small>
                    {p.employeeId} · {p.contractor}
                  </small>
                </div>
                <span className="tag">{p.trade}</span>
              </div>
            ))
          ) : (
            <MiniEmpty text="No manpower records" />
          )}
        </div>
        <div className="panel">
          <Head title="Current work" sub="Latest assignments" />
          {jobs.length ? (
            jobs.slice(0, 4).map((j) => (
              <div className="row" key={j.id}>
                <span className="job">
                  <BriefcaseBusiness />
                </span>
                <div className="grow">
                  <b>{j.title}</b>
                  <small>
                    {j.area} · {j.manpowerName || "Unassigned"}
                  </small>
                </div>
                <span className="status plain">{j.status}</span>
              </div>
            ))
          ) : (
            <MiniEmpty text="No work assignments" />
          )}
        </div>
      </section>
    </>
  );
}
function Metric({
  icon: I,
  label,
  value,
  note,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  note: string;
}) {
  return (
    <article>
      <span>
        <I />
      </span>
      <small>{label}</small>
      <b>{value}</b>
      <p>{note}</p>
    </article>
  );
}
function Head({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="panel-head">
      <div>
        <h3>{title}</h3>
        <p>{sub}</p>
      </div>
    </div>
  );
}
function PeopleTable({ rows }: { rows: Person[] }) {
  return (
    <div className="table">
      <table>
        <thead>
          <tr>
            <th>Employee</th>
            <th>Contractor</th>
            <th>Trade / skill</th>
            <th>Organization</th>
            <th>Shift</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.id}>
              <td>
                <b>{p.name}</b>
                <small>{p.employeeId}</small>
              </td>
              <td>{p.contractor}</td>
              <td>
                {p.trade}
                <small>{p.skillLevel}</small>
              </td>
              <td>{p.plant||"Not assigned"}<small>{[p.department,p.subdepartment,p.discipline].filter(Boolean).join(" / ")}</small></td>
              <td>{p.shift}</td>
              <td>
                <span className="status ok">Active</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function JobList({ rows }: { rows: Job[] }) {
  return (
    <div className="joblist">
      {rows.map((j, i) => (
        <article key={j.id}>
          <strong>{String(i + 1).padStart(2, "0")}</strong>
          <div className="grow">
            <h3>{j.title}</h3>
            <p>
              {j.area} · {j.scheduledDate} · {j.startTime}–{j.endTime}
            </p>
            <small>
              {j.manpowerName
                ? `${j.manpowerName} (${j.employeeId})`
                : "No worker selected"}
            </small>
          </div>
          <span className="status plain">{j.status}</span>
        </article>
      ))}
    </div>
  );
}
type StaffAccount={id:number;name:string;email:string;role:string;scopeType:string;scopeId:number|null;scopeName?:string;active:boolean};
function TeamAccess({organization}:{organization:OrgData|null}){
 const [accounts,setAccounts]=useState<StaffAccount[]>([]),[error,setError]=useState(""),[notice,setNotice]=useState("");
 const load=useCallback(()=>fetch("/api/staff").then(async r=>{if(r.ok)setAccounts(await r.json())}),[]);
 useEffect(()=>{load()},[load]);
 async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();setError("");const d=new FormData(e.currentTarget),scopeType=String(d.get("scopeType")),body={...Object.fromEntries(d),scopeId:scopeType==="Company"?null:Number(d.get("scopeId"))};const r=await fetch("/api/staff",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});const out=await r.json();if(!r.ok)return setError(out.error);setNotice("Team account created.");e.currentTarget.reset();load()}
 return <section className="panel page"><div className="planner-hero"><div><small>CONTROLLED ACCESS</small><h2>Managers & safety officers</h2><p>Give each person only the workplace scope they are responsible for.</p></div><KeyRound/></div><div className="org-layout"><form className="org-card" onSubmit={submit}><h3>Create account</h3><label className="field"><span>Full name</span><input name="name" required/></label><label className="field"><span>Email</span><input name="email" type="email" required/></label><label className="field"><span>Role</span><select name="role"><option>Manager</option><option>Safety Officer</option></select></label><label className="field"><span>Access level</span><select name="scopeType" defaultValue="Plant"><option>Company</option><option>Plant</option><option>Department</option><option>Sub-department</option><option>Discipline</option></select></label><label className="field"><span>Organization scope</span><select name="scopeId"><option value="">Whole company / choose scope</option>{organization?.units.map(u=><option value={u.id} key={u.id}>{u.type} — {u.name}</option>)}</select></label><label className="field"><span>Temporary password</span><input name="password" type="password" minLength={8} required/></label>{error&&<div className="formerror">{error}</div>}{notice&&<div className="request-success">{notice}</div>}<button className="primary">Create account</button></form><div className="org-card"><h3>Active accounts</h3><p>Managers handle attendance, leave and work. Safety officers handle passes and training.</p><div className="staff-list">{accounts.map(a=><article key={a.id}><span className="face">{a.name.split(" ").map(x=>x[0]).join("")}</span><div><b>{a.name}</b><small>{a.email}</small><small>{a.role} · {a.scopeName||a.scopeType}</small></div><span className="status ok">Active</span></article>)}{!accounts.length&&<MiniEmpty text="No manager or safety accounts yet."/>}</div></div></div></section>
}
function OrganizationSetup({data,reload}:{data:OrgData|null;reload:()=>void}){
 const [type,setType]=useState<OrgUnit["type"]>("Plant"),[parentId,setParentId]=useState(""),[name,setName]=useState(""),[error,setError]=useState(""),[notice,setNotice]=useState("");
 const parentType:{[key:string]:string|null}={Plant:null,Department:"Plant","Sub-department":"Department",Discipline:"Sub-department"};
 if(!data)return <section className="panel page"><Loading/></section>;
 const parents=data.units.filter(u=>u.type===parentType[type])||[];
 async function saveCompany(e:FormEvent<HTMLFormElement>){e.preventDefault();const body=Object.fromEntries(new FormData(e.currentTarget));const r=await fetch("/api/organization",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"company",...body})});const out=await r.json();if(!r.ok)return setError(out.error);setNotice("Company profile saved.");reload()}
 async function addUnit(){setError("");const r=await fetch("/api/organization",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"unit",type,name,parentId:parentId?Number(parentId):null})});const out=await r.json();if(!r.ok)return setError(out.error);setName("");setNotice(`${type} added.`);reload()}
 function path(u:OrgUnit){const parts=[u.name];let p=data?.units.find(x=>x.id===u.parentId);while(p){parts.unshift(p.name);p=data?.units.find(x=>x.id===p?.parentId)}return parts.join(" / ")}
 return <section className="panel page org-page"><div className="planner-hero"><div><small>COMPANY FOUNDATION</small><h2>Set up your organization</h2><p>Build the structure once. Attendance, managers, safety passes and reports will follow it.</p></div><span className="company-code">Company code<br/><b>{data?.company.code||"—"}</b></span></div>
 <div className="org-layout"><form className="org-card" onSubmit={saveCompany}><h3>1. Company profile</h3><p>Workers use this code when signing in.</p><label className="field"><span>Company name</span><input name="name" required defaultValue={data?.company.name}/></label><label className="field"><span>Company code</span><input name="code" required defaultValue={data?.company.code} maxLength={20}/></label><button className="primary">Save company</button></form>
 <div className="org-card"><h3>2. Add organization levels</h3><p>Add each level from Plant through Discipline.</p><label className="field"><span>Level</span><select value={type} onChange={e=>{setType(e.target.value as OrgUnit["type"]);setParentId("")}}>{["Plant","Department","Sub-department","Discipline"].map(x=><option key={x}>{x}</option>)}</select></label>{parentType[type]&&<label className="field"><span>Under {parentType[type]}</span><select value={parentId} onChange={e=>setParentId(e.target.value)}><option value="">Choose {parentType[type]}</option>{parents.map(p=><option value={p.id} key={p.id}>{path(p)}</option>)}</select></label>}<label className="field"><span>{type} name</span><input value={name} onChange={e=>setName(e.target.value)} placeholder={`Example: ${type==="Plant"?"CH2":type==="Department"?"Maintenance":type==="Sub-department"?"WRM":"Mechanical"}`}/></label><button className="primary" type="button" disabled={name.trim().length<2||!!parentType[type]&&!parentId} onClick={addUnit}>Add {type.toLowerCase()}</button></div></div>
 {error&&<div className="formerror org-message">{error}</div>}{notice&&<div className="request-success org-message">{notice}</div>}
 <Head title="Organization structure" sub="Plant → Department → Sub-department → Discipline"/><div className="org-tree">{data?.units.map(u=><div key={u.id} className={`org-level level-${u.type.toLowerCase().replace("-","")}`}><span>{u.type}</span><b>{path(u)}</b></div>)}{!data?.units.length&&<MiniEmpty text="Start by adding your first plant."/>}</div></section>
}
function PersonForm({ close, done, organization }: { close: () => void; done: () => void;organization:OrgData|null }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const d = new FormData(e.currentTarget);
    const body = {...Object.fromEntries(d),plantId:Number(d.get("plantId")),departmentId:Number(d.get("departmentId")),subdepartmentId:Number(d.get("subdepartmentId")),disciplineId:Number(d.get("disciplineId"))};
    const r = await fetch("/api/manpower", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const out = await r.json();
    setBusy(false);
    if (!r.ok) return setError(out.error);
    done();
  }
  return (
    <Form
      title="Add manpower"
      sub="Create a worker login with Employee ID and PIN."
      close={close}
      submit={submit}
      busy={busy}
      error={error}
    >
      <Field name="employeeId" label="Employee ID" required />
      <Field
        name="pin"
        label="Temporary PIN (4–8 digits)"
        type="password"
        required
      />
      <Field name="name" label="Full name" required />
      <Field name="contractor" label="Contractor" required />
      <Field name="trade" label="Trade / role" required />
      <Select
        name="skillLevel"
        label="Skill level"
        values={["Basic", "Skilled", "Advanced", "Certified"]}
      />
      <Select name="shift" label="Shift" values={["A", "B", "C", "G"]} />
      <Field name="phone" label="Phone number" />
      <OrgSelects organization={organization}/>
    </Form>
  );
}
function OrgSelects({organization}:{organization:OrgData|null}){
 const [plant,setPlant]=useState(""),[department,setDepartment]=useState(""),[subdepartment,setSubdepartment]=useState(""),[discipline,setDiscipline]=useState("");
 const units=organization?.units||[], plants=units.filter(u=>u.type==="Plant"),departments=units.filter(u=>u.type==="Department"&&String(u.parentId)===plant),subs=units.filter(u=>u.type==="Sub-department"&&String(u.parentId)===department),disciplines=units.filter(u=>u.type==="Discipline"&&String(u.parentId)===subdepartment);
 const select=(name:string,label:string,value:string,set:(v:string)=>void,rows:OrgUnit[])=><label className="field"><span>{label} *</span><select name={name} required value={value} onChange={e=>set(e.target.value)}><option value="">Select {label.toLowerCase()}</option>{rows.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}</select></label>;
 return <>{select("plantId","Plant",plant,v=>{setPlant(v);setDepartment("");setSubdepartment("");setDiscipline("")},plants)}{select("departmentId","Department",department,v=>{setDepartment(v);setSubdepartment("");setDiscipline("")},departments)}{select("subdepartmentId","Sub-department",subdepartment,v=>{setSubdepartment(v);setDiscipline("")},subs)}{select("disciplineId","Discipline",discipline,setDiscipline,disciplines)}</>
}
function WorkForm({
  people,
  close,
  done,
}: {
  people: Person[];
  close: () => void;
  done: () => void;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const d = new FormData(e.currentTarget);
    const body = {
      ...Object.fromEntries(d),
      manpowerId: d.get("manpowerId") ? Number(d.get("manpowerId")) : null,
    };
    const r = await fetch("/api/work", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const out = await r.json();
    setBusy(false);
    if (!r.ok) return setError(out.error);
    done();
  }
  return (
    <Form
      title="New work assignment"
      sub="Allot work to a contractor worker."
      close={close}
      submit={submit}
      busy={busy}
      error={error}
    >
      <Field name="title" label="Work description" required />
      <Field name="area" label="Area / equipment" required />
      <label className="field">
        <span>Assign manpower</span>
        <select name="manpowerId" required defaultValue="">
          <option value="" disabled>
            Select worker
          </option>
          {people.map((p) => (
            <option value={p.id} key={p.id}>
              {p.employeeId} — {p.name} ({p.trade})
            </option>
          ))}
        </select>
      </label>
      <Field name="scheduledDate" label="Work date" type="date" required />
      <Field name="startTime" label="Start time" type="time" required />
      <Field name="endTime" label="End time" type="time" required />
      <label className="field full">
        <span>Instructions</span>
        <textarea name="instructions" rows={3} />
      </label>
    </Form>
  );
}
function Form({
  title,
  sub,
  close,
  submit,
  busy,
  error,
  children,
}: {
  title: string;
  sub: string;
  close: () => void;
  submit: (e: FormEvent<HTMLFormElement>) => void;
  busy: boolean;
  error: string;
  children: React.ReactNode;
}) {
  return (
    <form className="entry" onSubmit={submit}>
      <div className="formhead">
        <div>
          <h2>{title}</h2>
          <p>{sub}</p>
        </div>
        <button type="button" onClick={close}>
          <X />
        </button>
      </div>
      {error && <p className="formerror">{error}</p>}
      <div className="formgrid">{children}</div>
      <div className="formactions">
        <button type="button" onClick={close}>
          Cancel
        </button>
        <button className="primary" disabled={busy}>
          {busy ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}
function Field({
  name,
  label,
  type = "text",
  required = false,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="field">
      <span>
        {label}
        {required && " *"}
      </span>
      <input name={name} type={type} required={required} />
    </label>
  );
}
function Select({
  name,
  label,
  values,
}: {
  name: string;
  label: string;
  values: string[];
}) {
  return (
    <label className="field">
      <span>{label} *</span>
      <select name={name}>
        {values.map((v) => (
          <option key={v}>{v}</option>
        ))}
      </select>
    </label>
  );
}
function Empty({
  icon: I,
  title,
  text,
  button,
  action,
}: {
  icon: typeof Users;
  title: string;
  text: string;
  button?: string;
  action?: () => void;
}) {
  return (
    <section className="panel page empty">
      <span>
        <I />
      </span>
      <h2>{title}</h2>
      <p>{text}</p>
      {button && (
        <button className="primary" onClick={action}>
          {button}
        </button>
      )}
    </section>
  );
}
function MiniEmpty({ text }: { text: string }) {
  return <div className="miniempty">{text}</div>;
}
function Loading() {
  return <div className="miniempty">Loading records…</div>;
}
function SchedulePlanner({people,refreshPeople}:{people:Person[];refreshPeople:()=>void}) {
  const [data, setData] = useState<{
    records: Array<{
      id: number;
      name: string;
      employeeId: string;
      contractor: string;
      shift: string;
      attendanceDate: string;
      requestType: string;
      reason?: string;
      requestedAt: string;
      status: string;
      manpowerId: number;
    }>;
    workplaceCode: string;
  } | null>(null);
  const [changes,setChanges]=useState<{shiftRequests:any[];workRequests:any[]}>({shiftRequests:[],workRequests:[]});
  const [shiftFilter,setShiftFilter]=useState("All");
  const load = useCallback(
    () => Promise.all([fetch("/api/attendance").then((r) => r.json()).then(setData),fetch("/api/change-requests").then(r=>r.json()).then(setChanges)]),
    [],
  );
  useEffect(() => {
    load();
  }, [load]);
  async function review(id: number, status: string) {
    await fetch("/api/attendance", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    load();
  }
  async function reviewChange(kind:string,id:number,status:string){await fetch("/api/change-requests",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({kind,id,status})});load();refreshPeople()}
  async function setWorkerShift(id:number,shift:string){await fetch("/api/manpower",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({id,shift})});refreshPeople()}
  const visible=data?.records.filter(r=>shiftFilter==="All"||r.shift===shiftFilter)||[];
  const pending=(data?.records.filter(r=>r.status==="Pending").length||0)+changes.shiftRequests.filter(r=>r.status==="Pending").length+changes.workRequests.filter(r=>r.status==="Pending").length;
  return (
    <section className="panel page">
      <div className="planner-hero"><div><small>WORKFORCE OPERATIONS</small><h2>Schedule planner</h2><p>Plan shift coverage, attendance and leave from one place.</p></div><label className="field"><span>View shift</span><select value={shiftFilter} onChange={e=>setShiftFilter(e.target.value)}>{["All","A","B","C","G"].map(s=><option key={s}>{s}</option>)}</select></label></div>
      <div className="planner-metrics"><article><b>{people.length}</b><span>Active workers</span></article><article><b>{visible.filter(r=>r.requestType==="Attendance"&&r.status==="Approved").length}</b><span>Approved attendance</span></article><article><b>{visible.filter(r=>r.requestType==="Leave"&&r.status==="Approved").length}</b><span>Approved leave</span></article><article><b>{pending}</b><span>Pending actions</span></article></div>
      <div className="codebar">
        <div>
          <small>TODAY’S WORKPLACE QR CODE</small>
          <strong>{data?.workplaceCode || "———"}</strong>
          <p>
            Display this QR at the workplace. Workers scan it and enter the
            six-character code.
          </p>
        </div>
        {data?.workplaceCode ? (
          <div className="workplace-qr">
            <QRCodeSVG
              value={data.workplaceCode}
              size={260}
              level="H"
              includeMargin
            />
          </div>
        ) : (
          <QrCode />
        )}
      </div>
      <Head title="Attendance & leave roster" sub="Shift-wise schedule and approval queue" />
      {!data ? (
        <Loading />
      ) : visible.length ? (
        <div className="attendance-list">
          {visible.map((r) => (
            <div className="row" key={r.id}>
              <span className="face">
                {r.name
                  .split(" ")
                  .map((x) => x[0])
                  .join("")}
              </span>
              <div className="grow">
                <b>{r.name}</b>
                <small>
                  {r.employeeId} · {r.contractor} · {r.attendanceDate} · Shift{" "}
                  {r.shift}
                </small>
                <small>
                  {r.requestType}
                  {r.reason ? ` · ${r.reason}` : ""}
                </small>
              </div>
              <span
                className={`status ${r.status === "Approved" ? "ok" : r.status === "Pending" ? "wait" : "plain"}`}
              >
                {r.status}
              </span>
              {r.status === "Pending" && (
                <div className="review">
                  <button onClick={() => review(r.id, "Rejected")}>
                    Reject
                  </button>
                  <button onClick={() => review(r.id, "Approved")}>
                    Approve
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <MiniEmpty text="No attendance requests" />
      )}
      <Head title="Shift assignments" sub="Change a worker’s default shift immediately" />
      <div className="shift-roster">{people.map(p=><div key={p.id}><span className="face">{p.name.split(" ").map(x=>x[0]).join("")}</span><span><b>{p.name}</b><small>{p.employeeId} · {p.trade}</small></span><select value={p.shift} onChange={e=>setWorkerShift(p.id,e.target.value)}>{["A","B","C","G"].map(s=><option key={s}>{s}</option>)}</select></div>)}</div>
      <Head title="Change requests" sub="Review worker shift and assignment change requests" />
      <div className="attendance-list">
       {[...changes.shiftRequests.map(r=>({...r,kind:"shift",summary:`Shift ${r.currentShift} → ${r.requestedShift} from ${r.effectiveDate}`})),...changes.workRequests.map(r=>({...r,kind:"work",summary:`${r.title} → ${r.requestedDate}`}))].map(r=><div className="row" key={`${r.kind}${r.id}`}><div className="grow"><b>{r.name}</b><small>{r.employeeId} · {r.summary}</small><small>{r.reason}</small></div><span className={`status ${r.status==="Approved"?"ok":r.status==="Pending"?"wait":"plain"}`}>{r.status}</span>{r.status==="Pending"&&<div className="review"><button onClick={()=>reviewChange(r.kind,r.id,"Rejected")}>Reject</button><button onClick={()=>reviewChange(r.kind,r.id,"Approved")}>Approve</button></div>}</div>)}
       {!changes.shiftRequests.length&&!changes.workRequests.length&&<MiniEmpty text="No change requests"/>}
      </div>
    </section>
  );
}

type WorkerRequest = {
  id: number;
  attendanceDate: string;
  status: string;
  requestType: "Attendance" | "Leave";
  shift: string;
  reason?: string;
};
type ColleagueLeave={id:number;attendanceDate:string;shift:string;name:string;employeeId:string};
type ChangeData={shiftRequests:Array<any>;workRequests:Array<any>};
const dateKey = (date: Date) => date.toISOString().slice(0, 10);
const todayKey = () => dateKey(new Date());
function calendarMonths() {
  const now = new Date();
  return [-1, 0, 1].map(
    (offset) =>
      new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1)),
  );
}
function MonthCalendar({
  month,
  records,
  selected,
  onSelect,
}: {
  month: Date;
  records: WorkerRequest[];
  selected: string;
  onSelect: (date: string) => void;
}) {
  const year = month.getUTCFullYear(),
    monthIndex = month.getUTCMonth(),
    first = new Date(Date.UTC(year, monthIndex, 1)).getUTCDay(),
    days = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const recordMap = new Map(records.map((r) => [r.attendanceDate, r]));
  return (
    <section className="month-card">
      <h3>
        {month.toLocaleDateString("en", {
          month: "long",
          year: "numeric",
          timeZone: "UTC",
        })}
      </h3>
      <div className="weekdays">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <span key={`${d}${i}`}>{d}</span>
        ))}
      </div>
      <div className="calendar-grid">
        {Array.from({ length: first }, (_, i) => (
          <span key={`blank${i}`} />
        ))}
        {Array.from({ length: days }, (_, i) => {
          const key = dateKey(new Date(Date.UTC(year, monthIndex, i + 1))),
            record = recordMap.get(key),
            past = key < todayKey();
          return (
            <button
              key={key}
              className={`${selected === key ? "selected " : ""}${record ? record.requestType.toLowerCase() : ""}`}
              disabled={past || !!record}
              onClick={() => onSelect(key)}
              aria-label={`${key}${record ? `, ${record.requestType} ${record.status}` : ""}`}
            >
              <b>{i + 1}</b>
              {record && (
                <small>{record.requestType === "Leave" ? "L" : "A"}</small>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default function WorkerHome() {
  const [worker, setWorker] = useState<Person | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [code, setCode] = useState(""),
    [selectedDate, setSelectedDate] = useState(todayKey()),
    [requestType, setRequestType] = useState<"Attendance" | "Leave">(
      "Attendance",
    ),
    [shift, setShift] = useState("G"),
    [reason, setReason] = useState(""),
    [records, setRecords] = useState<WorkerRequest[]>([]),
    [colleagueLeaves,setColleagueLeaves]=useState<ColleagueLeave[]>([]),
    [jobs,setJobs]=useState<Job[]>([]),
    [changes,setChanges]=useState<ChangeData>({shiftRequests:[],workRequests:[]}),
    [workerTab,setWorkerTab]=useState<"Schedule"|"My work"|"Team leave"|"Requests">("Schedule"),
    [changeShift,setChangeShift]=useState("A"),
    [effectiveDate,setEffectiveDate]=useState(todayKey()),
    [changeReason,setChangeReason]=useState(""),
    [notice, setNotice] = useState("");
  const loadRequests = useCallback(async () => {
    const [a,w,c]=await Promise.all([fetch("/api/attendance?mine=1"),fetch("/api/work?mine=1"),fetch("/api/change-requests")]);
    if (a.ok){const out=await a.json();setRecords(out.records);setColleagueLeaves(out.colleagueLeaves||[])}
    if(w.ok)setJobs(await w.json());
    if(c.ok)setChanges(await c.json());
  }, []);
  useEffect(() => {
    fetch("/api/worker/me").then(async (r) => {
      if (r.ok) {
        const current = (await r.json()).worker;
        setWorker(current);
        setShift(current.shift === "General" ? "G" : current.shift);
        loadRequests();
      }
    });
  }, [loadRequests]);
  async function login(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const body = Object.fromEntries(new FormData(e.currentTarget));
    const r = await fetch("/api/worker/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const out = await r.json();
    setBusy(false);
    if (!r.ok) return setError(out.error);
    setWorker(out.worker);
    setShift(out.worker.shift === "General" ? "G" : out.worker.shift);
    loadRequests();
  }
  async function submitRequest() {
    setBusy(true);
    setError("");
    setNotice("");
    const r = await fetch("/api/attendance", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        date: selectedDate,
        type: requestType,
        shift,
        code,
        reason,
      }),
    });
    const out = await r.json();
    setBusy(false);
    if (!r.ok) return setError(out.error);
    setNotice(`${requestType} request submitted for ${selectedDate}.`);
    setCode("");
    setReason("");
    loadRequests();
  }
  async function submitChange(payload:object,message:string){setBusy(true);setError("");const r=await fetch("/api/change-requests",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(payload)});const out=await r.json();setBusy(false);if(!r.ok)return setError(out.error);setNotice(message);setChangeReason("");loadRequests()}
  if (!worker)
    return (
      <div className="loginpage">
        <section className="loginbox">
          <div className="brand dark">
            <span>
              <HardHat />
            </span>
            <div>
              <b>Workforce Hub</b>
              <small>WORKER ATTENDANCE</small>
            </div>
          </div>
          <h1>Worker sign in</h1>
          <p>Use the Employee ID and PIN provided by your admin.</p>
          {error && <div className="formerror">{error}</div>}
          <form onSubmit={login}>
            <label className="field"><span>Company code</span><input name="companyCode" defaultValue="WORKFORCE" required autoCapitalize="characters"/></label>
            <Field name="employeeId" label="Employee ID" required />
            <Field name="pin" label="PIN" type="password" required />
            <button className="primary" disabled={busy}>
              <LogIn />
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>
          <a href="/admin">Admin sign in</a>
        </section>
      </div>
    );
  return (
    <div className="workerhome">
      <header>
        <div className="brand dark">
          <span>
            <HardHat />
          </span>
          <div>
            <b>Workforce Hub</b>
            <small>WORKER</small>
          </div>
        </div>
        <button
          onClick={async () => {
            await fetch("/api/worker/me", { method: "DELETE" });
            setWorker(null);
          }}
        >
          Sign out
        </button>
      </header>
      <main>
        <section className="hello">
          <span className="face big">
            {worker.name
              .split(" ")
              .map((x) => x[0])
              .join("")}
          </span>
          <div>
            <small>
              {worker.companyName ? `${worker.companyName} · ` : ""}{worker.employeeId} · SHIFT {worker.shift}
            </small>
            <h1>{worker.name}</h1>
            <p>
              {worker.contractor} · {worker.trade}
            </p>
          </div>
        </section>
        <nav className="worker-tabs">{(["Schedule","My work","Team leave","Requests"] as const).map(t=><button key={t} className={workerTab===t?"active":""} onClick={()=>{setWorkerTab(t);setError("");setNotice("")}}>{t}</button>)}</nav>
        {workerTab==="Schedule"&&<section className="worker-summary"><article><b>{records.filter(r=>r.requestType==="Attendance"&&r.status==="Approved").length}</b><span>Attendance days</span></article><article><b>{records.filter(r=>r.requestType==="Leave"&&r.status==="Approved").length}</b><span>Leave days</span></article>{["A","B","C","G"].map(s=><article key={s}><b>{records.filter(r=>r.requestType==="Attendance"&&r.shift===s).length}</b><span>Shift {s}</span></article>)}</section>}
        {workerTab==="Schedule"&&<section className="request-panel">
          <div className="request-head">
            <div>
              <small>MY SCHEDULE</small>
              <h2>Attendance & leave calendar</h2>
              <p>
                View last month and submit requests through the end of next
                month.
              </p>
            </div>
            <CalendarCheck />
          </div>
          <div className="calendar-strip">
            {calendarMonths().map((month) => (
              <MonthCalendar
                key={month.toISOString()}
                month={month}
                records={records}
                selected={selectedDate}
                onSelect={setSelectedDate}
              />
            ))}
          </div>
          <div className="request-form">
            <div className="request-toggle">
              <button
                className={requestType === "Attendance" ? "active" : ""}
                onClick={() => setRequestType("Attendance")}
              >
                Attendance
              </button>
              <button
                className={requestType === "Leave" ? "active" : ""}
                onClick={() => setRequestType("Leave")}
              >
                Leave
              </button>
            </div>
            <div className="request-fields">
              <label className="field">
                <span>Selected date</span>
                <input
                  type="date"
                  value={selectedDate}
                  min={todayKey()}
                  max={dateKey(
                    new Date(
                      Date.UTC(
                        new Date().getUTCFullYear(),
                        new Date().getUTCMonth() + 2,
                        0,
                      ),
                    ),
                  )}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </label>
              <label className="field">
                <span>Shift</span>
                <select
                  value={shift}
                  onChange={(e) => setShift(e.target.value)}
                >
                  {["A", "B", "C", "G"].map((s) => (
                    <option key={s} value={s}>
                      {s === "G" ? "G — General" : `Shift ${s}`}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {requestType === "Attendance" && selectedDate === todayKey() && (
              <label className="field">
                <span>Today’s workplace code</span>
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  placeholder="6-character code"
                />
              </label>
            )}
            {requestType === "Attendance" && selectedDate > todayKey() && (
              <p className="request-note">
                Future attendance is recorded as planned attendance and requires
                admin approval.
              </p>
            )}
            {requestType === "Leave" && (
              <label className="field">
                <span>Leave reason</span>
                <textarea
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Optional reason"
                />
              </label>
            )}
            {error && <div className="formerror">{error}</div>}
            {notice && <div className="request-success">{notice}</div>}
            <button
              className="primary"
              disabled={
                busy ||
                (requestType === "Attendance" &&
                  selectedDate === todayKey() &&
                  code.length !== 6)
              }
              onClick={submitRequest}
            >
              {busy ? "Submitting…" : `Submit ${requestType.toLowerCase()}`}
            </button>
          </div>
          <div className="calendar-legend">
            <span>
              <i className="attendance" />
              Attendance
            </span>
            <span>
              <i className="leave" />
              Leave
            </span>
            <span>Pending until admin approval</span>
          </div>
        </section>}
        {workerTab==="My work"&&<section className="request-panel"><div className="request-head"><div><small>ASSIGNED TO ME</small><h2>My work</h2><p>Check your area, timing and instructions. Request a date change if needed.</p></div><ClipboardList/></div><div className="worker-job-list">{jobs.map(j=><article key={j.id}><div><small>{j.scheduledDate} · {j.startTime}–{j.endTime}</small><h3>{j.title}</h3><p>{j.area}{j.instructions?` · ${j.instructions}`:""}</p><span className="status plain">{j.status}</span></div><details><summary>Request change</summary><label className="field"><span>Requested date</span><input id={`jobdate${j.id}`} type="date" min={todayKey()} defaultValue={j.scheduledDate}/></label><label className="field"><span>Reason</span><textarea id={`jobreason${j.id}`} rows={2}/></label><button className="primary" onClick={()=>{const d=(document.getElementById(`jobdate${j.id}`) as HTMLInputElement).value;const rs=(document.getElementById(`jobreason${j.id}`) as HTMLTextAreaElement).value;submitChange({kind:"work",workAssignmentId:j.id,requestedDate:d,reason:rs},"Work change request submitted.")}}>Submit request</button></details></article>)}{!jobs.length&&<MiniEmpty text="No work has been assigned yet."/>}</div></section>}
        {workerTab==="Team leave"&&<section className="request-panel"><div className="request-head"><div><small>TEAM AVAILABILITY</small><h2>Colleagues on leave</h2><p>Approved leave dates are visible for shift planning. Private reasons stay hidden.</p></div><Users/></div><div className="leave-board">{colleagueLeaves.map(l=><article key={l.id}><CalendarDays/><div><b>{l.name}</b><small>{l.attendanceDate} · Shift {l.shift}</small></div></article>)}{!colleagueLeaves.length&&<MiniEmpty text="No approved team leave this month or next month."/>}</div></section>}
        {workerTab==="Requests"&&<section className="request-panel"><div className="request-head"><div><small>SELF SERVICE</small><h2>Shift & work changes</h2><p>Send requests to your admin and track approval status.</p></div><CalendarCheck/></div><div className="change-form"><div className="request-fields"><label className="field"><span>Requested shift</span><select value={changeShift} onChange={e=>setChangeShift(e.target.value)}>{["A","B","C","G"].map(s=><option key={s}>{s}</option>)}</select></label><label className="field"><span>Effective date</span><input type="date" min={todayKey()} value={effectiveDate} onChange={e=>setEffectiveDate(e.target.value)}/></label></div><label className="field"><span>Reason</span><textarea rows={3} value={changeReason} onChange={e=>setChangeReason(e.target.value)} placeholder="Why do you need this shift change?"/></label>{error&&<div className="formerror">{error}</div>}{notice&&<div className="request-success">{notice}</div>}<button className="primary" disabled={busy||changeReason.trim().length<3} onClick={()=>submitChange({kind:"shift",requestedShift:changeShift,effectiveDate,reason:changeReason},"Shift change request submitted.")}>Request shift change</button></div><div className="request-history">{[...changes.shiftRequests.map(r=>({id:`s${r.id}`,title:`Shift ${r.currentShift} → ${r.requestedShift}`,date:r.effectiveDate,status:r.status})),...changes.workRequests.map(r=>({id:`w${r.id}`,title:`Work: ${r.title}`,date:r.requestedDate,status:r.status}))].map(r=><div className="row" key={r.id}><div className="grow"><b>{r.title}</b><small>{r.date}</small></div><span className={`status ${r.status==="Approved"?"ok":r.status==="Pending"?"wait":"plain"}`}>{r.status}</span></div>)}</div></section>}
      </main>
    </div>
  );
}
