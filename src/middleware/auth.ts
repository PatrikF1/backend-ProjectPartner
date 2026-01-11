import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import User, { type IUser } from '../models/User.js';
import { connectToDatabase } from '../db.js';

var JWT_SECRET = process.env.JWT_SECRET || 'token_broj';

export interface AuthRequest extends Request {
  user?: IUser;
}

export function generateToken(user: IUser): string {
  return jwt.sign(
    { 
      userId: user._id, 
      email: user.email, 
      isAdmin: user.isAdmin 
    },
    JWT_SECRET,
    { expiresIn: '48h' }
  );
}

export function verifyToken(token: string) {
  try {
    var decoded = jwt.verify(token, JWT_SECRET) as { userId?: string; email?: string; isAdmin?: boolean };
    return decoded;
  } catch (error) {
    return null;
  }
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    var authHeader = req.headers.authorization;
    if (!authHeader) {
      res.status(401).json({ msg: 'Access token is required' });
      return;
    }
    var token = authHeader.substring(7);
    if (!token) {
      res.status(401).json({ msg: 'Access token is required' });
      return;
    }

    var decoded = verifyToken(token);
    if (!decoded || !decoded.userId) {
      res.status(401).json({ msg: 'Invalid token' });
      return;
    }

    await connectToDatabase();
    var user = await User.findById(decoded.userId);
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
}

export async function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  await requireAuth(req, res, async function() {
    if (!req.user) {
      return;
    }
    if (!req.user.isAdmin) {
      res.status(403).json({ msg: 'Only administrators can access' });
      return;
    }
    next();
  });
}
