import { and, asc, desc, eq, gte, lte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  dailyTasks,
  employees,
  InsertCatalogTask,
  InsertDailyTask,
  InsertEmployee,
  InsertTaskVariant,
  InsertUser,
  taskCatalog,
  taskVariants,
  User,
  users,
} from "../drizzle/schema";
import * as local from "./localStore";

let _db: ReturnType<typeof drizzle> | null = null;

// Sin DATABASE_URL usamos un almacén temporal en un archivo JSON local
// (server/localStore.ts), para poder probar la app sin una base de datos
// MySQL real. En cuanto configures DATABASE_URL, esto deja de usarse.
function useLocalStore() {
  return !process.env.DATABASE_URL;
}

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db;
}

/** Strip the password hash before a user record is ever sent to the client. */
export function toPublicUser<T extends { passwordHash: string }>(user: T): Omit<T, "passwordHash"> {
  const { passwordHash: _passwordHash, ...publicUser } = user;
  return publicUser;
}

export async function getUserByEmail(email: string) {
  if (useLocalStore()) return local.getUserByEmail(email);
  const db = await requireDb();
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result[0];
}

export async function getUserById(id: number) {
  if (useLocalStore()) return local.getUserById(id);
  const db = await requireDb();
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}

/** Create a new local account. The very first user ever created becomes admin. */
export async function createUser(values: Pick<InsertUser, "name" | "email" | "passwordHash">) {
  if (useLocalStore()) return local.createUser(values);

  const db = await requireDb();
  const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(users);
  const role = Number(count) === 0 ? "admin" : "user";

  const result = await db.insert(users).values({ ...values, role });
  const id = Number(result[0].insertId);
  return getUserById(id);
}

export async function touchLastSignedIn(id: number) {
  if (useLocalStore()) return local.touchLastSignedIn(id);
  const db = await requireDb();
  await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, id));
}

export async function listEmployees(includeInactive = false) {
  if (useLocalStore()) return local.listEmployees(includeInactive);
  const db = await requireDb();
  const query = db.select().from(employees);
  return includeInactive
    ? query.orderBy(asc(employees.area), asc(employees.name))
    : query.where(eq(employees.isActive, true)).orderBy(asc(employees.area), asc(employees.name));
}

export async function createEmployee(values: Pick<InsertEmployee, "name" | "area">) {
  if (useLocalStore()) return local.createEmployee(values);
  const db = await requireDb();
  const result = await db.insert(employees).values(values);
  return { id: Number(result[0].insertId) };
}

export async function updateEmployee(values: Pick<InsertEmployee, "name" | "area"> & { id: number }) {
  if (useLocalStore()) return local.updateEmployee(values);
  const db = await requireDb();
  const { id, ...set } = values;
  await db.update(employees).set(set).where(eq(employees.id, id));
  return { success: true } as const;
}

export async function setEmployeeActive(id: number, isActive: boolean) {
  if (useLocalStore()) return local.setEmployeeActive(id, isActive);
  const db = await requireDb();
  await db.update(employees).set({ isActive }).where(eq(employees.id, id));
  return { success: true } as const;
}

export async function listCatalog(includeInactive = false) {
  if (useLocalStore()) return local.listCatalog(includeInactive);
  const db = await requireDb();
  const tasks = includeInactive
    ? await db.select().from(taskCatalog).orderBy(asc(taskCatalog.sortOrder), asc(taskCatalog.name))
    : await db
        .select()
        .from(taskCatalog)
        .where(eq(taskCatalog.isActive, true))
        .orderBy(asc(taskCatalog.sortOrder), asc(taskCatalog.name));
  const variants = includeInactive
    ? await db.select().from(taskVariants).orderBy(asc(taskVariants.name))
    : await db.select().from(taskVariants).where(eq(taskVariants.isActive, true)).orderBy(asc(taskVariants.name));
  return tasks.map(task => ({ ...task, variants: variants.filter(variant => variant.taskCatalogId === task.id) }));
}

export async function getCatalogTaskById(id: number) {
  if (useLocalStore()) return local.getCatalogTaskById(id);
  const db = await requireDb();
  const result = await db.select().from(taskCatalog).where(eq(taskCatalog.id, id)).limit(1);
  return result[0];
}

type CatalogTaskWrite = Pick<InsertCatalogTask, "name" | "area" | "unit" | "usesQuantity" | "hasVariants"> & {
  defaultTargetQuantity?: number | string | null;
  defaultTargetMinutes?: number | null;
};

export async function createCatalogTask(values: CatalogTaskWrite) {
  if (useLocalStore()) return local.createCatalogTask(values);
  const db = await requireDb();
  const result = await db.insert(taskCatalog).values({
    ...values,
    defaultTargetQuantity: values.defaultTargetQuantity == null ? null : String(values.defaultTargetQuantity),
  });
  return { id: Number(result[0].insertId) };
}

