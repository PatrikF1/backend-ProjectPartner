import express from "express";
import { connectToDatabase } from "../db.js";
import Task from "../models/Task.js";
import { requireAuth, AuthRequest } from "../middleware/auth.js";

const router = express.Router();

router.post("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    await connectToDatabase();
    const task = await new Task({
      projectId: req.body.projectId,
      applicationId: req.body.applicationId || null,
      name: req.body.name,
      description: req.body.description || '',
      status: req.body.status || 'not-started',
      createdBy: req.user._id,
    }).save();
    await task.populate('createdBy', 'name lastname email');
    await task.populate('projectId', 'name');
    await task.populate('applicationId', 'idea');
    return res.status(201).json(task);
  } 
  catch (error) {
    return res.status(500).json({ msg: "Greška pri kreiranju taska" });
  }
});

router.get("/", requireAuth, async (req, res) => {
  try {
    await connectToDatabase();

    const tasks = await Task.find()
      .populate('createdBy', 'name lastname email')
      .populate('projectId', 'name')
      .populate('applicationId', 'idea')
      .sort({ createdAt: -1 });

    return res.status(200).json(tasks);
  } 
  catch (error) {
    return res.status(500).json({ msg: "Greška pri dohvatanju taskova" });
  }
});

router.get("/project/:projectId/application/:applicationId", requireAuth, async (req: AuthRequest, res) => {
  try {
    await connectToDatabase();
    const tasks = await Task.find({
      projectId: req.params.projectId,
      applicationId: req.params.applicationId,
      createdBy: req.user._id
    })
      .populate('createdBy', 'name lastname email')
      .populate('projectId', 'name')
      .populate('applicationId', 'idea')
      .sort({ createdAt: -1 });

    return res.status(200).json(tasks);
  } 
  catch (error) {
    return res.status(500).json({ msg: "Greška pri dohvatanju taskova" });
  }
});


router.put("/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    await connectToDatabase();
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ msg: "Task nije pronađen" });
    
    if (req.body.status) task.status = req.body.status;
    if (req.body.name) task.name = req.body.name;
    if (req.body.description !== undefined) task.description = req.body.description;

    await task.save();
    await task.populate('createdBy', 'name lastname email');
    await task.populate('projectId', 'name');
    await task.populate('applicationId', 'idea');

    return res.status(200).json(task);
  } 
  catch (error) {
    return res.status(500).json({ msg: "Greška pri ažuriranju taska" });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    await connectToDatabase();
    await Task.findByIdAndDelete(req.params.id);
    return res.status(200).json({ msg: "Task je uspješno obrisan" });
  } 
  catch (error) {
    return res.status(500).json({ msg: "Greška pri brisanju taska" });
  }
});

router.get("/by-user", requireAuth, async (req: AuthRequest, res) => {
  try {
    await connectToDatabase();
    
    if (!req.user?.isAdmin) {
      return res.status(403).json({ msg: "Samo admin može pristupiti" });
    }

    const query: any = {};
    if (req.query.userId) query.createdBy = req.query.userId;
    if (req.query.applicationId) query.applicationId = req.query.applicationId;
    if (req.query.projectId) query.projectId = req.query.projectId;

    const tasks = await Task.find(query)
      .populate('createdBy', 'name lastname email')
      .populate('projectId', 'name')
      .populate('applicationId', 'idea')
      .sort({ createdAt: -1 });

    return res.status(200).json(tasks);
  } 
  catch (error) {
    return res.status(500).json({ msg: "Greška pri dohvatanju taskova" });
  }
});

export default router;

