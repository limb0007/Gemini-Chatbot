import { compare } from "bcrypt-ts";
import NextAuth, { type User, type Session } from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { getUser } from "@/db/queries";
import { authConfig } from "./auth.config";

interface ExtendedSession extends Session {
  user: User;
}

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  // Bring in your pages, Google provider, and `authorized` callback from auth.config.ts
  ...authConfig,

  // Merge providers: keep Google from authConfig and add Credentials here
  providers: [
    ...(authConfig.providers ?? []),
    Credentials({
      credentials: {},
      async authorize(creds: any) {
        const { email, password } = creds ?? {};
        if (!email || !password) return null;

        const users = await getUser(email);
        if (!users?.length) return null;

        const passwordsMatch = await compare(password, users[0].password!);
        if (!passwordsMatch) return null;

        return users[0] as any;
      },
    }),
  ],

  // Merge callbacks: keep `authorized` from config, add jwt/session mapping here
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      if (user) token.id = (user as any).id;
      return token;
    },
    async session({
      session,
      token,
    }: {
      session: ExtendedSession;
      token: any;
    }) {
      if (session.user) {
        (session.user as any).id = token.id as string;
      }
      return session;
    },
  },
});
