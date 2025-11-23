import mongoose, { Schema } from 'mongoose';
const EventSchema = new Schema({
    title: {
        type: String,
        required: true,
    },
    date: {
        type: Date,
        required: true,
    },
    description: {
        type: String,
        default: '',
    },
    sendAlert: {
        type: Boolean,
        default: false,
    },
    projectId: {
        type: Schema.Types.ObjectId,
        ref: 'Project',
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
export default mongoose.model('Event', EventSchema);
//# sourceMappingURL=Event.js.map