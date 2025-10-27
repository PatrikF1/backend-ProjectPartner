import express from "express";
import { connectToDatabase } from "../db.js";
import Github from "../models/Github.js";
import { requireAuth } from "../middleware/auth.js";
const router = express.Router();
router.post("/", requireAuth, async (req, res) => {
    const { githubUrl } = req.body;
    const userId = req.user._id;
    if (!githubUrl) {
        return res.status(400).json({ msg: "githubUrl je obavezan" });
    }
    try {
        await connectToDatabase();
        const newGithub = new Github({
            githubUrl,
            createdBy: userId,
            members: [userId]
        });
        const savedGithub = await newGithub.save();
        return res.status(201).json(savedGithub);
    }
    catch (error) {
        console.error("Greška pri kreiranju GitHub-a:", error);
        return res.status(500).json({ msg: "Greška pri kreiranju GitHub-a" });
    }
});
export default router;
//# sourceMappingURL=Githubs.js.map