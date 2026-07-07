import NextAuth, { type NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from '~/server/db/schema-pg'
import { eq } from 'drizzle-orm'

function getDb() {
  const sql = neon(process.env.DATABASE_URL!)
  return drizzle(sql, { schema })
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  useSecureCookies: true,
  cookies: {
    sessionToken: {
      name: `__Secure-next-auth.session-token`,
      options: { httpOnly: true, sameSite: 'lax', path: '/', secure: true },
    },
    callbackUrl: {
      name: `__Secure-next-auth.callback-url`,
      options: { sameSite: 'lax', path: '/', secure: true },
    },
    csrfToken: {
      name: `next-auth.csrf-token`,
      options: { httpOnly: true, sameSite: 'lax', path: '/', secure: true },
    },
    state: {
      name: `__Secure-next-auth.state`,
      options: { httpOnly: true, sameSite: 'lax', path: '/', secure: true, maxAge: 900 },
    },
    pkceCodeVerifier: {
      name: `__Secure-next-auth.pkce.code_verifier`,
      options: { httpOnly: true, sameSite: 'lax', path: '/', secure: true, maxAge: 900 },
    },
  },
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false
      try {
        const db = getDb()
        const existing = await db.select().from(schema.users)
          .where(eq(schema.users.email, user.email)).limit(1)
        if (existing.length === 0) {
          await db.insert(schema.users).values({
            email: user.email,
            name: user.name ?? null,
            image: user.image ?? null,
            planType: 'free',
            credits: 20,
          } as any)
        }
        return true
      } catch (err) {
        console.error('[nextauth] signIn error:', err)
        return false
      }
    },
    async session({ session }) {
      if (session.user?.email) {
        try {
          const db = getDb()
          const dbUser = await db.select().from(schema.users)
            .where(eq(schema.users.email, session.user.email)).limit(1)
          if (dbUser[0]) {
            ;(session.user as any).id = dbUser[0].id
            ;(session.user as any).credits = dbUser[0].credits
            ;(session.user as any).planType = dbUser[0].planType
            ;(session.user as any).creditsUsed = dbUser[0].creditsUsed
          }
        } catch (err) {
          console.error('[nextauth] session error:', err)
        }
      }
      return session
    },
    async jwt({ token }) {
      return token
    },
  },
  pages: {
    signIn: '/auth/login',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
  },
}

export default NextAuth(authOptions)
