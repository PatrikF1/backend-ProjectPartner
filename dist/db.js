import mongoose from 'mongoose';
import 'dotenv/config';
export async function connectToDatabase() {
    const uri = process.env.MONGO_URI;
    if (!uri)
        throw new Error('MONGO_URI nije postavljen');
    await mongoose.connect(uri, {
        dbName: process.env.MONGO_DB_NAME
    });
    console.log('Mongoose connected to DB:', mongoose.connection.name);
}
//# sourceMappingURL=db.js.map