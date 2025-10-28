import express from "express";
import { connectToDatabase } from "../db.js";
import Github from "../models/Github.js";
import { requireAuth, AuthRequest } from "../middleware/auth.js";

const router = express.Router();

router.post("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const githubUrl = req.body.githubUrl;
    const userId = req.user._id;

    if (!githubUrl) {
      return res.status(400).json({ msg: "githubUrl je obavezan" });
    }

    await connectToDatabase();

    const newGithub = new Github({
      githubUrl: githubUrl,
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

router.get("/", requireAuth, async (req, res) => {
  try {
    await connectToDatabase();

    const githubLinks = await Github.find()
      .populate('createdBy', 'name lastname email')
      .populate('members', 'name lastname email')
      .sort({ createdAt: -1 });

    return res.status(200).json(githubLinks);
  } 
  catch (error) {
    console.error("Greška pri dohvatanju GitHub linkova:", error);
    return res.status(500).json({ msg: "Greška pri dohvatanju GitHub linkova" });
  }
});

router.delete("/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = req.params.id;
    const userId = req.user._id.toString();

    await connectToDatabase();

    const githubLink = await Github.findById(id);

    if (!githubLink) {
      return res.status(404).json({ msg: "GitHub link nije pronađen" });
    }

    const createdByString = githubLink.createdBy.toString();
    const isCreator = createdByString === userId;

    if (!isCreator) {
      return res.status(403).json({ msg: "Samo kreator može obrisati ovaj GitHub link" });
    }

    await Github.findByIdAndDelete(id);

    return res.status(200).json({ msg: "GitHub link je uspješno obrisan" });
  } 
  catch (error) {
    console.error("Greška pri brisanju GitHub linka:", error);
    return res.status(500).json({ msg: "Greška pri brisanju GitHub linka" });
  }
});

export default router;