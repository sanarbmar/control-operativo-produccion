/**
 * Migra los datos reales ya guardados en local-data/db.json (el almacén
 * temporal en JSON) hacia la base de datos SQLite definitiva, conservando
 * los IDs originales.
 *
 * Uso:
 *   1. Asegúrate de tener DATABASE_URL configurado en .env (ruta al archivo
 *      .db) y de haber corrido `pnpm exec drizzle-kit generate` +
 *      `pnpm exec drizzle-kit migrate` para crear las tablas.
 *   2. Corre: pnpm exec tsx scripts/migrar-json-a-sqlite.ts
 *
 * Es seguro correrlo una sola vez sobre una base recién creada y vacía.
 * Si ya hay datos, el script se detiene para no duplicar nada.
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { dailyTasks, employees, taskCatalog, taskVariants, users } from "../drizzle/schema";

const JSON_FILE = path.resolve(import.meta.dirname, "..", "local-data", "db.json");

type JsonStore = {
  nextIds: Record<string, number>;
  users: any[];
  employees: any[];
  taskCatalog: any[];
  taskVariants: any[];
  dailyTasks: any[];
};

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("Falta DATABASE_URL en .env (ruta al archivo .db)");
  }

  const raw = fs.readFileSync(JSON_FILE, "utf-8");
  const store: JsonStore = JSON.parse(raw);

  const sqlite = new Database(process.env.DATABASE_URL);
  sqlite.pragma("foreign_keys = OFF"); // lo activamos otra vez al final; durante la carga insertamos en orden seguro igual
  const db = drizzle(sqlite);

  const existingUsers = sqlite.prepare("select count(*) as c from users").get() as { c: number };
  const existingEmployees = sqlite.prepare("select count(*) as c from employees").get() as { c: number };
  if (existingUsers.c > 0 || existingEmployees.c > 0) {
    console.log(
      `La base ya tiene datos (users=${existingUsers.c}, employees=${existingEmployees.c}). No se migra nada para evitar duplicados.`,
    );
    sqlite.close();
    return;
  }

  const insertAll = sqlite.transaction(() => {
    if (store.users.length) {
      for (const u of store.users) {
        db.insert(users)
          .values({
            id: u.id,
            name: u.name,
            email: u.email,
            passwordHash: u.passwordHash,
            role: u.role,
            createdAt: u.createdAt,
            updatedAt: u.updatedAt,
            lastSignedIn: u.lastSignedIn,
          })
          .run();
      }
    }

    for (const e of store.employees) {
      db.insert(employees)
        .values({
          id: e.id,
          name: e.name,
          area: e.area,
          isActive: e.isActive,
          createdAt: e.createdAt,
          updatedAt: e.updatedAt,
        })
        .run();
    }

    for (const t of store.taskCatalog) {
      db.insert(taskCatalog)
        .values({
          id: t.id,
          name: t.name,
          area: t.area,
          unit: t.unit,
          usesQuantity: t.usesQuantity,
          hasVariants: t.hasVariants,
          defaultTargetQuantity: t.defaultTargetQuantity,
          defaultTargetMinutes: t.defaultTargetMinutes,
          isActive: t.isActive,
          sortOrder: t.sortOrder,
          createdAt: t.createdAt,
          updatedAt: t.updatedAt,
        })
        .run();
    }

    for (const v of store.taskVariants) {
      db.insert(taskVariants)
        .values({
          id: v.id,
          taskCatalogId: v.taskCatalogId,
          name: v.name,
          isActive: v.isActive,
          createdAt: v.createdAt,
          updatedAt: v.updatedAt,
        })
        .run();
    }

    for (const d of store.dailyTasks) {
      db.insert(dailyTasks)
        .values({
          id: d.id,
          workDate: d.workDate,
          employeeId: d.employeeId,
          area: d.area,
          taskCatalogId: d.taskCatalogId,
          variantId: d.variantId,
          status: d.status,
          targetQuantity: d.targetQuantity,
          targetDurationMinutes: d.targetDurationMinutes,
          completedQuantity: d.completedQuantity,
          unit: d.unit,
          startAt: d.startAt,
          endAt: d.endAt,
          notes: d.notes,
          createdByUserId: d.createdByUserId,
          createdAt: d.createdAt,
          updatedAt: d.updatedAt,
        })
        .run();
    }
  });

  insertAll();
  sqlite.pragma("foreign_keys = ON");

  const counts = {
    users: (sqlite.prepare("select count(*) as c from users").get() as any).c,
    employees: (sqlite.prepare("select count(*) as c from employees").get() as any).c,
    taskCatalog: (sqlite.prepare("select count(*) as c from task_catalog").get() as any).c,
    taskVariants: (sqlite.prepare("select count(*) as c from task_variants").get() as any).c,
    dailyTasks: (sqlite.prepare("select count(*) as c from daily_tasks").get() as any).c,
  };
  console.log("Migración completa:", counts);
  sqlite.close();
}

main().catch(err => {
  console.error("Error migrando datos:", err);
  process.exit(1);
});
