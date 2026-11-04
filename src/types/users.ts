export type SystemRole = 'System Admin' | 'Store Admin' | 'Merchandiser' | 'End-Customer';

export type UserStatus = 'Active' | 'Inactive' | 'Pending Activation';

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  role: SystemRole;
  storeId?: number | null;
  status: UserStatus;
  emailVerified?: boolean;
  lastActive?: string;
}
