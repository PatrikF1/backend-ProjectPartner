import express, { Response, Request } from "express";
import { connectToDatabase } from "../db.js";
import Space from "../models/Space.js";
import { requireAdmin, requireAuth, AuthRequest } from "../middleware/auth.js";
import mongoose from "mongoose";

const router = express.Router();

interface CreateSpaceBody {
  name: string;
  description: string;
  type: 'workspace' | 'project-space' | 'team-space' | 'meeting-room';
  capacity?: number;
}

interface UpdateSpaceBody {
  name?: string;
  description?: string;
  type?: 'workspace' | 'project-space' | 'team-space' | 'meeting-room';
  capacity?: number;
}

router.post("/", requireAdmin, async (req: AuthRequest, res: Response) => {
  const { 
    name, 
    description, 
    type, 
    capacity
  } = req.body as CreateSpaceBody;

  if (!name || !description || !type) {
    return res.status(400).json({ msg: 'Naziv, opis i tip prostora su obavezni' });
  }

  try {
    await connectToDatabase();

    const newSpace = new Space({
      name,
      description,
      type,
      capacity,
      createdBy: req.user._id
    });

    const savedSpace = await newSpace.save();
    await savedSpace.populate('createdBy', 'name lastname email');
    
    return res.status(201).json({
      _id: savedSpace._id,
      name: savedSpace.name,
      description: savedSpace.description,
      type: savedSpace.type,
      capacity: savedSpace.capacity,
      createdBy: savedSpace.createdBy,
      createdAt: savedSpace.createdAt,
      updatedAt: savedSpace.updatedAt
    });
  } catch (error) {
    console.error('Greška pri kreiranju prostora:', error);
    return res.status(500).json({ msg: 'Greška pri kreiranju prostora' });
  }
});

router.get("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    await connectToDatabase();

    const spaces = await Space.find()
      .populate('createdBy', 'name lastname email')
      .populate('members', 'name lastname email')
      .sort({ createdAt: -1 });

    return res.status(200).json(spaces);
  } catch (error) {
    console.error('Greška pri dohvatanju prostora:', error);
    return res.status(500).json({ msg: 'Greška pri dohvatanju prostora' });
  }
});

router.get("/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    await connectToDatabase();

    const space = await Space.findById(id)
      .populate('createdBy', 'name lastname email');

    if (!space) {
      return res.status(404).json({ msg: 'Prostor nije pronađen' });
    }

    return res.status(200).json(space);
  } catch (error) {
    console.error('Greška pri dohvatanju prostora:', error);
    return res.status(500).json({ msg: 'Greška pri dohvatanju prostora' });
  }
});

router.put("/:id", requireAdmin, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const updateData = req.body as UpdateSpaceBody;

  try {
    await connectToDatabase();

    const updatedSpace = await Space.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate('createdBy', 'name lastname email');

    if (!updatedSpace) {
      return res.status(404).json({ msg: 'Prostor nije pronađen' });
    }

    return res.status(200).json(updatedSpace);
  } catch (error) {
    console.error('Greška pri ažuriranju prostora:', error);
    return res.status(500).json({ msg: 'Greška pri ažuriranju prostora' });
  }
});

router.delete("/:id", requireAdmin, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    await connectToDatabase();

    const deletedSpace = await Space.findByIdAndDelete(id);

    if (!deletedSpace) {
      return res.status(404).json({ msg: 'Prostor nije pronađen' });
    }

    return res.status(200).json({ msg: 'Prostor je uspješno obrisan' });
  } catch (error) {
    console.error('Greška pri brisanju prostora:', error);
    return res.status(500).json({ msg: 'Greška pri brisanju prostora' });
  }
});


// POST /api/spaces/:id/join - Prijava na space
router.post("/:id/join", requireAuth, async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.user._id;
  
    try {
      await connectToDatabase();
  
      const space = await Space.findById(id);
      if (!space) {
        return res.status(404).json({ msg: 'Space nije pronađen' });
      }
  
      // Provjeri je li korisnik već u space-u
      if (space.members.includes(userId)) {
        return res.status(400).json({ msg: 'Već ste u ovom space-u' });
      }
  
      // Provjeri kapacitet
      if (space.capacity && space.members.length >= space.capacity) {
        return res.status(400).json({ msg: 'Space je pun' });
      }
  
      // Dodaj korisnika u space
      space.members.push(userId);
      await space.save();
  
      // Populate members da dobijemo korisničke podatke
      await space.populate('members', 'name lastname email');
      await space.populate('createdBy', 'name lastname email');
  
      return res.status(200).json(space);
    } catch (error) {
      console.error('Greška pri pridruživanju space-u:', error);
      return res.status(500).json({ msg: 'Greška pri pridruživanju space-u' });
    }
  });
  
  // POST /api/spaces/:id/leave - Napuštanje space-a
  router.post("/:id/leave", requireAuth, async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.user._id;
  
    try {
      await connectToDatabase();
  
      const space = await Space.findById(id);
      if (!space) {
        return res.status(404).json({ msg: 'Space nije pronađen' });
      }
  
      // Provjeri je li korisnik u space-u
      if (!space.members.includes(userId)) {
        return res.status(400).json({ msg: 'Niste u ovom space-u' });
      }
  
      // Ukloni korisnika iz space-a
      space.members = space.members.filter((memberId: mongoose.Types.ObjectId) => memberId.toString() !== userId.toString());
      await space.save();
  
      // Populate members da dobijemo korisničke podatke
      await space.populate('members', 'name lastname email');
      await space.populate('createdBy', 'name lastname email');
  
      return res.status(200).json(space);
    } catch (error) {
      console.error('Greška pri napuštanju space-a:', error);
      return res.status(500).json({ msg: 'Greška pri napuštanju space-a' });
    }
  });

export default router;
