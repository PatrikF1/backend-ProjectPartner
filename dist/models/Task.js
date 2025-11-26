import mongoose, { Schema } from 'mongoose';
const TaskSchema = new Schema({
    projectId: {
        type: Schema.Types.ObjectId,
        ref: 'Project',
        required: true,
    },
    applicationId: {
        type: Schema.Types.ObjectId,
        ref: 'Application',
        default: null,
    },
    name: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        default: '',
    },
    status: {
        type: String,
        enum: ['not-started', 'in-progress', 'completed'],
        default: 'not-started',
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium',
    },
    deadline: {
        type: Date,
        default: null,
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
}, {
    timestamps: true
});
export default mongoose.model('Task', TaskSchema);
//# sourceMappingURL=Task.js.map