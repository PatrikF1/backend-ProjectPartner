import mongoose, { Schema, Document } from 'mongoose';

export interface ISpace extends Document {
  name: string;
  description: string;
  type: 'workspace' | 'project-space' | 'team-space' | 'meeting-room';
  capacity?: number;
  location?: string;
  amenities: string[];
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
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
  location: {
    type: String,
    required: false,
    trim: true,
    maxlength: 200
  },
  amenities: [{
    type: String,
    trim: true
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

export default mongoose.model<ISpace>('Space', SpaceSchema);
