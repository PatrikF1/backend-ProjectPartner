import express, { Response } from "express";
import { connectToDatabase } from "../db.js";
import Task from "../models/Task.js";
import Project from "../models/Project.js";
import Event from "../models/Event.js";
import { requireAuth, AuthRequest } from "../middleware/auth.js";

const router = express.Router();

interface CreateTaskRequest {
  projectId: string;
  applicationId?: string;
  name: string;
  description?: string;
  status?: string;
  deadline?: string;
}

interface UpdateTaskRequest {
  name?: string;
  description?: string;
  status?: string;
  deadline?: string;
}

router.post("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ msg: 'Unauthorized' });
    }

    await connectToDatabase();
    
    var taskData = req.body as CreateTaskRequest;
    var task = new Task({
      projectId: taskData.projectId,
      applicationId: taskData.applicationId || null,
      name: taskData.name,
      description: taskData.description || '',
      status: taskData.status || 'not-started',
      deadline: taskData.deadline ? new Date(taskData.deadline) : null,
      createdBy: req.user._id
    });

    await task.save();
    await task.populate('createdBy', 'name lastname email');
    await task.populate('projectId', 'name');
    await task.populate('applicationId', 'idea');

    if (taskData.deadline && task.deadline) {
      var project = await Project.findById(taskData.projectId);
      if (project && project.members && project.members.length > 0) {
        for (var i = 0; i < project.members.length; i++) {
          var memberId = project.members[i];
          var event = new Event({
            title: taskData.name,
            date: task.deadline,
            description: taskData.description || 'Task deadline',
            projectId: taskData.projectId,
            taskId: task._id,
            createdBy: memberId,
            sendAlert: false
          });
          await event.save();
        }
      }
    }
    
    return res.status(201).json(task);
  } catch (error) {
    return res.status(500).json({ msg: "Error creating task" });
  }
});

router.get("/", requireAuth, async (_req, res: Response) => {
  try {
    await connectToDatabase();

    var tasks = await Task.find()
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

router.get("/my", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ msg: 'Unauthorized' });
    }

    await connectToDatabase();

    var userProjects = await Project.find({ members: req.user._id });
    var projectIds = [];
    for (var i = 0; i < userProjects.length; i++) {
      projectIds.push(userProjects[i]._id);
    }
    var tasks = await Task.find({
      projectId: { $in: projectIds }
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

router.put("/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    await connectToDatabase();
    var task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ msg: "Task not found" });
    
    var updateData = req.body as UpdateTaskRequest;
    if (updateData.status) task.status = updateData.status as any;
    if (updateData.name) task.name = updateData.name;
    if (updateData.description !== undefined) task.description = updateData.description;
    if (updateData.deadline !== undefined) task.deadline = updateData.deadline ? new Date(updateData.deadline) : null;

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

router.delete("/:id", requireAuth, async (req, res: Response) => {
  try {
    await connectToDatabase();
    await Task.findByIdAndDelete(req.params.id);
    return res.status(200).json({ msg: "Task successfully deleted" });
  } 
  catch (error) {
    return res.status(500).json({ msg: "Error deleting task" });
  }
});

export default router;

