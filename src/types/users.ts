export type SystemRole = 'System Admin' | 'Store Admin' | 'Merchandiser' | 'End-Customer';

export type UserStatus = 'Active' | 'Inactive';

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  role: SystemRole;
  status: UserStatus;
  lastActive?: string;
}

export const initialUsers: UserAccount[] = [
  {
    id: 'usr-1',
    name: 'System Administrator',
    email: 'admin@retailspace.demo',
    role: 'System Admin',
    status: 'Active',
    lastActive: 'Just now'
  },
  {
    id: 'usr-2',
    name: 'Minh Tran',
    email: 'minh.tran@example.demo',
    role: 'Merchandiser',
    status: 'Active',
    lastActive: '12 mins ago'
  },
  {
    id: 'usr-3',
    name: 'Lan Nguyen',
    email: 'lan.nguyen@example.demo',
    role: 'Store Admin',
    status: 'Active',
    lastActive: '1 hour ago'
  },
  {
    id: 'usr-4',
    name: 'Quynh Le',
    email: 'quynh.le@example.demo',
    role: 'End-Customer',
    status: 'Active',
    lastActive: 'Yesterday'
  },
  {
    id: 'usr-5',
    name: 'Thu Ha',
    email: 'thu.ha@example.demo',
    role: 'Merchandiser',
    status: 'Inactive',
    lastActive: '3 days ago'
  }
];
