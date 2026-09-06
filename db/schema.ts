import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const manpower = sqliteTable("manpower", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  employeeId: text("employee_id").notNull().unique(),
  name: text("name").notNull(),
  contractor: text("contractor").notNull(),
  trade: text("trade").notNull(),
  skillLevel: text("skill_level").notNull(),
  shift: text("shift").notNull(),
  phone: text("phone"),
  pinSalt: text("pin_salt"),
  pinHash: text("pin_hash"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull(),
});

export const attendance = sqliteTable("attendance", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  manpowerId: integer("manpower_id").notNull().references(() => manpower.id),
  attendanceDate: text("attendance_date").notNull(),
  requestedAt: text("requested_at").notNull(),
  status: text("status").notNull().default("Pending"),
  reviewedAt: text("reviewed_at"),
  reviewedBy: text("reviewed_by"),
}, (table) => [uniqueIndex("attendance_worker_date_unique").on(table.manpowerId, table.attendanceDate)]);

export const workAssignments = sqliteTable("work_assignments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  area: text("area").notNull(),
  manpowerId: integer("manpower_id").references(() => manpower.id),
  scheduledDate: text("scheduled_date").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  instructions: text("instructions"),
  status: text("status").notNull().default("Not started"),
  createdAt: text("created_at").notNull(),
});
