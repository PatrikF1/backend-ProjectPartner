import express, { type Response, type Request } from "express";
import { connectToDatabase } from "../db.js";
import User from "../models/User.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    await connectToDatabase();
    const users = await User.find().select('name lastname email isAdmin');
    return res.status(200).json(users);
  } 
  catch (error) {
    return res.status(500).json({ msg: 'Error' });
  }
});


export default router;