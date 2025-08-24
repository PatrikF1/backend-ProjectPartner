import express from 'express';
import { connectToDatabase } from '../db.js';
import User from '../models/User.js';
import { hashPassword } from '../middleware/hashPassword.js';
const router = express.Router();
router.post("/register", hashPassword, async (req, res) => {
    const { name, lastname, email, phone, c_password } = req.body;
    if (!name || !lastname || !email || !phone || !req.body.passwordHash || !c_password)
        return res.status(400).json({ msg: 'Sva polja su obavezna' });
    try {
        await connectToDatabase();
        const exists = await User.findOne({ email });
        if (exists)
            return res.status(409).json({ msg: 'Korisnik već postoji' });
        const newUser = new User({
            ime: `${name} ${lastname}`,
            email,
            godine: phone
        });
        const savedUser = await newUser.save();
        return res.status(201).json({ _id: savedUser._id, email });
    }
    catch (error) {
        return res.status(500).json({ msg: 'Greška pri registraciji' });
    }
});
export default router;
//# sourceMappingURL=Auth.js.map