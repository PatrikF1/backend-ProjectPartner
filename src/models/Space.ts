import mongoose, { Schema, Document } from 'mongoose';

export interface ISpace extends Document {
  name: string;
  description: string;
  type: 'workspace' | 'project-space' | 'team-space' | 'meeting-room';
  capacity?: number;
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
  members: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const SpaceSchema: Schema = new Schema({
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
    enum: ['workspace', 'project-space', 'team-space', 'meeting-room'],
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
    ref: 'User' }],
}, {
  timestamps: true
});

export default mongoose.model<ISpace>('Space', SpaceSchema);
