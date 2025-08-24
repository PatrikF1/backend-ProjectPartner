import express from "express";
import { connectToDatabase } from "../db.js";
import User from "../models/User.js";
const router = express.Router();
router.get('/', async (req, res) => {
    try {
        await connectToDatabase();
        const users = await User.find().select('-passwordHash');
        res.json(users);
    }
    catch (error) {
        res.status(500).json({ error: 'Greška pri dohvatanju korisnika' });
    }
});
router.post('/', async (req, res) => {
    try {
        await connectToDatabase();
        const newUser = new User(req.body);
        const savedUser = await newUser.save();
        const { passwordHash, ...userWithoutPassword } = savedUser.toObject();
        res.status(201).json(userWithoutPassword);
    }
    catch (error) {
        res.status(400).json({ error: 'Greška pri kreiranju korisnika' });
    }
});
router.get('/:id', async (req, res) => {
    try {
        await connectToDatabase();
        const user = await User.findById(req.params.id).select('-passwordHash');
        if (!user)
            return res.status(404).json({ error: 'Korisnik nije pronađen' });
        res.json(user);
    }
    catch (error) {
        res.status(500).json({ error: 'Greška pri dohvatanju korisnika' });
    }
});
router.put('/:id', async (req, res) => {
    try {
        await connectToDatabase();
        const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true }).select('-passwordHash');
        if (!user)
            return res.status(404).json({ error: 'Korisnik nije pronađen' });
        res.json(user);
    }
    catch (error) {
        res.status(500).json({ error: 'Greška pri ažuriranju korisnika' });
    }
});
router.delete('/:id', async (req, res) => {
    try {
        await connectToDatabase();
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user)
            return res.status(404).json({ error: 'Korisnik nije pronađen' });
        res.json({ message: 'Korisnik obrisan' });
    }
    catch (error) {
        res.status(500).json({ error: 'Greška pri brisanju korisnika' });
    }
});
export default router;
//# sourceMappingURL=Users.js.map