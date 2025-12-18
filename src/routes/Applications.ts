import express from "express";
import { connectToDatabase } from "../db.js";
import Application from "../models/Application.js";
import Project from "../models/Project.js";
import { requireAuth, requireAdmin, AuthRequest } from "../middleware/auth.js";

const router = express.Router();

router.post("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    await connectToDatabase();
    const application = await new Application({
      projectId: req.body.projectId,
      idea: req.body.idea,
      description: req.body.description,
      createdBy: req.user._id,
      status: 'pending'
    }).save();
    await application.populate('createdBy', 'name lastname email');
    await application.populate('projectId', 'name');
    return res.status(201).json(application);
  } 
  catch (error) {
    return res.status(500).json({ msg: "Error creating application" });
  }
});

router.get("/", requireAuth, async (req, res) => {
  try {
    await connectToDatabase();

    const applications = await Application.find()
      .populate('createdBy', 'name lastname email')
      .populate('projectId', 'name')
      .sort({ createdAt: -1 });

    return res.status(200).json(applications);
  } 
  catch (error) {
    return res.status(500).json({ msg: "Error fetching applications" });
  }
});

router.get("/my", requireAuth, async (req: AuthRequest, res) => {
  try {
    await connectToDatabase();
    const applications = await Application.find({ createdBy: req.user._id })
      .populate('projectId', 'name')
      .populate('createdBy', 'name lastname email')
      .sort({ createdAt: -1 });

    return res.status(200).json(applications);
  } 
  catch (error) {
    return res.status(500).json({ msg: "Error fetching applications" });
  }
});

router.put("/:id/:action", requireAdmin, async (req: AuthRequest, res) => {
  try {
    await connectToDatabase();
    const application = await Application.findById(req.params.id);
    if (!application) return res.status(404).json({ msg: "Application not found" });
    
    application.status = req.params.action === 'approve' ? 'approved' : 'rejected';
    await application.save();

    if (req.params.action === 'approve') {
      const project = await Project.findById(application.projectId);
      if (project) {
        project.members.push(application.createdBy);
        await project.save();
      }
    }

    await application.populate('createdBy', 'name lastname email');
    await application.populate('projectId', 'name');

    return res.status(200).json(application);
  } 
  catch (error) {
    return res.status(500).json({ msg: "Error updating application" });
  }
});

export default router;
