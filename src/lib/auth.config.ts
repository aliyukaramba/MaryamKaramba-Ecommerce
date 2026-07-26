import type { NextAuthConfig } from "next-auth";

/**
 * This config contains only what's safe to run on the Edge runtime — no
 * Prisma, no bcrypt, no database access. It's used directly by
 * middleware.ts. The full config (with the Credentials provider and
 * Prisma adapter) lives in auth.ts and spreads this config in, adding
 * the Node-only pieces on top for use in Server Components/Actions/Route
 * Handlers, which all run on the Node.js runtime.
 *
 * Why this split matters: middleware.ts runs on Vercel's Edge runtime,
 * which cannot execute Prisma's Node client. If middleware imports the
 * full auth.ts (with PrismaAdapter bundled in), the resulting Edge
 * bundle can silently misbehave — including session/role data not
 * resolving the same way it does in ordinary Server Components. Keeping
 * middleware on this Edge-only config avoids that entire class of bug.
 */
export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/admin/login",
    error: "/admin/login",
  },
  // 8 hours, not NextAuth's 30-day default. JWT sessions are stateless —
  // once issued, nothing re-checks the database on subsequent requests,
  // so deactivating an admin account (or a full password reset) doesn't
  // revoke a session that's already out in the world. A short maxAge is
  // the practical bound on that exposure window without adding a
  // server-side session store. See SECURITY_AUDIT.md for the fuller
  // tradeoff discussion and what a complete fix would look like.
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 },
  providers: [], // populated with Credentials in auth.ts (Node runtime only)
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.role = (user as { role: string }).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
  trustHost: true,
};
