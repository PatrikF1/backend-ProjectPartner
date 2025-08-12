<<<<<<< HEAD
import { MongoClient }from "mongodb"
import dotenv from "dotenv"
=======
<<<<<<< HEAD
import { MongoClient } from "mongodb"
import { config } from "dotenv"
>>>>>>> b10fe56 (valjda ce sada raditi)

dotenv.config()

<<<<<<< HEAD
const mongoURI = process.env.MONGO_URI as string 
const database = process.env.MONGO_DB_NAME as string
=======
const mongoURI = process.env.MONGO_URI
const database = process.env.MONGO_DB_NAME
=======
import { MongoClient }from "mongodb"
import dotenv from "dotenv"

dotenv.config()

const mongoURI = process.env.MONGO_URI as string 
const database = process.env.MONGO_DB_NAME as string
>>>>>>> 1380466 (valjda ce sada raditi)
>>>>>>> b10fe56 (valjda ce sada raditi)

if (!mongoURI || !database) {
    throw new Error("MONGO_URI ili MONGO_DB_NAME nisu definirani u .env datoteci");
  }


async function connectToDatabase() {
    try {
<<<<<<< HEAD
    const client = new MongoClient(mongoURI); 
=======
<<<<<<< HEAD
    const client = new MongoClient(mongoURI!); 
=======
    const client = new MongoClient(mongoURI); 
>>>>>>> 1380466 (valjda ce sada raditi)
>>>>>>> b10fe56 (valjda ce sada raditi)
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