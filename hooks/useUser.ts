import { useSession } from 'next-auth/react'

// Extended session user type — fields injected by NextAuth session callback
export interface SessionUser {
  name?: string | null
  email?: string | null
  image?: string | null
  id?: string
  credits?: number
  planType?: 'free' | 'topup' | 'starter' | 'lifetime'
  creditsUsed?: number
}

export function useUser() {
  const { data: session, status } = useSession()
  const user = session?.user as SessionUser | undefined

  return {
    user,
    isLoading: status === 'loading',
    isAuthenticated: status === 'authenticated',
    credits: user?.credits ?? 0,
    planType: user?.planType ?? 'free',
    creditsUsed: user?.creditsUsed ?? 0,
  }
}
