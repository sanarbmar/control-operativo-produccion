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

export function taskEfficiencyPercent(
  completedQuantity?: number | string | null,
  actualMinutes?: number | null,
  targetQuantity?: number | string | null,
  targetMinutes?: number | null,
) {
  if (completedQuantity == null || completedQuantity === "") return null;
  const completed = Number(completedQuantity ?? 0);
  const target = Number(targetQuantity ?? 0);
  if (!Number.isFinite(completed) || !Number.isFinite(target) || completed < 0 || target <= 0 || !actualMinutes || actualMinutes <= 0 || !targetMinutes || targetMinutes <= 0) {
    return null;
  }
  return Math.round(((completed / actualMinutes) / (target / targetMinutes)) * 1000) / 10;
}

export function weightedEfficiencyPercent(
  records: Array<{
    completedQuantity?: number | string | null;
    actualMinutes?: number | null;
    targetQuantity?: number | string | null;
    targetMinutes?: number | null;
  }>,
) {
  let totalCompleted = 0;
  let totalExpectedForWorkedTime = 0;

  for (const record of records) {
    if (record.completedQuantity == null || record.completedQuantity === "") continue;
    const completed = Number(record.completedQuantity);
    const target = Number(record.targetQuantity ?? 0);
    const actualMinutes = Number(record.actualMinutes ?? 0);
    const targetMinutes = Number(record.targetMinutes ?? 0);
    if (!Number.isFinite(completed) || !Number.isFinite(target) || completed < 0 || target <= 0 || actualMinutes <= 0 || targetMinutes <= 0) continue;
    totalCompleted += completed;
    totalExpectedForWorkedTime += target * (actualMinutes / targetMinutes);
  }

  if (totalExpectedForWorkedTime === 0) return null;
  return Math.round((totalCompleted / totalExpectedForWorkedTime) * 1000) / 10;
}
