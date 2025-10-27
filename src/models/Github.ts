import mongoose, { Schema, Document } from 'mongoose';

export interface IGithub extends Document {
  githubUrl: string;
  createdBy: mongoose.Types.ObjectId;
  members: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const GithubSchema: Schema = new Schema({
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

export default mongoose.model<IGithub>('Github', GithubSchema);
