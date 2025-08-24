import express, { type Response, type Request } from "express";
import { connectToDatabase } from "../db.js";
import User from "../models/User.js";

const router = express.Router();

router.get('/', async (req: Request, res: Response) => {
    try {
        await connectToDatabase();
        const users = await User.find().select('-passwordHash');
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: 'Greška pri dohvaćanju korisnika' });
    }
});

router.post('/', async (req: Request, res: Response) => {
    try {
        await connectToDatabase();
        const newUser = new User(req.body);
        const savedUser = await newUser.save();
        const userData: any = savedUser.toObject();
        delete userData.passwordHash;
        res.status(201).json(userData);
    } catch (error) {
        res.status(400).json({ error: 'Greška pri kreiranju korisnika' });
    }
});

export default router;