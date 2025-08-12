import express, { type Express, type Request, type Response} from "express"
import cors from "cors"
import dotenv from "dotenv"
import userRoutes from "./routes/Users.js"

dotenv.config();

const PORT = process.env.PORT as string;

const app: Express = express()

app.use(cors())
app.use(express.json())

app.get('/', (req: Request, res: Response) => {
  res.send('Backend radi!!!')
})

app.use("/users", userRoutes);



app.listen(PORT, error => {
  if (error) {
    console.log('Greška prilikom pokretanja servera', error)
  }
  console.log(`Aplikacija radi na http://localhost:${PORT}`)
})