import { useSession } from 'next-auth/react'

export function useUser() {
  const { data: session, status } = useSession()

  const user = session?.user as any

  return {
    user,
    isLoading: status === 'loading',
    isAuthenticated: status === 'authenticated',
    credits: user?.credits ?? 0,
    planType: user?.planType ?? 'free',
    creditsUsed: user?.creditsUsed ?? 0,
  }
}
