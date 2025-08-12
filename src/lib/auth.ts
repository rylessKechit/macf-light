import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import connectDB from "@/lib/db/mongodb"
import User from "@/models/User"

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          console.log('❌ Credentials manquantes')
          return null
        }

        try {
          await connectDB()
          
          const user = await User.findOne({ 
            email: credentials.email.toLowerCase() 
          }).select('+password')
          
          if (!user) {
            console.log('❌ Utilisateur non trouvé:', credentials.email)
            return null
          }

          const isPasswordValid = await bcrypt.compare(
            credentials.password, 
            user.password
          )

          if (!isPasswordValid) {
            console.log('❌ Mot de passe incorrect pour:', credentials.email)
            return null
          }

          // Mettre à jour la dernière connexion
          await user.updateLastLogin()

          console.log('✅ Connexion réussie pour:', credentials.email)
          
          return {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            company: user.company,
            role: user.role,
          }
        } catch (error) {
          console.error('❌ Erreur d\'authentification:', error)
          return null
        }
      }
    })
  ],
  pages: {
    signIn: '/auth/signin',
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 jours
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id
        token.company = user.company
        token.role = user.role
      }
      
      // Gérer les mises à jour de session
      if (trigger === "update" && session) {
        return { ...token, ...session }
      }
      
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.company = token.company as string
        session.user.role = token.role as string
      }
      return session
    }
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
}