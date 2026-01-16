export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
}

export interface IUser {
  _id: string;
  name: string;
  email: string;
  phone: string;
  password: string;
  avatar?: string;
  role: UserRole;
  isVerified: boolean;
  verificationToken?: string;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateUserDTO = Omit<IUser, '_id' | 'createdAt' | 'updatedAt'>;
export type UpdateUserDTO = Partial<Omit<IUser, '_id' | 'email' | 'createdAt' | 'updatedAt'>>;