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
  session: { strategy: "jwt" },
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
