import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { ForbiddenError } from "@shared/_core/errors";
import { parse as parseCookieHeader } from "cookie";
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type { Request } from "express";
import { SignJWT, jwtVerify } from "jose";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { ENV } from "./env";

const scrypt = promisify(scryptCallback);
const SCRYPT_KEYLEN = 64;

export type SessionPayload = {
  userId: number;
};

/**
 * Local (non-Manus) authentication: email/password accounts with our own
 * signed session cookie. No external OAuth provider involved.
 */
class SDKServer {
  /** Hash a plaintext password for storage. Format: "<salt-hex>:<hash-hex>". */
  async hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16).toString("hex");
    const derivedKey = (await scrypt(password, salt, SCRYPT_KEYLEN)) as Buffer;
    return `${salt}:${derivedKey.toString("hex")}`;
  }

  /** Check a plaintext password against a hash produced by hashPassword. */
  async verifyPassword(password: string, storedHash: string): Promise<boolean> {
    const [salt, key] = storedHash.split(":");
    if (!salt || !key) return false;

    const keyBuffer = Buffer.from(key, "hex");
    const derivedKey = (await scrypt(password, salt, keyBuffer.length)) as Buffer;
    if (derivedKey.length !== keyBuffer.length) return false;

    return timingSafeEqual(derivedKey, keyBuffer);
  }

  private getSessionSecret() {
    if (!ENV.cookieSecret) {
      throw new Error(
        "JWT_SECRET no está configurado. Agrega JWT_SECRET a tu archivo .env."
      );
    }
    return new TextEncoder().encode(ENV.cookieSecret);
  }

  /** Create a signed session token (JWT) for a logged-in user. */
  async createSessionToken(
    userId: number,
    options: { expiresInMs?: number } = {}
  ): Promise<string> {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1000);
    const secretKey = this.getSessionSecret();

    return new SignJWT({ userId } satisfies SessionPayload)
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setExpirationTime(expirationSeconds)
      .sign(secretKey);
  }

  async verifySession(
    cookieValue: string | undefined | null
  ): Promise<SessionPayload | null> {
    if (!cookieValue) return null;

    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"],
      });
      const { userId } = payload as Record<string, unknown>;

      if (typeof userId !== "number") {
        console.warn("[Auth] Session payload missing userId");
        return null;
      }

      return { userId };
    } catch (error) {
      console.warn("[Auth] Session verification failed", String(error));
      return null;
    }
  }

  private parseCookies(cookieHeader: string | undefined) {
    if (!cookieHeader) return new Map<string, string>();
    return new Map(Object.entries(parseCookieHeader(cookieHeader)));
  }

  async authenticateRequest(req: Request): Promise<User> {
    // 1. Prefer the session cookie (regular email/password login).
    const cookies = this.parseCookies(req.headers.cookie);
    let sessionToken = cookies.get(COOKIE_NAME);

    // 2. Fallback to the Authorization header, used when the browser blocks
    //    third-party/iframe cookies (Safari ITP, private browsing, WebView).
    if (!sessionToken) {
      const authHeader = req.headers.authorization;
      if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
        sessionToken = authHeader.slice(7);
      }
    }

    const session = await this.verifySession(sessionToken);
    if (!session) {
      throw ForbiddenError("Invalid session cookie");
    }

    const user = await db.getUserById(session.userId);
    if (!user) {
      throw ForbiddenError("User not found");
    }

    return user;
  }
}

export const sdk = new SDKServer();
