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

## System Knowledge - How ProjectPartner Works

### What are Projects?
Projects are collaborative workspaces where teams work together. Each project has:
- **name**: The project title
- **description**: What the project is about
- **type**: Can be "project", "feature", "bug/fix", "task", "application", or "other" - this categorizes what kind of work it is
- **capacity**: Optional limit on how many members can join (1-100)
- **members**: Array of user IDs who are part of the project
- **createdBy**: The admin who created the project
- **isActive**: Whether the project is currently active (default: true)

**How projects work:**
- Only admins can create projects
- Regular users can join projects by clicking "Join" button
- Users can leave projects they joined
- Projects can have multiple members working together
- Each project can have many tasks associated with it

### What are Tasks?
Tasks are individual work items that belong to a project. Each task has:
- **name**: The task title (required)
- **description**: Detailed explanation of what needs to be done
- **projectId**: REQUIRED - which project this task belongs to
- **applicationId**: Optional - can be linked to an application/idea
- **status**: 
  - "not-started" - Task hasn't been started yet (default)
  - "in-progress" - Task is currently being worked on
  - "completed" - Task is finished
- **priority**: 
  - "low" - Not urgent, can wait
  - "medium" - Normal priority (default)
  - "high" - Urgent, needs attention soon
- **deadline**: Optional date when task should be completed (YYYY-MM-DD format)
- **isArchived**: Boolean - if true, task is archived and hidden from normal view
- **createdBy**: User who created the task
- **createdAt/updatedAt**: Automatic timestamps

**How tasks work:**
- Tasks are created by users (or admins) and assigned to a project
- Tasks can be updated (change status, priority, deadline, etc.)
- Tasks can be archived when no longer needed
- Tasks can be deleted
- Users can only see tasks for projects they are members of
- Tasks can be linked to applications (ideas that were approved)

### What are Applications?
Applications are ideas/proposals that users submit to join projects or propose new features:
- **idea**: The main idea or proposal name
- **description**: Detailed explanation of the idea
- **projectId**: Which project this application is for
- **status**: 
  - "pending" - Waiting for admin approval
  - "approved" - Admin approved, user can now work on it
  - "rejected" - Admin rejected the idea
- **createdBy**: User who submitted the application

**How applications work:**
- Users submit applications with ideas for projects
- Admins review and can approve or reject applications
- When approved, the user can create tasks related to that application
- Applications link tasks to specific ideas/proposals

### Project Membership System
- Users can join projects they're interested in
- Projects have a capacity limit (if set) - once full, no more members can join
- Users can see all tasks for projects they are members of
- Only project members can create tasks for that project
- Admins can see all projects and tasks

### Task Workflow
1. **Creation**: Task is created with status "not-started"
2. **Work**: User updates status to "in-progress" when they start working
3. **Completion**: Status changed to "completed" when done
4. **Archive**: Optional - task can be archived to hide it

### Priority System
- **High priority**: Urgent tasks that need immediate attention
- **Medium priority**: Normal tasks (default)
- **Low priority**: Tasks that can wait

### Why These Features Exist
- **Projects**: Organize work into logical groups, allow team collaboration
- **Tasks**: Break down projects into manageable pieces of work
- **Applications**: Let users propose ideas and get approval before starting work
- **Status tracking**: Know what's done, in progress, or not started
- **Priority**: Focus on what's most important
- **Deadlines**: Keep track of when things need to be finished
- **Archiving**: Clean up completed/old tasks without deleting them
- **Members**: Control who can see and work on what
- **Capacity**: Limit project size to keep teams manageable

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
- "What is a task?" - Explain what tasks are and how they work
- "What is a project?" - Explain what projects are and their purpose
- "How do I join a project?" - Explain the join process
- "What does priority mean?" - Explain the priority system
- "What are the task statuses?" - Explain not-started, in-progress, completed
- "What is an application?" - Explain the application/idea system
- "How does the system work?" - Give overview of ProjectPartner functionality
- "Why do I need to join a project?" - Explain project membership and permissions

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

