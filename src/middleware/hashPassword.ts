import bcrypt from 'bcryptjs';
import { Request, Response, NextFunction } from 'express';

export const hashPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.body.password) {
      const saltRounds = 10;
      req.body.passwordHash = await bcrypt.hash(req.body.password, saltRounds);
      delete req.body.password;
    }
    next();
  } catch (error) {
    res.status(500).json({ error: 'Greška pri hashiranju lozinke' });
  }
};
