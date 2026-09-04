export type Area = "produccion" | "ventas" | "administracion";
export type TaskStatus = "pendiente" | "en_proceso" | "completada";

export type TaskRecord = {
  id: number;
  workDate: number;
  employeeId: number;
  employeeName: string;
  area: Area;
  taskCatalogId: number;
  taskName: string;
  variantId: number | null;
  variantName: string | null;
  status: TaskStatus;
  targetQuantity: string | null;
  targetDurationMinutes: number | null;
  completedQuantity: string | null;
  unit: string;
  startAt: number | null;
  endAt: number | null;
  notes: string | null;
};

export const areaLabels: Record<Area, string> = {
  produccion: "Producción",
  ventas: "Ventas",
  administracion: "Administración",
};

export const statusLabels: Record<TaskStatus, string> = {
  pendiente: "Pendiente",
  en_proceso: "En proceso",
  completada: "Completada",
};

export function dateInputValue(timestamp = Date.now()) {
  const date = new Date(timestamp);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export function dateTimeInputValue(timestamp?: number | null) {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

export function dateToTimestamp(value: string) {
  return new Date(`${value}T12:00:00`).getTime();
}

export function dateRange(value: string) {
  const start = new Date(`${value}T00:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { from: start.getTime(), to: end.getTime() - 1 };
}

export function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat("es-CO", { day: "2-digit", month: "short", year: "numeric" }).format(timestamp);
}

export function formatDateTime(timestamp?: number | null) {
  if (!timestamp) return "—";
  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(timestamp);
}

export function durationMinutes(startAt?: number | null, endAt?: number | null) {
  if (!startAt || !endAt || endAt <= startAt) return 0;
  return Math.round((endAt - startAt) / 60000);
}

export function formatDuration(minutes: number) {
  if (!minutes) return "—";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours ? `${hours} h ${rest ? `${rest} min` : ""}`.trim() : `${rest} min`;
}
