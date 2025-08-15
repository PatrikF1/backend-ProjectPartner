import express, { type Express, type Response, type Request} from "express"
import { db } from "../db.js"
import { error } from "console";

const router = express.Router()

router.get('/', async (req: Request, res: Response) =>{
    let userCollection = db.collection('Users');
    let allUsers = await userCollection.find().toArray();
    res.status(200).json(allUsers);

    if(!allUsers){
        res.status(500).json({msg: "Korisnici nisu dohvaceni", error})
    }
})


export default router;