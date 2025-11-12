import express from "express";
import { connectToDatabase } from "../db.js";
import Post from "../models/Post.js";
import { requireAuth } from "../middleware/auth.js";
const router = express.Router();
router.post("/", requireAuth, async (req, res) => {
    try {
        const title = req.body.title;
        const content = req.body.content;
        const userId = req.user._id;
        if (!title || !content) {
            return res.status(400).json({ msg: "Title i content su obavezni" });
        }
        await connectToDatabase();
        const newPost = new Post({
            title: title,
            content: content,
            createdBy: userId,
            comments: []
        });
        const savedPost = await newPost.save();
        await savedPost.populate('createdBy', 'name lastname email');
        return res.status(201).json(savedPost);
    }
    catch (error) {
        console.error("Greška pri kreiranju posta:", error);
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
        console.error("Greška pri dohvatanju postova:", error);
        return res.status(500).json({ msg: "Greška pri dohvatanju postova" });
    }
});
router.delete("/:id", requireAuth, async (req, res) => {
    try {
        const id = req.params.id;
        const userId = req.user._id.toString();
        await connectToDatabase();
        const post = await Post.findById(id);
        if (!post) {
            return res.status(404).json({ msg: "Post nije pronađen" });
        }
        const createdByString = post.createdBy.toString();
        const isCreator = createdByString === userId;
        if (!isCreator) {
            return res.status(403).json({ msg: "Samo kreator može obrisati ovaj post" });
        }
        await Post.findByIdAndDelete(id);
        return res.status(200).json({ msg: "Post je uspješno obrisan" });
    }
    catch (error) {
        console.error("Greška pri brisanju posta:", error);
        return res.status(500).json({ msg: "Greška pri brisanju posta" });
    }
});
router.post("/:id/comments", requireAuth, async (req, res) => {
    try {
        const postId = req.params.id;
        const content = req.body.content;
        const userId = req.user._id;
        if (!content) {
            return res.status(400).json({ msg: "Content je obavezan" });
        }
        await connectToDatabase();
        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({ msg: "Post nije pronađen" });
        }
        post.comments.push({
            content: content,
            createdBy: userId
        });
        const savedPost = await post.save();
        await savedPost.populate('createdBy', 'name lastname email');
        await savedPost.populate('comments.createdBy', 'name lastname email');
        return res.status(201).json(savedPost);
    }
    catch (error) {
        console.error("Greška pri dodavanju komentara:", error);
        return res.status(500).json({ msg: "Greška pri dodavanju komentara" });
    }
});
router.delete("/:id/comments/:commentId", requireAuth, async (req, res) => {
    try {
        const postId = req.params.id;
        const commentId = req.params.commentId;
        const userId = req.user._id.toString();
        await connectToDatabase();
        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({ msg: "Post nije pronađen" });
        }
        let commentFound = false;
        let commentIndex = -1;
        for (let i = 0; i < post.comments.length; i++) {
            const comment = post.comments[i];
            if (comment._id.toString() === commentId) {
                commentFound = true;
                commentIndex = i;
                break;
            }
        }
        if (!commentFound) {
            return res.status(404).json({ msg: "Komentar nije pronađen" });
        }
        const comment = post.comments[commentIndex];
        const commentCreatorId = comment.createdBy.toString();
        const isCreator = commentCreatorId === userId;
        if (!isCreator) {
            return res.status(403).json({ msg: "Samo kreator može obrisati ovaj komentar" });
        }
        post.comments.splice(commentIndex, 1);
        const savedPost = await post.save();
        await savedPost.populate('createdBy', 'name lastname email');
        await savedPost.populate('comments.createdBy', 'name lastname email');
        return res.status(200).json(savedPost);
    }
    catch (error) {
        console.error("Greška pri brisanju komentara:", error);
        return res.status(500).json({ msg: "Greška pri brisanju komentara" });
    }
});
export default router;
//# sourceMappingURL=Posts.js.map