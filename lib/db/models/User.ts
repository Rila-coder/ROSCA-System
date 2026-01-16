import mongoose, { Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import { UserRole } from '@/types/user';

export interface UserDocument extends mongoose.Document {
  name: string;
  email: string;
  phone?: string; // Optional for Google users initially
  password?: string; // Optional for Google users
  avatar?: string | null; 
  role: UserRole;
  isVerified: boolean;
  provider: 'credentials' | 'google'; // New field
  verificationToken?: string;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<UserDocument>(
  {
    name: { 
      type: String, 
      required: [true, 'Name is required'], 
      trim: true 
    },
    email: { 
      type: String, 
      required: [true, 'Email is required'], 
      unique: true, 
      lowercase: true, 
      trim: true 
    },
    // Phone is unique only if it exists (sparse index)
    phone: { 
      type: String, 
      unique: true, 
      sparse: true 
    },
    // Password is optional now
    password: { 
      type: String, 
      minlength: 6, 
      select: false 
    },
    avatar: { 
      type: String, 
      default: null 
    },
    role: { 
      type: String, 
      enum: Object.values(UserRole), 
      default: UserRole.USER 
    },
    isVerified: { 
      type: Boolean, 
      default: false // Default false, but Google login sets this true
    },
    provider: { 
      type: String, 
      enum: ['credentials', 'google'], 
      default: 'credentials' 
    },
    verificationToken: String,
    resetPasswordToken: String,
    resetPasswordExpires: Date,
  },
  { 
    timestamps: true 
  }
);

// Virtual for avatar URL
userSchema.virtual('avatarUrl').get(function(this: UserDocument) {
  return this.avatar || '/Images/avatar.jpeg';
});

// Hash password ONLY if it exists and is modified
userSchema.pre('save', async function (this: UserDocument) {
  if (!this.isModified('password') || !this.password) return;

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password method - Returns false if user has no password (Google user)
userSchema.methods.comparePassword = async function (
  this: UserDocument,
  candidatePassword: string
): Promise<boolean> {
  if (!this.password) return false;
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    return false;
  }
};

userSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret) {
    const { 
      password, 
      verificationToken, 
      resetPasswordToken, 
      resetPasswordExpires, 
      ...rest 
    } = ret;
    
    if (!rest.avatar) {
      rest.avatar = '/Images/avatar.jpeg';
    }
    
    return rest;
  },
});

userSchema.set('toObject', {
  virtuals: true,
  transform: function (doc, ret) {
    const { 
      password, 
      verificationToken, 
      resetPasswordToken, 
      resetPasswordExpires, 
      ...rest 
    } = ret;
    
    if (!rest.avatar) {
      rest.avatar = '/Images/avatar.jpeg';
    }
    
    return rest;
  },
});

export const User =
  mongoose.models.User || mongoose.model<UserDocument>('User', userSchema);