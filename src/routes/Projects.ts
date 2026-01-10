import express, { Response, Request } from "express";
import { connectToDatabase } from "../db.js";
import Project from "../models/Project.js";
import Task from "../models/Task.js";
import Application from "../models/Application.js";
import { requireAdmin, requireAuth, AuthRequest } from "../middleware/auth.js";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

const router = express.Router();

interface CreateProjectBody {
  name: string;
  description: string;
  type: 'project' | 'feature' | 'bug/fix' | 'other' | 'task' | 'application';
  capacity?: number;
}

interface UpdateProjectBody {
  name?: string;
  description?: string;
  type?: 'project' | 'feature' | 'bug/fix' | 'other' | 'task' | 'application';
  capacity?: number;
}

router.post("/", requireAdmin, async (req: AuthRequest, res: Response) => {
  const { name, description, type, capacity } = req.body as CreateProjectBody;

  if (!name || !description || !type) {
    return res.status(400).json({ msg: 'Name, description and project type are required' });
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
  } catch (error) {
    return res.status(500).json({ msg: 'Error creating project' });
  }
});

router.get("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    await connectToDatabase();

    const projects = await Project.find()
      .populate('createdBy', 'name lastname email')
      .populate('members', 'name lastname email')
      .sort({ createdAt: -1 });

    return res.status(200).json(projects);
  } catch (error) {
    return res.status(500).json({ msg: 'Error fetching projects' });
  }
});

router.get("/my", requireAuth, async (req: AuthRequest, res: Response) => {
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

router.get("/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    await connectToDatabase();

    const project = await Project.findById(req.params.id)
      .populate('createdBy', 'name lastname email')
      .populate('members', 'name lastname email');

    if (!project) {
      return res.status(404).json({ msg: 'Project not found' });
    }

    return res.status(200).json(project);
  } catch (error) {
    return res.status(500).json({ msg: 'Error fetching project' });
  }
});

router.put("/:id", requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    await connectToDatabase();

    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ msg: 'Project not found' });
    }

    if (req.body.name) project.name = req.body.name;
    if (req.body.description) project.description = req.body.description;
    if (req.body.type) project.type = req.body.type;
    if (req.body.capacity) project.capacity = req.body.capacity;

    await project.save();
    await project.populate('createdBy', 'name lastname email');
    await project.populate('members', 'name lastname email');

    return res.status(200).json(project);
  } catch (error) {
    return res.status(500).json({ msg: 'Error updating project' });
  }
});

router.delete("/:id", requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    await connectToDatabase();

    const deletedProject = await Project.findByIdAndDelete(req.params.id);
    if (!deletedProject) {
      return res.status(404).json({ msg: 'Project not found' });
    }

    return res.status(200).json({ msg: 'Project successfully deleted' });
  } catch (error) {
    return res.status(500).json({ msg: 'Error deleting project' });
  }
});

router.post("/:id/join", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    await connectToDatabase();

    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ msg: 'Project not found' });
    }

    const isMember = project.members.some(member => 
      member.toString() === req.user._id.toString()
    );
    if (isMember) {
      return res.status(400).json({ msg: 'You are already a member of this project' });
    }

    if (project.capacity && project.members.length >= project.capacity) {
      return res.status(400).json({ msg: 'Project is full' });
    }

    project.members.push(req.user._id);
    await project.save();
    await project.populate('createdBy', 'name lastname email');
    await project.populate('members', 'name lastname email');

    return res.status(200).json(project);
  } catch (error) {
    return res.status(500).json({ msg: 'Error joining project' });
  }
});

router.post("/:id/leave", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    await connectToDatabase();

    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ msg: 'Project not found' });
    }

    const memberIndex = project.members.findIndex(member => 
      member.toString() === req.user._id.toString()
    );
    if (memberIndex === -1) {
      return res.status(400).json({ msg: 'You are not a member of this project' });
    }

    project.members.splice(memberIndex, 1);
    await project.save();
    await project.populate('createdBy', 'name lastname email');
    await project.populate('members', 'name lastname email');

    return res.status(200).json(project);
  } catch (error) {
    return res.status(500).json({ msg: 'Error leaving project' });
  }
});

