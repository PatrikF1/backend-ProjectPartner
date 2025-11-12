import express from "express";
import { connectToDatabase } from "../db.js";
import Post from "../models/Post.js";
import { requireAuth, AuthRequest } from "../middleware/auth.js";

const router = express.Router();

router.post("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    await connectToDatabase();
    const post = await new Post({
      title: req.body.title,
      content: req.body.content,
      createdBy: req.user._id,
      comments: []
    }).save();
    await post.populate('createdBy', 'name lastname email');
    return res.status(201).json(post);
  } 
  catch (error) {
    return res.status(500).json({ msg: "Greška pri kreiranju posta" });
  }
});

router.get("/", requireAuth, async (req, res) => {
  try {
    await connectToDatabase();

    const posts = await Post.find()
      .populate('createdBy', 'name lastname email')
      .populate('comments.createdBy', 'name lastname email')
      .sort({ createdAt: -1 });

    return res.status(200).json(posts);
  } 
  catch (error) {
    return res.status(500).json({ msg: "Greška pri dohvatanju postova" });
  }
});

router.delete("/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    await connectToDatabase();
    await Post.findByIdAndDelete(req.params.id);
    return res.status(200).json({ msg: "Post je uspješno obrisan" });
  } 
  catch (error) {
    return res.status(500).json({ msg: "Greška pri brisanju posta" });
  }
});

router.post("/:id/comments", requireAuth, async (req: AuthRequest, res) => {
  try {
    await connectToDatabase();
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ msg: "Post nije pronađen" });
    
    post.comments.push({
      content: req.body.content,
      createdBy: req.user._id
    } as any);
    
    await post.save();
    await post.populate('createdBy', 'name lastname email');
    await post.populate('comments.createdBy', 'name lastname email');

    return res.status(201).json(post);
  } 
  catch (error) {
    return res.status(500).json({ msg: "Greška pri dodavanju komentara" });
  }
});

router.delete("/:id/comments/:commentId", requireAuth, async (req: AuthRequest, res) => {
  try {
    await connectToDatabase();
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ msg: "Post nije pronađen" });
    
    for (let i = 0; i < post.comments.length; i++) {
      if ((post.comments[i] as any)._id.toString() === req.params.commentId) {
        post.comments.splice(i, 1);
        break;
      }
    }

    await post.save();
    await post.populate('createdBy', 'name lastname email');
    await post.populate('comments.createdBy', 'name lastname email');

    return res.status(200).json(post);
  } 
  catch (error) {
    return res.status(500).json({ msg: "Greška pri brisanju komentara" });
  }
});

export default router;

