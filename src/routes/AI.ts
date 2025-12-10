import express from 'express';
import OpenAI from 'openai';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { connectToDatabase } from '../db.js';

const router = express.Router();

if (!process.env.OPENAI_API_KEY) {
  console.warn('WARNING: OPENAI_API_KEY nije postavljen u environment variables');
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
        msg: 'OpenAI API key nije konfiguriran',
        error: 'Postavite OPENAI_API_KEY u vašem .env fajlu',
      });
    }

    await connectToDatabase();
    const { message, context } = req.body;

    if (!message) {
      return res.status(400).json({ msg: 'Potrebno je unijeti poruku' });
    }

    const projects = context?.projects || [];
    const tasks = context?.tasks || [];
    const applications = context?.applications || [];
    
    const currentDate = new Date().toISOString().split('T')[0];
    const totalProjects = projects.length;
    const activeTasks = tasks.filter((task: any) => task.status !== 'completed').length;
    const pendingApps = applications.filter((app: any) => app.status === 'pending').length;
    
    const today = new Date();
    const overdueTasks = tasks.filter((task: any) => {
      if (!task.deadline || task.status === 'completed') return false;
      return new Date(task.deadline) < today;
    }).length;

    const systemPrompt = `You are a helpful AI assistant for a project management system called ProjectPartner.

## Your Role
You help users manage their projects, tasks, and applications. Be proactive, concise, and action-oriented in your responses.

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

    const aiResponse = completion.choices[0]?.message?.content || "I apologize, but I couldn't process your request.";

    return res.status(200).json({
      message: aiResponse,
      success: true,
    });
  } catch (error) {
    console.error('AI Chat Error:', error);
    return res.status(500).json({
      msg: 'Error processing AI request',
    });
  }
});

export default router;

