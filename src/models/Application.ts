import mongoose, { Schema, Document } from 'mongoose'

export interface IApplication extends Document {
  projectId: mongoose.Types.ObjectId
  idea: string
  description: string
  status: 'pending' | 'approved' | 'rejected'
  createdBy: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const ApplicationSchema = new Schema<IApplication>(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    idea: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
)

export default mongoose.model<IApplication>('Application', ApplicationSchema)

