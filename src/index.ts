<<<<<<< HEAD
import express, { type Express, type Request, type Response} from "express"
=======
<<<<<<< HEAD
import express from "express"
>>>>>>> b10fe56 (valjda ce sada raditi)
import cors from "cors"
import dotenv from "dotenv"
import userRoutes from "./routes/Users.js"

dotenv.config();

const PORT = process.env.PORT as string;

<<<<<<< HEAD
const app: Express = express()
=======
const app = express()
=======
import express, { type Express, type Request, type Response} from "express"
import cors from "cors"
import dotenv from "dotenv"
import userRoutes from "./routes/Users.js"

dotenv.config();

const PORT = process.env.PORT as string;

const app: Express = express()
>>>>>>> 1380466 (valjda ce sada raditi)
>>>>>>> b10fe56 (valjda ce sada raditi)

app.use(cors())
app.use(express.json())

<<<<<<< HEAD
app.get('/', (req: Request, res: Response) => {
  res.send('Backend radi!!!')
})

app.use("/users", userRoutes);


=======
<<<<<<< HEAD
app.get('/', (req, res) => {
  res.send('Backend radi')
})

=======
app.get('/', (req: Request, res: Response) => {
  res.send('Backend radi!!!')
})

app.use("/users", userRoutes);


>>>>>>> 1380466 (valjda ce sada raditi)
>>>>>>> b10fe56 (valjda ce sada raditi)

app.listen(PORT, error => {
  if (error) {
    console.log('Greška prilikom pokretanja servera', error)
  }
<<<<<<< HEAD
  console.log(`Aplikacija radi na http://localhost:${PORT}`)
=======
<<<<<<< HEAD
  console.log(`SharpApp poslužitelj dela na http://localhost:${PORT}`)
=======
  console.log(`Aplikacija radi na http://localhost:${PORT}`)
>>>>>>> 1380466 (valjda ce sada raditi)
>>>>>>> b10fe56 (valjda ce sada raditi)
})