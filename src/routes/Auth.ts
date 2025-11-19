import express, { Response, Request } from 'express';
import { connectToDatabase } from '../db.js';
import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import { generateToken } from '../middleware/auth.js';

const router = express.Router();

router.post("/register", async (req: Request, res: Response) => { 
  try {
    if (!req.body.email || !req.body.password) {
      return res.status(400).json({ msg: 'Email i lozinka su obavezni' });
    }
    
    if (req.body.password !== req.body.c_password) {
      return res.status(400).json({ msg: 'Lozinke se ne podudaraju' });
    }

    await connectToDatabase();
    
    const exists = await User.findOne({ email: req.body.email });
    if (exists) return res.status(409).json({ msg: 'Korisnik već postoji' });

    const passwordHash = await bcrypt.hash(req.body.password, 10);
    
    const newUser = new User({ 
      name: req.body.name,
      lastname: req.body.lastname,
      email: req.body.email, 
      phone: req.body.phone,
      passwordHash,
      isAdmin: req.body.isAdmin || false
    });
    
    const savedUser = await newUser.save();
    const token = generateToken(savedUser);
    
    return res.status(201).json({ 
      _id: savedUser._id, 
      name: savedUser.name,
      lastname: savedUser.lastname,
      email: savedUser.email,
      phone: savedUser.phone,
      isAdmin: savedUser.isAdmin,
      token
    });
  } catch (error) {
    return res.status(500).json({ msg: 'Greška pri registraciji' });
  }
});


router.post('/login', async (req: Request, res: Response) => {
  try {
    if (!req.body.email || !req.body.password) {
      return res.status(400).json({ msg: 'Email i lozinka su obavezni' });
    }

    await connectToDatabase();

    const user = await User.findOne({ email: req.body.email });
    if (!user) return res.status(401).json({ msg: 'Neispravni podaci' });

    const ok = await bcrypt.compare(req.body.password, user.passwordHash);
    if (!ok) return res.status(401).json({ msg: 'Neispravni podaci' });

    const token = generateToken(user);

    return res.status(200).json({
      _id: user._id,
      name: user.name,
      lastname: user.lastname,
      email: user.email,
      phone: user.phone,
      isAdmin: user.isAdmin,
      token
    });
  } catch (error) {
    return res.status(500).json({ msg: 'Greška pri prijavi' });
  }
});

export default router;
