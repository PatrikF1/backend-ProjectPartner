import mongoose, { Schema, Document } from 'mongoose';

export interface IProjectFile {
  _id?: mongoose.Types.ObjectId;
  name: string;
  url: string;
  addedBy: mongoose.Types.ObjectId;
  addedAt: Date;
}

export interface IProject extends Document {
  name: string;
  description: string;
  type: string;
  isActive: boolean;
  deadline: Date | null;
  createdBy: mongoose.Types.ObjectId;
  members: mongoose.Types.ObjectId[];
  files: IProjectFile[];
  createdAt: Date;
  updatedAt: Date;
}

const ProjectSchema: Schema = new Schema({
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
    default: 'project'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  deadline: {
    type: Date,
    default: null
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  files: [{
    name: { type: String, required: true },
    url: { type: String, required: true },
    addedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    addedAt: { type: Date, default: Date.now }
  }]
}, {
  timestamps: true
});

export default mongoose.model<IProject>('Project', ProjectSchema);
