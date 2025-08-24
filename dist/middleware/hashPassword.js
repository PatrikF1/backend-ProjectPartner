import bcrypt from 'bcryptjs';
export const hashPassword = async (req, res, next) => {
    try {
        if (req.body.password) {
            const saltRounds = 10;
            req.body.passwordHash = await bcrypt.hash(req.body.password, saltRounds);
            delete req.body.password;
        }
        next();
    }
    catch (error) {
        res.status(500).json({ error: 'Greška pri hashiranju lozinke' });
    }
};
//# sourceMappingURL=hashPassword.js.map