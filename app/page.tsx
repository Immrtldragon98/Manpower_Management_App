"use client";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  CalendarCheck,
  DoorOpen,
  HardHat,
  LayoutDashboard,
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
  | "Manpower"
  | "Attendance"
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
};
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
  ["Manpower", Users],
  ["Attendance", CalendarCheck],
  ["Work", BriefcaseBusiness],
  ["Gate passes", DoorOpen],
  ["Skills", BadgeCheck],
];
export function AdminApp() {
  const [tab, setTab] = useState<Tab>("Dashboard"),
    [open, setOpen] = useState(false),
    [people, setPeople] = useState<Person[]>([]),
    [jobs, setJobs] = useState<Job[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [query, setQuery] = useState(""),
    [form, setForm] = useState<"person" | "work" | null>(null),
    [notice, setNotice] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [p, w] = await Promise.all([
        fetch("/api/manpower"),
        fetch("/api/work"),
      ]);
      if (!p.ok || !w.ok) throw new Error();
      setPeople(await p.json());
      setJobs(await w.json());
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
          {nav.map(([n, I]) => (
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
            <b>Admin access</b>
            <small>Full permissions</small>
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
                    <button
                      className="primary"
                      onClick={() => setForm("person")}
                    >
                      + Add manpower
                    </button>
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
          {tab === "Attendance" && <AttendanceAdmin />}
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
function PersonForm({ close, done }: { close: () => void; done: () => void }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const d = new FormData(e.currentTarget);
    const body = Object.fromEntries(d);
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
    </Form>
  );
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
function AttendanceAdmin() {
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
    }>;
    workplaceCode: string;
  } | null>(null);
  const load = useCallback(
    () =>
      fetch("/api/attendance")
        .then((r) => r.json())
        .then(setData),
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
  return (
    <section className="panel page">
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
      <Head
        title="Attendance requests"
        sub="Approve or reject submitted requests"
      />
      {!data ? (
        <Loading />
      ) : data.records.length ? (
        <div className="attendance-list">
          {data.records.map((r) => (
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
    [notice, setNotice] = useState("");
  const loadRequests = useCallback(async () => {
    const r = await fetch("/api/attendance?mine=1");
    if (r.ok) setRecords((await r.json()).records);
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
              {worker.employeeId} · SHIFT {worker.shift}
            </small>
            <h1>{worker.name}</h1>
            <p>
              {worker.contractor} · {worker.trade}
            </p>
          </div>
        </section>
        <section className="request-panel">
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
        </section>
      </main>
    </div>
  );
}
