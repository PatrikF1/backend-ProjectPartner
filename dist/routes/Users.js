import express from "express";
import { connectToDatabase } from "../db.js";
const router = express.Router();
router.get('/', async (req, res) => {
    try {
        const db = await connectToDatabase();
        let userCollection = db.collection('Users');
        let allUsers = await userCollection.find().toArray();
        if (!allUsers || allUsers.length === 0) {
            return res.status(404).json({ msg: "Korisnici nisu pronađeni" });
        }
        res.status(200).json(allUsers);
    }
    catch (error) {
        console.error('Greška pri dohvatanju korisnika:', error);
        res.status(500).json({ msg: "Greška pri dohvatanju korisnika", error: error instanceof Error ? error.message : 'Nepoznata greška' });
    }
});
export default router;
//# sourceMappingURL=Users.js.map