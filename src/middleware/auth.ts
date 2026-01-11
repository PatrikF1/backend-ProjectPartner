import jwt from 'jsonwebtoken';
import type { JwtPayload } from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import User, { type IUser } from '../models/User.js';
import { connectToDatabase } from '../db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'token_broj';

interface TokenPayload extends JwtPayload {
  userId: string;
  email: string;
  isAdmin: boolean;
}

export interface AuthRequest extends Request {
  user?: IUser;
}

export const generateToken = (user: IUser) => {
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

export const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = req.headers.authorization?.substring(7);
    if (!token) {
      res.status(401).json({ msg: 'Access token is required' });
      return;
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      res.status(401).json({ msg: 'Invalid token' });
      return;
    }

    await connectToDatabase();
    const user = await User.findById(decoded.userId);
    if (!user) {
      res.status(404).json({ msg: 'User not found' });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ msg: 'Error during authentication' });
  }
};

export const requireAdmin = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = req.headers.authorization?.substring(7);
    if (!token) {
      res.status(401).json({ msg: 'Access token is required' });
      return;
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      res.status(401).json({ msg: 'Invalid token' });
      return;
    }

    await connectToDatabase();
    const user = await User.findById(decoded.userId);
    if (!user) {
      res.status(404).json({ msg: 'User not found' });
      return;
    }

    if (!user.isAdmin) {
      res.status(403).json({ msg: 'Only administrators can access' });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Admin check error:', error);
    res.status(500).json({ msg: 'Error checking admin status' });
  }
};
