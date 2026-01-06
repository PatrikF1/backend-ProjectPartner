import express from 'express';
import OpenAI from 'openai';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { connectToDatabase } from '../db.js';
import Task from '../models/Task.js';
import Project from '../models/Project.js';

const router = express.Router();

if (!process.env.OPENAI_API_KEY) {
  console.warn('WARNING: OPENAI_API_KEY is not set in environment variables');
}

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  : null;

router.post('/chat', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!openai) {
      return res.status(500).json({
        msg: 'OpenAI API key is not configured',
        error: 'Please set OPENAI_API_KEY in your .env file',
      });
    }

    await connectToDatabase();
    const { message, context } = req.body;

    if (!message) {
      return res.status(400).json({ msg: 'Message is required' });
    }

    var projects = context?.projects || [];
    var tasks = context?.tasks || [];
    var applications = context?.applications || [];

    const systemPrompt = `You are an AI assistant for ProjectPartner. Help users manage projects and tasks.

When user asks to create a task or project, respond with JSON:
{
  "message": "I'll create that for you.",
  "actions": [
    {
      "type": "create_task",
      "data": {
        "name": "Task name",
        "projectId": "project_id",
        "description": "Description",
        "priority": "low|medium|high",
        "deadline": "YYYY-MM-DD"
      }
    }
  ]
}

OR for projects:
{
  "message": "I'll create that project.",
  "actions": [
    {
      "type": "create_project",
      "data": {
        "name": "Project name",
        "description": "Description",
        "type": "project|feature|bug/fix|task|application|other",
        "capacity": number
      }
    }
  ]
}

User data: Projects: ${JSON.stringify(projects)}, Tasks: ${JSON.stringify(tasks)}, Applications: ${JSON.stringify(applications)}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    var aiResponseText = "I apologize, but I couldn't process your request.";
    if (completion.choices && completion.choices[0] && completion.choices[0].message && completion.choices[0].message.content) {
      aiResponseText = completion.choices[0].message.content;
    }
    
    var actions = [];
    var responseMessage = aiResponseText;

    try {
      var aiResponse = JSON.parse(aiResponseText);
      if (aiResponse.actions && Array.isArray(aiResponse.actions)) {
        actions = aiResponse.actions;
        if (aiResponse.message) {
          responseMessage = aiResponse.message;
        } else {
          responseMessage = aiResponseText;
        }
      }
    } catch (error) {
      responseMessage = aiResponseText;
    }

    var actionResults = [];
    if (actions.length > 0) {
      for (var i = 0; i < actions.length; i++) {
        var action = actions[i];
        try {
          if (action.type === 'create_task') {
            var taskData = action.data;
            if (!taskData.name || !taskData.projectId) {
              actionResults.push({
                type: 'create_task',
                success: false,
                error: 'Task name and projectId are required'
              });
              continue;
            }

            var project = await Project.findById(taskData.projectId);
            if (!project) {
              actionResults.push({
                type: 'create_task',
                success: false,
                error: 'Project not found'
              });
              continue;
            }

            var priority = 'medium';
            if (taskData.priority) {
              var priorityLower = taskData.priority.toLowerCase();
              if (priorityLower === 'low' || priorityLower === 'medium' || priorityLower === 'high') {
                priority = priorityLower;
              }
            }

            var task = new Task({
              projectId: taskData.projectId,
              applicationId: taskData.applicationId || null,
              name: taskData.name,
              description: taskData.description || '',
              status: taskData.status || 'not-started',
              priority: priority,
              deadline: taskData.deadline ? new Date(taskData.deadline) : null,
              createdBy: req.user._id
            });

            await task.save();
            await task.populate('createdBy', 'name lastname email');
            await task.populate('projectId', 'name');
            await task.populate('applicationId', 'idea');

            actionResults.push({
              type: 'create_task',
              success: true,
              message: 'Task created successfully: ' + taskData.name,
              data: task
            });
          } else if (action.type === 'create_project') {
            if (!req.user.isAdmin) {
              actionResults.push({
                type: 'create_project',
                success: false,
                error: 'Only administrators can create projects'
              });
              continue;
            }

            var projectData = action.data;
            if (!projectData.name || !projectData.description || !projectData.type) {
              actionResults.push({
                type: 'create_project',
                success: false,
                error: 'Project name, description and type are required'
              });
              continue;
            }

            var projectType = 'project';
            var validTypes = ['project', 'feature', 'bug/fix', 'other', 'task', 'application'];
            for (var t = 0; t < validTypes.length; t++) {
              if (projectData.type === validTypes[t]) {
                projectType = projectData.type;
                break;
              }
            }

            var newProject = new Project({
              name: projectData.name,
              description: projectData.description,
              type: projectType,
              capacity: projectData.capacity,
              createdBy: req.user._id
            });

            await newProject.save();
            await newProject.populate('createdBy', 'name lastname email');

            actionResults.push({
              type: 'create_project',
              success: true,
              message: 'Project created successfully: ' + projectData.name,
              data: newProject
            });
          }
        } catch (error: any) {
          var errorMsg = 'Error executing action';
          if (error && error.message) {
            errorMsg = error.message;
          }
          actionResults.push({
            type: action.type,
            success: false,
            error: errorMsg
          });
        }
      }

      if (actionResults.length > 0) {
        for (var s = 0; s < actionResults.length; s++) {
          if (actionResults[s].success) {
            responseMessage = responseMessage + '\n\n' + actionResults[s].message;
          } else {
            responseMessage = responseMessage + '\n\nError: ' + actionResults[s].error;
          }
        }
      }
    }

    return res.status(200).json({
      message: responseMessage,
      success: true,
      actions: actionResults
    });
  } catch (error) {
    console.error('AI Chat Error:', error);
    return res.status(500).json({
      msg: 'Error processing AI request',
    });
  }
});

export default router;

