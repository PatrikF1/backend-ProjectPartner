import { MongoClient, Db } from 'mongodb';

let client: MongoClient | null = null;


export async function connectToDatabase(): Promise<Db> {
  const uri = process.env.MONGO_URI;

  if (!uri) throw new Error('MONGO_URI nije postavljen u .env');
  const dbName = process.env.MONGO_DB_NAME || 'ProjectPartner';

  if (!client) {
    client = await MongoClient.connect(uri);
    console.log('MongoDB spojen!');
  }

  return client.db(dbName);
}
