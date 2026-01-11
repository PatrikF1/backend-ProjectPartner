import express, { Response } from "express";
import { connectToDatabase } from "../db.js";
import Event from "../models/Event.js";
import Project from "../models/Project.js";
import { requireAuth, AuthRequest } from "../middleware/auth.js";

const router = express.Router();

router.post("/events", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ msg: 'Unauthorized' });
    }

    await connectToDatabase();
    var event = await new Event({
      title: req.body.title,
      date: req.body.date,
      description: req.body.description || '',
      sendAlert: req.body.sendAlert || false,
      projectId: req.body.projectId || null,
      taskId: req.body.taskId || null,
      createdBy: req.user._id,
    }).save();
    await event.populate('createdBy', 'name lastname email');
    await event.populate('projectId', 'name');
    return res.status(201).json(event);
  } 
  catch (error) {
    return res.status(500).json({ msg: "Error creating event" });
  }
});

router.get("/events", requireAuth, async (_req: AuthRequest, res: Response) => {
  try {
    await connectToDatabase();

    var events = await Event.find()
      .populate('createdBy', 'name lastname email')
      .populate('projectId', 'name')
      .sort({ date: 1, createdAt: -1 });

    var projects = await Project.find({ deadline: { $ne: null } })
      .populate('createdBy', 'name lastname email')
      .populate('members', 'name lastname email');

    var projectEvents = [];
    for (var i = 0; i < projects.length; i++) {
      var project = projects[i];
      if (project.deadline) {
        projectEvents.push({
          _id: 'project_' + project._id,
          title: 'Project Deadline: ' + project.name,
          date: project.deadline,
          description: 'Project deadline',
          projectId: project._id,
          taskId: null,
          isProjectDeadline: true,
          createdBy: project.createdBy,
          project: {
            _id: project._id,
            name: project.name
          }
        });
      }
    }

    var allEvents: any[] = [];
    for (var j = 0; j < events.length; j++) {
      allEvents.push(events[j]);
    }
    for (var k = 0; k < projectEvents.length; k++) {
      allEvents.push(projectEvents[k]);
    }
    allEvents.sort(function(a, b) {
      var dateA = new Date(a.date).getTime();
      var dateB = new Date(b.date).getTime();
      return dateA - dateB;
    });

    return res.status(200).json(allEvents);
  } 
  catch (error) {
    return res.status(500).json({ msg: "Error fetching events" });
  }
});

router.delete("/events/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ msg: 'Unauthorized' });
    }

    await connectToDatabase();
    var event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ msg: "Event not found" });

    var isAdmin = req.user.isAdmin === true;
    var isOwner = String(event.createdBy) === String(req.user._id);

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ msg: "Only owner or admin can delete event" });
    }

    await Event.findByIdAndDelete(req.params.id);
    return res.status(200).json({ msg: "Event successfully deleted" });
  } 
  catch (error) {
    return res.status(500).json({ msg: "Error deleting event" });
  }
});

export default router;

