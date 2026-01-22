import mongoose, { Schema, Document } from "mongoose";

/**
 * Represents an admin or staff contact entry
 * displayed on the Contact page.
 */
export interface IAdminContact extends Document {
  name: string;
  title: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
  position?: number; // Optional field for ordering contacts
  avatarUrl?: string; // Optional field for avatar URL
  user?: mongoose.Types.ObjectId; // Reference to User model (optional)
}

const AdminContactSchema = new Schema<IAdminContact>(
  {
    name: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true},
    position: { type: Number, default: 0 }, // Optional field for ordering contacts
    user: { type: Schema.Types.ObjectId, ref: 'User', required: false }, // Reference to User model (optional)
  },
  {
    timestamps: true, // automatically adds createdAt and updatedAt
  }
);

export default mongoose.model<IAdminContact>("AdminContact", AdminContactSchema);
