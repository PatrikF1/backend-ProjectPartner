import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import User from '../models/User.js';
import { connectToDatabase } from '../db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'token_broj';

export interface AuthRequest extends Request {
  user?: any;
}

export const generateToken = (user: any) => {
  return jwt.sign(
    { 
      userId: user._id, 
      email: user.email, 
      isAdmin: user.isAdmin 
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
};

export const verifyToken = (token: string) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

export const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ msg: 'Token za pristup je obavezan' });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    if (!decoded) {
      return res.status(401).json({ msg: 'Neispravan token' });
    }

    await connectToDatabase();
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(404).json({ msg: 'Korisnik nije pronađen' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Greška pri provjeri autentifikacije:', error);
    return res.status(500).json({ msg: 'Greška pri provjeri autentifikacije' });
  }
};

export const requireAdmin = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ msg: 'Token za pristup je obavezan' });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    if (!decoded) {
      return res.status(401).json({ msg: 'Neispravan token' });
    }

    if (!decoded.isAdmin) {
      return res.status(403).json({ msg: 'Samo administratori mogu pristupiti ovoj funkcionalnosti' });
    }

    await connectToDatabase();
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(404).json({ msg: 'Korisnik nije pronađen' });
    }

    if (!user.isAdmin) {
      return res.status(403).json({ msg: 'Samo administratori mogu pristupiti ovoj funkcionalnosti' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Greška pri provjeri administratorskog statusa:', error);
    return res.status(500).json({ msg: 'Greška pri provjeri administratorskog statusa' });
  }
};