export async function updateCatalogTask(
  values: CatalogTaskWrite & { id: number },
) {
  if (useLocalStore()) return local.updateCatalogTask(values);
  const db = await requireDb();
  const { id, ...set } = values;
  await db
    .update(taskCatalog)
    .set({
      ...set,
      defaultTargetQuantity: set.defaultTargetQuantity == null ? null : String(set.defaultTargetQuantity),
    })
    .where(eq(taskCatalog.id, id));
  return { success: true } as const;
}

export async function setCatalogTaskActive(id: number, isActive: boolean) {
  if (useLocalStore()) return local.setCatalogTaskActive(id, isActive);
  const db = await requireDb();
  await db.update(taskCatalog).set({ isActive }).where(eq(taskCatalog.id, id));
  return { success: true } as const;
}

export async function createTaskVariant(values: Pick<InsertTaskVariant, "taskCatalogId" | "name">) {
  if (useLocalStore()) return local.createTaskVariant(values);
  const db = await requireDb();
  const result = await db.insert(taskVariants).values(values);
  return { id: Number(result[0].insertId) };
}

export async function updateTaskVariant(values: Pick<InsertTaskVariant, "name"> & { id: number }) {
  if (useLocalStore()) return local.updateTaskVariant(values);
  const db = await requireDb();
  const { id, ...set } = values;
  await db.update(taskVariants).set(set).where(eq(taskVariants.id, id));
  return { success: true } as const;
}

export async function setTaskVariantActive(id: number, isActive: boolean) {
  if (useLocalStore()) return local.setTaskVariantActive(id, isActive);
  const db = await requireDb();
  await db.update(taskVariants).set({ isActive }).where(eq(taskVariants.id, id));
  return { success: true } as const;
}

type DailyTaskFilters = {
  from: number;
  to: number;
  employeeId?: number;
  area?: "produccion" | "ventas" | "administracion";
  status?: "pendiente" | "en_proceso" | "completada";
};

export async function listDailyTasks(filters: DailyTaskFilters) {
  if (useLocalStore()) return local.listDailyTasks(filters);
  const db = await requireDb();
  const conditions = [gte(dailyTasks.workDate, filters.from), lte(dailyTasks.workDate, filters.to)];
  if (filters.employeeId) conditions.push(eq(dailyTasks.employeeId, filters.employeeId));
  if (filters.area) conditions.push(eq(dailyTasks.area, filters.area));
  if (filters.status) conditions.push(eq(dailyTasks.status, filters.status));

  return db
    .select({
      id: dailyTasks.id,
      workDate: dailyTasks.workDate,
      employeeId: dailyTasks.employeeId,
      employeeName: employees.name,
      area: dailyTasks.area,
      taskCatalogId: dailyTasks.taskCatalogId,
      taskName: taskCatalog.name,
      variantId: dailyTasks.variantId,
      variantName: taskVariants.name,
      status: dailyTasks.status,
      targetQuantity: dailyTasks.targetQuantity,
      targetDurationMinutes: dailyTasks.targetDurationMinutes,
      completedQuantity: dailyTasks.completedQuantity,
      unit: dailyTasks.unit,
      startAt: dailyTasks.startAt,
      endAt: dailyTasks.endAt,
      notes: dailyTasks.notes,
      createdAt: dailyTasks.createdAt,
      updatedAt: dailyTasks.updatedAt,
    })
    .from(dailyTasks)
    .innerJoin(employees, eq(dailyTasks.employeeId, employees.id))
    .innerJoin(taskCatalog, eq(dailyTasks.taskCatalogId, taskCatalog.id))
    .leftJoin(taskVariants, eq(dailyTasks.variantId, taskVariants.id))
    .where(and(...conditions))
    .orderBy(desc(dailyTasks.workDate), desc(dailyTasks.id));
}

type DailyTaskWrite = Omit<InsertDailyTask, "targetQuantity" | "completedQuantity"> & {
  targetQuantity?: number | string | null;
  completedQuantity?: number | string | null;
};

export async function createDailyTask(values: DailyTaskWrite) {
  if (useLocalStore()) return local.createDailyTask(values as Parameters<typeof local.createDailyTask>[0]);
  const db = await requireDb();
  const result = await db.insert(dailyTasks).values({
    ...values,
    targetQuantity: values.targetQuantity == null ? null : String(values.targetQuantity),
    completedQuantity: values.completedQuantity == null ? null : String(values.completedQuantity),
  });
  return { id: Number(result[0].insertId) };
}

export async function updateDailyTask(id: number, values: Partial<DailyTaskWrite>) {
  if (useLocalStore()) return local.updateDailyTask(id, values as Parameters<typeof local.updateDailyTask>[1]);
  const db = await requireDb();
  await db
    .update(dailyTasks)
    .set({
      ...values,
      targetQuantity: values.targetQuantity == null ? null : String(values.targetQuantity),
      completedQuantity: values.completedQuantity == null ? null : String(values.completedQuantity),
    })
    .where(eq(dailyTasks.id, id));
  return { success: true } as const;
}

export async function deleteDailyTask(id: number) {
  if (useLocalStore()) return local.deleteDailyTask(id);
  const db = await requireDb();
  await db.delete(dailyTasks).where(eq(dailyTasks.id, id));
  return { success: true } as const;
}
