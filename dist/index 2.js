import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import userRoutes from "./routes/Users.js";
dotenv.config();
const PORT = process.env.PORT;
const app = express();
app.use(cors());
app.use(express.json());
app.get('/', (req, res) => {
    res.send('Backend radi!!!');
});
app.use("/users", userRoutes);
app.listen(PORT, error => {
    if (error) {
        console.log('Greška prilikom pokretanja servera', error);
    }
    console.log(`Aplikacija radi na http://localhost:${PORT}`);
});
