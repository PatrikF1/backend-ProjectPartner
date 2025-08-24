import mongoose from 'mongoose';
export async function connectToDatabase() {
    const uri = process.env.MONGO_URI;
    if (!uri) {
        throw new Error('MONGO_URI nije postavljen u .env');
    }
    try {
        await mongoose.connect(uri);
        console.log('MongoDB spojen sa Mongoose-om');
    }
    catch (error) {
        console.error('Greška pri povezivanju na MongoDB:', error);
        throw error;
    }
}
//# sourceMappingURL=db.js.map