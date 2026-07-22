import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { ensureBootstrapAdmin } from "@/lib/bootstrap";

const DUMMY_PASSWORD_HASH = "$2a$12$sQJStPeMk8./ueymH/6VBOICSGpc7KNoaa8scbb5v2p/p/PxbpNvK";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60
  },
  pages: {
    signIn: "/login"
  },
  providers: [
    CredentialsProvider({
      name: "Identifiants",
      credentials: {
        email: { label: "Adresse électronique", type: "email" },
        password: { label: "Mot de passe", type: "password" }
      },
      async authorize(credentials) {
        await ensureBootstrapAdmin();
        if (!credentials?.email || !credentials.password) return null;
        const email = credentials.email.trim().toLowerCase();
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash) {
          await bcrypt.compare(credentials.password, DUMMY_PASSWORD_HASH);
          return null;
        }
        if (!user.isActive || user.mustChangePassword) return null;
        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) return null;
        await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
        return { id: user.id, name: user.name, email: user.email, role: user.role };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.active = true;
      } else if (token.sub) {
        const current = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { role: true, isActive: true, name: true, email: true }
        });
        token.role = current?.role;
        token.active = Boolean(current?.isActive);
        if (current) {
          token.name = current.name;
          token.email = current.email;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub && token.role) {
        session.user.id = token.sub;
        session.user.role = token.role;
        session.user.active = token.active !== false;
      }
      return session;
    }
  }
};
