import { MongoClient } from "mongodb"
import dotenv from "dotenv"


dotenv.config()


const mongoURI = process.env.MONGO_URI as string 
const database = process.env.MONGO_NAME as string


if (!mongoURI || !database) {
    throw new Error("MONGO_URI ili MONGO_DB_NAME nisu definirani u .env datoteci");
  }


async function connectToDatabase() {
    try {
    const client = new MongoClient(mongoURI); 
    await client.connect();
    console.log('Uspješno spajanje na bazu podataka');
    let db = client.db(database); 
    return db;
    } catch (error) {
    console.error('Greška prilikom spajanja na bazu podataka', error);
    throw error;
    }
    }


    let db = await connectToDatabase()

    export { db };