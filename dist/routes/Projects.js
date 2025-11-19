import express from "express";
import { connectToDatabase } from "../db.js";
import Project from "../models/Project.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
const router = express.Router();
router.post("/", requireAdmin, async (req, res) => {
    const { name, description, type, capacity } = req.body;
    if (!name || !description || !type) {
        return res.status(400).json({ msg: 'Naziv, opis i tip projekta su obavezni' });
    }
    try {
        await connectToDatabase();
        const newProject = new Project({
            name,
            description,
            type,
            capacity,
            createdBy: req.user._id
        });
        const savedProject = await newProject.save();
        await savedProject.populate('createdBy', 'name lastname email');
        return res.status(201).json(savedProject);
    }
    catch (error) {
        return res.status(500).json({ msg: 'Greška pri kreiranju projekta' });
    }
});
router.get("/", requireAuth, async (req, res) => {
    try {
        await connectToDatabase();
        const projects = await Project.find()
            .populate('createdBy', 'name lastname email')
            .populate('members', 'name lastname email')
            .sort({ createdAt: -1 });
        return res.status(200).json(projects);
    }
    catch (error) {
        return res.status(500).json({ msg: 'Greška pri dohvatanju projekata' });
    }
});
router.get("/my", requireAuth, async (req, res) => {
    try {
        await connectToDatabase();
        const projects = await Project.find({ members: req.user._id })
            .populate('createdBy', 'name lastname email')
            .populate('members', 'name lastname email')
            .sort({ createdAt: -1 });
        return res.status(200).json(projects);
    }
    catch (error) {
        return res.status(500).json({ msg: "Greška pri dohvatanju projekata" });
    }
});
router.get("/:id", requireAuth, async (req, res) => {
    const { id } = req.params;
    try {
        await connectToDatabase();
        const project = await Project.findById(id)
            .populate('createdBy', 'name lastname email')
            .populate('members', 'name lastname email');
        if (!project) {
            return res.status(404).json({ msg: 'Projekt nije pronađen' });
        }
        return res.status(200).json(project);
    }
    catch (error) {
        return res.status(500).json({ msg: 'Greška pri dohvatanju projekta' });
    }
});
router.put("/:id", requireAdmin, async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;
    try {
        await connectToDatabase();
        const updatedProject = await Project.findByIdAndUpdate(id, updateData, { new: true, runValidators: true })
            .populate('createdBy', 'name lastname email')
            .populate('members', 'name lastname email');
        if (!updatedProject) {
            return res.status(404).json({ msg: 'Projekt nije pronađen' });
        }
        return res.status(200).json(updatedProject);
    }
    catch (error) {
        return res.status(500).json({ msg: 'Greška pri ažuriranju projekta' });
    }
});
router.delete("/:id", requireAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        await connectToDatabase();
        const deletedProject = await Project.findByIdAndDelete(id);
        if (!deletedProject) {
            return res.status(404).json({ msg: 'Projekt nije pronađen' });
        }
        return res.status(200).json({ msg: 'Projekt je uspješno obrisan' });
    }
    catch (error) {
        return res.status(500).json({ msg: 'Greška pri brisanju projekta' });
    }
});
router.post("/:id/join", requireAuth, async (req, res) => {
    const { id } = req.params;
    const userId = req.user._id;
    try {
        await connectToDatabase();
        const project = await Project.findById(id);
        if (!project) {
            return res.status(404).json({ msg: 'Projekt nije pronađen' });
        }
        const isMember = project.members.some(member => member.toString() === userId.toString());
        if (isMember) {
            return res.status(400).json({ msg: 'Već ste član ovog projekta' });
        }
        if (project.capacity && project.members.length >= project.capacity) {
            return res.status(400).json({ msg: 'Projekt je popunjen' });
        }
        project.members.push(userId);
        await project.save();
        await project.populate('createdBy', 'name lastname email');
        await project.populate('members', 'name lastname email');
        return res.status(200).json(project);
    }
    catch (error) {
        return res.status(500).json({ msg: 'Greška pri pridruživanju projektu' });
    }
});
router.post("/:id/leave", requireAuth, async (req, res) => {
    const { id } = req.params;
    const userId = req.user._id;
    try {
        await connectToDatabase();
        const project = await Project.findById(id);
        if (!project) {
            return res.status(404).json({ msg: 'Projekt nije pronađen' });
        }
        const memberIndex = project.members.findIndex(member => member.toString() === userId.toString());
        if (memberIndex === -1) {
            return res.status(400).json({ msg: 'Niste član ovog projekta' });
        }
        project.members.splice(memberIndex, 1);
        await project.save();
        await project.populate('createdBy', 'name lastname email');
        await project.populate('members', 'name lastname email');
        return res.status(200).json(project);
    }
    catch (error) {
        return res.status(500).json({ msg: 'Greška pri napuštanju projekta' });
    }
});
export default router;
//# sourceMappingURL=Projects.js.map