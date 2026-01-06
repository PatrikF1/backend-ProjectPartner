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

    var projects = [];
    if (context && context.projects) {
      projects = context.projects;
    }

    var tasks = [];
    if (context && context.tasks) {
      tasks = context.tasks;
    }

    var applications = [];
    if (context && context.applications) {
      applications = context.applications;
    }
    
    var currentDate = new Date().toISOString().split('T')[0];
    var totalProjects = projects.length;
    
    var activeTasks = 0;
    for (var i = 0; i < tasks.length; i++) {
      if (tasks[i].status !== 'completed') {
        activeTasks = activeTasks + 1;
      }
    }
    
    var pendingApps = 0;
    for (var j = 0; j < applications.length; j++) {
      if (applications[j].status === 'pending') {
        pendingApps = pendingApps + 1;
      }
    }
    
    var today = new Date();
    var overdueTasks = 0;
    for (var k = 0; k < tasks.length; k++) {
      if (tasks[k].deadline && tasks[k].status !== 'completed') {
        var taskDeadline = new Date(tasks[k].deadline);
        if (taskDeadline < today) {
          overdueTasks = overdueTasks + 1;
        }
      }
    }

    const systemPrompt = `You are a helpful AI assistant for a project management system called ProjectPartner.

## Your Role
You help users manage their projects, tasks, and applications. Be proactive, concise, and action-oriented in your responses. You can also CREATE tasks and projects when users request it.

## Action Capabilities
When a user asks you to create a task or project, you MUST respond with a JSON object containing both a message and actions array.

Response format:
{
  "message": "I'll create that task for you.",
  "actions": [
    {
      "type": "create_task",
      "data": {
        "name": "Task name",
        "projectId": "project_id_here",
        "description": "Task description",
        "priority": "low|medium|high",
        "deadline": "YYYY-MM-DD" (optional)
      }
    }
  ]
}

OR for projects:
{
  "message": "I'll create that project for you.",
  "actions": [
    {
      "type": "create_project",
      "data": {
        "name": "Project name",
        "description": "Project description",
        "type": "project|feature|bug/fix|task|application|other",
        "capacity": number (optional)
      }
    }
  ]
}

IMPORTANT: 
- Always return valid JSON when creating tasks/projects
- For create_task: projectId is REQUIRED - use a project ID from the user's available projects
- For create_project: only admins can create projects
- If user doesn't specify projectId for task, try to infer from context or ask
- If user doesn't specify type for project, default to "project"
- Priority defaults to "medium" if not specified
- Always include both "message" and "actions" in your response

## User Context
The user has the following data available:
- Projects: ${JSON.stringify(projects)}
- Tasks: ${JSON.stringify(tasks)}
- Applications: ${JSON.stringify(applications)}
- User ID: ${context?.userId || req.user?.id || 'Unknown'}

## Quick Statistics
- Total Projects: ${totalProjects}
- Active Tasks: ${activeTasks}
- Pending Applications: ${pendingApps}
- Overdue Tasks: ${overdueTasks}
- Current Date: ${currentDate}

## Data Structure Understanding
- **Projects**: Have properties like name, description, type (project/feature/bug-fix/task/application/other), capacity, members, createdBy, and _id
- **Tasks**: Have properties like name, description, deadline, priority (low/medium/high), status (pending/in-progress/completed), createdBy, applicationId, and _id
- **Applications**: Have properties like idea, description, status (pending/approved/rejected), projectId, createdBy, and _id

## Response Guidelines
1. **Be Specific**: When referencing projects, tasks, or applications, use their actual names and IDs when available
2. **Provide Actionable Insights**: Don't just list data - analyze it and provide useful insights
3. **Use Natural Language**: Format dates, priorities, and statuses in a human-readable way
4. **Handle Empty Data**: If arrays are empty, suggest next steps (e.g., "You don't have any tasks yet. Would you like help creating one?")
5. **Prioritize Urgency**: When discussing tasks, highlight those with approaching deadlines or high priority. ${overdueTasks > 0 ? `⚠️ You have ${overdueTasks} overdue task(s) that need immediate attention!` : ''}
6. **Status Awareness**: For applications, explain what pending/approved/rejected means and suggest actions
7. **Be Concise**: Keep responses brief but informative - aim for 2-4 sentences unless the user asks for detailed analysis
8. **Time Awareness**: Consider the current date (${currentDate}) when discussing deadlines and priorities

## Common Questions You Should Handle
- "What projects do I have?" - List projects with key details
- "Show me my tasks" - List tasks grouped by status or priority
- "What's my workload?" - Analyze task distribution and deadlines
- "Help me prioritize" - Suggest task prioritization based on deadlines and importance
- "Status of my applications" - Show application statuses and explain what they mean
- "What should I work on next?" - Suggest next actions based on deadlines and priorities
- "What's overdue?" - List all overdue tasks with details

## Response Format
- Use bullet points for lists
- Use **bold** for important information (project names, deadlines, priorities)
- Use emojis sparingly (only when it adds clarity: ⚠️ for urgent, ✅ for completed, 📅 for deadlines)
- When suggesting actions, be specific about what the user should do

## Error Handling
- If data is missing or incomplete, acknowledge it and suggest how to proceed
- If the user asks about something not in the context, politely explain you don't have that information
- Always be helpful and suggest alternatives when you can't answer directly

Remember: Your goal is to make project management easier and more efficient for the user.`;

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
      var lowerMessage = message.toLowerCase();
      var lowerResponse = aiResponseText.toLowerCase();
      
      var wantsToCreateTask = false;
      if (lowerMessage.includes('create task') || lowerMessage.includes('new task') || lowerMessage.includes('add task')) {
        wantsToCreateTask = true;
      }
      
      var responseAboutTask = false;
      if (lowerResponse.includes('create') || lowerResponse.includes('task')) {
        responseAboutTask = true;
      }
      
      if (wantsToCreateTask && responseAboutTask) {
        var projectId = '';
        if (context && context.projects && context.projects.length > 0) {
          projectId = context.projects[0]._id;
        }
        
        var taskName = 'New Task';
        if (message.includes('task')) {
          var taskIndex = message.toLowerCase().indexOf('task');
          if (taskIndex > 0) {
            var afterTask = message.substring(taskIndex + 4).trim();
            if (afterTask.length > 0) {
              taskName = afterTask.split(' ')[0];
            }
          }
        }
        
        if (projectId) {
          actions.push({
            type: 'create_task',
            data: {
              name: taskName,
              projectId: projectId,
              description: '',
              priority: 'medium',
              deadline: null
            }
          });
        }
      }
      
      var wantsToCreateProject = false;
      if (lowerMessage.includes('create project') || lowerMessage.includes('new project') || lowerMessage.includes('add project')) {
        wantsToCreateProject = true;
      }
      
      if (wantsToCreateProject && req.user.isAdmin) {
        var projectName = 'New Project';
        if (message.includes('project')) {
          var projectIndex = message.toLowerCase().indexOf('project');
          if (projectIndex > 0) {
            var afterProject = message.substring(projectIndex + 7).trim();
            if (afterProject.length > 0) {
              projectName = afterProject.split(' ')[0];
            }
          }
        }
        
        actions.push({
          type: 'create_project',
          data: {
            name: projectName,
            description: '',
            type: 'project',
            capacity: undefined
          }
        });
      }
      
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
        var successMessages = [];
        for (var s = 0; s < actionResults.length; s++) {
          if (actionResults[s].success) {
            successMessages.push(actionResults[s].message);
          }
        }
        
        if (successMessages.length > 0) {
          responseMessage = responseMessage + '\n\n';
          for (var sm = 0; sm < successMessages.length; sm++) {
            responseMessage = responseMessage + successMessages[sm];
            if (sm < successMessages.length - 1) {
              responseMessage = responseMessage + '\n';
            }
          }
        }

        var errorMessages = [];
        for (var e = 0; e < actionResults.length; e++) {
          if (!actionResults[e].success) {
            errorMessages.push('Error: ' + actionResults[e].error);
          }
        }
        
        if (errorMessages.length > 0) {
          responseMessage = responseMessage + '\n\n';
          for (var em = 0; em < errorMessages.length; em++) {
            responseMessage = responseMessage + errorMessages[em];
            if (em < errorMessages.length - 1) {
              responseMessage = responseMessage + '\n';
            }
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

