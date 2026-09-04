import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { AREAS, deriveTaskStatus, validateTimeline } from "../../shared/operations";
import * as db from "../db";
import { protectedProcedure, router } from "../_core/trpc";

const areaSchema = z.enum(AREAS);
const optionalPositiveQuantity = z.number().nonnegative().max(9999999999).nullable().optional();
const optionalPositiveMinutes = z.number().int().positive().max(100000).nullable().optional();

const taskInput = z.object({
  workDate: z.number().int().nonnegative(),
  employeeId: z.number().int().positive(),
  area: areaSchema,
  taskCatalogId: z.number().int().positive(),
  variantId: z.number().int().positive().nullable().optional(),
  targetQuantity: optionalPositiveQuantity,
  targetDurationMinutes: optionalPositiveMinutes,
  completedQuantity: optionalPositiveQuantity,
  unit: z.string().trim().min(1).max(50),
  startAt: z.number().int().nonnegative().nullable().optional(),
  endAt: z.number().int().nonnegative().nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
});

const catalogInput = z.object({
  name: z.string().trim().min(2).max(180),
  area: areaSchema,
  unit: z.string().trim().min(1).max(50),
  usesQuantity: z.boolean(),
  hasVariants: z.boolean(),
  defaultTargetQuantity: optionalPositiveQuantity,
  defaultTargetMinutes: optionalPositiveMinutes,
});

function assertValidTimeline(startAt?: number | null, endAt?: number | null) {
  const message = validateTimeline(startAt, endAt);
  if (message) throw new TRPCError({ code: "BAD_REQUEST", message });
}

export const operationsRouter = router({
  employees: router({
    list: protectedProcedure
      .input(z.object({ includeInactive: z.boolean().optional() }).optional())
      .query(({ input }) => db.listEmployees(input?.includeInactive ?? false)),
    create: protectedProcedure
      .input(z.object({ name: z.string().trim().min(2).max(120), area: areaSchema }))
      .mutation(({ input }) => db.createEmployee(input)),
    update: protectedProcedure
      .input(z.object({ id: z.number().int().positive(), name: z.string().trim().min(2).max(120), area: areaSchema }))
      .mutation(({ input }) => db.updateEmployee(input)),
    setActive: protectedProcedure
      .input(z.object({ id: z.number().int().positive(), isActive: z.boolean() }))
      .mutation(({ input }) => db.setEmployeeActive(input.id, input.isActive)),
  }),

  catalog: router({
    list: protectedProcedure
      .input(z.object({ includeInactive: z.boolean().optional() }).optional())
      .query(({ input }) => db.listCatalog(input?.includeInactive ?? false)),
    create: protectedProcedure.input(catalogInput).mutation(({ input }) => db.createCatalogTask(input)),
    update: protectedProcedure
      .input(catalogInput.extend({ id: z.number().int().positive() }))
      .mutation(({ input }) => db.updateCatalogTask(input)),
    setActive: protectedProcedure
      .input(z.object({ id: z.number().int().positive(), isActive: z.boolean() }))
      .mutation(({ input }) => db.setCatalogTaskActive(input.id, input.isActive)),
    createVariant: protectedProcedure
      .input(z.object({ taskCatalogId: z.number().int().positive(), name: z.string().trim().min(1).max(100) }))
      .mutation(({ input }) => db.createTaskVariant(input)),
    updateVariant: protectedProcedure
      .input(z.object({ id: z.number().int().positive(), name: z.string().trim().min(1).max(100) }))
      .mutation(({ input }) => db.updateTaskVariant(input)),
    setVariantActive: protectedProcedure
      .input(z.object({ id: z.number().int().positive(), isActive: z.boolean() }))
      .mutation(({ input }) => db.setTaskVariantActive(input.id, input.isActive)),
  }),

  dailyTasks: router({
    list: protectedProcedure
      .input(
        z.object({
          from: z.number().int().nonnegative(),
          to: z.number().int().nonnegative(),
          employeeId: z.number().int().positive().optional(),
          area: areaSchema.optional(),
          status: z.enum(["pendiente", "en_proceso", "completada"]).optional(),
        }),
      )
      .query(({ input }) => db.listDailyTasks(input)),
    create: protectedProcedure.input(taskInput).mutation(async ({ input, ctx }) => {
      assertValidTimeline(input.startAt, input.endAt);
      const catalogDefaults = await db.getCatalogTaskById(input.taskCatalogId);
      return db.createDailyTask({
        ...input,
        variantId: input.variantId ?? null,
        targetQuantity: input.targetQuantity ?? catalogDefaults?.defaultTargetQuantity ?? null,
        targetDurationMinutes: input.targetDurationMinutes ?? catalogDefaults?.defaultTargetMinutes ?? null,
        completedQuantity: input.completedQuantity ?? null,
        startAt: input.startAt ?? null,
        endAt: input.endAt ?? null,
        notes: input.notes || null,
        status: deriveTaskStatus(input.startAt, input.endAt),
        createdByUserId: ctx.user.id,
      });
    }),
    update: protectedProcedure
      .input(taskInput.extend({ id: z.number().int().positive() }))
      .mutation(({ input }) => {
        assertValidTimeline(input.startAt, input.endAt);
        const { id, ...values } = input;
        return db.updateDailyTask(id, {
          ...values,
          variantId: values.variantId ?? null,
          targetQuantity: values.targetQuantity ?? null,
          targetDurationMinutes: values.targetDurationMinutes ?? null,
          completedQuantity: values.completedQuantity ?? null,
          startAt: values.startAt ?? null,
          endAt: values.endAt ?? null,
          notes: values.notes || null,
          status: deriveTaskStatus(values.startAt, values.endAt),
        });
      }),
    remove: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(({ input }) => db.deleteDailyTask(input.id)),
  }),
});
