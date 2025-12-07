import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { connectToDatabase } from '../db.js';
const JWT_SECRET = process.env.JWT_SECRET || 'token_broj';
export const generateToken = (user) => {
    return jwt.sign({
        userId: user._id,
        email: user.email,
        isAdmin: user.isAdmin
    }, JWT_SECRET, { expiresIn: '48h' });
};
export const verifyToken = (token) => {
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (typeof decoded === 'string')
            return null;
        return decoded;
    }
    catch (error) {
        return null;
    }
};
export const requireAuth = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.substring(7);
        if (!token)
            return res.status(401).json({ msg: 'Token za pristup je obavezan' });
        const decoded = verifyToken(token);
        if (!decoded)
            return res.status(401).json({ msg: 'Neispravan token' });
        await connectToDatabase();
        const user = await User.findById(decoded.userId);
        if (!user)
            return res.status(404).json({ msg: 'Korisnik nije pronađen' });
        req.user = user;
        next();
    }
    catch (error) {
        return res.status(500).json({ msg: 'Greška pri provjeri autentifikacije' });
    }
};
export const requireAdmin = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.substring(7);
        if (!token)
            return res.status(401).json({ msg: 'Token za pristup je obavezan' });
        const decoded = verifyToken(token);
        if (!decoded)
            return res.status(401).json({ msg: 'Neispravan token' });
        await connectToDatabase();
        const user = await User.findById(decoded.userId);
        if (!user)
            return res.status(404).json({ msg: 'Korisnik nije pronađen' });
        if (!user.isAdmin)
            return res.status(403).json({ msg: 'Samo administratori mogu pristupiti' });
        req.user = user;
        next();
    }
    catch (error) {
        return res.status(500).json({ msg: 'Greška pri provjeri administratorskog statusa' });
    }
};
//# sourceMappingURL=auth.js.map