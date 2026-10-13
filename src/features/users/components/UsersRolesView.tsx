import React, { useState } from 'react';
import { Search, ChevronDown, UserPlus, X, Shield } from 'lucide-react';
import { UserAccount, SystemRole, UserStatus, initialUsers } from '../../../types/users';

export const UsersRolesView: React.FC = () => {
  const [users, setUsers] = useState<UserAccount[]>(initialUsers);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);

  // Form states for Add/Edit
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formRole, setFormRole] = useState<SystemRole>('Merchandiser');
  const [formStatus, setFormStatus] = useState<UserStatus>('Active');

  const filteredUsers = users.filter((u) => {
    if (roleFilter !== 'all') {
      const roleMap: Record<string, SystemRole> = {
        admin: 'System Admin',
        store: 'Store Admin',
        merchandiser: 'Merchandiser',
        customer: 'End-Customer'
      };
      if (roleMap[roleFilter] && u.role !== roleMap[roleFilter]) return false;
    }
    if (statusFilter !== 'all') {
      if (u.status.toLowerCase() !== statusFilter.toLowerCase()) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = u.name.toLowerCase().includes(q);
      const matchEmail = u.email.toLowerCase().includes(q);
      if (!matchName && !matchEmail) return false;
    }
    return true;
  });

  const handleOpenAddModal = () => {
    setFormName('');
    setFormEmail('');
    setFormRole('Merchandiser');
    setFormStatus('Active');
    setIsAddModalOpen(true);
  };

  const handleSaveAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formEmail.trim()) return;

    const newUser: UserAccount = {
      id: `usr-${Date.now()}`,
      name: formName.trim(),
      email: formEmail.trim(),
      role: formRole,
      status: formStatus,
      lastActive: 'Just now'
    };

    setUsers([newUser, ...users]);
    setIsAddModalOpen(false);
  };

  const handleOpenEditModal = (user: UserAccount) => {
    setEditingUser(user);
    setFormName(user.name);
    setFormEmail(user.email);
    setFormRole(user.role);
    setFormStatus(user.status);
  };

  const handleSaveEditUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setUsers(
      users.map((u) =>
        u.id === editingUser.id
          ? {
              ...u,
              name: formName.trim(),
              email: formEmail.trim(),
              role: formRole,
              status: formStatus
            }
          : u
      )
    );
    setEditingUser(null);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <section className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pb-2" data-purpose="page-title-banner">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-[#191c1b]">
            Accounts &amp; Roles
          </h1>
          <p className="mt-1 text-sm text-[#6d7974]">
            Manage store user accounts, planogram assignments and effective role permissions.
          </p>
          <div className="mt-2.5">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold uppercase tracking-wider bg-[#f6ece9] text-[#6d7974]">
              DEMO DATA
            </span>
          </div>
        </div>
        <div>
          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-[#1e3a2f] hover:bg-[#294d3f] rounded-lg shadow-xs transition-all cursor-pointer"
            type="button"
          >
            Add User +
          </button>
        </div>
      </section>

      {/* 4 User Stat KPI Cards with Sleek Small Accent Bars (Small accent bar) & Distinct Colors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Users (Forest Pine) */}
        <div className="bg-white border border-[#E7E2D8] rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#1e3a2f]" />
                <span className="text-xs font-semibold uppercase tracking-wider text-[#6d7974]">Total Accounts</span>
              </div>
              {/* Sleek Small Accent Bar (Small accent bar) */}
              <span className="w-8 h-1 rounded-full bg-[#1e3a2f] shrink-0" />
            </div>
            <div className="text-3xl font-bold text-[#191c1b] font-mono tabular-nums mt-3">
              {users.length}
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between pt-2 border-t border-[#f6ece9]">
            <span className="text-xs text-[#89938f]">Provisioned staff</span>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#e7ede9] text-[#1e3a2f]">
              Active Directory
            </span>
          </div>
        </div>

        {/* Card 2: Active Accounts (Cognac Amber) */}
        <div className="bg-white border border-[#E7E2D8] rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#c26d38]" />
                <span className="text-xs font-semibold uppercase tracking-wider text-[#6d7974]">Active Accounts</span>
              </div>
              {/* Sleek Small Accent Bar (Small accent bar) */}
              <span className="w-8 h-1 rounded-full bg-[#c26d38] shrink-0" />
            </div>
            <div className="text-3xl font-bold text-[#191c1b] font-mono tabular-nums mt-3">
              {users.filter(u => u.status === 'Active').length}
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between pt-2 border-t border-[#f6ece9]">
            <span className="text-xs text-[#89938f]">Operational access</span>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#fdf4ed] text-[#c26d38]">
              Verified
            </span>
          </div>
        </div>

        {/* Card 3: Role Profiles (Ocean Azure) */}
        <div className="bg-white border border-[#E7E2D8] rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#0284c7]" />
                <span className="text-xs font-semibold uppercase tracking-wider text-[#6d7974]">Role Profiles</span>
              </div>
              {/* Sleek Small Accent Bar (Small accent bar) */}
              <span className="w-8 h-1 rounded-full bg-[#0284c7] shrink-0" />
            </div>
            <div className="text-3xl font-bold text-[#191c1b] font-mono tabular-nums mt-3">
              4
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between pt-2 border-t border-[#f6ece9]">
            <span className="text-xs text-[#89938f]">RBAC matrix tiers</span>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#e0f2fe] text-[#0284c7]">
              Enforced
            </span>
          </div>
        </div>

        {/* Card 4: Admin Privileges (Plum Rose) */}
        <div className="bg-white border border-[#E7E2D8] rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#8b263e]" />
                <span className="text-xs font-semibold uppercase tracking-wider text-[#6d7974]">Admin Privileges</span>
              </div>
              {/* Sleek Small Accent Bar (Small accent bar) */}
              <span className="w-8 h-1 rounded-full bg-[#8b263e] shrink-0" />
            </div>
            <div className="text-3xl font-bold text-[#191c1b] font-mono tabular-nums mt-3">
              {users.filter(u => u.role.includes('Admin')).length}
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between pt-2 border-t border-[#f6ece9]">
            <span className="text-xs text-[#89938f]">Full platform control</span>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#fdf2f4] text-[#8b263e]">
              Privileged
            </span>
          </div>
        </div>
      </div>

      {/* User Management Card */}
      <section className="bg-white rounded-xl border border-[#E7E2D8] shadow-xs overflow-hidden">
        {/* Card Header & Filter Controls */}
        <div className="p-6 border-b border-[#E7E2D8] space-y-4">
          <div>
            <h2 className="text-lg font-bold text-[#191c1b]">User Management</h2>
            <p className="text-xs text-[#6d7974] mt-0.5">
              Search, review, and update operational staff accounts.
            </p>
          </div>

          {/* Filter & Search Bar Row */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-1">
            {/* Search Input */}
            <div className="md:col-span-6 relative">
              <input
                className="w-full text-sm bg-white border border-[#E7E2D8] rounded-lg px-3.5 py-2 text-[#191c1b] placeholder-[#89938f] focus:border-[#1e3a2f] outline-none transition"
                placeholder="Search name or email..."
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Role Selector */}
            <div className="md:col-span-3 relative">
              <select
                className="w-full text-sm bg-white border border-[#E7E2D8] rounded-lg px-3 py-2 text-[#6d7974] appearance-none pr-8 focus:border-[#1e3a2f] outline-none cursor-pointer"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                aria-label="Filter by role"
              >
                <option value="all">All roles</option>
                <option value="admin">System Admin</option>
                <option value="store">Store Admin</option>
                <option value="merchandiser">Merchandiser</option>
                <option value="customer">End-Customer</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-[#89938f]">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>

            {/* Status Selector */}
            <div className="md:col-span-3 relative">
              <select
                className="w-full text-sm bg-white border border-[#E7E2D8] rounded-lg px-3 py-2 text-[#6d7974] appearance-none pr-8 focus:border-[#1e3a2f] outline-none cursor-pointer"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                aria-label="Filter by status"
              >
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-[#89938f]">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-[11px] font-semibold text-[#89938f] uppercase tracking-wider border-b border-[#E7E2D8] bg-[#fbf2f0]">
                <th className="py-3 px-6" scope="col">NAME</th>
                <th className="py-3 px-6" scope="col">EMAIL</th>
                <th className="py-3 px-6" scope="col">ROLE</th>
                <th className="py-3 px-6" scope="col">STATUS</th>
                <th className="py-3 px-6 text-right" scope="col">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7E2D8]/60 text-[#191c1b]">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-[#fbf2f0] transition-colors">
                  <td className="py-3.5 px-6 font-semibold text-[#191c1b] whitespace-nowrap">
                    {user.name}
                  </td>
                  <td className="py-3.5 px-6 text-[#6d7974] whitespace-nowrap">
                    {user.email}
                  </td>
                  <td className="py-3.5 px-6 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-[#f6ece9] text-[#1e3a2f]">
                      {user.role}
                    </span>
                  </td>
                  <td className="py-3.5 px-6 whitespace-nowrap">
                    {user.status === 'Active' ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-[#e7ede9] text-[#1e3a2f]">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-[#fcedea] text-[#b3261e]">
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-6 text-right whitespace-nowrap">
                    <button
                      onClick={() => handleOpenEditModal(user)}
                      className="text-xs font-semibold text-[#1e3a2f] hover:underline transition-colors cursor-pointer"
                      type="button"
                    >
                      Edit ›
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Table Footer Count */}
        <div className="px-6 py-3.5 border-t border-[#E7E2D8] text-xs text-[#89938f]">
          Showing {filteredUsers.length} of {users.length} demo users
        </div>
      </section>

      {/* Role Permission Summary Card */}
      <section className="bg-white rounded-xl border border-[#E7E2D8] shadow-xs p-6">
        <h3 className="text-base font-semibold text-[#191c1b] mb-4">
          Role Permission Summary
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* System Admin */}
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-[#1e3a2f]">System Admin</h4>
            <p className="text-xs text-[#6d7974] leading-relaxed">
              Mining setup, integrations, RBAC and cluster health
            </p>
          </div>

          {/* Store Admin */}
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-[#1e3a2f]">Store Admin</h4>
            <p className="text-xs text-[#6d7974] leading-relaxed">
              Inventory, planogram imports, store activations, shelf metrics
            </p>
          </div>

          {/* Merchandiser */}
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-[#1e3a2f]">Merchandiser</h4>
            <p className="text-xs text-[#6d7974] leading-relaxed">
              Product arrangements, cross-sell recommendations, campaign drafts
            </p>
          </div>

          {/* End-Customer */}
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-[#1e3a2f]">End-Customer</h4>
            <p className="text-xs text-[#6d7974] leading-relaxed">
              Storefront kiosk and basket recommendations
            </p>
          </div>
        </div>
      </section>

      {/* Footer Note */}
      <footer className="pt-2 pb-6 text-xs text-[#89938f]">
        <p>Role changes require explicit confirmation · Interface preview only; no backend connected.</p>
      </footer>

      {/* Add User Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#191c1b]/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-[#E7E2D8] shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E2D8]">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-[#1e3a2f]" />
                <h3 className="text-sm font-bold text-[#191c1b]">Add New Account</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-[#89938f] hover:bg-[#fbf2f0] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAddUser} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-[#191c1b] block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Hoang Duc"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full text-xs bg-white border border-[#E7E2D8] rounded-lg p-2 text-[#191c1b] focus:border-[#1e3a2f] outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#191c1b] block mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. hoang.duc@retailspace.demo"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full text-xs bg-white border border-[#E7E2D8] rounded-lg p-2 text-[#191c1b] focus:border-[#1e3a2f] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#191c1b] block mb-1">Role Assignment</label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value as SystemRole)}
                    className="w-full text-xs bg-white border border-[#E7E2D8] rounded-lg p-2 text-[#191c1b] focus:border-[#1e3a2f] outline-none"
                  >
                    <option value="System Admin">System Admin</option>
                    <option value="Store Admin">Store Admin</option>
                    <option value="Merchandiser">Merchandiser</option>
                    <option value="End-Customer">End-Customer</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#191c1b] block mb-1">Initial Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as UserStatus)}
                    className="w-full text-xs bg-white border border-[#E7E2D8] rounded-lg p-2 text-[#191c1b] focus:border-[#1e3a2f] outline-none"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-[#E7E2D8] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-1.5 border border-[#E7E2D8] text-xs font-medium text-[#6d7974] rounded-lg hover:bg-[#fbf2f0] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#1e3a2f] text-white text-xs font-semibold rounded-lg hover:bg-[#294d3f] cursor-pointer"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-[#191c1b]/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-[#E7E2D8] shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E2D8]">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#1e3a2f]" />
                <h3 className="text-sm font-bold text-[#191c1b]">Edit User &amp; Permissions</h3>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="p-1 rounded-lg text-[#89938f] hover:bg-[#fbf2f0] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditUser} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-[#191c1b] block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full text-xs bg-white border border-[#E7E2D8] rounded-lg p-2 text-[#191c1b] focus:border-[#1e3a2f] outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#191c1b] block mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full text-xs bg-white border border-[#E7E2D8] rounded-lg p-2 text-[#191c1b] focus:border-[#1e3a2f] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#191c1b] block mb-1">Role Assignment</label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value as SystemRole)}
                    className="w-full text-xs bg-white border border-[#E7E2D8] rounded-lg p-2 text-[#191c1b] focus:border-[#1e3a2f] outline-none"
                  >
                    <option value="System Admin">System Admin</option>
                    <option value="Store Admin">Store Admin</option>
                    <option value="Merchandiser">Merchandiser</option>
                    <option value="End-Customer">End-Customer</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#191c1b] block mb-1">Account Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as UserStatus)}
                    className="w-full text-xs bg-white border border-[#E7E2D8] rounded-lg p-2 text-[#191c1b] focus:border-[#1e3a2f] outline-none"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-[#E7E2D8] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-3 py-1.5 border border-[#E7E2D8] text-xs font-medium text-[#6d7974] rounded-lg hover:bg-[#fbf2f0] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#1e3a2f] text-white text-xs font-semibold rounded-lg hover:bg-[#294d3f] cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
