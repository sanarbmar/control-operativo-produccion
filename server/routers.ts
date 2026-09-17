import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { sdk } from "./_core/sdk";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { operationsRouter } from "./routers/operations";

const credentialsInput = z.object({
  email: z.string().trim().toLowerCase().email("Correo inválido").max(320),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres").max(200),
});

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => (opts.ctx.user ? db.toPublicUser(opts.ctx.user) : null)),

    register: publicProcedure
      .input(credentialsInput.extend({ name: z.string().trim().min(1, "El nombre es obligatorio").max(120) }))
      .mutation(async ({ input, ctx }) => {
        const existing = await db.getUserByEmail(input.email);
        if (existing) {
          throw new TRPCError({ code: "CONFLICT", message: "Ya existe una cuenta con ese correo" });
        }

        const passwordHash = await sdk.hashPassword(input.password);
        const user = await db.createUser({ name: input.name, email: input.email, passwordHash });
        if (!user) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "No se pudo crear la cuenta" });
        }

        const sessionToken = await sdk.createSessionToken(user.id);
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

        return db.toPublicUser(user);
      }),

    login: publicProcedure.input(credentialsInput).mutation(async ({ input, ctx }) => {
      const user = await db.getUserByEmail(input.email);
      const isValid = user ? await sdk.verifyPassword(input.password, user.passwordHash) : false;

      if (!user || !isValid) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Correo o contraseña incorrectos" });
      }

      await db.touchLastSignedIn(user.id);
      const sessionToken = await sdk.createSessionToken(user.id);
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      return db.toPublicUser(user);
    }),

    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  operations: operationsRouter,
});

export type AppRouter = typeof appRouter;
