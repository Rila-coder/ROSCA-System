export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  LATE = 'late',
  SKIPPED = 'skipped',
}

export interface IPaymentCycle {
  _id: string;
  groupId: string;
  cycleNumber: number;
  amount: number;
  dueDate: Date;
  recipientId: string; // User ID
  isCompleted: boolean;
  completedAt?: Date;
  createdAt: Date;
}

export interface IPayment {
  _id: string;
  cycleId: string;
  userId: string;
  groupId: string;
  amount: number;
  status: PaymentStatus;
  paidAt?: Date;
  verifiedBy?: string; // User ID who verified
  paymentMethod?: 'cash' | 'bank_transfer' | 'upi' | 'other';
  transactionId?: string;
  notes?: string;
  createdAt: Date;
}