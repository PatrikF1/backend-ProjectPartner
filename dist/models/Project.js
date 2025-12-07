import mongoose, { Schema } from 'mongoose';
const ProjectSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    description: {
        type: String,
        required: true,
        trim: true,
        maxlength: 500
    },
    type: {
        type: String,
        enum: ['project', 'feature', 'bug/fix', 'other', 'task', 'application'],
        required: true
    },
    capacity: {
        type: Number,
        required: false,
        min: 1,
        max: 100
    },
    isActive: {
        type: Boolean,
        default: true
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
export default mongoose.model('Project', ProjectSchema);
//# sourceMappingURL=Project.js.map