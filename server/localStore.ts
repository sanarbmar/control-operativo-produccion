import fs from "node:fs";
import path from "node:path";
import { sdk } from "./_core/sdk";

/**
 * Almacén temporal en un archivo JSON local, usado SOLO cuando no hay
 * DATABASE_URL configurado. Sirve para probar la app (login, empleados,
 * catálogo, tareas) sin depender de una base de datos MySQL real.
 *
 * Se crea automáticamente en local-data/db.json la primera vez que arranca
 * el servidor, con datos de ejemplo (incluida una cuenta de prueba). Bórralo
 * si quieres reiniciar los datos de prueba desde cero.
 *
 * En cuanto configures DATABASE_URL en tu .env, este archivo deja de usarse
 * por completo y todo pasa a la base de datos MySQL real.
 */

const DATA_DIR = path.resolve(import.meta.dirname, "..", "local-data");
const DATA_FILE = path.join(DATA_DIR, "db.json");

type Area = "produccion" | "ventas" | "administracion";
type TaskStatus = "pendiente" | "en_proceso" | "completada";

export type LocalUser = {
  id: number;
  name: string | null;
  email: string;
  passwordHash: string;
  role: "user" | "admin";
  createdAt: string;
  updatedAt: string;
  lastSignedIn: string;
};

