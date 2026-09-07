import { Pool, type QueryResultRow } from "pg";
const globalForDb = globalThis as unknown as { workforcePool?: Pool; workforceSchema?: Promise<void> };
export const pool = globalForDb.workforcePool ?? new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.PGSSLMODE === "disable" ? false : { rejectUnauthorized: false } });
if (process.env.NODE_ENV !== "production") globalForDb.workforcePool = pool;
export function ensureSchema() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured");
  globalForDb.workforceSchema ??= pool.query(`
    CREATE TABLE IF NOT EXISTS manpower (id BIGSERIAL PRIMARY KEY, employee_id TEXT NOT NULL UNIQUE, name TEXT NOT NULL, contractor TEXT NOT NULL, trade TEXT NOT NULL, skill_level TEXT NOT NULL, shift TEXT NOT NULL, phone TEXT, pin_salt TEXT, pin_hash TEXT, active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    CREATE TABLE IF NOT EXISTS attendance (id BIGSERIAL PRIMARY KEY, manpower_id BIGINT NOT NULL REFERENCES manpower(id) ON DELETE CASCADE, attendance_date DATE NOT NULL, requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), status TEXT NOT NULL DEFAULT 'Pending', reviewed_at TIMESTAMPTZ, reviewed_by TEXT, UNIQUE (manpower_id, attendance_date));
    CREATE TABLE IF NOT EXISTS work_assignments (id BIGSERIAL PRIMARY KEY, title TEXT NOT NULL, area TEXT NOT NULL, manpower_id BIGINT REFERENCES manpower(id) ON DELETE SET NULL, scheduled_date DATE NOT NULL, start_time TEXT NOT NULL, end_time TEXT NOT NULL, instructions TEXT, status TEXT NOT NULL DEFAULT 'Not started', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
  `).then(() => undefined);
  return globalForDb.workforceSchema;
}
export async function query<T extends QueryResultRow = QueryResultRow>(text: string, values: unknown[] = []) { await ensureSchema(); return pool.query<T>(text, values); }
