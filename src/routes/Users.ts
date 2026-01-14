import express, { type Response } from "express";
import { connectToDatabase } from "../db.js";
import User from "../models/User.js";
import Project from "../models/Project.js";
import Application from "../models/Application.js";
import { requireAuth, AuthRequest } from "../middleware/auth.js";

const router = express.Router();

router.get("/", requireAuth, async (_req, res: Response) => {
  try {
    await connectToDatabase();
    var users = await User.find().select('name lastname email isAdmin');
    return res.status(200).json(users);
  } 
  catch (error) {
    return res.status(500).json({ msg: 'Error' });
  }
});

router.get("/dashboard", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    await connectToDatabase();
    var userId = req.user!._id;

    var users = await User.find().select('name lastname email isAdmin');
    var projects = await Project.find()
      .populate('createdBy', 'name lastname email')
      .populate('members', 'name lastname email')
      .sort({ createdAt: -1 });
    var myProjects = await Project.find({ members: userId })
      .populate('createdBy', 'name lastname email')
      .populate('members', 'name lastname email')
      .sort({ createdAt: -1 });
    var applications = await Application.find()
      .populate('projectId', 'name')
      .populate('createdBy', 'name lastname email')
      .sort({ createdAt: -1 });
    var myApplications = await Application.find({ createdBy: userId })
      .populate('projectId', 'name')
      .populate('createdBy', 'name lastname email')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      users: users,
      projects: projects,
      myProjects: myProjects,
      applications: applications,
      myApplications: myApplications
    });
  } 
  catch (error) {
    return res.status(500).json({ msg: "Error fetching dashboard data" });
  }
});

router.get("/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    await connectToDatabase();
    var userId = req.params.id;
    var user = await User.findById(userId).select('name lastname email phone isAdmin');
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    return res.status(200).json(user);
  } 
  catch (error) {
    return res.status(500).json({ msg: 'Error' });
  }
});

export default router;