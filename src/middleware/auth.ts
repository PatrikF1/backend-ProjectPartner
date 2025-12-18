import jwt from 'jsonwebtoken';
import type { JwtPayload } from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import User from '../models/User.js';
import { connectToDatabase } from '../db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'token_broj';

interface TokenPayload extends JwtPayload {
  userId: string;
  email: string;
  isAdmin: boolean;
}

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
    { expiresIn: '48h' }
  );
};

export const verifyToken = (token: string): TokenPayload | null => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (typeof decoded === 'string') return null;
    return decoded as TokenPayload;
  } catch (error) {
    return null;
  }
};

export const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.substring(7);
    if (!token) return res.status(401).json({ msg: 'Access token is required' });

    const decoded = verifyToken(token);
    if (!decoded) return res.status(401).json({ msg: 'Invalid token' });

    await connectToDatabase();
    const user = await User.findById(decoded.userId);
    if (!user) return res.status(404).json({ msg: 'User not found' });

    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({ msg: 'Error during authentication' });
  }
};

export const requireAdmin = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.substring(7);
    if (!token) return res.status(401).json({ msg: 'Access token is required' });

    const decoded = verifyToken(token);
    if (!decoded) return res.status(401).json({ msg: 'Invalid token' });

    await connectToDatabase();
    const user = await User.findById(decoded.userId);
    if (!user) return res.status(404).json({ msg: 'User not found' });

    if (!user.isAdmin) return res.status(403).json({ msg: 'Only administrators can access' });

    req.user = user;
    next();
  } catch (error) {
    console.error('Admin check error:', error);
    return res.status(500).json({ msg: 'Error checking admin status' });
  }
};
