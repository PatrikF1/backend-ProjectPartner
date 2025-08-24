import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  lastname: string;
  email: string;
  phone?: number;
  passwordHash: string;
}

const UserSchema: Schema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  lastname: {
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
  phone: {
    type: Number,
    required: false,
    min: 0
  },
  passwordHash: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

export default mongoose.model<IUser>('User', UserSchema);
