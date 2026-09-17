import {
  bigint,
  boolean,
  decimal,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow (usuario/contraseña propio, sin Manus).
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable(
  "users",
  {
    /**
     * Surrogate primary key. Auto-incremented numeric value managed by the database.
     * Use this for relations between tables.
     */
    id: int("id").autoincrement().primaryKey(),
    name: text("name"),
    email: varchar("email", { length: 320 }).notNull(),
    /** scrypt hash in the form "<salt-hex>:<hash-hex>". Never sent to the client. */
    passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
    role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
    lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  },
  table => [uniqueIndex("users_email_unique").on(table.email)],
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const areaValues = ["produccion", "ventas", "administracion"] as const;
export const taskStatusValues = ["pendiente", "en_proceso", "completada"] as const;

export const employees = mysqlTable(
  "employees",
  {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 120 }).notNull(),
    area: mysqlEnum("area", areaValues).notNull(),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [uniqueIndex("employees_name_unique").on(table.name), index("employees_area_idx").on(table.area)],
);

export const taskCatalog = mysqlTable(
  "task_catalog",
  {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 180 }).notNull(),
    area: mysqlEnum("area", areaValues).default("produccion").notNull(),
    unit: varchar("unit", { length: 50 }).default("unidades").notNull(),
    usesQuantity: boolean("usesQuantity").default(true).notNull(),
    hasVariants: boolean("hasVariants").default(false).notNull(),
    defaultTargetQuantity: decimal("defaultTargetQuantity", { precision: 12, scale: 2 }),
    defaultTargetMinutes: int("defaultTargetMinutes"),
    isActive: boolean("isActive").default(true).notNull(),
    sortOrder: int("sortOrder").default(0).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [uniqueIndex("task_catalog_name_unique").on(table.name), index("task_catalog_area_idx").on(table.area)],
);

export const taskVariants = mysqlTable(
  "task_variants",
  {
    id: int("id").autoincrement().primaryKey(),
    taskCatalogId: int("taskCatalogId")
      .notNull()
      .references(() => taskCatalog.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 100 }).notNull(),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("task_variant_task_name_unique").on(table.taskCatalogId, table.name),
    index("task_variants_task_idx").on(table.taskCatalogId),
  ],
);

export const dailyTasks = mysqlTable(
  "daily_tasks",
  {
    id: int("id").autoincrement().primaryKey(),
    workDate: bigint("workDate", { mode: "number" }).notNull(),
    employeeId: int("employeeId")
      .notNull()
      .references(() => employees.id, { onDelete: "restrict" }),
    area: mysqlEnum("area", areaValues).notNull(),
    taskCatalogId: int("taskCatalogId")
      .notNull()
      .references(() => taskCatalog.id, { onDelete: "restrict" }),
    variantId: int("variantId").references(() => taskVariants.id, { onDelete: "set null" }),
    status: mysqlEnum("status", taskStatusValues).default("pendiente").notNull(),
    targetQuantity: decimal("targetQuantity", { precision: 12, scale: 2 }),
    targetDurationMinutes: int("targetDurationMinutes"),
    completedQuantity: decimal("completedQuantity", { precision: 12, scale: 2 }),
    unit: varchar("unit", { length: 50 }).default("unidades").notNull(),
    startAt: bigint("startAt", { mode: "number" }),
    endAt: bigint("endAt", { mode: "number" }),
    notes: text("notes"),
    createdByUserId: int("createdByUserId").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
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
