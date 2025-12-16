
import express, { type Express, type Request, type Response} from "express"
import cors from "cors"
import dotenv from "dotenv"
import userRoutes from "./routes/Users.js"
import authRoutes from "./routes/Auth.js"
import projectRoutes from "./routes/Projects.js"
import applicationRoutes from "./routes/Applications.js"
import taskRoutes from "./routes/Tasks.js"
import calendarRoutes from "./routes/Calendar.js"
import aiRoutes from "./routes/AI.js"
import { connectToDatabase } from "./db.js"

dotenv.config();

const PORT = process.env.PORT || 3000;

const app: Express = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))

app.get('/', (req: Request, res: Response) => {
  res.send('Backend radi!!!')
})

app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/calendar", calendarRoutes);
app.use("/api", aiRoutes);

app.listen(PORT, async (error) => {
  if (error) {
    console.log('Greška prilikom pokretanja servera', error)
    return
  }

  try {
    await connectToDatabase()
    console.log(`Aplikacija radi na http://localhost:${PORT}`)
  } catch (error) {
    console.error('Greška pri povezivanju na bazu podataka:', error)
    process.exit(1)
  }
})