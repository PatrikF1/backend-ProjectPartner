import mongoose, { Schema, Document } from 'mongoose';

export interface IEvent extends Document {
  title: string;
  date: Date;
  description: string;
  sendAlert: boolean;
  projectId: mongoose.Types.ObjectId | null;
  taskId: mongoose.Types.ObjectId | null;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const EventSchema: Schema = new Schema({
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
  taskId: {
    type: Schema.Types.ObjectId,
    ref: 'Task',
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

export default mongoose.model<IEvent>('Event', EventSchema);

