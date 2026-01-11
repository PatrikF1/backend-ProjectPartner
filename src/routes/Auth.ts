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
  adminKey?: string;
}

interface LoginRequest {
  email: string;
  password: string;
}

router.post("/register", async (req: Request, res: Response) => { 
  try {
    var body = req.body as RegisterRequest;
    if (!body.email || !body.password) {
      return res.status(400).json({ msg: 'Email and password are required' });
    }
    
    if (body.password !== body.c_password) {
      return res.status(400).json({ msg: 'Passwords do not match' });
    }

    await connectToDatabase();
    
    var exists = await User.findOne({ email: body.email });
    if (exists) return res.status(409).json({ msg: 'User already exists' });

    var passwordHash = await bcrypt.hash(body.password, 10);
    
    var ADMIN_KEY = process.env.ADMIN_KEY;
    var isAdmin = false;
    
    if (body.adminKey && body.adminKey.trim()) {
      if (!ADMIN_KEY) {
        return res.status(400).json({ msg: 'Admin key is not configured on server' });
      }
      if (body.adminKey.trim() === ADMIN_KEY) {
        isAdmin = true;
      } else {
        return res.status(400).json({ msg: 'Invalid admin key' });
      }
    }
    
    var newUser = new User({ 
      name: body.name,
      lastname: body.lastname,
      email: body.email, 
      phone: body.phone,
      passwordHash,
      isAdmin: isAdmin
    });
    
    var savedUser = await newUser.save();
    var token = generateToken(savedUser);
    
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
    console.error('Registration error:', error);
    return res.status(500).json({ 
      msg: 'Error during registration'
    });
  }
});


router.post('/login', async (req: Request, res: Response) => {
  try {
    var body = req.body as LoginRequest;
    if (!body.email || !body.password) {
      return res.status(400).json({ msg: 'Email and password are required' });
    }

    await connectToDatabase();
    
    var user = await User.findOne({ email: body.email });
    if (!user) return res.status(401).json({ msg: 'Invalid credentials' });
    
    var ok = await bcrypt.compare(body.password, user.passwordHash);
    if (!ok) return res.status(401).json({ msg: 'Invalid credentials' });

    var token = generateToken(user);

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
    console.error('Login error:', error);
    return res.status(500).json({ 
      msg: 'Error during login'
    });
  }
});

export default router;
