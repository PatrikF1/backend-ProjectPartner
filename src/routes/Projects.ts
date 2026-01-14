import express, { Response } from "express";
import mongoose from "mongoose";
import { connectToDatabase } from "../db.js";
import Project from "../models/Project.js";
import Task from "../models/Task.js";
import Application from "../models/Application.js";
import { requireAdmin, requireAuth, AuthRequest } from "../middleware/auth.js";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

var router = express.Router();

interface CreateProjectRequest {
  name: string;
  description: string;
  deadline?: string;
}

router.post("/", requireAdmin, async (req: AuthRequest, res: Response) => {
  var body = req.body as CreateProjectRequest;
  var name = body.name;
  var description = body.description;
  var deadline = body.deadline;

  if (!name || !description) {
    return res.status(400).json({ msg: 'Name and description are required' });
  }

  try {
    await connectToDatabase();

    var newProject = new Project({
      name: name,
      description: description,
      type: 'project',
      deadline: deadline ? new Date(deadline) : null,
      createdBy: req.user!._id
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
    await connectToDatabase();

    var project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ msg: 'Project not found' });
    }

    var userId = String(req.user!._id);
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

    project.members.push(req.user!._id as mongoose.Types.ObjectId);
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

    var project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ msg: 'Project not found' });
    }

    var userId = req.user!._id;
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

