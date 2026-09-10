import { Pool, type QueryResultRow } from "pg";
const globalForDb = globalThis as unknown as {
  workforcePool?: Pool;
  workforceSchema?: Promise<void>;
};
export const pool =
  globalForDb.workforcePool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl:
      process.env.PGSSLMODE === "disable"
        ? false
        : { rejectUnauthorized: false },
  });
if (process.env.NODE_ENV !== "production") globalForDb.workforcePool = pool;
export function ensureSchema() {
  if (!process.env.DATABASE_URL)
    throw new Error("DATABASE_URL is not configured");
  globalForDb.workforceSchema ??= pool
    .query(
      `
    CREATE TABLE IF NOT EXISTS companies (id BIGSERIAL PRIMARY KEY, code TEXT NOT NULL UNIQUE, name TEXT NOT NULL, timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata', active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    INSERT INTO companies (code,name) VALUES ('WORKFORCE','Workforce Hub Company') ON CONFLICT (code) DO NOTHING;
    CREATE TABLE IF NOT EXISTS organization_units (id BIGSERIAL PRIMARY KEY, company_id BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE, unit_type TEXT NOT NULL, name TEXT NOT NULL, parent_id BIGINT REFERENCES organization_units(id) ON DELETE CASCADE, active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    CREATE TABLE IF NOT EXISTS staff_accounts (id BIGSERIAL PRIMARY KEY, company_id BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE, email TEXT NOT NULL, name TEXT NOT NULL, role TEXT NOT NULL, scope_type TEXT NOT NULL DEFAULT 'Company', scope_id BIGINT REFERENCES organization_units(id) ON DELETE SET NULL, password_salt TEXT NOT NULL, password_hash TEXT NOT NULL, active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE(company_id,email));
    CREATE UNIQUE INDEX IF NOT EXISTS organization_units_unique_root ON organization_units(company_id,unit_type,LOWER(name)) WHERE parent_id IS NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS organization_units_unique_child ON organization_units(company_id,parent_id,unit_type,LOWER(name)) WHERE parent_id IS NOT NULL;
    CREATE TABLE IF NOT EXISTS manpower (id BIGSERIAL PRIMARY KEY, employee_id TEXT NOT NULL UNIQUE, name TEXT NOT NULL, contractor TEXT NOT NULL, trade TEXT NOT NULL, skill_level TEXT NOT NULL, shift TEXT NOT NULL, phone TEXT, pin_salt TEXT, pin_hash TEXT, active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    ALTER TABLE manpower ADD COLUMN IF NOT EXISTS company_id BIGINT REFERENCES companies(id);
    ALTER TABLE manpower ADD COLUMN IF NOT EXISTS plant_id BIGINT REFERENCES organization_units(id);
    ALTER TABLE manpower ADD COLUMN IF NOT EXISTS department_id BIGINT REFERENCES organization_units(id);
    ALTER TABLE manpower ADD COLUMN IF NOT EXISTS subdepartment_id BIGINT REFERENCES organization_units(id);
    ALTER TABLE manpower ADD COLUMN IF NOT EXISTS discipline_id BIGINT REFERENCES organization_units(id);
    UPDATE manpower SET company_id=(SELECT id FROM companies WHERE code='WORKFORCE') WHERE company_id IS NULL;
    CREATE TABLE IF NOT EXISTS attendance (id BIGSERIAL PRIMARY KEY, manpower_id BIGINT NOT NULL REFERENCES manpower(id) ON DELETE CASCADE, attendance_date DATE NOT NULL, requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), status TEXT NOT NULL DEFAULT 'Pending', reviewed_at TIMESTAMPTZ, reviewed_by TEXT, request_type TEXT NOT NULL DEFAULT 'Attendance', shift_code TEXT NOT NULL DEFAULT 'G', reason TEXT, UNIQUE (manpower_id, attendance_date));
    ALTER TABLE attendance ADD COLUMN IF NOT EXISTS request_type TEXT NOT NULL DEFAULT 'Attendance';
    ALTER TABLE attendance ADD COLUMN IF NOT EXISTS shift_code TEXT NOT NULL DEFAULT 'G';
    ALTER TABLE attendance ADD COLUMN IF NOT EXISTS reason TEXT;
    CREATE TABLE IF NOT EXISTS work_assignments (id BIGSERIAL PRIMARY KEY, title TEXT NOT NULL, area TEXT NOT NULL, manpower_id BIGINT REFERENCES manpower(id) ON DELETE SET NULL, scheduled_date DATE NOT NULL, start_time TEXT NOT NULL, end_time TEXT NOT NULL, instructions TEXT, status TEXT NOT NULL DEFAULT 'Not started', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    CREATE TABLE IF NOT EXISTS shift_change_requests (id BIGSERIAL PRIMARY KEY, manpower_id BIGINT NOT NULL REFERENCES manpower(id) ON DELETE CASCADE, current_shift TEXT NOT NULL, requested_shift TEXT NOT NULL, effective_date DATE NOT NULL, reason TEXT, status TEXT NOT NULL DEFAULT 'Pending', requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), reviewed_at TIMESTAMPTZ, reviewed_by TEXT);
    CREATE TABLE IF NOT EXISTS work_change_requests (id BIGSERIAL PRIMARY KEY, manpower_id BIGINT NOT NULL REFERENCES manpower(id) ON DELETE CASCADE, work_assignment_id BIGINT NOT NULL REFERENCES work_assignments(id) ON DELETE CASCADE, requested_date DATE NOT NULL, reason TEXT, status TEXT NOT NULL DEFAULT 'Pending', requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), reviewed_at TIMESTAMPTZ, reviewed_by TEXT);
  `,
    )
    .then(() => undefined);
  return globalForDb.workforceSchema;
}
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  values: unknown[] = [],
) {
  await ensureSchema();
  return pool.query<T>(text, values);
}
