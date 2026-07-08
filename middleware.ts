import { withAuth } from 'next-auth/middleware'

export default withAuth({
  pages: {
    signIn: '/auth/login',
  },
})

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/api/user/:path*',
    '/api/generate',
    '/api/payment/history',
  ],
}
