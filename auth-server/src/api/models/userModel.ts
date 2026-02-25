import mongoose from 'mongoose';
import type { Document } from 'mongoose';
import {UserInfo} from '../../types/LocalTypes';

const userSchema = new mongoose.Schema<UserInfo>({
  googleId: {
    type: String,
    sparse: true,
    unique: true,
    required: false,
  },
  userName: {
    type: String,
    required: true,
    minLength: 2,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    match: /^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/,
  },
  user_level_id: {
    type: Number,
    required: true,
    default: 1, // Default 1 = User (2 = Admin, 3 = Superadmin)
    ref: 'UserLevel',
  },
  registeredAt: {
    type: String,
    required: true,
    default: () => new Date().toISOString(),
  },
  favorites: {
    type: [
      {
        destination: { type: String, required: true },
        url: { type: String, required: true },
      }
    ],
    required: false,
    default: [],
  },
  documents: {
    type: [String],
    required: false,
    default: [],
  },
  avatarUrl: {
    type: String,
    required: false,
  },
  isBlocked: {
    type: Boolean,
    required: true,
    default: false,
  },
}, {
  collection: 'users'
});

export default mongoose.model<UserInfo>('User', userSchema);
export type UserDocument = Document & UserInfo;
