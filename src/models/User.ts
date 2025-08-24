import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  ime: string;
  email: string;
  godine?: number;
}

const UserSchema: Schema = new Schema({
  ime: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  godine: {
    type: Number,
    min: 0
  }
}, {
  timestamps: true
});

export default mongoose.model<IUser>('User', UserSchema);
