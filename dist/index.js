import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import userRoutes from "./routes/Users.js";
import authRoutes from "./routes/Auth.js";
import projectRoutes from "./routes/Projects.js";
import applicationRoutes from "./routes/Applications.js";
import taskRoutes from "./routes/Tasks.js";
import calendarRoutes from "./routes/Calendar.js";
import aiRoutes from "./routes/AI.js";
import { connectToDatabase } from "./db.js";
dotenv.config();
const PORT = process.env.PORT || 3000;
const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.get('/', (_req, res) => {
    res.send('Backend radi!!!');
});
app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/calendar", calendarRoutes);
app.use("/api", aiRoutes);
app.listen(PORT, async (error) => {
    if (error) {
        console.log('Error starting server', error);
        return;
    }
    try {
        await connectToDatabase();
        console.log(`Application running on http://localhost:${PORT}`);
    }
    catch (error) {
        console.error('Error connecting to database:', error);
        process.exit(1);
    }
});
//# sourceMappingURL=index.js.map