type LocalEmployee = {
  id: number;
  name: string;
  area: Area;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type LocalCatalogTask = {
  id: number;
  name: string;
  area: Area;
  unit: string;
  usesQuantity: boolean;
  hasVariants: boolean;
  defaultTargetQuantity: string | null;
  defaultTargetMinutes: number | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

type LocalTaskVariant = {
  id: number;
  taskCatalogId: number;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type LocalDailyTask = {
  id: number;
  workDate: number;
  employeeId: number;
  area: Area;
  taskCatalogId: number;
  variantId: number | null;
  status: TaskStatus;
  targetQuantity: string | null;
  targetDurationMinutes: number | null;
  completedQuantity: string | null;
  unit: string;
  startAt: number | null;
  endAt: number | null;
  notes: string | null;
  createdByUserId: number | null;
  createdAt: string;
  updatedAt: string;
};

type Store = {
  nextIds: Record<"users" | "employees" | "taskCatalog" | "taskVariants" | "dailyTasks", number>;
  users: LocalUser[];
  employees: LocalEmployee[];
  taskCatalog: LocalCatalogTask[];
  taskVariants: LocalTaskVariant[];
  dailyTasks: LocalDailyTask[];
};

let cache: Store | null = null;
let loading: Promise<Store> | null = null;

function nextId(store: Store, key: keyof Store["nextIds"]) {
  const id = store.nextIds[key];
  store.nextIds[key] = id + 1;
  return id;
}

async function buildSeed(): Promise<Store> {
  const now = new Date().toISOString();
  const store: Store = {
    nextIds: { users: 1, employees: 120002, taskCatalog: 930002, taskVariants: 4, dailyTasks: 3510002 },
    users: [],
    employees: [],
    taskCatalog: [],
    taskVariants: [],
    dailyTasks: [],
  };

  // Cuenta de acceso para entrar a la app. Cambia la contraseña (o crea otra
  // cuenta desde el formulario de registro) en cuanto puedas.
  const passwordHash = await sdk.hashPassword("demo1234");
  store.users.push({
    id: nextId(store, "users"),
    name: "Admin",
    email: "demo@controloperativo.local",
    passwordHash,
    role: "admin",
    createdAt: now,
    updatedAt: now,
    lastSignedIn: now,
  });

  // ---------------------------------------------------------------------
  // Datos reales migrados desde la instalación anterior en Manus (export
  // manual de operations.employees.list / operations.catalog.list /
  // operations.dailyTasks.list vía DevTools). Se conservan los IDs
  // originales. Los campos que Manus no expuso en estas consultas (por
  // ejemplo el detalle exacto de "isActive" de cada catálogo) se completan
  // con valores por defecto razonables.
  // ---------------------------------------------------------------------

  store.employees.push(
    { id: 1, name: "Benjamín", area: "produccion", isActive: true, createdAt: now, updatedAt: now },
    { id: 2, name: "Rojo", area: "produccion", isActive: true, createdAt: now, updatedAt: now },
    { id: 3, name: "Sebastián", area: "produccion", isActive: true, createdAt: now, updatedAt: now },
    { id: 4, name: "Jhampier", area: "produccion", isActive: true, createdAt: now, updatedAt: now },
    { id: 5, name: "Juan Pablo", area: "produccion", isActive: true, createdAt: now, updatedAt: now },
    { id: 6, name: "Paola", area: "produccion", isActive: true, createdAt: now, updatedAt: now },
    { id: 7, name: "Jesús Adrián", area: "produccion", isActive: true, createdAt: now, updatedAt: now },
    { id: 9, name: "Juan Manuel", area: "produccion", isActive: true, createdAt: now, updatedAt: now },
    { id: 10, name: "Cristian", area: "ventas", isActive: true, createdAt: now, updatedAt: now },
    { id: 30001, name: "Equipo", area: "produccion", isActive: true, createdAt: now, updatedAt: now },
    { id: 90001, name: "Duvan", area: "produccion", isActive: true, createdAt: now, updatedAt: now },
    { id: 120001, name: "Miguel angel", area: "produccion", isActive: true, createdAt: now, updatedAt: now },
  );

  store.taskCatalog.push(
    { id: 1, name: "Desdoblar forros", area: "produccion", unit: "forros", usesQuantity: true, hasVariants: false, defaultTargetQuantity: "2", defaultTargetMinutes: 22, isActive: true, sortOrder: 0, createdAt: now, updatedAt: now },
    { id: 2, name: "Embolsar espuma", area: "produccion", unit: "espumas", usesQuantity: true, hasVariants: false, defaultTargetQuantity: "55", defaultTargetMinutes: 15, isActive: true, sortOrder: 1, createdAt: now, updatedAt: now },
    { id: 3, name: "Corte 480 colchonetas", area: "produccion", unit: "caras", usesQuantity: true, hasVariants: true, defaultTargetQuantity: "40.5", defaultTargetMinutes: 90, isActive: true, sortOrder: 2, createdAt: now, updatedAt: now },
    { id: 5, name: "Extender capas refuerzos", area: "produccion", unit: "refuerzos", usesQuantity: true, hasVariants: false, defaultTargetQuantity: "80", defaultTargetMinutes: 50, isActive: true, sortOrder: 3, createdAt: now, updatedAt: now },
    { id: 6, name: "Embolsar colchoneta", area: "produccion", unit: "colchonetas", usesQuantity: true, hasVariants: false, defaultTargetQuantity: "150", defaultTargetMinutes: 45, isActive: true, sortOrder: 4, createdAt: now, updatedAt: now },
    { id: 7, name: "Empacar colchonetas", area: "produccion", unit: "colchonetas", usesQuantity: true, hasVariants: false, defaultTargetQuantity: "100", defaultTargetMinutes: 60, isActive: true, sortOrder: 5, createdAt: now, updatedAt: now },
    { id: 8, name: "Recepción mercancia", area: "produccion", unit: "recepciones", usesQuantity: true, hasVariants: false, defaultTargetQuantity: null, defaultTargetMinutes: 60, isActive: true, sortOrder: 6, createdAt: now, updatedAt: now },
    { id: 9, name: "Confeccionar colchonetas", area: "produccion", unit: "colchonetas", usesQuantity: true, hasVariants: false, defaultTargetQuantity: "3", defaultTargetMinutes: 15, isActive: true, sortOrder: 7, createdAt: now, updatedAt: now },
    { id: 11, name: "Contar forros", area: "produccion", unit: "forros", usesQuantity: true, hasVariants: false, defaultTargetQuantity: "40", defaultTargetMinutes: 3, isActive: true, sortOrder: 8, createdAt: now, updatedAt: now },
    { id: 30001, name: "Meter espuma en forro", area: "produccion", unit: "unidades", usesQuantity: true, hasVariants: false, defaultTargetQuantity: "100", defaultTargetMinutes: 60, isActive: true, sortOrder: 9, createdAt: now, updatedAt: now },
    { id: 60001, name: "Cortar espuma", area: "produccion", unit: "unidades", usesQuantity: true, hasVariants: false, defaultTargetQuantity: "160", defaultTargetMinutes: 80, isActive: true, sortOrder: 10, createdAt: now, updatedAt: now },
    { id: 90001, name: "Envinipelar paquetes x 10 colchonetas(licitacion)", area: "produccion", unit: "unidades", usesQuantity: true, hasVariants: false, defaultTargetQuantity: "330", defaultTargetMinutes: 180, isActive: true, sortOrder: 11, createdAt: now, updatedAt: now },
    { id: 120001, name: "Cargue de camión", area: "produccion", unit: "600", usesQuantity: false, hasVariants: false, defaultTargetQuantity: null, defaultTargetMinutes: 30, isActive: true, sortOrder: 12, createdAt: now, updatedAt: now },
    { id: 150001, name: "auditoría de petos", area: "produccion", unit: "unidades", usesQuantity: true, hasVariants: false, defaultTargetQuantity: "1200", defaultTargetMinutes: 90, isActive: true, sortOrder: 13, createdAt: now, updatedAt: now },
    { id: 180001, name: "Auditoría  y empaque de petos", area: "produccion", unit: "unidades", usesQuantity: true, hasVariants: false, defaultTargetQuantity: "200", defaultTargetMinutes: 10, isActive: true, sortOrder: 14, createdAt: now, updatedAt: now },
    { id: 210001, name: "Alistar pedidos", area: "produccion", unit: "unidades", usesQuantity: true, hasVariants: false, defaultTargetQuantity: "10", defaultTargetMinutes: 1, isActive: true, sortOrder: 15, createdAt: now, updatedAt: now },
    { id: 240001, name: "Embalaje de colchonetas con el plástico", area: "produccion", unit: "unidades2", usesQuantity: true, hasVariants: false, defaultTargetQuantity: "1", defaultTargetMinutes: 35, isActive: true, sortOrder: 16, createdAt: now, updatedAt: now },
    { id: 270001, name: "Contar caras", area: "produccion", unit: "unidades", usesQuantity: true, hasVariants: false, defaultTargetQuantity: null, defaultTargetMinutes: 25, isActive: true, sortOrder: 17, createdAt: now, updatedAt: now },
    { id: 300001, name: "Pegar guías", area: "produccion", unit: "unidades", usesQuantity: true, hasVariants: false, defaultTargetQuantity: "10", defaultTargetMinutes: 14, isActive: true, sortOrder: 18, createdAt: now, updatedAt: now },
    { id: 330001, name: "Envipinelar pacas de colchonetas", area: "produccion", unit: "unidades", usesQuantity: true, hasVariants: false, defaultTargetQuantity: "2", defaultTargetMinutes: 16, isActive: true, sortOrder: 19, createdAt: now, updatedAt: now },
    { id: 390001, name: "Auditar y empacar tulas", area: "produccion", unit: "unidades", usesQuantity: true, hasVariants: false, defaultTargetQuantity: "1", defaultTargetMinutes: 90, isActive: true, sortOrder: 20, createdAt: now, updatedAt: now },
    { id: 420001, name: "Cargar camión", area: "produccion", unit: "unidades", usesQuantity: true, hasVariants: false, defaultTargetQuantity: null, defaultTargetMinutes: 60, isActive: true, sortOrder: 21, createdAt: now, updatedAt: now },
    { id: 510001, name: "Separar corte para confeccionista", area: "produccion", unit: "unidades", usesQuantity: true, hasVariants: false, defaultTargetQuantity: "1", defaultTargetMinutes: 5, isActive: true, sortOrder: 22, createdAt: now, updatedAt: now },
    { id: 540001, name: "Hacer aseo", area: "produccion", unit: "unidades", usesQuantity: true, hasVariants: false, defaultTargetQuantity: "1", defaultTargetMinutes: 30, isActive: true, sortOrder: 23, createdAt: now, updatedAt: now },
    { id: 570001, name: "Organizar producción para confeccionistas internos", area: "produccion", unit: "PERSONAS", usesQuantity: true, hasVariants: false, defaultTargetQuantity: "2", defaultTargetMinutes: 10, isActive: true, sortOrder: 24, createdAt: now, updatedAt: now },
    { id: 630001, name: "Marcación piezas de arnés", area: "produccion", unit: "unidades", usesQuantity: true, hasVariants: false, defaultTargetQuantity: "6", defaultTargetMinutes: 45, isActive: true, sortOrder: 25, createdAt: now, updatedAt: now },
    { id: 660001, name: "Apertura huecos arnes", area: "produccion", unit: "unidades", usesQuantity: true, hasVariants: false, defaultTargetQuantity: "2", defaultTargetMinutes: 1, isActive: true, sortOrder: 26, createdAt: now, updatedAt: now },
    { id: 900001, name: "Poner remaches al arnes", area: "produccion", unit: "unidades", usesQuantity: true, hasVariants: false, defaultTargetQuantity: "110", defaultTargetMinutes: 180, isActive: true, sortOrder: 27, createdAt: now, updatedAt: now },
    { id: 930001, name: "Entrega paquetes a transportadora q", area: "produccion", unit: "unidades", usesQuantity: true, hasVariants: false, defaultTargetQuantity: null, defaultTargetMinutes: null, isActive: true, sortOrder: 28, createdAt: now, updatedAt: now },
  );

  store.taskVariants.push(
    { id: 3, taskCatalogId: 3, name: "Alaskan", isActive: true, createdAt: now, updatedAt: now },
  );

  store.dailyTasks.push(
    { id: 1, workDate: 1788454800000, employeeId: 10, area: "ventas", taskCatalogId: 6, variantId: null, status: "completada", targetQuantity: "200.00", targetDurationMinutes: null, completedQuantity: null, unit: "colchonetas", startAt: 1788471720000, endAt: 1788475320000, notes: null, createdByUserId: null, createdAt: "2026-09-03T21:41:29.000Z", updatedAt: "2026-09-03T21:42:51.000Z" },
    { id: 30001, workDate: 1788454800000, employeeId: 1, area: "produccion", taskCatalogId: 11, variantId: null, status: "completada", targetQuantity: "200.00", targetDurationMinutes: null, completedQuantity: "200.00", unit: "forros", startAt: 1788472260000, endAt: 1788475920000, notes: null, createdByUserId: null, createdAt: "2026-09-03T21:53:00.000Z", updatedAt: "2026-09-03T21:53:00.000Z" },
    { id: 60001, workDate: 1788541200000, employeeId: 4, area: "produccion", taskCatalogId: 5, variantId: null, status: "completada", targetQuantity: "80.00", targetDurationMinutes: 60, completedQuantity: "80.00", unit: "refuerzos", startAt: 1788523800000, endAt: 1788529680000, notes: null, createdByUserId: null, createdAt: "2026-09-04T13:53:16.000Z", updatedAt: "2026-09-04T21:46:58.000Z" },
    { id: 90001, workDate: 1788541200000, employeeId: 30001, area: "produccion", taskCatalogId: 7, variantId: null, status: "completada", targetQuantity: "100.00", targetDurationMinutes: 60, completedQuantity: "420.00", unit: "colchonetas", startAt: 1788526800000, endAt: 1788537780000, notes: "Se entregaron en total 740\n320 del día de ayer y 420 del día de hoy en el tiempo establecido", createdByUserId: null, createdAt: "2026-09-04T16:58:27.000Z", updatedAt: "2026-09-04T22:38:06.000Z" },
    { id: 120001, workDate: 1788541200000, employeeId: 30001, area: "produccion", taskCatalogId: 1, variantId: null, status: "completada", targetQuantity: "80.00", targetDurationMinutes: 60, completedQuantity: "200.00", unit: "forros", startAt: 1788528660000, endAt: 1788540660000, notes: "Duvan realiza el desdoble de 200 forros", createdByUserId: null, createdAt: "2026-09-04T17:00:44.000Z", updatedAt: "2026-09-04T22:21:34.000Z" },
    { id: 150001, workDate: 1788541200000, employeeId: 2, area: "produccion", taskCatalogId: 2, variantId: null, status: "completada", targetQuantity: "100.00", targetDurationMinutes: null, completedQuantity: "100.00", unit: "espumas", startAt: 1788543000000, endAt: 1788546600000, notes: "Se cortaron 100 y se embolsaron", createdByUserId: null, createdAt: "2026-09-04T18:39:44.000Z", updatedAt: "2026-09-04T18:39:44.000Z" },
    { id: 180001, workDate: 1788541200000, employeeId: 4, area: "produccion", taskCatalogId: 7, variantId: null, status: "completada", targetQuantity: "100.00", targetDurationMinutes: 60, completedQuantity: "65.00", unit: "colchonetas", startAt: 1788545700000, endAt: 1788548400000, notes: null, createdByUserId: null, createdAt: "2026-09-04T21:36:38.000Z", updatedAt: "2026-09-04T22:20:43.000Z" },
    { id: 210001, workDate: 1788800400000, employeeId: 1, area: "produccion", taskCatalogId: 90001, variantId: null, status: "completada", targetQuantity: "330.00", targetDurationMinutes: 180, completedQuantity: "330.00", unit: "unidades", startAt: 1788789600000, endAt: 1788800460000, notes: null, createdByUserId: null, createdAt: "2026-09-07T17:22:40.000Z", updatedAt: "2026-09-07T17:22:40.000Z" },
    { id: 390001, workDate: 1788800400000, employeeId: 3, area: "produccion", taskCatalogId: 150001, variantId: null, status: "completada", targetQuantity: "1200.00", targetDurationMinutes: 90, completedQuantity: "1200.00", unit: "unidades", startAt: 1788613500000, endAt: 1788618840000, notes: null, createdByUserId: null, createdAt: "2026-09-07T17:33:52.000Z", updatedAt: "2026-09-07T17:33:52.000Z" },
    { id: 390002, workDate: 1788627600000, employeeId: 3, area: "produccion", taskCatalogId: 180001, variantId: null, status: "completada", targetQuantity: "600.00", targetDurationMinutes: 60, completedQuantity: "600.00", unit: "unidades", startAt: 1788618960000, endAt: 1788797040000, notes: null, createdByUserId: null, createdAt: "2026-09-07T17:35:10.000Z", updatedAt: "2026-09-07T17:35:10.000Z" },
    { id: 420001, workDate: 1788800400000, employeeId: 5, area: "produccion", taskCatalogId: 1, variantId: null, status: "completada", targetQuantity: "80.00", targetDurationMinutes: 60, completedQuantity: "60.00", unit: "forros", startAt: 1788801300000, endAt: 1788805140000, notes: null, createdByUserId: null, createdAt: "2026-09-07T21:41:56.000Z", updatedAt: "2026-09-07T21:41:56.000Z" },
    { id: 450001, workDate: 1788800400000, employeeId: 1, area: "produccion", taskCatalogId: 11, variantId: null, status: "completada", targetQuantity: "545.00", targetDurationMinutes: null, completedQuantity: "545.00", unit: "forros", startAt: 1788802920000, endAt: 1788817380000, notes: "Se cuentan a medida que se saca espacio para tener claridad de cada uno \nSe reporta en cada chat la cantidad exacta que se conto en forros llegados de los confeccionistas", createdByUserId: null, createdAt: "2026-09-07T21:43:36.000Z", updatedAt: "2026-09-07T21:43:36.000Z" },
    { id: 480001, workDate: 1788800400000, employeeId: 2, area: "produccion", taskCatalogId: 60001, variantId: null, status: "completada", targetQuantity: "100.00", targetDurationMinutes: 120, completedQuantity: "100.00", unit: "unidades", startAt: 1788806940000, endAt: 1788813000000, notes: null, createdByUserId: null, createdAt: "2026-09-07T21:45:27.000Z", updatedAt: "2026-09-07T21:45:27.000Z" },
    { id: 510001, workDate: 1788886800000, employeeId: 4, area: "produccion", taskCatalogId: 3, variantId: 3, status: "completada", targetQuantity: "80.00", targetDurationMinutes: 90, completedQuantity: "80.00", unit: "caras", startAt: 1788870360000, endAt: 1788879600000, notes: null, createdByUserId: null, createdAt: "2026-09-08T12:27:06.000Z", updatedAt: "2026-09-08T18:21:03.000Z" },
    { id: 540001, workDate: 1788800400000, employeeId: 5, area: "produccion", taskCatalogId: 1, variantId: null, status: "completada", targetQuantity: "30.00", targetDurationMinutes: 20, completedQuantity: "30.00", unit: "forros", startAt: 1788881400000, endAt: 1788925800000, notes: "Desdoblar forros, empaque de espuma y vinipel en paquete", createdByUserId: null, createdAt: "2026-09-08T15:58:26.000Z", updatedAt: "2026-09-08T15:58:26.000Z" },
    { id: 570001, workDate: 1788886800000, employeeId: 4, area: "produccion", taskCatalogId: 1, variantId: null, status: "completada", targetQuantity: "67.00", targetDurationMinutes: 60, completedQuantity: "67.00", unit: "forros", startAt: 1788884100000, endAt: 1788887700000, notes: null, createdByUserId: null, createdAt: "2026-09-08T17:41:28.000Z", updatedAt: "2026-09-08T17:41:28.000Z" },
    { id: 600001, workDate: 1788886800000, employeeId: 5, area: "produccion", taskCatalogId: 1, variantId: null, status: "completada", targetQuantity: "68.00", targetDurationMinutes: 60, completedQuantity: "68.00", unit: "forros", startAt: 1788884100000, endAt: 1788887700000, notes: null, createdByUserId: null, createdAt: "2026-09-08T17:42:46.000Z", updatedAt: "2026-09-08T17:42:46.000Z" },
    { id: 630001, workDate: 1788886800000, employeeId: 2, area: "produccion", taskCatalogId: 6, variantId: null, status: "completada", targetQuantity: "100.00", targetDurationMinutes: 60, completedQuantity: "50.00", unit: "colchonetas", startAt: 1788896880000, endAt: 1788899400000, notes: null, createdByUserId: null, createdAt: "2026-09-08T19:48:10.000Z", updatedAt: "2026-09-08T21:23:04.000Z" },
    { id: 660001, workDate: 1788886800000, employeeId: 3, area: "produccion", taskCatalogId: 60001, variantId: null, status: "completada", targetQuantity: "160.00", targetDurationMinutes: 60, completedQuantity: "120.00", unit: "unidades", startAt: 1788895740000, endAt: 1788899400000, notes: null, createdByUserId: null, createdAt: "2026-09-08T20:30:25.000Z", updatedAt: "2026-09-08T20:30:25.000Z" },
    { id: 690001, workDate: 1788886800000, employeeId: 1, area: "produccion", taskCatalogId: 120001, variantId: null, status: "completada", targetQuantity: null, targetDurationMinutes: 30, completedQuantity: null, unit: "600", startAt: 1788874320000, endAt: 1788876420000, notes: "Meter pedidos al carry del centro", createdByUserId: null, createdAt: "2026-09-08T21:30:50.000Z", updatedAt: "2026-09-08T21:30:50.000Z" },
    { id: 720001, workDate: 1788886800000, employeeId: 1, area: "produccion", taskCatalogId: 240001, variantId: null, status: "completada", targetQuantity: null, targetDurationMinutes: 120, completedQuantity: "7.00", unit: "unidades2", startAt: 1788881460000, endAt: 1788888720000, notes: "El embalaje de pedido lycan", createdByUserId: null, createdAt: "2026-09-08T21:33:12.000Z", updatedAt: "2026-09-08T21:33:12.000Z" },
    { id: 750001, workDate: 1788886800000, employeeId: 1, area: "produccion", taskCatalogId: 8, variantId: null, status: "completada", targetQuantity: null, targetDurationMinutes: 60, completedQuantity: "40.00", unit: "recepciones", startAt: 1788898980000, endAt: 1788903180000, notes: null, createdByUserId: null, createdAt: "2026-09-08T21:34:03.000Z", updatedAt: "2026-09-08T21:34:03.000Z" },
    { id: 780001, workDate: 1788886800000, employeeId: 4, area: "produccion", taskCatalogId: 60001, variantId: null, status: "completada", targetQuantity: "160.00", targetDurationMinutes: 30, completedQuantity: "32.00", unit: "Unidad", startAt: 1788891000000, endAt: 1788892680000, notes: null, createdByUserId: null, createdAt: "2026-09-08T21:39:31.000Z", updatedAt: "2026-09-08T21:39:31.000Z" },
    { id: 810001, workDate: 1788886800000, employeeId: 4, area: "produccion", taskCatalogId: 2, variantId: null, status: "completada", targetQuantity: null, targetDurationMinutes: 20, completedQuantity: "35.00", unit: "espumas", startAt: 1788893400000, endAt: 1788894600000, notes: null, createdByUserId: null, createdAt: "2026-09-08T21:41:41.000Z", updatedAt: "2026-09-08T21:41:41.000Z" },
    { id: 840001, workDate: 1788886800000, employeeId: 4, area: "produccion", taskCatalogId: 7, variantId: null, status: "completada", targetQuantity: null, targetDurationMinutes: 60, completedQuantity: "55.00", unit: "colchonetas", startAt: 1788894900000, endAt: 1788903000000, notes: "Tener en cuenta la hora del almuerzo", createdByUserId: null, createdAt: "2026-09-08T21:44:57.000Z", updatedAt: "2026-09-08T21:44:57.000Z" },
    { id: 870001, workDate: 1788973200000, employeeId: 1, area: "produccion", taskCatalogId: 270001, variantId: null, status: "completada", targetQuantity: null, targetDurationMinutes: 25, completedQuantity: "180.00", unit: "unidades", startAt: 1788961200000, endAt: 1788962400000, notes: null, createdByUserId: null, createdAt: "2026-09-09T21:54:47.000Z", updatedAt: "2026-09-09T21:54:47.000Z" },
    { id: 900001, workDate: 1788973200000, employeeId: 90001, area: "produccion", taskCatalogId: 240001, variantId: null, status: "completada", targetQuantity: null, targetDurationMinutes: 50, completedQuantity: "40.00", unit: "unidades2", startAt: 1788965100000, endAt: 1788968160000, notes: null, createdByUserId: null, createdAt: "2026-09-09T21:55:59.000Z", updatedAt: "2026-09-09T21:55:59.000Z" },
    { id: 930001, workDate: 1788973200000, employeeId: 1, area: "produccion", taskCatalogId: 300001, variantId: null, status: "completada", targetQuantity: null, targetDurationMinutes: 23, completedQuantity: "18.00", unit: "unidades", startAt: 1788965760000, endAt: 1788967020000, notes: null, createdByUserId: null, createdAt: "2026-09-09T21:57:08.000Z", updatedAt: "2026-09-09T21:57:08.000Z" },
    { id: 930002, workDate: 1788973200000, employeeId: 1, area: "produccion", taskCatalogId: 330001, variantId: null, status: "completada", targetQuantity: "2.00", targetDurationMinutes: null, completedQuantity: "12.00", unit: "unidades", startAt: 1788966300000, endAt: 1788984300000, notes: "Fueron varios paquetes durante el transcurso del día", createdByUserId: null, createdAt: "2026-09-09T21:58:20.000Z", updatedAt: "2026-09-09T22:06:02.000Z" },
    { id: 960001, workDate: 1788973200000, employeeId: 1, area: "produccion", taskCatalogId: 1, variantId: null, status: "completada", targetQuantity: null, targetDurationMinutes: 35, completedQuantity: "40.00", unit: "forros", startAt: 1788980700000, endAt: 1788982800000, notes: null, createdByUserId: null, createdAt: "2026-09-09T21:59:16.000Z", updatedAt: "2026-09-09T22:05:38.000Z" },
    { id: 990001, workDate: 1788973200000, employeeId: 5, area: "produccion", taskCatalogId: 2, variantId: null, status: "completada", targetQuantity: null, targetDurationMinutes: 10, completedQuantity: "12.00", unit: "espumas", startAt: 1788961200000, endAt: 1788962400000, notes: null, createdByUserId: null, createdAt: "2026-09-09T22:01:03.000Z", updatedAt: "2026-09-09T22:01:03.000Z" },
    { id: 1020001, workDate: 1788973200000, employeeId: 5, area: "produccion", taskCatalogId: 11, variantId: null, status: "completada", targetQuantity: null, targetDurationMinutes: 10, completedQuantity: "100.00", unit: "forros", startAt: 1788962760000, endAt: 1788963360000, notes: null, createdByUserId: null, createdAt: "2026-09-09T22:02:00.000Z", updatedAt: "2026-09-09T22:02:00.000Z" },
    { id: 1050001, workDate: 1788973200000, employeeId: 5, area: "produccion", taskCatalogId: 30001, variantId: null, status: "completada", targetQuantity: null, targetDurationMinutes: 75, completedQuantity: "40.00", unit: "unidades", startAt: 1788966360000, endAt: 1788977100000, notes: "Se para para unos minutos para  cortar más espuma", createdByUserId: null, createdAt: "2026-09-09T22:02:56.000Z", updatedAt: "2026-09-09T22:07:09.000Z" },
    { id: 1080001, workDate: 1788973200000, employeeId: 5, area: "produccion", taskCatalogId: 6, variantId: null, status: "completada", targetQuantity: null, targetDurationMinutes: 65, completedQuantity: "100.00", unit: "colchonetas", startAt: 1788981600000, endAt: 1788984900000, notes: null, createdByUserId: null, createdAt: "2026-09-09T22:03:46.000Z", updatedAt: "2026-09-09T22:03:46.000Z" },
    { id: 1110001, workDate: 1788973200000, employeeId: 5, area: "produccion", taskCatalogId: 30001, variantId: null, status: "completada", targetQuantity: null, targetDurationMinutes: 35, completedQuantity: "20.00", unit: "unidades", startAt: 1788988500000, endAt: 1788990000000, notes: null, createdByUserId: null, createdAt: "2026-09-09T22:04:35.000Z", updatedAt: "2026-09-09T22:04:35.000Z" },
    { id: 1140001, workDate: 1788973200000, employeeId: 1, area: "produccion", taskCatalogId: 5, variantId: null, status: "completada", targetQuantity: "80.00", targetDurationMinutes: 40, completedQuantity: "1.20", unit: "refuerzos", startAt: 1788965280000, endAt: 1788967800000, notes: null, createdByUserId: null, createdAt: "2026-09-10T15:04:14.000Z", updatedAt: "2026-09-10T15:04:14.000Z" },
    { id: 1170001, workDate: 1788973200000, employeeId: 2, area: "produccion", taskCatalogId: 60001, variantId: null, status: "completada", targetQuantity: "160.00", targetDurationMinutes: 90, completedQuantity: "100.00", unit: "unidades", startAt: 1788981000000, endAt: 1789072020000, notes: null, createdByUserId: null, createdAt: "2026-09-10T15:10:38.000Z", updatedAt: "2026-09-10T15:10:38.000Z" },
    { id: 1200001, workDate: 1788973200000, employeeId: 2, area: "produccion", taskCatalogId: 2, variantId: null, status: "completada", targetQuantity: null, targetDurationMinutes: 20, completedQuantity: null, unit: "espumas", startAt: 1788981060000, endAt: 1789068720000, notes: null, createdByUserId: null, createdAt: "2026-09-10T15:11:34.000Z", updatedAt: "2026-09-10T15:11:34.000Z" },
    { id: 1230001, workDate: 1789059600000, employeeId: 30001, area: "produccion", taskCatalogId: 240001, variantId: null, status: "completada", targetQuantity: null, targetDurationMinutes: null, completedQuantity: "122.00", unit: "unidades2", startAt: 1789047000000, endAt: 1789051200000, notes: "El equipo descarga yumbolones del camión y se organiza en la bodega", createdByUserId: null, createdAt: "2026-09-10T21:47:38.000Z", updatedAt: "2026-09-10T21:47:38.000Z" },
    { id: 1260001, workDate: 1789059600000, employeeId: 30001, area: "produccion", taskCatalogId: 390001, variantId: null, status: "completada", targetQuantity: "233.00", targetDurationMinutes: 90, completedQuantity: "233.00", unit: "unidades", startAt: 1789052400000, endAt: 1789057800000, notes: "Se organizan las tulas x25 por paquete y se revisan que estén bien confeccionadas", createdByUserId: null, createdAt: "2026-09-10T21:50:19.000Z", updatedAt: "2026-09-10T21:50:19.000Z" },
    { id: 1290001, workDate: 1789059600000, employeeId: 2, area: "produccion", taskCatalogId: 300001, variantId: null, status: "completada", targetQuantity: null, targetDurationMinutes: 5, completedQuantity: "10.00", unit: "unidades", startAt: 1789058700000, endAt: 1789059360000, notes: null, createdByUserId: null, createdAt: "2026-09-10T21:52:01.000Z", updatedAt: "2026-09-10T21:52:01.000Z" },
    { id: 1320001, workDate: 1789059600000, employeeId: 2, area: "produccion", taskCatalogId: 30001, variantId: null, status: "completada", targetQuantity: null, targetDurationMinutes: 45, completedQuantity: "35.00", unit: "unidades", startAt: 1789072680000, endAt: 1789075800000, notes: null, createdByUserId: null, createdAt: "2026-09-10T21:53:32.000Z", updatedAt: "2026-09-10T21:53:32.000Z" },
    { id: 1320002, workDate: 1789059600000, employeeId: 1, area: "produccion", taskCatalogId: 240001, variantId: null, status: "completada", targetQuantity: null, targetDurationMinutes: 20, completedQuantity: "4.00", unit: "unidades2", startAt: 1789055280000, endAt: 1789056480000, notes: null, createdByUserId: null, createdAt: "2026-09-10T21:54:07.000Z", updatedAt: "2026-09-10T21:54:07.000Z" },
    { id: 1350001, workDate: 1789059600000, employeeId: 2, area: "produccion", taskCatalogId: 6, variantId: null, status: "completada", targetQuantity: null, targetDurationMinutes: 30, completedQuantity: "45.00", unit: "colchonetas", startAt: 1789075380000, endAt: 1789077300000, notes: null, createdByUserId: null, createdAt: "2026-09-10T21:55:06.000Z", updatedAt: "2026-09-10T21:55:06.000Z" },
    { id: 1380001, workDate: 1789059600000, employeeId: 5, area: "produccion", taskCatalogId: 60001, variantId: null, status: "completada", targetQuantity: "100.00", targetDurationMinutes: 40, completedQuantity: "72.00", unit: "unidades", startAt: 1789063500000, endAt: 1789065960000, notes: null, createdByUserId: null, createdAt: "2026-09-10T21:56:18.000Z", updatedAt: "2026-09-10T21:56:18.000Z" },
    { id: 1410001, workDate: 1789059600000, employeeId: 1, area: "produccion", taskCatalogId: 1, variantId: null, status: "completada", targetQuantity: null, targetDurationMinutes: 65, completedQuantity: "55.00", unit: "forros", startAt: 1789063200000, endAt: 1789067100000, notes: null, createdByUserId: null, createdAt: "2026-09-10T21:57:13.000Z", updatedAt: "2026-09-10T21:57:13.000Z" },
    { id: 1440001, workDate: 1789059600000, employeeId: 2, area: "produccion", taskCatalogId: 210001, variantId: null, status: "completada", targetQuantity: null, targetDurationMinutes: 60, completedQuantity: null, unit: "unidades", startAt: 1789059000000, endAt: 1789062840000, notes: "Se realiza un pedido largo", createdByUserId: null, createdAt: "2026-09-10T21:58:34.000Z", updatedAt: "2026-09-10T21:58:34.000Z" },
    { id: 1470001, workDate: 1789146000000, employeeId: 9, area: "ventas", taskCatalogId: 30001, variantId: null, status: "completada", targetQuantity: "100.00", targetDurationMinutes: 60, completedQuantity: "32.00", unit: "unidades", startAt: 1789141740000, endAt: 1789143600000, notes: "Licitación", createdByUserId: null, createdAt: "2026-09-11T15:49:47.000Z", updatedAt: "2026-09-14T13:23:24.000Z" },
    { id: 1470002, workDate: 1789146000000, employeeId: 1, area: "produccion", taskCatalogId: 330001, variantId: null, status: "completada", targetQuantity: null, targetDurationMinutes: 16, completedQuantity: null, unit: "unidades", startAt: 1789141740000, endAt: 1789147380000, notes: "Envipinelar colchonetas y se subían al carro las pacas. De 10 por lapsus para agilizar", createdByUserId: null, createdAt: "2026-09-11T15:49:59.000Z", updatedAt: "2026-09-11T17:24:08.000Z" },
    { id: 1470003, workDate: 1789146000000, employeeId: 2, area: "produccion", taskCatalogId: 30001, variantId: null, status: "completada", targetQuantity: null, targetDurationMinutes: 75, completedQuantity: "120.00", unit: "unidades", startAt: 1789141740000, endAt: 1789146300000, notes: null, createdByUserId: null, createdAt: "2026-09-11T15:50:53.000Z", updatedAt: "2026-09-11T17:09:04.000Z" },
    { id: 1470004, workDate: 1789146000000, employeeId: 5, area: "produccion", taskCatalogId: 30001, variantId: null, status: "completada", targetQuantity: null, targetDurationMinutes: null, completedQuantity: "50.00", unit: "unidades", startAt: 1789141800000, endAt: 1789143600000, notes: null, createdByUserId: null, createdAt: "2026-09-11T15:51:10.000Z", updatedAt: "2026-09-11T17:27:56.000Z" },
    { id: 1500001, workDate: 1789146000000, employeeId: 2, area: "produccion", taskCatalogId: 330001, variantId: null, status: "completada", targetQuantity: null, targetDurationMinutes: 16, completedQuantity: "7.00", unit: "unidades", startAt: 1789146540000, endAt: 1789147500000, notes: null, createdByUserId: null, createdAt: "2026-09-11T17:09:26.000Z", updatedAt: "2026-09-11T17:25:27.000Z" },
    { id: 1530001, workDate: 1789146000000, employeeId: 1, area: "produccion", taskCatalogId: 180001, variantId: null, status: "completada", targetQuantity: null, targetDurationMinutes: 10, completedQuantity: "430.00", unit: "unidades", startAt: 1789133400000, endAt: 1789137000000, notes: null, createdByUserId: null, createdAt: "2026-09-11T17:26:57.000Z", updatedAt: "2026-09-11T17:27:18.000Z" },
    { id: 1560001, workDate: 1789146000000, employeeId: 5, area: "produccion", taskCatalogId: 420001, variantId: null, status: "completada", targetQuantity: null, targetDurationMinutes: 60, completedQuantity: "680.00", unit: "unidades", startAt: 1789144200000, endAt: 1789147800000, notes: null, createdByUserId: null, createdAt: "2026-09-11T17:30:56.000Z", updatedAt: "2026-09-11T17:30:56.000Z" },
    { id: 1560002, workDate: 1789146000000, employeeId: 5, area: "produccion", taskCatalogId: 180001, variantId: null, status: "completada", targetQuantity: null, targetDurationMinutes: 60, completedQuantity: "430.00", unit: "unidades", startAt: 1789133460000, endAt: 1789137120000, notes: null, createdByUserId: null, createdAt: "2026-09-11T17:31:37.000Z", updatedAt: "2026-09-11T17:32:33.000Z" },
    { id: 1590001, workDate: 1789146000000, employeeId: 5, area: "produccion", taskCatalogId: 30001, variantId: null, status: "completada", targetQuantity: null, targetDurationMinutes: 55, completedQuantity: "55.00", unit: "unidades", startAt: 1789147980000, endAt: 1789152000000, notes: "Colchonetas Nicolás", createdByUserId: null, createdAt: "2026-09-11T17:33:27.000Z", updatedAt: "2026-09-11T18:43:50.000Z" },
    { id: 1620001, workDate: 1789146000000, employeeId: 2, area: "produccion", taskCatalogId: 30001, variantId: null, status: "completada", targetQuantity: null, targetDurationMinutes: 14, completedQuantity: "24.00", unit: "unidades", startAt: 1789149180000, endAt: 1789150020000, notes: null, createdByUserId: null, createdAt: "2026-09-11T17:53:59.000Z", updatedAt: "2026-09-11T18:10:09.000Z" },
    { id: 1650001, workDate: 1789146000000, employeeId: 2, area: "produccion", taskCatalogId: 60001, variantId: null, status: "completada", targetQuantity: null, targetDurationMinutes: 91, completedQuantity: "80.00", unit: "unidades", startAt: 1789134360000, endAt: 1789139820000, notes: "Cortadas y embolsadas", createdByUserId: null, createdAt: "2026-09-11T18:12:26.000Z", updatedAt: "2026-09-11T18:29:07.000Z" },
    { id: 1680001, workDate: 1789146000000, employeeId: 2, area: "produccion", taskCatalogId: 6, variantId: null, status: "completada", targetQuantity: null, targetDurationMinutes: 9, completedQuantity: "24.00", unit: "colchonetas", startAt: 1789150560000, endAt: 1789151100000, notes: null, createdByUserId: null, createdAt: "2026-09-11T18:16:29.000Z", updatedAt: "2026-09-11T18:25:54.000Z" },
    { id: 1710001, workDate: 1789146000000, employeeId: 2, area: "produccion", taskCatalogId: 330001, variantId: null, status: "completada", targetQuantity: null, targetDurationMinutes: 3, completedQuantity: "2.00", unit: "unidades", startAt: 1789151520000, endAt: 1789151700000, notes: null, createdByUserId: null, createdAt: "2026-09-11T18:32:51.000Z", updatedAt: "2026-09-11T18:36:05.000Z" },
    { id: 1740001, workDate: 1789146000000, employeeId: 5, area: "produccion", taskCatalogId: 1, variantId: null, status: "completada", targetQuantity: null, targetDurationMinutes: 25, completedQuantity: "33.00", unit: "forros", startAt: 1789152300000, endAt: 1789153800000, notes: null, createdByUserId: null, createdAt: "2026-09-11T18:45:40.000Z", updatedAt: "2026-09-11T20:17:30.000Z" },
    { id: 1770001, workDate: 1789146000000, employeeId: 4, area: "produccion", taskCatalogId: 300001, variantId: null, status: "completada", targetQuantity: "19.00", targetDurationMinutes: 75, completedQuantity: "19.00", unit: "unidades", startAt: 1789134300000, endAt: 1789138800000, notes: null, createdByUserId: null, createdAt: "2026-09-11T18:51:34.000Z", updatedAt: "2026-09-11T18:51:34.000Z" },
    { id: 1800001, workDate: 1789146000000, employeeId: 5, area: "produccion", taskCatalogId: 1, variantId: null, status: "en_proceso", targetQuantity: null, targetDurationMinutes: null, completedQuantity: null, unit: "forros", startAt: 1789157940000, endAt: null, notes: null, createdByUserId: null, createdAt: "2026-09-11T20:19:20.000Z", updatedAt: "2026-09-14T13:31:13.000Z" },
    { id: 1830001, workDate: 1789146000000, employeeId: 2, area: "produccion", taskCatalogId: 330001, variantId: null, status: "completada", targetQuantity: null, targetDurationMinutes: 21, completedQuantity: "6.00", unit: "unidades", startAt: 1789157160000, endAt: 1789158420000, notes: null, createdByUserId: null, createdAt: "2026-09-11T21:53:23.000Z", updatedAt: "2026-09-11T21:54:36.000Z" },
    { id: 1860001, workDate: 1789146000000, employeeId: 2, area: "produccion", taskCatalogId: 240001, variantId: null, status: "completada", targetQuantity: null, targetDurationMinutes: 57, completedQuantity: "6.00", unit: "unidades", startAt: 1789158840000, endAt: 1789162260000, notes: null, createdByUserId: null, createdAt: "2026-09-11T21:55:15.000Z", updatedAt: "2026-09-11T21:56:41.000Z" },
    { id: 1890001, workDate: 1789146000000, employeeId: 4, area: "produccion", taskCatalogId: 180001, variantId: null, status: "completada", targetQuantity: "200.00", targetDurationMinutes: 10, completedQuantity: "820.00", unit: "unidades", startAt: 1789139700000, endAt: 1789163400000, notes: "Teniendo en cuenta hora de almuerzo", createdByUserId: null, createdAt: "2026-09-11T22:00:20.000Z", updatedAt: "2026-09-14T13:17:37.000Z" },
    { id: 1920001, workDate: 1789232400000, employeeId: 2, area: "produccion", taskCatalogId: 8, variantId: null, status: "completada", targetQuantity: null, targetDurationMinutes: null, completedQuantity: null, unit: "recepciones", startAt: 1789220340000, endAt: 1789221600000, notes: null, createdByUserId: null, createdAt: "2026-09-12T14:01:22.000Z", updatedAt: "2026-09-14T14:51:26.000Z" },
    { id: 1950001, workDate: 1789232400000, employeeId: 2, area: "produccion", taskCatalogId: 510001, variantId: null, status: "completada", targetQuantity: "1.00", targetDurationMinutes: 5, completedQuantity: "1.00", unit: "unidades", startAt: 1789218660000, endAt: 1789220160000, notes: null, createdByUserId: null, createdAt: "2026-09-12T14:04:18.000Z", updatedAt: "2026-09-14T14:50:49.000Z" },
    { id: 1980001, workDate: 1789232400000, employeeId: 1, area: "produccion", taskCatalogId: 1, variantId: null, status: "completada", targetQuantity: "2.00", targetDurationMinutes: 1, completedQuantity: "120.00", unit: "forros", startAt: 1789221000000, endAt: 1789227060000, notes: "Se desdobla a medida que salen de confección", createdByUserId: null, createdAt: "2026-09-12T14:10:22.000Z", updatedAt: "2026-09-14T15:11:22.000Z" },
    { id: 2010001, workDate: 1789232400000, employeeId: 2, area: "produccion", taskCatalogId: 60001, variantId: null, status: "completada", targetQuantity: "160.00", targetDurationMinutes: 80, completedQuantity: "80.00", unit: "unidades", startAt: 1789222260000, endAt: 1789225380000, notes: "Organizar corte de hip thrust entrar al baño", createdByUserId: null, createdAt: "2026-09-12T14:11:27.000Z", updatedAt: "2026-09-14T14:49:20.000Z" },
    { id: 2040001, workDate: 1789232400000, employeeId: 2, area: "produccion", taskCatalogId: 2, variantId: null, status: "completada", targetQuantity: "10.00", targetDurationMinutes: 1, completedQuantity: "80.00", unit: "espumas", startAt: 1789225860000, endAt: 1789226880000, notes: null, createdByUserId: null, createdAt: "2026-09-12T15:11:44.000Z", updatedAt: "2026-09-14T14:48:58.000Z" },
    { id: 2070001, workDate: 1789232400000, employeeId: 1, area: "produccion", taskCatalogId: 240001, variantId: null, status: "completada", targetQuantity: "1.00", targetDurationMinutes: 4, completedQuantity: "3.00", unit: "unidades", startAt: 1789226700000, endAt: 1789227840000, notes: null, createdByUserId: null, createdAt: "2026-09-12T15:44:59.000Z", updatedAt: "2026-09-14T14:48:29.000Z" },
    { id: 2100001, workDate: 1789232400000, employeeId: 1, area: "produccion", taskCatalogId: 540001, variantId: null, status: "completada", targetQuantity: "1.00", targetDurationMinutes: 30, completedQuantity: "1.00", unit: "unidades", startAt: 1789226160000, endAt: 1789226460000, notes: "BARRI Y TRAPIE 1 ER PISO", createdByUserId: null, createdAt: "2026-09-12T15:45:40.000Z", updatedAt: "2026-09-14T15:14:00.000Z" },
    { id: 2100002, workDate: 1789232400000, employeeId: 1, area: "produccion", taskCatalogId: 570001, variantId: null, status: "completada", targetQuantity: "2.00", targetDurationMinutes: 10, completedQuantity: "2.00", unit: "unidades", startAt: 1789224000000, endAt: 1789224360000, notes: "Organizar caras de estampados y material para la confección de forros en lista de pedidos", createdByUserId: null, createdAt: "2026-09-12T15:46:52.000Z", updatedAt: "2026-09-14T15:12:54.000Z" },
    { id: 2130001, workDate: 1789232400000, employeeId: 2, area: "produccion", taskCatalogId: 540001, variantId: null, status: "completada", targetQuantity: "1.00", targetDurationMinutes: 30, completedQuantity: "1.00", unit: "unidades", startAt: 1789227120000, endAt: 1789228740000, notes: "Barrer y mover casata", createdByUserId: null, createdAt: "2026-09-12T16:19:44.000Z", updatedAt: "2026-09-14T14:46:40.000Z" },
    { id: 2130002, workDate: 1789232400000, employeeId: 2, area: "produccion", taskCatalogId: 3, variantId: null, status: "completada", targetQuantity: "1.00", targetDurationMinutes: 90, completedQuantity: "1.00", unit: "caras", startAt: 1789230000000, endAt: 1789231440000, notes: "Organizar las caras para hip thrust", createdByUserId: null, createdAt: "2026-09-12T16:20:24.000Z", updatedAt: "2026-09-14T14:45:40.000Z" },
    { id: 2160001, workDate: 1789232400000, employeeId: 4, area: "produccion", taskCatalogId: 630001, variantId: null, status: "completada", targetQuantity: "6.00", targetDurationMinutes: 1, completedQuantity: "223.00", unit: "unidades", startAt: 1789220700000, endAt: 1789232400000, notes: null, createdByUserId: null, createdAt: "2026-09-12T17:02:13.000Z", updatedAt: "2026-09-14T14:01:51.000Z" },
    { id: 2190001, workDate: 1789232400000, employeeId: 4, area: "produccion", taskCatalogId: 210001, variantId: null, status: "completada", targetQuantity: "10.00", targetDurationMinutes: 1, completedQuantity: "36.00", unit: "unidades", startAt: 1789218900000, endAt: 1789220400000, notes: null, createdByUserId: null, createdAt: "2026-09-12T17:03:52.000Z", updatedAt: "2026-09-14T14:42:27.000Z" },
    { id: 2220001, workDate: 1789232400000, employeeId: 5, area: "produccion", taskCatalogId: 660001, variantId: null, status: "completada", targetQuantity: "2.00", targetDurationMinutes: 1, completedQuantity: "101.00", unit: "unidades", startAt: 1789220700000, endAt: 1789232100000, notes: null, createdByUserId: null, createdAt: "2026-09-12T17:05:54.000Z", updatedAt: "2026-09-14T13:59:49.000Z" },
    { id: 2250001, workDate: 1789232400000, employeeId: 2, area: "produccion", taskCatalogId: 11, variantId: null, status: "completada", targetQuantity: "40.00", targetDurationMinutes: 1, completedQuantity: "144.00", unit: "forros", startAt: 1789230540000, endAt: 1789232400000, notes: null, createdByUserId: null, createdAt: "2026-09-12T17:12:30.000Z", updatedAt: "2026-09-14T15:21:52.000Z" },
    { id: 2280001, workDate: 1789405200000, employeeId: 1, area: "produccion", taskCatalogId: 30001, variantId: null, status: "completada", targetQuantity: "100.00", targetDurationMinutes: 60, completedQuantity: "10.00", unit: "unidades", startAt: 1789392240000, endAt: 1789393080000, notes: null, createdByUserId: null, createdAt: "2026-09-14T13:32:09.000Z", updatedAt: "2026-09-14T15:51:25.000Z" },
    { id: 2310001, workDate: 1789405200000, employeeId: 2, area: "produccion", taskCatalogId: 2, variantId: null, status: "en_proceso", targetQuantity: null, targetDurationMinutes: null, completedQuantity: null, unit: "espumas", startAt: 1789394820000, endAt: null, notes: null, createdByUserId: null, createdAt: "2026-09-14T14:07:52.000Z", updatedAt: "2026-09-14T15:48:58.000Z" },
    { id: 2340001, workDate: 1789405200000, employeeId: 9, area: "produccion", taskCatalogId: 240001, variantId: null, status: "completada", targetQuantity: "1.00", targetDurationMinutes: 4, completedQuantity: "3.00", unit: "unidades", startAt: 1789396800000, endAt: 1789398660000, notes: null, createdByUserId: null, createdAt: "2026-09-14T14:41:00.000Z", updatedAt: "2026-09-14T15:11:17.000Z" },
    { id: 2370001, workDate: 1789405200000, employeeId: 4, area: "produccion", taskCatalogId: 660001, variantId: null, status: "completada", targetQuantity: "2.00", targetDurationMinutes: 1, completedQuantity: "110.00", unit: "unidades", startAt: 1789392300000, endAt: 1789397100000, notes: null, createdByUserId: null, createdAt: "2026-09-14T14:46:53.000Z", updatedAt: "2026-09-14T15:47:45.000Z" },
    { id: 2400001, workDate: 1789405200000, employeeId: 120001, area: "produccion", taskCatalogId: 1, variantId: null, status: "completada", targetQuantity: "2.00", targetDurationMinutes: 1, completedQuantity: "50.00", unit: "forros", startAt: 1789398600000, endAt: 1789400520000, notes: null, createdByUserId: null, createdAt: "2026-09-14T15:42:33.000Z", updatedAt: "2026-09-14T15:42:33.000Z" },
    { id: 2430001, workDate: 1789405200000, employeeId: 5, area: "produccion", taskCatalogId: 1, variantId: null, status: "completada", targetQuantity: null, targetDurationMinutes: 35, completedQuantity: "45.00", unit: "forros", startAt: 1789398600000, endAt: 1789403580000, notes: "SE FRENO PRODUCCION POR REUNION GRUPAL", createdByUserId: null, createdAt: "2026-09-14T15:46:09.000Z", updatedAt: "2026-09-14T16:34:14.000Z" },
    { id: 2460001, workDate: 1789405200000, employeeId: 1, area: "produccion", taskCatalogId: 30001, variantId: null, status: "completada", targetQuantity: "100.00", targetDurationMinutes: 60, completedQuantity: "40.00", unit: "unidades", startAt: 1789400700000, endAt: 1789403400000, notes: null, createdByUserId: null, createdAt: "2026-09-14T15:53:15.000Z", updatedAt: "2026-09-14T17:42:34.000Z" },
    { id: 2490001, workDate: 1789405200000, employeeId: 6, area: "produccion", taskCatalogId: 9, variantId: null, status: "completada", targetQuantity: "3.00", targetDurationMinutes: 15, completedQuantity: null, unit: "colchonetas", startAt: 1789390800000, endAt: 1789412400000, notes: null, createdByUserId: null, createdAt: "2026-09-14T16:15:42.000Z", updatedAt: "2026-09-14T16:25:37.000Z" },
    { id: 2520001, workDate: 1789405200000, employeeId: 6, area: "produccion", taskCatalogId: 9, variantId: null, status: "completada", targetQuantity: "3.00", targetDurationMinutes: 15, completedQuantity: null, unit: "colchonetas", startAt: 1789416000000, endAt: 1789423200000, notes: null, createdByUserId: null, createdAt: "2026-09-14T16:19:23.000Z", updatedAt: "2026-09-14T16:26:00.000Z" },
    { id: 2550001, workDate: 1789405200000, employeeId: 7, area: "produccion", taskCatalogId: 9, variantId: null, status: "completada", targetQuantity: "3.00", targetDurationMinutes: 15, completedQuantity: "23.00", unit: "colchonetas", startAt: 1789391400000, endAt: 1789412400000, notes: null, createdByUserId: null, createdAt: "2026-09-14T16:29:18.000Z", updatedAt: "2026-09-14T18:46:07.000Z" },
    { id: 2580001, workDate: 1789405200000, employeeId: 5, area: "produccion", taskCatalogId: 30001, variantId: null, status: "completada", targetQuantity: "100.00", targetDurationMinutes: 25, completedQuantity: "30.00", unit: "unidades", startAt: 1789403700000, endAt: 1789405200000, notes: null, createdByUserId: null, createdAt: "2026-09-14T16:35:40.000Z", updatedAt: "2026-09-14T17:05:12.000Z" },
    { id: 2610001, workDate: 1789405200000, employeeId: 4, area: "produccion", taskCatalogId: 900001, variantId: null, status: "completada", targetQuantity: "1.00", targetDurationMinutes: 2, completedQuantity: "13.00", unit: "unidades", startAt: 1789398000000, endAt: 1789407180000, notes: "Teniendo en cuenta la reunión y ayudar a embobinar", createdByUserId: null, createdAt: "2026-09-14T17:39:05.000Z", updatedAt: "2026-09-14T17:39:05.000Z" },
    { id: 2640001, workDate: 1789405200000, employeeId: 1, area: "produccion", taskCatalogId: 30001, variantId: null, status: "completada", targetQuantity: "100.00", targetDurationMinutes: 60, completedQuantity: "80.00", unit: "unidades", startAt: 1789407900000, endAt: 1789416000000, notes: "1 hora de almuerzo", createdByUserId: null, createdAt: "2026-09-14T17:45:15.000Z", updatedAt: "2026-09-15T17:14:22.000Z" },
    { id: 2670001, workDate: 1789405200000, employeeId: 4, area: "produccion", taskCatalogId: 210001, variantId: null, status: "completada", targetQuantity: "10.00", targetDurationMinutes: 1, completedQuantity: "2.00", unit: "unidades", startAt: 1789407600000, endAt: 1789409640000, notes: null, createdByUserId: null, createdAt: "2026-09-14T18:15:00.000Z", updatedAt: "2026-09-14T18:15:00.000Z" },
    { id: 2700001, workDate: 1789405200000, employeeId: 1, area: "produccion", taskCatalogId: 300001, variantId: null, status: "completada", targetQuantity: "1.00", targetDurationMinutes: 1, completedQuantity: "9.00", unit: "unidades", startAt: 1789413240000, endAt: 1789414200000, notes: null, createdByUserId: null, createdAt: "2026-09-14T19:41:42.000Z", updatedAt: "2026-09-14T19:44:40.000Z" },
    { id: 2730001, workDate: 1789405200000, employeeId: 1, area: "produccion", taskCatalogId: 570001, variantId: null, status: "completada", targetQuantity: "2.00", targetDurationMinutes: 10, completedQuantity: "115.00", unit: "PERSONAS", startAt: 1789416000000, endAt: 1789416840000, notes: "Contando caras de todo lo que hay estampado para organizar el corte para los confeccionistas y revisando que todo de estampación haya salido bien", createdByUserId: null, createdAt: "2026-09-14T20:15:01.000Z", updatedAt: "2026-09-14T20:15:01.000Z" },
    { id: 2760001, workDate: 1789405200000, employeeId: 1, area: "produccion", taskCatalogId: 510001, variantId: null, status: "completada", targetQuantity: "1.00", targetDurationMinutes: 5, completedQuantity: null, unit: "unidades", startAt: 1789417980000, endAt: 1789418340000, notes: "Se recibe a Ferney 80 forros de. Licitación y entrega de material para trabajar", createdByUserId: null, createdAt: "2026-09-14T20:40:14.000Z", updatedAt: "2026-09-14T20:40:14.000Z" },
    { id: 2790001, workDate: 1789405200000, employeeId: 1, area: "produccion", taskCatalogId: 930001, variantId: null, status: "completada", targetQuantity: null, targetDurationMinutes: null, completedQuantity: "9.00", unit: "unidades", startAt: 1789419600000, endAt: 1789420140000, notes: null, createdByUserId: null, createdAt: "2026-09-14T21:09:44.000Z", updatedAt: "2026-09-14T21:09:44.000Z" },
    { id: 2820001, workDate: 1789405200000, employeeId: 4, area: "produccion", taskCatalogId: 60001, variantId: null, status: "completada", targetQuantity: "160.00", targetDurationMinutes: 80, completedQuantity: "16.00", unit: "unidades", startAt: 1789412100000, endAt: 1789413000000, notes: null, createdByUserId: null, createdAt: "2026-09-14T21:19:02.000Z", updatedAt: "2026-09-14T21:19:02.000Z" },
    { id: 2850001, workDate: 1789405200000, employeeId: 4, area: "produccion", taskCatalogId: 30001, variantId: null, status: "completada", targetQuantity: "100.00", targetDurationMinutes: 60, completedQuantity: "22.00", unit: "unidades", startAt: 1789420800000, endAt: 1789422780000, notes: null, createdByUserId: null, createdAt: "2026-09-14T21:44:15.000Z", updatedAt: "2026-09-14T21:53:17.000Z" },
    { id: 2880001, workDate: 1789405200000, employeeId: 1, area: "produccion", taskCatalogId: 1, variantId: null, status: "completada", targetQuantity: "2.00", targetDurationMinutes: 1, completedQuantity: "34.00", unit: "forros", startAt: 1789420200000, endAt: 1789421400000, notes: null, createdByUserId: null, createdAt: "2026-09-14T21:46:23.000Z", updatedAt: "2026-09-14T21:48:00.000Z" },
    { id: 2910001, workDate: 1789405200000, employeeId: 6, area: "produccion", taskCatalogId: 9, variantId: null, status: "pendiente", targetQuantity: "3.00", targetDurationMinutes: 15, completedQuantity: "20.00", unit: "30", startAt: null, endAt: null, notes: null, createdByUserId: null, createdAt: "2026-09-14T21:55:17.000Z", updatedAt: "2026-09-14T21:55:17.000Z" },
    { id: 2940001, workDate: 1789405200000, employeeId: 5, area: "produccion", taskCatalogId: 900001, variantId: null, status: "completada", targetQuantity: "110.00", targetDurationMinutes: 180, completedQuantity: "30.00", unit: "unidades", startAt: 1789409700000, endAt: 1789422900000, notes: "TENIENDO EN CUENTA EL TIEMPO DE LOS ROLLOS DE TELA PARA LOS PETOS", createdByUserId: null, createdAt: "2026-09-14T21:58:59.000Z", updatedAt: "2026-09-15T21:35:29.000Z" },
    { id: 2970001, workDate: 1789491600000, employeeId: 5, area: "produccion", taskCatalogId: 900001, variantId: null, status: "completada", targetQuantity: "110.00", targetDurationMinutes: 285, completedQuantity: "41.00", unit: "unidades", startAt: 1789479900000, endAt: 1789497000000, notes: null, createdByUserId: null, createdAt: "2026-09-15T14:42:14.000Z", updatedAt: "2026-09-15T21:34:55.000Z" },
    { id: 3000001, workDate: 1789491600000, employeeId: 4, area: "produccion", taskCatalogId: 210001, variantId: null, status: "completada", targetQuantity: "10.00", targetDurationMinutes: 63, completedQuantity: "5.00", unit: "unidades", startAt: 1789479600000, endAt: 1789483380000, notes: "Se realiza pedidos del centro y se montan al carro", createdByUserId: null, createdAt: "2026-09-15T14:45:08.000Z", updatedAt: "2026-09-15T14:45:45.000Z" },
    { id: 3030001, workDate: 1789491600000, employeeId: 1, area: "produccion", taskCatalogId: 210001, variantId: null, status: "completada", targetQuantity: "10.00", targetDurationMinutes: 60, completedQuantity: "5.00", unit: "unidades", startAt: 1789479960000, endAt: 1789483560000, notes: "Se realiza el empaque de pedidos para el centro y el piso encauchetado", createdByUserId: null, createdAt: "2026-09-15T14:46:36.000Z", updatedAt: "2026-09-15T15:24:06.000Z" },
    { id: 3060001, workDate: 1789491600000, employeeId: 1, area: "produccion", taskCatalogId: 180001, variantId: null, status: "completada", targetQuantity: "200.00", targetDurationMinutes: 10, completedQuantity: null, unit: "unidades", startAt: 1789482960000, endAt: 1789485480000, notes: "Se guardan los cortes delanteros y traceros  en la bolsa para la futura distribución con confeccionistas", createdByUserId: null, createdAt: "2026-09-15T14:47:28.000Z", updatedAt: "2026-09-15T15:24:41.000Z" },
    { id: 3090001, workDate: 1789491600000, employeeId: 4, area: "produccion", taskCatalogId: 11, variantId: null, status: "completada", targetQuantity: "40.00", targetDurationMinutes: 5, completedQuantity: "80.00", unit: "forros", startAt: 1789483500000, endAt: 1789483800000, notes: null, createdByUserId: null, createdAt: "2026-09-15T14:50:38.000Z", updatedAt: "2026-09-15T14:50:38.000Z" },
    { id: 3120001, workDate: 1789491600000, employeeId: 1, area: "produccion", taskCatalogId: 11, variantId: null, status: "completada", targetQuantity: "40.00", targetDurationMinutes: 1, completedQuantity: "120.00", unit: "forros", startAt: 1789489140000, endAt: 1789489800000, notes: "Pauso conteo para trasladar plásticos y recortes sobrantes de casata", createdByUserId: null, createdAt: "2026-09-15T16:53:59.000Z", updatedAt: "2026-09-15T16:53:59.000Z" },
    { id: 3150001, workDate: 1789491600000, employeeId: 1, area: "produccion", taskCatalogId: 390001, variantId: null, status: "completada", targetQuantity: "1.00", targetDurationMinutes: 1, completedQuantity: "40.00", unit: "unidades", startAt: 1789488900000, endAt: 1789491780000, notes: null, createdByUserId: null, createdAt: "2026-09-15T17:17:20.000Z", updatedAt: "2026-09-15T17:17:46.000Z" },
    { id: 3180001, workDate: 1789491600000, employeeId: 1, area: "produccion", taskCatalogId: 510001, variantId: null, status: "completada", targetQuantity: "1.00", targetDurationMinutes: 5, completedQuantity: "30.00", unit: "unidades", startAt: 1789493040000, endAt: 1789493160000, notes: "Caras para estampación", createdByUserId: null, createdAt: "2026-09-15T17:26:59.000Z", updatedAt: "2026-09-15T17:26:59.000Z" },
    { id: 3210001, workDate: 1789491600000, employeeId: 1, area: "produccion", taskCatalogId: 1, variantId: null, status: "completada", targetQuantity: "2.00", targetDurationMinutes: 6, completedQuantity: "6.00", unit: "forros", startAt: 1789498980000, endAt: 1789499340000, notes: null, createdByUserId: null, createdAt: "2026-09-15T19:21:14.000Z", updatedAt: "2026-09-15T19:21:14.000Z" },
    { id: 3240001, workDate: 1789491600000, employeeId: 1, area: "produccion", taskCatalogId: 30001, variantId: null, status: "completada", targetQuantity: "100.00", targetDurationMinutes: 60, completedQuantity: "6.00", unit: "unidades", startAt: 1789499400000, endAt: 1789499880000, notes: null, createdByUserId: null, createdAt: "2026-09-15T19:21:36.000Z", updatedAt: "2026-09-15T19:22:35.000Z" },
    { id: 3270001, workDate: 1789491600000, employeeId: 4, area: "produccion", taskCatalogId: 390001, variantId: null, status: "completada", targetQuantity: "1.00", targetDurationMinutes: 211, completedQuantity: "210.00", unit: "unidades", startAt: 1789487700000, endAt: 1789500360000, notes: "Teniendo en cuenta la empacada de todas las tulas", createdByUserId: null, createdAt: "2026-09-15T19:28:21.000Z", updatedAt: "2026-09-15T19:28:21.000Z" },
    { id: 3300001, workDate: 1789491600000, employeeId: 1, area: "produccion", taskCatalogId: 1, variantId: null, status: "completada", targetQuantity: "2.00", targetDurationMinutes: 1, completedQuantity: "10.00", unit: "forros", startAt: 1789500420000, endAt: 1789500840000, notes: null, createdByUserId: null, createdAt: "2026-09-15T19:40:52.000Z", updatedAt: "2026-09-15T19:40:52.000Z" },
    { id: 3330001, workDate: 1789491600000, employeeId: 1, area: "produccion", taskCatalogId: 30001, variantId: null, status: "completada", targetQuantity: "100.00", targetDurationMinutes: 60, completedQuantity: "9.00", unit: "unidades", startAt: 1789501140000, endAt: 1789501680000, notes: null, createdByUserId: null, createdAt: "2026-09-15T19:50:08.000Z", updatedAt: "2026-09-15T19:50:08.000Z" },
    { id: 3360001, workDate: 1789491600000, employeeId: 1, area: "produccion", taskCatalogId: 1, variantId: null, status: "completada", targetQuantity: "2.00", targetDurationMinutes: 1, completedQuantity: "10.00", unit: "forros", startAt: 1789501980000, endAt: 1789502520000, notes: null, createdByUserId: null, createdAt: "2026-09-15T20:00:59.000Z", updatedAt: "2026-09-15T20:03:49.000Z" },
    { id: 3390001, workDate: 1789491600000, employeeId: 1, area: "produccion", taskCatalogId: 1, variantId: null, status: "completada", targetQuantity: "2.00", targetDurationMinutes: 1, completedQuantity: "18.00", unit: "forros", startAt: 1789503060000, endAt: 1789503840000, notes: null, createdByUserId: null, createdAt: "2026-09-15T20:11:10.000Z", updatedAt: "2026-09-15T20:24:24.000Z" },
    { id: 3420001, workDate: 1789491600000, employeeId: 1, area: "produccion", taskCatalogId: 30001, variantId: null, status: "en_proceso", targetQuantity: "100.00", targetDurationMinutes: 60, completedQuantity: "12.00", unit: "unidades", startAt: 1789504020000, endAt: null, notes: null, createdByUserId: null, createdAt: "2026-09-15T20:27:57.000Z", updatedAt: "2026-09-15T20:27:57.000Z" },
    { id: 3450001, workDate: 1789491600000, employeeId: 5, area: "produccion", taskCatalogId: 630001, variantId: null, status: "completada", targetQuantity: "6.00", targetDurationMinutes: 90, completedQuantity: "72.00", unit: "unidades", startAt: 1789501500000, endAt: 1789506900000, notes: null, createdByUserId: null, createdAt: "2026-09-15T21:38:05.000Z", updatedAt: "2026-09-15T21:38:05.000Z" },
    { id: 3480001, workDate: 1789491600000, employeeId: 1, area: "produccion", taskCatalogId: 210001, variantId: null, status: "completada", targetQuantity: "10.00", targetDurationMinutes: 1, completedQuantity: null, unit: "unidades", startAt: 1789505040000, endAt: 1789510080000, notes: "Pedido smarfit", createdByUserId: null, createdAt: "2026-09-15T22:08:57.000Z", updatedAt: "2026-09-15T22:08:57.000Z" },
    { id: 3510001, workDate: 1789491600000, employeeId: 4, area: "produccion", taskCatalogId: 210001, variantId: null, status: "completada", targetQuantity: "10.00", targetDurationMinutes: 1, completedQuantity: "15.00", unit: "unidades", startAt: 1789504800000, endAt: 1789509600000, notes: null, createdByUserId: null, createdAt: "2026-09-15T22:10:05.000Z", updatedAt: "2026-09-15T22:10:05.000Z" },
  );

  return store;
}

function persist() {
  if (!cache) return;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(cache, null, 2), "utf-8");
}

async function load(): Promise<Store> {
  if (cache) return cache;
  if (loading) return loading;

  loading = (async () => {
    if (fs.existsSync(DATA_FILE)) {
      cache = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8")) as Store;
      return cache;
    }
    console.log(
      "[localStore] No hay DATABASE_URL configurado: usando datos de prueba en local-data/db.json"
    );
    cache = await buildSeed();
    persist();
    return cache;
  })();

  return loading;
}

// ---------------- Users ----------------

export async function getUserByEmail(email: string) {
  const store = await load();
  return store.users.find(u => u.email === email);
}

export async function getUserById(id: number) {
  const store = await load();
  return store.users.find(u => u.id === id);
}

export async function createUser(values: { name?: string | null; email: string; passwordHash: string }) {
  const store = await load();
  const now = new Date().toISOString();
  const role: LocalUser["role"] = store.users.length === 0 ? "admin" : "user";
  const user: LocalUser = {
    id: nextId(store, "users"),
    name: values.name ?? null,
    email: values.email,
    passwordHash: values.passwordHash,
    role,
    createdAt: now,
    updatedAt: now,
    lastSignedIn: now,
  };
  store.users.push(user);
  persist();
  return user;
}

export async function touchLastSignedIn(id: number) {
  const store = await load();
  const user = store.users.find(u => u.id === id);
  if (user) {
    user.lastSignedIn = new Date().toISOString();
    persist();
  }
}

// ---------------- Employees ----------------

export async function listEmployees(includeInactive: boolean) {
  const store = await load();
  const list = includeInactive ? store.employees : store.employees.filter(e => e.isActive);
  return [...list].sort((a, b) => a.area.localeCompare(b.area) || a.name.localeCompare(b.name));
}

export async function createEmployee(values: { name: string; area: Area }) {
  const store = await load();
  const now = new Date().toISOString();
  const employee: LocalEmployee = {
    id: nextId(store, "employees"),
    name: values.name,
    area: values.area,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };
  store.employees.push(employee);
  persist();
  return { id: employee.id };
}

export async function updateEmployee(values: { id: number; name: string; area: Area }) {
  const store = await load();
  const employee = store.employees.find(e => e.id === values.id);
  if (employee) {
    employee.name = values.name;
    employee.area = values.area;
    employee.updatedAt = new Date().toISOString();
    persist();
  }
  return { success: true } as const;
}

export async function setEmployeeActive(id: number, isActive: boolean) {
  const store = await load();
  const employee = store.employees.find(e => e.id === id);
  if (employee) {
    employee.isActive = isActive;
    employee.updatedAt = new Date().toISOString();
    persist();
  }
  return { success: true } as const;
}

// ---------------- Catalog ----------------

type CatalogWrite = {
  name: string;
  area: Area;
  unit: string;
  usesQuantity: boolean;
  hasVariants: boolean;
  defaultTargetQuantity?: number | string | null;
  defaultTargetMinutes?: number | null;
};

export async function listCatalog(includeInactive: boolean) {
  const store = await load();
  const tasks = includeInactive ? store.taskCatalog : store.taskCatalog.filter(t => t.isActive);
  const variantsSrc = includeInactive ? store.taskVariants : store.taskVariants.filter(v => v.isActive);
  const sorted = [...tasks].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  return sorted.map(task => ({
    ...task,
    variants: variantsSrc.filter(v => v.taskCatalogId === task.id).sort((a, b) => a.name.localeCompare(b.name)),
  }));
}

export async function getCatalogTaskById(id: number) {
  const store = await load();
  return store.taskCatalog.find(t => t.id === id);
}

export async function createCatalogTask(values: CatalogWrite) {
  const store = await load();
  const now = new Date().toISOString();
  const task: LocalCatalogTask = {
    id: nextId(store, "taskCatalog"),
    name: values.name,
    area: values.area,
    unit: values.unit,
    usesQuantity: values.usesQuantity,
    hasVariants: values.hasVariants,
    defaultTargetQuantity: values.defaultTargetQuantity == null ? null : String(values.defaultTargetQuantity),
    defaultTargetMinutes: values.defaultTargetMinutes ?? null,
    isActive: true,
    sortOrder: store.taskCatalog.length,
    createdAt: now,
    updatedAt: now,
  };
  store.taskCatalog.push(task);
  persist();
  return { id: task.id };
}

export async function updateCatalogTask(values: CatalogWrite & { id: number }) {
  const store = await load();
  const task = store.taskCatalog.find(t => t.id === values.id);
  if (task) {
    task.name = values.name;
    task.area = values.area;
    task.unit = values.unit;
    task.usesQuantity = values.usesQuantity;
    task.hasVariants = values.hasVariants;
    task.defaultTargetQuantity = values.defaultTargetQuantity == null ? null : String(values.defaultTargetQuantity);
    task.defaultTargetMinutes = values.defaultTargetMinutes ?? null;
    task.updatedAt = new Date().toISOString();
    persist();
  }
  return { success: true } as const;
}

export async function setCatalogTaskActive(id: number, isActive: boolean) {
  const store = await load();
  const task = store.taskCatalog.find(t => t.id === id);
  if (task) {
    task.isActive = isActive;
    task.updatedAt = new Date().toISOString();
    persist();
  }
  return { success: true } as const;
}

export async function createTaskVariant(values: { taskCatalogId: number; name: string }) {
  const store = await load();
  const now = new Date().toISOString();
  const variant: LocalTaskVariant = {
    id: nextId(store, "taskVariants"),
    taskCatalogId: values.taskCatalogId,
    name: values.name,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };
  store.taskVariants.push(variant);
  persist();
  return { id: variant.id };
}

export async function updateTaskVariant(values: { id: number; name: string }) {
  const store = await load();
  const variant = store.taskVariants.find(v => v.id === values.id);
  if (variant) {
    variant.name = values.name;
    variant.updatedAt = new Date().toISOString();
    persist();
  }
  return { success: true } as const;
}

export async function setTaskVariantActive(id: number, isActive: boolean) {
  const store = await load();
  const variant = store.taskVariants.find(v => v.id === id);
  if (variant) {
    variant.isActive = isActive;
    variant.updatedAt = new Date().toISOString();
    persist();
  }
  return { success: true } as const;
}

// ---------------- Daily tasks ----------------

type DailyTaskFilters = {
  from: number;
  to: number;
  employeeId?: number;
  area?: Area;
  status?: TaskStatus;
};

export async function listDailyTasks(filters: DailyTaskFilters) {
  const store = await load();
  const employeesById = new Map(store.employees.map(e => [e.id, e]));
  const catalogById = new Map(store.taskCatalog.map(t => [t.id, t]));
  const variantsById = new Map(store.taskVariants.map(v => [v.id, v]));

  return store.dailyTasks
    .filter(t => t.workDate >= filters.from && t.workDate <= filters.to)
    .filter(t => (filters.employeeId ? t.employeeId === filters.employeeId : true))
    .filter(t => (filters.area ? t.area === filters.area : true))
    .filter(t => (filters.status ? t.status === filters.status : true))
    .sort((a, b) => b.workDate - a.workDate || b.id - a.id)
    .map(t => ({
      id: t.id,
      workDate: t.workDate,
      employeeId: t.employeeId,
      employeeName: employeesById.get(t.employeeId)?.name ?? "-",
      area: t.area,
      taskCatalogId: t.taskCatalogId,
      taskName: catalogById.get(t.taskCatalogId)?.name ?? "-",
      variantId: t.variantId,
      variantName: t.variantId != null ? (variantsById.get(t.variantId)?.name ?? null) : null,
      status: t.status,
      targetQuantity: t.targetQuantity,
      targetDurationMinutes: t.targetDurationMinutes,
      completedQuantity: t.completedQuantity,
      unit: t.unit,
      startAt: t.startAt,
      endAt: t.endAt,
      notes: t.notes,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    }));
}

type DailyTaskWrite = {
  workDate: number;
  employeeId: number;
  area: Area;
  taskCatalogId: number;
  variantId?: number | null;
  targetQuantity?: number | string | null;
  targetDurationMinutes?: number | null;
  completedQuantity?: number | string | null;
  unit: string;
  startAt?: number | null;
  endAt?: number | null;
  notes?: string | null;
  status: TaskStatus;
  createdByUserId: number;
};

export async function createDailyTask(values: DailyTaskWrite) {
  const store = await load();
  const now = new Date().toISOString();
  const task: LocalDailyTask = {
    id: nextId(store, "dailyTasks"),
    workDate: values.workDate,
    employeeId: values.employeeId,
    area: values.area,
    taskCatalogId: values.taskCatalogId,
    variantId: values.variantId ?? null,
    status: values.status,
    targetQuantity: values.targetQuantity == null ? null : String(values.targetQuantity),
    targetDurationMinutes: values.targetDurationMinutes ?? null,
    completedQuantity: values.completedQuantity == null ? null : String(values.completedQuantity),
    unit: values.unit,
    startAt: values.startAt ?? null,
    endAt: values.endAt ?? null,
    notes: values.notes ?? null,
    createdByUserId: values.createdByUserId,
    createdAt: now,
    updatedAt: now,
  };
  store.dailyTasks.push(task);
  persist();
  return { id: task.id };
}

export async function updateDailyTask(id: number, values: Partial<DailyTaskWrite>) {
  const store = await load();
  const task = store.dailyTasks.find(t => t.id === id);
  if (task) {
    Object.assign(task, values, {
      targetQuantity: values.targetQuantity === undefined ? task.targetQuantity : values.targetQuantity == null ? null : String(values.targetQuantity),
      completedQuantity:
        values.completedQuantity === undefined ? task.completedQuantity : values.completedQuantity == null ? null : String(values.completedQuantity),
      updatedAt: new Date().toISOString(),
    });
    persist();
  }
  return { success: true } as const;
}

export async function deleteDailyTask(id: number) {
  const store = await load();
  store.dailyTasks = store.dailyTasks.filter(t => t.id !== id);
  persist();
  return { success: true } as const;
}
