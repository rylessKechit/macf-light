import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth'

// Handler unique pour GET et POST
const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }