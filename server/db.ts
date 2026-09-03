import { and, asc, desc, eq, gte, lte } from "drizzle-orm";
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
  users,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

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

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db;
}

export async function listEmployees(includeInactive = false) {
  const db = await requireDb();
  const query = db.select().from(employees);
  return includeInactive
    ? query.orderBy(asc(employees.area), asc(employees.name))
    : query.where(eq(employees.isActive, true)).orderBy(asc(employees.area), asc(employees.name));
}

export async function createEmployee(values: Pick<InsertEmployee, "name" | "area">) {
  const db = await requireDb();
  const result = await db.insert(employees).values(values);
  return { id: Number(result[0].insertId) };
}

export async function updateEmployee(values: Pick<InsertEmployee, "name" | "area"> & { id: number }) {
  const db = await requireDb();
  const { id, ...set } = values;
  await db.update(employees).set(set).where(eq(employees.id, id));
  return { success: true } as const;
}

export async function setEmployeeActive(id: number, isActive: boolean) {
  const db = await requireDb();
  await db.update(employees).set({ isActive }).where(eq(employees.id, id));
  return { success: true } as const;
}

export async function listCatalog(includeInactive = false) {
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

export async function createCatalogTask(
  values: Pick<InsertCatalogTask, "name" | "area" | "unit" | "usesQuantity" | "hasVariants">,
) {
  const db = await requireDb();
  const result = await db.insert(taskCatalog).values(values);
  return { id: Number(result[0].insertId) };
}

export async function updateCatalogTask(
  values: Pick<InsertCatalogTask, "name" | "area" | "unit" | "usesQuantity" | "hasVariants"> & { id: number },
) {
  const db = await requireDb();
  const { id, ...set } = values;
  await db.update(taskCatalog).set(set).where(eq(taskCatalog.id, id));
  return { success: true } as const;
}

export async function setCatalogTaskActive(id: number, isActive: boolean) {
  const db = await requireDb();
  await db.update(taskCatalog).set({ isActive }).where(eq(taskCatalog.id, id));
  return { success: true } as const;
}

export async function createTaskVariant(values: Pick<InsertTaskVariant, "taskCatalogId" | "name">) {
  const db = await requireDb();
  const result = await db.insert(taskVariants).values(values);
  return { id: Number(result[0].insertId) };
}

export async function updateTaskVariant(values: Pick<InsertTaskVariant, "name"> & { id: number }) {
  const db = await requireDb();
  const { id, ...set } = values;
  await db.update(taskVariants).set(set).where(eq(taskVariants.id, id));
  return { success: true } as const;
}

export async function setTaskVariantActive(id: number, isActive: boolean) {
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
  const db = await requireDb();
  const result = await db.insert(dailyTasks).values({
    ...values,
    targetQuantity: values.targetQuantity == null ? null : String(values.targetQuantity),
    completedQuantity: values.completedQuantity == null ? null : String(values.completedQuantity),
  });
  return { id: Number(result[0].insertId) };
}

export async function updateDailyTask(id: number, values: Partial<DailyTaskWrite>) {
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
  const db = await requireDb();
  await db.delete(dailyTasks).where(eq(dailyTasks.id, id));
  return { success: true } as const;
}
