import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

/**
 * Core user table backing auth flow (usuario/contraseña propio, sin Manus).
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 *
 * Timestamps are stored as ISO-8601 text (e.g. "2026-09-16T19:07:35.127Z"),
 * generated on the JS side via $defaultFn/$onUpdate, so they behave the same
 * regardless of which SQL dialect drizzle talks to.
 */
export const users = sqliteTable(
  "users",
  {
    /**
     * Surrogate primary key. Auto-incremented numeric value managed by the database.
     * Use this for relations between tables.
     */
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name"),
    email: text("email", { length: 320 }).notNull(),
    /** scrypt hash in the form "<salt-hex>:<hash-hex>". Never sent to the client. */
    passwordHash: text("passwordHash", { length: 255 }).notNull(),
    role: text("role", { enum: ["user", "admin"] }).default("user").notNull(),
    createdAt: text("createdAt")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    updatedAt: text("updatedAt")
      .notNull()
      .$defaultFn(() => new Date().toISOString())
      .$onUpdate(() => new Date().toISOString()),
    lastSignedIn: text("lastSignedIn")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  table => [uniqueIndex("users_email_unique").on(table.email)],
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const areaValues = ["produccion", "ventas", "administracion"] as const;
export const taskStatusValues = ["pendiente", "en_proceso", "completada"] as const;

export const employees = sqliteTable(
  "employees",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name", { length: 120 }).notNull(),
    area: text("area", { enum: areaValues }).notNull(),
    isActive: integer("isActive", { mode: "boolean" }).default(true).notNull(),
    createdAt: text("createdAt")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    updatedAt: text("updatedAt")
      .notNull()
      .$defaultFn(() => new Date().toISOString())
      .$onUpdate(() => new Date().toISOString()),
  },
  table => [uniqueIndex("employees_name_unique").on(table.name), index("employees_area_idx").on(table.area)],
);

export const taskCatalog = sqliteTable(
  "task_catalog",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name", { length: 180 }).notNull(),
    area: text("area", { enum: areaValues }).default("produccion").notNull(),
    unit: text("unit", { length: 50 }).default("unidades").notNull(),
    usesQuantity: integer("usesQuantity", { mode: "boolean" }).default(true).notNull(),
    hasVariants: integer("hasVariants", { mode: "boolean" }).default(false).notNull(),
    // Stored as text (not a numeric type) so exact decimal values like "2.00"
    // round-trip without floating point surprises, same as the JSON store did.
    defaultTargetQuantity: text("defaultTargetQuantity"),
    defaultTargetMinutes: integer("defaultTargetMinutes"),
    isActive: integer("isActive", { mode: "boolean" }).default(true).notNull(),
    sortOrder: integer("sortOrder").default(0).notNull(),
    createdAt: text("createdAt")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    updatedAt: text("updatedAt")
      .notNull()
      .$defaultFn(() => new Date().toISOString())
      .$onUpdate(() => new Date().toISOString()),
  },
  table => [uniqueIndex("task_catalog_name_unique").on(table.name), index("task_catalog_area_idx").on(table.area)],
);

export const taskVariants = sqliteTable(
  "task_variants",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    taskCatalogId: integer("taskCatalogId")
      .notNull()
      .references(() => taskCatalog.id, { onDelete: "cascade" }),
    name: text("name", { length: 100 }).notNull(),
    isActive: integer("isActive", { mode: "boolean" }).default(true).notNull(),
    createdAt: text("createdAt")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    updatedAt: text("updatedAt")
      .notNull()
      .$defaultFn(() => new Date().toISOString())
      .$onUpdate(() => new Date().toISOString()),
  },
  table => [
    uniqueIndex("task_variant_task_name_unique").on(table.taskCatalogId, table.name),
    index("task_variants_task_idx").on(table.taskCatalogId),
  ],
);

export const dailyTasks = sqliteTable(
  "daily_tasks",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    workDate: integer("workDate", { mode: "number" }).notNull(),
    employeeId: integer("employeeId")
      .notNull()
      .references(() => employees.id, { onDelete: "restrict" }),
    area: text("area", { enum: areaValues }).notNull(),
    taskCatalogId: integer("taskCatalogId")
      .notNull()
      .references(() => taskCatalog.id, { onDelete: "restrict" }),
    variantId: integer("variantId").references(() => taskVariants.id, { onDelete: "set null" }),
    status: text("status", { enum: taskStatusValues }).default("pendiente").notNull(),
    targetQuantity: text("targetQuantity"),
    targetDurationMinutes: integer("targetDurationMinutes"),
    completedQuantity: text("completedQuantity"),
    unit: text("unit", { length: 50 }).default("unidades").notNull(),
    startAt: integer("startAt", { mode: "number" }),
    endAt: integer("endAt", { mode: "number" }),
    notes: text("notes"),
    createdByUserId: integer("createdByUserId").references(() => users.id, { onDelete: "set null" }),
    createdAt: text("createdAt")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    updatedAt: text("updatedAt")
      .notNull()
      .$defaultFn(() => new Date().toISOString())
      .$onUpdate(() => new Date().toISOString()),
  },
  table => [
    index("daily_tasks_work_date_idx").on(table.workDate),
    index("daily_tasks_employee_idx").on(table.employeeId),
    index("daily_tasks_area_idx").on(table.area),
    index("daily_tasks_status_idx").on(table.status),
  ],
);

export type Employee = typeof employees.$inferSelect;
export type InsertEmployee = typeof employees.$inferInsert;
export type CatalogTask = typeof taskCatalog.$inferSelect;
export type InsertCatalogTask = typeof taskCatalog.$inferInsert;
export type TaskVariant = typeof taskVariants.$inferSelect;
export type InsertTaskVariant = typeof taskVariants.$inferInsert;
export type DailyTask = typeof dailyTasks.$inferSelect;
export type InsertDailyTask = typeof dailyTasks.$inferInsert;
