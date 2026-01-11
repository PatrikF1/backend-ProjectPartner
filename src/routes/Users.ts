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
    const users = await User.find().select('name lastname email isAdmin');
    return res.status(200).json(users);
  } 
  catch (error) {
    return res.status(500).json({ msg: 'Error' });
  }
});

router.get("/dashboard", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ msg: 'Unauthorized' });
    }

    await connectToDatabase();
    const userId = req.user._id;

    const [users, projects, myProjects, applications, myApplications] = await Promise.all([
      User.find().select('name lastname email isAdmin'),
      Project.find()
        .populate('createdBy', 'name lastname email')
        .populate('members', 'name lastname email')
        .sort({ createdAt: -1 }),
      Project.find({ members: userId })
        .populate('createdBy', 'name lastname email')
        .populate('members', 'name lastname email')
        .sort({ createdAt: -1 }),
      Application.find()
        .populate('projectId', 'name')
        .populate('createdBy', 'name lastname email')
        .sort({ createdAt: -1 }),
      Application.find({ createdBy: userId })
        .populate('projectId', 'name')
        .populate('createdBy', 'name lastname email')
        .sort({ createdAt: -1 })
    ]);

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

export default router;