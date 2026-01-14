import mongoose from 'mongoose'
import 'dotenv/config'

export async function connectToDatabase() {
  if (mongoose.connection.readyState === 1) {
    return;
  }

  var uri = process.env.MONGO_URI 
  if (!uri) throw new Error('MONGO_URI is not set')

  try {
    var dbName = process.env.MONGO_DB_NAME || 'ProjectPartner';
    await mongoose.connect(uri, { dbName })
    console.log('Mongoose connected to DB:', mongoose.connection.name)
  } catch (error) {
    console.error('Database connection error:', error);
    throw error;
  }
}
