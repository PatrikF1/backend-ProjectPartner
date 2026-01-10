import express, { Response, Request } from "express";
import { connectToDatabase } from "../db.js";
import Project from "../models/Project.js";
import Task from "../models/Task.js";
import Application from "../models/Application.js";
import { requireAdmin, requireAuth, AuthRequest } from "../middleware/auth.js";
import PdfPrinter from "pdfmake";

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

    const fonts = {
      Roboto: {
        normal: 'Helvetica',
        bold: 'Helvetica-Bold',
        italics: 'Helvetica-Oblique',
        bolditalics: 'Helvetica-BoldOblique'
      }
    };

    const printer = new PdfPrinter(fonts);

    const docDefinition: any = {
      content: [
        { text: 'Project End Report', style: 'header', alignment: 'center' },
        { text: `Date: ${new Date().toLocaleDateString()}`, alignment: 'center', margin: [0, 0, 0, 20] },
        { text: 'Project Information', style: 'subheader', margin: [0, 10, 0, 10] },
        { text: `Name: ${project.name}`, margin: [0, 5, 0, 5] },
        { text: `Type: ${project.type || 'N/A'}`, margin: [0, 5, 0, 5] },
        { text: `Members: ${project.members.length}`, margin: [0, 5, 0, 20] },
        { text: 'Task Statistics', style: 'subheader', margin: [0, 10, 0, 10] },
        { text: `Total Tasks: ${totalTasks}`, margin: [0, 5, 0, 5] },
        { text: `Completed: ${completedTasks}`, margin: [0, 5, 0, 5] },
        { text: `Completion Rate: ${completionRate}%`, margin: [0, 5, 0, 20] },
        { text: 'Team Members', style: 'subheader', margin: [0, 10, 0, 10] },
        ...memberStats.map(member => [
          { text: `${member.name} (${member.email})`, margin: [0, 5, 0, 2] },
          { text: `  Tasks: ${member.tasks} | Completed: ${member.completed}`, margin: [0, 0, 0, 10] }
        ]).flat()
      ],
      styles: {
        header: {
          fontSize: 20,
          bold: true
        },
        subheader: {
          fontSize: 16,
          bold: true
        }
      },
      defaultStyle: {
        fontSize: 12
      }
    };

    const pdfDoc = printer.createPdfKitDocument(docDefinition);
    const chunks: Buffer[] = [];

    pdfDoc.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });

    const pdfPromise = new Promise<string>((resolve) => {
      pdfDoc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);
        const base64Pdf = pdfBuffer.toString('base64');
        resolve(base64Pdf);
      });
    });

    pdfDoc.end();
    const base64Pdf = await pdfPromise;

    
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