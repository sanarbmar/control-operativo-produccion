import { describe, expect, it } from "vitest";
import {
  deriveTaskStatus,
  durationMinutes,
  efficiencyPerHour,
  validateTimeline,
} from "../shared/operations";

describe("operational time calculations", () => {
  it("calculates elapsed minutes with decimal precision", () => {
    const start = new Date("2026-09-03T08:00:00Z").getTime();
    const end = new Date("2026-09-03T09:32:30Z").getTime();
    expect(durationMinutes(start, end)).toBe(92.5);
  });

  it("returns zero when a task has no valid completed timeline", () => {
    expect(durationMinutes(null, null)).toBe(0);
    expect(durationMinutes(2000, 1000)).toBe(0);
  });

  it("rejects an end time without a start time", () => {
    expect(validateTimeline(null, Date.now())).toContain("inicio");
  });

  it("rejects an end time equal to or before its start", () => {
    expect(validateTimeline(2000, 2000)).toContain("posterior");
    expect(validateTimeline(2000, 1000)).toContain("posterior");
  });

  it("derives task status from its recorded times", () => {
    expect(deriveTaskStatus(null, null)).toBe("pendiente");
    expect(deriveTaskStatus(1000, null)).toBe("en_proceso");
    expect(deriveTaskStatus(1000, 2000)).toBe("completada");
  });

  it("calculates hourly rate only when time and quantity are valid", () => {
    expect(efficiencyPerHour(120, 90)).toBe(80);
    expect(efficiencyPerHour(50, 0)).toBeNull();
    expect(efficiencyPerHour(null, 60)).toBe(0);
  });
});
