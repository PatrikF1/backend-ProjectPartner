import express, { Express, Response, Request } from 'express'
import { connectToDatabase } from '../db.js'
import User from '../models/User.js'
import bcrypt from 'bcryptjs'

const router = express.Router()

interface RegisterBody {
  name: string
  lastname: string
  email: string
  phone?: number
  password: string
  c_password: string
}

interface LoginBody {
  email: string
  password: string
}

router.post("/register", async (req: Request, res: Response) => { 
  const { name, lastname, email, phone, password, c_password } = req.body as RegisterBody
  
  if (!name || !lastname || !email || !password || !c_password) {
    return res.status(400).json({ msg: 'Sva obavezna polja su obavezna' })
  }
  
  if (password !== c_password) {
    return res.status(400).json({ msg: 'Lozinke se ne podudaraju' })
  }

  try {
    await connectToDatabase()
    
    const exists = await User.findOne({ email })
    if (exists) return res.status(409).json({ msg: 'Korisnik već postoji' })

    const passwordHash = await bcrypt.hash(password, 10)
    
    const newUser = new User({ 
      name,
      lastname,
      email, 
      phone,
      passwordHash
    })
    
    const savedUser = await newUser.save()
    return res.status(201).json({ 
      _id: savedUser._id, 
      name: savedUser.name,
      lastname: savedUser.lastname,
      email: savedUser.email,
      phone: savedUser.phone
    })
  } catch (error) {
    return res.status(500).json({ msg: 'Greška pri registraciji' })
  }
})




export default router
