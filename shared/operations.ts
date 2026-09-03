export const AREAS = ["produccion", "ventas", "administracion"] as const;
export type Area = (typeof AREAS)[number];

export const TASK_STATUSES = ["pendiente", "en_proceso", "completada"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const AREA_LABELS: Record<Area, string> = {
  produccion: "Producción",
  ventas: "Ventas",
  administracion: "Administración",
};

export const STATUS_LABELS: Record<TaskStatus, string> = {
  pendiente: "Pendiente",
  en_proceso: "En proceso",
  completada: "Completada",
};

export function validateTimeline(startAt?: number | null, endAt?: number | null) {
  if (endAt != null && startAt == null) {
    return "Registra la fecha y hora de inicio antes de indicar la finalización.";
  }
  if (startAt != null && endAt != null && endAt <= startAt) {
    return "La fecha y hora final debe ser posterior al inicio.";
  }
  return null;
}

export function deriveTaskStatus(startAt?: number | null, endAt?: number | null): TaskStatus {
  if (startAt != null && endAt != null) return "completada";
  if (startAt != null) return "en_proceso";
  return "pendiente";
}

export function durationMinutes(startAt?: number | null, endAt?: number | null) {
  if (startAt == null || endAt == null || endAt <= startAt) return 0;
  return Math.round(((endAt - startAt) / 60000) * 10) / 10;
}

export function efficiencyPerHour(quantity?: number | string | null, minutes?: number | null) {
  const parsedQuantity = Number(quantity ?? 0);
  if (!Number.isFinite(parsedQuantity) || !minutes || minutes <= 0) return null;
  return Math.round(((parsedQuantity * 60) / minutes) * 10) / 10;
}
