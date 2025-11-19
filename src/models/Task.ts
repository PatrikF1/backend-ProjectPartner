import mongoose, { Schema, Document } from 'mongoose';

export interface ITask extends Document {
  projectId: mongoose.Types.ObjectId;
  applicationId: mongoose.Types.ObjectId | null;
  name: string;
  description: string;
  status: 'not-started' | 'in-progress' | 'completed';
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema: Schema = new Schema({
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
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true
});

export default mongoose.model<ITask>('Task', TaskSchema);

