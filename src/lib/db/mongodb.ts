import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI!

if (!MONGODB_URI) {
  throw new Error(
    'MONGODB_URI doit être défini dans les variables d\'environnement. Format: mongodb+srv://username:password@cluster.mongodb.net/database'
  )
}

/**
 * Configuration optimisée pour MongoDB Atlas
 */
const mongooseOptions = {
  bufferCommands: false,
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  family: 4
}

/**
 * Global cache pour maintenir une connexion unique across hot reloads
 */
let cached = (global as any).mongoose

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null }
}

async function connectDB() {
  // Retourner la connexion existante si disponible
  if (cached.conn) {
    return cached.conn
  }

  // Créer une nouvelle connexion si pas de promesse en cours
  if (!cached.promise) {
    console.log('🔄 Connexion à MongoDB Atlas...')
    
    cached.promise = mongoose.connect(MONGODB_URI, mongooseOptions)
      .then((mongoose) => {
        console.log('✅ Connecté à MongoDB Atlas')
        return mongoose
      })
      .catch((error) => {
        console.error('❌ Erreur de connexion MongoDB:', error)
        cached.promise = null
        throw error
      })
  }

  try {
    cached.conn = await cached.promise
  } catch (e) {
    cached.promise = null
    console.error('❌ Échec de connexion MongoDB:', e)
    throw new Error('Impossible de se connecter à MongoDB Atlas')
  }

  return cached.conn
}

export default connectDB

// Fonction pour déconnecter proprement
export async function disconnectDB() {
  if (cached.conn) {
    await mongoose.disconnect()
    cached.conn = null
    cached.promise = null
    console.log('🔌 Déconnecté de MongoDB')
  }
}