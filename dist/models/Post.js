import mongoose, { Schema } from 'mongoose';
const CommentSchema = new Schema({
    content: {
        type: String,
        required: true,
        trim: true,
        maxlength: 500
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});
const PostSchema = new Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    content: {
        type: String,
        required: true,
        trim: true,
        maxlength: 2000
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    comments: [CommentSchema]
}, {
    timestamps: true
});
export default mongoose.model('Post', PostSchema);
//# sourceMappingURL=Post.js.map