router.post("/:id/end", requireAdmin, async (req: AuthRequest, res: Response) => {
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
    var inProgressTasks = 0;
    var notStartedTasks = 0;
    for (var i = 0; i < tasks.length; i++) {
      if (tasks[i].status === 'completed') {
        completedTasks = completedTasks + 1;
      } else if (tasks[i].status === 'in-progress') {
        inProgressTasks = inProgressTasks + 1;
      } else {
        notStartedTasks = notStartedTasks + 1;
      }
    }
    var completionRate = totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(1) : '0.0';
    
    var projectCreatedDate = project.createdAt ? new Date(project.createdAt).toLocaleDateString() : 'N/A';
    var projectDeadline = project.deadline ? new Date(project.deadline).toLocaleDateString() : 'No deadline';
    var projectCreator = project.createdBy;
    var creatorName = '';
    if (projectCreator && typeof projectCreator === 'object' && 'name' in projectCreator) {
      var creatorObj = projectCreator as { name?: string; lastname?: string; email?: string };
      creatorName = (creatorObj.name || '') + ' ' + (creatorObj.lastname || '');
      creatorName = creatorName.trim() || (creatorObj.email || 'Unknown');
    }

    var memberStats = [];
    for (var j = 0; j < project.members.length; j++) {
      var member = project.members[j];
      var memberName = '';
      var memberEmail = '';
      var memberId = '';

      if (member) {
        var memberObj = member as unknown as { name?: string; lastname?: string; email?: string; _id?: unknown };
        memberName = (memberObj.name || '') + ' ' + (memberObj.lastname || '');
        memberName = memberName.trim() || (memberObj.email || '');
        memberEmail = memberObj.email || '';
        memberId = String(memberObj._id || '');
      }

      var memberTasks = 0;
      var memberCompleted = 0;

      for (var k = 0; k < tasks.length; k++) {
        var taskCreatorId = String(tasks[k].createdBy?._id || tasks[k].createdBy);
        if (taskCreatorId === memberId) {
          memberTasks = memberTasks + 1;
          if (tasks[k].status === 'completed') {
            memberCompleted = memberCompleted + 1;
          }
        }
      }

      memberStats.push({
        name: memberName,
        email: memberEmail,
        tasks: memberTasks,
        completed: memberCompleted
      });
    }

    var pdfDoc = await PDFDocument.create();
    var page = pdfDoc.addPage([595, 842]);
    var helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    var helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    function replaceCroatianChars(text: string): string {
      return text.replace(/ć/g, 'c').replace(/č/g, 'c').replace(/đ/g, 'd').replace(/š/g, 's').replace(/ž/g, 'z')
        .replace(/Ć/g, 'C').replace(/Č/g, 'C').replace(/Đ/g, 'D').replace(/Š/g, 'S').replace(/Ž/g, 'Z');
    }

    function drawText(p: any, text: string, x: number, y: number, size: number, font: any, bold: boolean) {
      p.drawText(text, { x: x, y: y, size: size, font: bold ? helveticaBoldFont : font, color: rgb(0, 0, 0) });
    }

    var yPos = 800;
    var margin = 50;
    var lineHeight = 15;

    drawText(page, 'Project End Report', 200, yPos, 20, helveticaBoldFont, true);
    yPos -= 30;
    drawText(page, `Date: ${new Date().toLocaleDateString()}`, 250, yPos, 12, helveticaFont, false);
    yPos -= 40;

    drawText(page, 'Project Information', margin, yPos, 16, helveticaBoldFont, true);
    yPos -= 20;
    drawText(page, `Name: ${replaceCroatianChars(project.name)}`, margin, yPos, 12, helveticaFont, false);
    yPos -= lineHeight;
    drawText(page, `Description: ${replaceCroatianChars(project.description || 'N/A')}`, margin, yPos, 12, helveticaFont, false);
    yPos -= lineHeight;
    drawText(page, `Created By: ${replaceCroatianChars(creatorName)}`, margin, yPos, 12, helveticaFont, false);
    yPos -= lineHeight;
    drawText(page, `Created Date: ${projectCreatedDate}`, margin, yPos, 12, helveticaFont, false);
    yPos -= lineHeight;
    drawText(page, `Deadline: ${projectDeadline}`, margin, yPos, 12, helveticaFont, false);
    yPos -= lineHeight;
    drawText(page, `Members: ${project.members.length}`, margin, yPos, 12, helveticaFont, false);
    yPos -= 30;

    drawText(page, 'Task Statistics', margin, yPos, 16, helveticaBoldFont, true);
    yPos -= 20;
    drawText(page, `Total: ${totalTasks} | Completed: ${completedTasks} | In Progress: ${inProgressTasks} | Not Started: ${notStartedTasks}`, margin, yPos, 12, helveticaFont, false);
    yPos -= lineHeight;
    drawText(page, `Completion Rate: ${completionRate}%`, margin, yPos, 12, helveticaFont, false);
    yPos -= 30;

    drawText(page, 'Team Members', margin, yPos, 16, helveticaBoldFont, true);
    yPos -= 20;

    var currentPage = page;
    for (var j = 0; j < memberStats.length; j++) {
      if (yPos < 100) {
        currentPage = pdfDoc.addPage([595, 842]);
        yPos = 800;
      }
      var memberStat = memberStats[j];
      var memberText = `${replaceCroatianChars(memberStat.name)} (${memberStat.email}) - Tasks: ${memberStat.tasks}, Completed: ${memberStat.completed}`;
      drawText(currentPage, memberText, margin, yPos, 12, helveticaFont, false);
      yPos -= lineHeight;
    }

    if (yPos < 150) {
      currentPage = pdfDoc.addPage([595, 842]);
      yPos = 800;
    }

    drawText(currentPage, 'Task List', margin, yPos, 16, helveticaBoldFont, true);
    yPos -= 20;

    for (var l = 0; l < tasks.length; l++) {
      if (yPos < 100) {
        currentPage = pdfDoc.addPage([595, 842]);
        yPos = 800;
      }
      var task = tasks[l];
      var taskName = replaceCroatianChars(task.name || 'Unnamed Task');
      var taskStatus = task.status || 'unknown';
      var taskDeadline = task.deadline ? new Date(task.deadline).toLocaleDateString() : 'No deadline';
      drawText(currentPage, `${l + 1}. ${taskName} - Status: ${taskStatus}, Deadline: ${taskDeadline}`, margin, yPos, 12, helveticaFont, false);
      yPos -= lineHeight;
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