router.post("/:id/end", requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    await connectToDatabase();

    const projectId = req.params.id;

    const project = await Project.findById(projectId)
      .populate('createdBy', 'name lastname email')
      .populate('members', 'name lastname email');

    if (!project) {
      return res.status(404).json({ msg: 'Project not found' });
    }

   
    const tasks = await Task.find({ projectId: projectId })
      .populate('createdBy', 'name lastname email');

    const totalTasks = tasks.length;
    let completedTasks = 0;
    for (let i = 0; i < tasks.length; i++) {
      if (tasks[i].status === 'completed') {
        completedTasks = completedTasks + 1;
      }
    }
    const completionRate = totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(1) : '0.0';

    const memberStats: any[] = [];
    for (let j = 0; j < project.members.length; j++) {
      const member = project.members[j] as any;
      let memberName = (member.name || '') + ' ' + (member.lastname || '');
      memberName = memberName.trim() || member.email;

      let memberTasks = 0;
      let memberCompleted = 0;

      for (let k = 0; k < tasks.length; k++) {
        const taskCreatorId = String(tasks[k].createdBy?._id || tasks[k].createdBy);
        const memberId = String(member._id);
        if (taskCreatorId === memberId) {
          memberTasks = memberTasks + 1;
          if (tasks[k].status === 'completed') {
            memberCompleted = memberCompleted + 1;
          }
        }
      }

      memberStats.push({
        name: memberName,
        email: member.email,
        tasks: memberTasks,
        completed: memberCompleted
      });
    }

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]);
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let yPos = 800;
    const margin = 50;
    const lineHeight = 15;
    const titleSize = 20;
    const subheaderSize = 16;
    const normalSize = 12;

    const titleText = 'Project End Report';
    const titleWidth = helveticaBoldFont.widthOfTextAtSize(titleText, titleSize);
    page.drawText(titleText, {
      x: (595 - titleWidth) / 2,
      y: yPos,
      size: titleSize,
      font: helveticaBoldFont,
      color: rgb(0, 0, 0),
    });
    yPos -= 30;

    const dateText = `Date: ${new Date().toLocaleDateString()}`;
    const dateWidth = helveticaFont.widthOfTextAtSize(dateText, normalSize);
    page.drawText(dateText, {
      x: (595 - dateWidth) / 2,
      y: yPos,
      size: normalSize,
      font: helveticaFont,
      color: rgb(0, 0, 0),
    });
    yPos -= 40;

    page.drawText('Project Information', {
      x: margin,
      y: yPos,
      size: subheaderSize,
      font: helveticaBoldFont,
      color: rgb(0, 0, 0),
    });
    yPos -= lineHeight * 1.5;

    page.drawText(`Name: ${project.name}`, {
      x: margin,
      y: yPos,
      size: normalSize,
      font: helveticaFont,
      color: rgb(0, 0, 0),
    });
    yPos -= lineHeight;

    page.drawText(`Type: ${project.type || 'N/A'}`, {
      x: margin,
      y: yPos,
      size: normalSize,
      font: helveticaFont,
      color: rgb(0, 0, 0),
    });
    yPos -= lineHeight;

    page.drawText(`Members: ${project.members.length}`, {
      x: margin,
      y: yPos,
      size: normalSize,
      font: helveticaFont,
      color: rgb(0, 0, 0),
    });
    yPos -= lineHeight * 2;

    page.drawText('Task Statistics', {
      x: margin,
      y: yPos,
      size: subheaderSize,
      font: helveticaBoldFont,
      color: rgb(0, 0, 0),
    });
    yPos -= lineHeight * 1.5;

    page.drawText(`Total Tasks: ${totalTasks}`, {
      x: margin,
      y: yPos,
      size: normalSize,
      font: helveticaFont,
      color: rgb(0, 0, 0),
    });
    yPos -= lineHeight;

    page.drawText(`Completed: ${completedTasks}`, {
      x: margin,
      y: yPos,
      size: normalSize,
      font: helveticaFont,
      color: rgb(0, 0, 0),
    });
    yPos -= lineHeight;

    page.drawText(`Completion Rate: ${completionRate}%`, {
      x: margin,
      y: yPos,
      size: normalSize,
      font: helveticaFont,
      color: rgb(0, 0, 0),
    });
    yPos -= lineHeight * 2;

    page.drawText('Team Members', {
      x: margin,
      y: yPos,
      size: subheaderSize,
      font: helveticaBoldFont,
      color: rgb(0, 0, 0),
    });
    yPos -= lineHeight * 1.5;

    let currentPage = page;
    for (let j = 0; j < memberStats.length; j++) {
      if (yPos < 100) {
        currentPage = pdfDoc.addPage([595, 842]);
        yPos = 800;
      }

      const member = memberStats[j];
      const memberText = `${member.name} (${member.email})`;
      currentPage.drawText(memberText, {
        x: margin,
        y: yPos,
        size: normalSize,
        font: helveticaFont,
        color: rgb(0, 0, 0),
      });
      yPos -= lineHeight;

      const statsText = `  Tasks: ${member.tasks} | Completed: ${member.completed}`;
      currentPage.drawText(statsText, {
        x: margin,
        y: yPos,
        size: normalSize,
        font: helveticaFont,
        color: rgb(0, 0, 0),
      });
      yPos -= lineHeight * 1.5;
    }

    const pdfBytes = await pdfDoc.save();
    const base64Pdf = Buffer.from(pdfBytes).toString('base64');

    
    await Task.deleteMany({ projectId: projectId });
    await Application.deleteMany({ projectId: projectId });
    await Project.findByIdAndDelete(projectId);

 
    return res.status(200).json({
      msg: 'Project ended successfully',
      pdfUrl: 'data:application/pdf;base64,' + base64Pdf
    });

  } catch (error) {
    console.error('Error ending project:', error);
    return res.status(500).json({ msg: 'Error ending project' });
  }
});

export default router;