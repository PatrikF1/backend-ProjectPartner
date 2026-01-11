import express, { Response, Request } from 'express';
import { connectToDatabase } from '../db.js';
import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import { generateToken } from '../middleware/auth.js';

const router = express.Router();

interface RegisterRequest {
  name: string;
  lastname: string;
  email: string;
  phone?: number;
  password: string;
  c_password: string;
  isAdmin?: boolean;
}

interface LoginRequest {
  email: string;
  password: string;
}

router.post("/register", async (req: Request, res: Response) => { 
  try {
    if (!req.body.email || !req.body.password) {
      return res.status(400).json({ msg: 'Email and password are required' });
    }
    
    if (req.body.password !== req.body.c_password) {
      return res.status(400).json({ msg: 'Passwords do not match' });
    }

    await connectToDatabase();
    
    const exists = await User.findOne({ email: req.body.email });
    if (exists) return res.status(409).json({ msg: 'User already exists' });

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
  } catch (error: unknown) {
    console.error('Registration error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ 
      msg: 'Error during registration',
      error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    });
  }
});


router.post('/login', async (req: Request, res: Response) => {
  try {
    if (!req.body.email || !req.body.password) {
      return res.status(400).json({ msg: 'Email and password are required' });
    }

    await connectToDatabase();

    const user = await User.findOne({ email: req.body.email });
    if (!user) return res.status(401).json({ msg: 'Invalid credentials' });

    const ok = await bcrypt.compare(req.body.password, user.passwordHash);
    if (!ok) return res.status(401).json({ msg: 'Invalid credentials' });

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
  } catch (error: unknown) {
    console.error('Login error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ 
      msg: 'Error during login',
      error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    });
  }
});

export default router;
