import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import userRoutes from "./routes/Users.js";
import authRoutes from "./routes/Auth.js";
import projectRoutes from "./routes/Projects.js";
import githubRoutes from "./routes/Githubs.js";
dotenv.config();
const PORT = process.env.PORT || 3000;
const app = express();
app.use(cors());
app.use(express.json());
app.get('/', (req, res) => {
    res.send('Backend radi!!!');
});
app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/github", githubRoutes);
app.listen(PORT, error => {
    if (error) {
        console.log('Greška prilikom pokretanja servera', error);
    }
    console.log(`Aplikacija radi na http://localhost:${PORT}`);
});
//# sourceMappingURL=index.js.map