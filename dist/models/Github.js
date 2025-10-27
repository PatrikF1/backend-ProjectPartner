import mongoose, { Schema } from 'mongoose';
const GithubSchema = new Schema({
    githubUrl: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    members: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }]
}, {
    timestamps: true
});
export default mongoose.model('Github', GithubSchema);
//# sourceMappingURL=Github.js.map