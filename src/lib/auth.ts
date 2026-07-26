import NextAuth from "next-auth";
import type { Adapter } from "next-auth/adapters";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validations/auth";
import { authConfig } from "@/lib/auth.config";
import { rateLimit } from "@/lib/rate-limit";
import { logActivity } from "@/lib/activity-log";

// @auth/prisma-adapter and next-auth each resolve their own copy of
// @auth/core in some npm dependency trees (a long-standing next-auth v5
// beta + adapter issue). The two copies are structurally identical at
// runtime but TypeScript treats them as distinct types, which breaks the
// `adapter` option's type-check. Casting through `Adapter` from
// "next-auth/adapters" (the type next-auth itself expects) sidesteps the
// mismatch without depending on npm's dependency resolution being exact.
const adapter = PrismaAdapter(prisma) as unknown as Adapter;

// A fixed, valid bcrypt hash computed once at module load, used to burn
// an equivalent amount of time when no matching admin account exists —
// otherwise a login attempt for a non-existent email returns near-
// instantly while a real account's wrong-password attempt takes
// bcrypt's usual ~100ms+, and that gap alone lets an attacker enumerate
// which admin emails exist.
const DUMMY_PASSWORD_HASH = bcrypt.hashSync("timing-attack-mitigation-only", 12);

function getClientIp(request?: Request): string {
  if (!request) return "unknown";
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        const ip = getClientIp(request);
        // Admin login is the single highest-value target in this whole
        // system — rate limit it same as every other auth endpoint.
        // Deliberately stricter than the customer login limit (5 vs 8).
        const { success: withinLimit } = await rateLimit(`admin-login:${ip}`, 5, 300);
        if (!withinLimit) {
          return null;
        }

        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
        });

        if (!user || !user.isActive || !user.password) {
          // Burn equivalent time to a real comparison, closing the
          // timing side-channel that would otherwise reveal whether
          // this email belongs to an active admin account.
          await bcrypt.compare(password, DUMMY_PASSWORD_HASH);
          await logActivity({
            action: "LOGIN",
            entity: "User",
            details: { success: false, email: email.toLowerCase() },
          });
          return null;
        }

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
          await logActivity({
            userId: user.id,
            action: "LOGIN",
            entity: "User",
            entityId: user.id,
            details: { success: false },
          });
          return null;
        }

        await logActivity({
          userId: user.id,
          action: "LOGIN",
          entity: "User",
          entityId: user.id,
          details: { success: true },
        });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          image: user.image,
        };
      },
    }),
  ],
});
