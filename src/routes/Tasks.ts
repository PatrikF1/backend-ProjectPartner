import express from "express";
import { connectToDatabase } from "../db.js";
import Task from "../models/Task.js";
import Project from "../models/Project.js";
import { requireAuth, AuthRequest } from "../middleware/auth.js";

const router = express.Router();

router.post("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    await connectToDatabase();
    
    const task = new Task({
      projectId: req.body.projectId,
      applicationId: req.body.applicationId || null,
      name: req.body.name,
      description: req.body.description || '',
      status: req.body.status || 'not-started',
      priority: req.body.priority || 'medium',
      deadline: req.body.deadline ? new Date(req.body.deadline) : null,
      createdBy: req.user._id
    });

    await task.save();
    await task.populate('createdBy', 'name lastname email');
    await task.populate('projectId', 'name');
    await task.populate('applicationId', 'idea');
    
    return res.status(201).json(task);
  } catch (error) {
    return res.status(500).json({ msg: "Error creating task" });
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
    return res.status(500).json({ msg: "Error fetching tasks" });
  }
});

router.get("/my", requireAuth, async (req: AuthRequest, res) => {
  try {
    await connectToDatabase();

    const userProjects = await Project.find({ members: req.user._id });
    const projectIds = userProjects.map(p => p._id);
    const tasks = await Task.find({
      projectId: { $in: projectIds },
      isArchived: false
    })
      .populate('createdBy', 'name lastname email')
      .populate('projectId', 'name')
      .populate('applicationId', 'idea')
      .sort({ createdAt: -1 });

    return res.status(200).json(tasks);
  } catch (error) {
    return res.status(500).json({ msg: "Error fetching tasks" });
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
  } catch (error) {
    return res.status(500).json({ msg: "Error fetching tasks" });
  }
});

router.put("/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    await connectToDatabase();
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ msg: "Task not found" });
    
    if (req.body.status) task.status = req.body.status;
    if (req.body.name) task.name = req.body.name;
    if (req.body.description !== undefined) task.description = req.body.description;
    if (req.body.priority) task.priority = req.body.priority;
    if (req.body.deadline !== undefined) task.deadline = req.body.deadline ? new Date(req.body.deadline) : null;

    await task.save();
    await task.populate('createdBy', 'name lastname email');
    await task.populate('projectId', 'name');
    await task.populate('applicationId', 'idea');

    return res.status(200).json(task);
  } 
  catch (error) {
    return res.status(500).json({ msg: "Error updating task" });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    await connectToDatabase();
    await Task.findByIdAndDelete(req.params.id);
    return res.status(200).json({ msg: "Task successfully deleted" });
  } 
  catch (error) {
    return res.status(500).json({ msg: "Error deleting task" });
  }
});

router.put("/:id/archive", requireAuth, async (req: AuthRequest, res) => {
  try {
    await connectToDatabase();
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ msg: "Task not found" });

    task.isArchived = true;
    task.archivedAt = new Date();
    await task.save();

    await task.populate('createdBy', 'name lastname email');
    await task.populate('projectId', 'name');
    await task.populate('applicationId', 'idea');

    return res.status(200).json(task);
  } 
  catch (error) {
    return res.status(500).json({ msg: "Error archiving task" });
  }
});

export default router;

