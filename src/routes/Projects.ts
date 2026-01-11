import express, { Response } from "express";
import { connectToDatabase } from "../db.js";
import Project from "../models/Project.js";
import Task from "../models/Task.js";
import Application from "../models/Application.js";
import { requireAdmin, requireAuth, AuthRequest } from "../middleware/auth.js";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

const router = express.Router();

interface CreateProjectRequest {
  name: string;
  description: string;
  deadline?: string;
}

router.post("/", requireAdmin, async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ msg: 'Unauthorized' });
  }

  var body = req.body as CreateProjectRequest;
  var name = body.name;
  var description = body.description;

  if (!name || !description) {
    return res.status(400).json({ msg: 'Name and description are required' });
  }

  try {
    await connectToDatabase();

    var newProject = new Project({
      name: name,
      description: description,
      type: 'project',
      createdBy: req.user._id
    });

    var savedProject = await newProject.save();
    await savedProject.populate('createdBy', 'name lastname email');
    
    return res.status(201).json(savedProject);
  } catch (error) {
    return res.status(500).json({ msg: 'Error creating project' });
  }
});

router.get("/", requireAuth, async (_req: AuthRequest, res: Response) => {
  try {
    await connectToDatabase();

    var projects = await Project.find()
      .populate('createdBy', 'name lastname email')
      .populate('members', 'name lastname email')
      .sort({ createdAt: -1 });

    return res.status(200).json(projects);
  } catch (error) {
    return res.status(500).json({ msg: 'Error fetching projects' });
  }
});


router.put("/:id", requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    await connectToDatabase();

    var project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ msg: 'Project not found' });
    }

    if (req.body.name) project.name = req.body.name;
    if (req.body.description) project.description = req.body.description;
    if (req.body.deadline !== undefined) {
      project.deadline = req.body.deadline ? new Date(req.body.deadline) : null;
    }

    await project.save();
    await project.populate('createdBy', 'name lastname email');
    await project.populate('members', 'name lastname email');

    return res.status(200).json(project);
  } catch (error) {
    return res.status(500).json({ msg: 'Error updating project' });
  }
});

router.post("/:id/join", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ msg: 'Unauthorized' });
    }

    await connectToDatabase();

    var project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ msg: 'Project not found' });
    }

    var userId = String(req.user._id);
    var isMember = false;
    for (var i = 0; i < project.members.length; i++) {
      if (project.members[i].toString() === userId) {
        isMember = true;
        break;
      }
    }
    if (isMember) {
      return res.status(400).json({ msg: 'You are already a member of this project' });
    }

    project.members.push(req.user._id as any);
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
    if (!req.user) {
      return res.status(401).json({ msg: 'Unauthorized' });
    }

    await connectToDatabase();

    var project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ msg: 'Project not found' });
    }

    var userId = req.user._id;
    var memberIndex = -1;
    for (var i = 0; i < project.members.length; i++) {
      if (project.members[i].toString() === String(userId)) {
        memberIndex = i;
        break;
      }
    }
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

    var projectId = req.params.id;

    var project = await Project.findById(projectId)
      .populate('createdBy', 'name lastname email')
      .populate('members', 'name lastname email');

    if (!project) {
      return res.status(404).json({ msg: 'Project not found' });
    }

   
    var tasks = await Task.find({ projectId: projectId })
      .populate('createdBy', 'name lastname email');

    var totalTasks = tasks.length;
    var completedTasks = 0;
    for (var i = 0; i < tasks.length; i++) {
      if (tasks[i].status === 'completed') {
        completedTasks = completedTasks + 1;
      }
    }
    var completionRate = totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(1) : '0.0';

    var memberStats = [];
    for (var j = 0; j < project.members.length; j++) {
      var member = project.members[j];
      var memberObj: any = member;
      var memberName = (memberObj.name || '') + ' ' + (memberObj.lastname || '');
      memberName = memberName.trim() || memberObj.email;

      var memberTasks = 0;
      var memberCompleted = 0;

      for (var k = 0; k < tasks.length; k++) {
        var taskCreatorId = String(tasks[k].createdBy?._id || tasks[k].createdBy);
        var memberId = String(memberObj._id);
        if (taskCreatorId === memberId) {
          memberTasks = memberTasks + 1;
          if (tasks[k].status === 'completed') {
            memberCompleted = memberCompleted + 1;
          }
        }
      }

      memberStats.push({
        name: memberName,
        email: memberObj.email,
        tasks: memberTasks,
        completed: memberCompleted
      });
    }

    var pdfDoc = await PDFDocument.create();
    var page = pdfDoc.addPage([595, 842]);
    var helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    var helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    function replaceCroatianChars(text: string): string {
      return text
        .replace(/ć/g, 'c')
        .replace(/č/g, 'c')
        .replace(/đ/g, 'd')
        .replace(/š/g, 's')
        .replace(/ž/g, 'z')
        .replace(/Ć/g, 'C')
        .replace(/Č/g, 'C')
        .replace(/Đ/g, 'D')
        .replace(/Š/g, 'S')
        .replace(/Ž/g, 'Z');
    };

    var yPos = 800;
    var margin = 50;
    var lineHeight = 15;
    var titleSize = 20;
    var subheaderSize = 16;
    var normalSize = 12;

    var titleText = 'Project End Report';
    var titleWidth = helveticaBoldFont.widthOfTextAtSize(titleText, titleSize);
    page.drawText(titleText, {
      x: (595 - titleWidth) / 2,
      y: yPos,
      size: titleSize,
      font: helveticaBoldFont,
      color: rgb(0, 0, 0),
    });
    yPos -= 30;

    var dateText = `Date: ${new Date().toLocaleDateString()}`;
    var dateWidth = helveticaFont.widthOfTextAtSize(dateText, normalSize);
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

    page.drawText(`Name: ${replaceCroatianChars(project.name)}`, {
      x: margin,
      y: yPos,
      size: normalSize,
      font: helveticaFont,
      color: rgb(0, 0, 0),
    });
    yPos -= lineHeight;

    page.drawText(`Type: ${replaceCroatianChars(project.type || 'N/A')}`, {
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

    var currentPage = page;
    for (var j = 0; j < memberStats.length; j++) {
      if (yPos < 100) {
        currentPage = pdfDoc.addPage([595, 842]);
        yPos = 800;
      }

      var memberStat = memberStats[j];
      var memberText = `${replaceCroatianChars(memberStat.name)} (${memberStat.email})`;
      if (memberText.length > 0) {
        currentPage.drawText(memberText, {
          x: margin,
          y: yPos,
          size: normalSize,
          font: helveticaFont,
          color: rgb(0, 0, 0),
        });
        yPos -= lineHeight;
      }

      var statsText = `  Tasks: ${memberStat.tasks} | Completed: ${memberStat.completed}`;
      currentPage.drawText(statsText, {
        x: margin,
        y: yPos,
        size: normalSize,
        font: helveticaFont,
        color: rgb(0, 0, 0),
      });
      yPos -= lineHeight * 1.5;
    }

    var pdfBytes = await pdfDoc.save();
    var base64Pdf = Buffer.from(pdfBytes).toString('base64');

    
    await Task.deleteMany({ projectId: projectId });
    await Application.deleteMany({ projectId: projectId });
    await Project.findByIdAndDelete(projectId);

 
    return res.status(200).json({
      msg: 'Project ended successfully',
      pdfUrl: 'data:application/pdf;base64,' + base64Pdf
    });

  } catch (error) {
    console.error('Error ending project:', error);
    return res.status(500).json({
      msg: 'Error ending project'
    });
  }
});

export default router;