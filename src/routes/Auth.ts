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
  isAdmin?: boolean
}

interface LoginBody {
  email: string
  password: string
}

router.post("/register", async (req: Request, res: Response) => { 
  const { name, lastname, email, phone, password, c_password, isAdmin } = req.body as RegisterBody
  
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
      passwordHash,
      isAdmin: isAdmin || false
    })
    
    const savedUser = await newUser.save()
    return res.status(201).json({ 
      _id: savedUser._id, 
      name: savedUser.name,
      lastname: savedUser.lastname,
      email: savedUser.email,
      phone: savedUser.phone,
      isAdmin: savedUser.isAdmin
    })
  } catch (error) {
    return res.status(500).json({ msg: 'Greška pri registraciji' })
  }
})


router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body as LoginBody
  if (!email || !password) return res.status(400).json({ msg: 'Email i lozinka su obavezni' })

  try {
    await connectToDatabase()

    const user = await User.findOne({ email })
    if (!user) return res.status(401).json({ msg: 'Neispravni podaci' })

    const ok = await bcrypt.compare(password, user.passwordHash)
    if (!ok) return res.status(401).json({ msg: 'Neispravni podaci' })

    return res.status(200).json({
      _id: user._id,
      name: user.name,
      lastname: user.lastname,
      email: user.email,
      phone: user.phone
     
    })
  } catch {
    return res.status(500).json({ msg: 'Greška pri prijavi' })
  }
})

export default router
