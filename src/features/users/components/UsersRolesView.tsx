import React, { useEffect, useRef, useState } from 'react';
import { Search, ChevronDown, UserPlus, X, Shield } from 'lucide-react';
import { UserAccount, SystemRole, UserStatus } from '../../../types/users';

import { authService } from '../../../services/authService';

const usersViewStateKey = 'system-users-view-state';
const readUsersViewState = () => { try { return JSON.parse(sessionStorage.getItem(usersViewStateKey) || '{}') as { searchQuery?: string; roleFilter?: string; statusFilter?: string; page?: number }; } catch { return {}; } };

export const UsersRolesView: React.FC = () => {
  const restoredState = readUsersViewState();
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [searchQuery, setSearchQuery] = useState(restoredState.searchQuery ?? '');
  const [roleFilter, setRoleFilter] = useState(restoredState.roleFilter ?? 'all');
  const [statusFilter, setStatusFilter] = useState(restoredState.statusFilter ?? 'all');
  const [page, setPage] = useState(restoredState.page ?? 0);
  const pageSize = 10;
  const restoredFilters = useRef(true);
  const tableScrollY = useRef(0);
  const [isBackendLive, setIsBackendLive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [backendRoles, setBackendRoles] = useState<Array<{ code: string; display_name: string }>>([]);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);

  // Form states for Add/Edit
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formRole, setFormRole] = useState<SystemRole>('Merchandiser');
  const [formStatus, setFormStatus] = useState<UserStatus>('Inactive');
  const [formStoreId, setFormStoreId] = useState('');
  useEffect(() => { sessionStorage.setItem(usersViewStateKey, JSON.stringify({ searchQuery, roleFilter, statusFilter, page })); }, [searchQuery, roleFilter, statusFilter, page]);
  useEffect(() => { if (tableScrollY.current > 0) requestAnimationFrame(() => window.scrollTo({ top: tableScrollY.current, behavior: 'auto' })); }, [page]);

  const roleCodeMap: Record<SystemRole, string> = {
    'System Admin': 'SYSTEM_ADMIN',
    'Store Admin': 'STORE_ADMIN',
    'Merchandiser': 'MERCHANDISER',
    'End-Customer': 'END_CUSTOMER'
  };

  const roleRevMap: Record<string, SystemRole> = {
    'SYSTEM_ADMIN': 'System Admin',
    'STORE_ADMIN': 'Store Admin',
    'MERCHANDISER': 'Merchandiser',
    'END_CUSTOMER': 'End-Customer'
  };

  const getUserFriendlyApiError = (message?: string) => {
    const normalized = (message || '').toLowerCase();

    if (normalized.includes('already exists') || normalized.includes('duplicate') || normalized.includes('unique')) {
      return 'Email này đã được đăng ký. Vui lòng sử dụng email khác hoặc đăng nhập bằng tài khoản hiện có.';
    }

    if (normalized.includes('store') && (normalized.includes('exist') || normalized.includes('constraint') || normalized.includes('invalid'))) {
      return 'Store được chọn không tồn tại hoặc không phù hợp với vai trò này.';
    }

    if (normalized.includes('role') && (normalized.includes('invalid') || normalized.includes('constraint'))) {
      return 'Vai trò không hợp lệ. Vui lòng chọn lại vai trò tài khoản.';
    }

    return 'Không thể tạo tài khoản. Vui lòng kiểm tra thông tin và thử lại.';
  };

  const fetchBackendUsers = async () => {
    const token = authService.getToken();
    if (!token) return;
    setIsLoading(true);
    setApiError(null);
    try {
      const res = await fetch('/api/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const mappedUsers: UserAccount[] = data.map((u: any) => ({
          id: String(u.userId),
          name: u.name || '(Unnamed)',
          email: u.email,
          role: roleRevMap[u.roleCode] || 'End-Customer',
          storeId: u.storeId,
          status: u.status === 'ACTIVE' ? 'Active' : 'Inactive',
          emailVerified: u.emailVerified === true,
          lastActive: u.emailVerified ? 'Email verified' : 'Waiting for OTP verification'
        }));
        setUsers(mappedUsers);
        setIsBackendLive(true);
      }
    } catch {
      // Backend not reached: keep the list empty instead of showing demo accounts.
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBackendRoles = async () => {
    const token = authService.getToken();
    if (!token) return;
    try {
      const res = await fetch('/api/roles', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Unable to load roles');
      setBackendRoles(await res.json());
    } catch {
      setApiError('Unable to load roles from the Backend.');
    }
  };

  React.useEffect(() => {
    fetchBackendUsers();
    fetchBackendRoles();
  }, []);

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
  const totalPages = Math.max(Math.ceil(filteredUsers.length / pageSize), 1);
  const visibleUsers = filteredUsers.slice(page * pageSize, (page + 1) * pageSize);
  useEffect(() => { if (restoredFilters.current) { restoredFilters.current = false; return; } setPage(0); }, [searchQuery, roleFilter, statusFilter]);
  useEffect(() => { if (page >= totalPages) setPage(Math.max(totalPages - 1, 0)); }, [page, totalPages]);

  const handleOpenAddModal = () => {
    setFormName('');
    setFormEmail('');
    setFormRole('Merchandiser');
    setFormStatus('Inactive');
    setFormStoreId('');
    setApiError(null);
    setSuccessMessage(null);
    setIsAddModalOpen(true);
  };

  const handleSaveAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formEmail.trim()) return;
    setApiError(null);
    setSuccessMessage(null);

    const token = authService.getToken();
    const needsStore = formRole === 'Store Admin' || formRole === 'Merchandiser';
    const storeId = formStoreId.trim() ? Number(formStoreId) : null;
    if (needsStore && (!storeId || !Number.isInteger(storeId) || storeId < 1)) {
      setApiError('This role requires a valid Store ID.');
      return;
    }
    if (!token) {
      setApiError('Your session has expired. Please sign in again as System Admin.');
      return;
    }
    setIsCreatingUser(true);
    {
      try {
        const res = await fetch('/api/users', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            name: formName.trim(),
            email: formEmail.trim(),
            roleCode: roleCodeMap[formRole],
            storeId
          })
        });

        if (res.ok) {
          await fetchBackendUsers();
          setIsAddModalOpen(false);
          setSuccessMessage(`Đã tạo tài khoản và gửi lời mời kích hoạt tới ${formEmail.trim()}.`);
          return;
        } else {
          const errData = await res.json().catch(() => null);
          const backendMessage = errData?.error || errData?.message;
          console.error('Create user failed:', backendMessage || res.statusText);
          setApiError(getUserFriendlyApiError(backendMessage));
          return;
        }
      } catch {
        setApiError('Lỗi kết nối Backend.');
        return;
      } finally {
        setIsCreatingUser(false);
      }
    }

  };

  const handleOpenEditModal = async (user: UserAccount) => {
    const token = authService.getToken();
    const userId = Number(user.id);
    setApiError(null);

    if (!token || !Number.isInteger(userId)) {
      setApiError('Unable to load account information.');
      return;
    }

    try {
      const res = await fetch(`/api/users/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Unable to load user');
      const detail = await res.json();
      setEditingUser({
        ...user,
        id: String(detail.userId),
        name: detail.name || '(Unnamed)',
        email: detail.email,
        role: roleRevMap[detail.roleCode] || 'End-Customer',
        storeId: detail.storeId,
        status: detail.status === 'ACTIVE' ? 'Active' : 'Inactive',
        emailVerified: detail.emailVerified === true
      });
      setFormName(detail.name || '');
      setFormEmail(detail.email || '');
      setFormRole(roleRevMap[detail.roleCode] || 'End-Customer');
      setFormStatus(detail.emailVerified === true && detail.status === 'ACTIVE' ? 'Active' : 'Inactive');
      setFormStoreId(detail.storeId ? String(detail.storeId) : '');
    } catch {
      setApiError('Unable to load account details from the Backend.');
    }
  };

  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setApiError(null);

    const token = authService.getToken();
    const userIdNum = parseInt(editingUser.id.replace(/\D/g, ''), 10);
    const needsStore = formRole === 'Store Admin' || formRole === 'Merchandiser';
    const storeId = formStoreId.trim() ? Number(formStoreId) : null;

    if ((editingUser.emailVerified !== true || editingUser.status === 'Inactive') && formStatus === 'Active') {
      setApiError('This account must complete OTP activation before it can become Active.');
      return;
    }

    // An account without completed OTP verification can only remain Inactive.
    if (editingUser.emailVerified !== true) {
      setFormStatus('Inactive');
    }

    if (needsStore && (!storeId || !Number.isInteger(storeId) || storeId < 1)) {
      setApiError('Vui lòng nhập Store ID hợp lệ cho vai trò này.');
      return;
    }

    if (isBackendLive && token && !isNaN(userIdNum)) {
      try {
        // 1. Update name
        const nameResponse = await fetch(`/api/users/${userIdNum}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ name: formName.trim() })
        });
        if (!nameResponse.ok) {
          const data = await nameResponse.json().catch(() => ({}));
          throw new Error(data?.error || 'Unable to update account name.');
        }

        // 2. Update role and Store
        const roleResponse = await fetch(`/api/users/${userIdNum}/role`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ roleCode: roleCodeMap[formRole], storeId })
        });
        if (!roleResponse.ok) {
          const data = await roleResponse.json().catch(() => ({}));
          throw new Error(data?.error || 'Unable to update account role.');
        }

        // 3. Update status only for accounts that completed OTP activation.
        if (editingUser.emailVerified === true) {
          const statusResponse = await fetch(`/api/users/${userIdNum}/status`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ status: formStatus === 'Active' ? 'ACTIVE' : 'INACTIVE' })
          });
          if (!statusResponse.ok) {
            const data = await statusResponse.json().catch(() => ({}));
            throw new Error(data?.error || 'Unable to update account status.');
          }
        }

        await fetchBackendUsers();
        setEditingUser(null);
        return;
      } catch {
      setApiError('Không thể cập nhật tài khoản trên Backend. Vui lòng kiểm tra quyền SYSTEM_ADMIN, role và Store ID.');
      }
    }

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
          {apiError && (
            <div className="mt-2 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              {apiError}
            </div>
          )}
          {successMessage && (
            <div className="mt-2 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
              {successMessage}
            </div>
          )}
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
              {visibleUsers.map((user) => (
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
              {Array.from({ length: Math.max(pageSize - visibleUsers.length, 0) }, (_, index) => (
                <tr key={`empty-user-${index}`} className="h-[58px] !border-0">
                  <td colSpan={5} className="!border-0" />
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Table Footer Pagination */}
        <div className="flex items-center justify-between border-t border-[#E7E2D8] px-6 py-3.5 text-xs text-[#89938f]">
          <span>Showing page {page + 1} of {totalPages} · 10 accounts per page</span>
          <div className="flex items-center gap-1">
            <button disabled={page === 0} onClick={() => { tableScrollY.current = window.scrollY; setPage((current) => current - 1); }} className="rounded-lg border border-[#e7e2d8] px-3 py-1.5 disabled:opacity-40">Previous</button>
            {Array.from({ length: totalPages }, (_, index) => <button key={index} onClick={() => { tableScrollY.current = window.scrollY; setPage(index); }} className={`min-w-8 rounded-lg border px-2 py-1.5 ${page === index ? 'border-[#1e3a2f] bg-[#1e3a2f] text-white' : 'border-[#e7e2d8] text-[#6d7974] hover:bg-[#faf8f5]'}`}>{index + 1}</button>)}
            <button disabled={page + 1 >= totalPages} onClick={() => { tableScrollY.current = window.scrollY; setPage((current) => current + 1); }} className="rounded-lg border border-[#e7e2d8] px-3 py-1.5 disabled:opacity-40">Next</button>
          </div>
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
              Recommendations Dashboard: Review mining product groups, approve for layouts, and tune utility profiles.
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
        <p>Role and status changes are applied directly through the Backend.</p>
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
                  placeholder="e.g. hoang.duc@example.com"
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
                    onChange={(e) => {
                      const nextRole = e.target.value as SystemRole;
                      setFormRole(nextRole);
                      if (nextRole === 'System Admin' || nextRole === 'End-Customer') {
                        setFormStoreId('');
                      }
                    }}
                    className="w-full text-xs bg-white border border-[#E7E2D8] rounded-lg p-2 text-[#191c1b] focus:border-[#1e3a2f] outline-none"
                  >
                    {backendRoles.map((role) => (
                      <option key={role.code} value={roleRevMap[role.code]}>
                        {role.display_name}
                      </option>
                    ))}
                  </select>
                </div>

          <div>
            <label className="text-xs font-semibold text-[#191c1b] block mb-1">Store ID</label>
            <input
              type="number"
              min="1"
              required={formRole === 'Store Admin' || formRole === 'Merchandiser'}
              value={formStoreId}
              onChange={(e) => setFormStoreId(e.target.value)}
              placeholder={formRole === 'System Admin' || formRole === 'End-Customer' ? 'Not applicable' : 'e.g. 1'}
              disabled={formRole === 'System Admin' || formRole === 'End-Customer'}
              className="w-full text-xs bg-white border border-[#E7E2D8] rounded-lg p-2 text-[#191c1b] focus:border-[#1e3a2f] outline-none disabled:bg-[#f6f3ef] disabled:text-[#89938f]"
            />
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
                  disabled={isCreatingUser}
                  className="px-4 py-1.5 bg-[#1e3a2f] text-white text-xs font-semibold rounded-lg hover:bg-[#294d3f] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isCreatingUser ? 'Creating...' : 'Create Account'}
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
                  readOnly
                  aria-readonly="true"
                  value={formEmail}
                  className="w-full text-xs bg-[#f6f3ef] border border-[#E7E2D8] rounded-lg p-2 text-[#6d7974] cursor-not-allowed outline-none"
                />
                <p className="mt-1 text-[11px] text-[#89938f]">
                  Email cannot be changed after account creation.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#191c1b] block mb-1">Role Assignment</label>
                  <select
                    value={formRole}
                    onChange={(e) => {
                      const nextRole = e.target.value as SystemRole;
                      setFormRole(nextRole);
                      if (nextRole === 'System Admin' || nextRole === 'End-Customer') {
                        setFormStoreId('');
                      }
                    }}
                    className="w-full text-xs bg-white border border-[#E7E2D8] rounded-lg p-2 text-[#191c1b] focus:border-[#1e3a2f] outline-none"
                  >
                    {backendRoles.map((role) => (
                      <option key={role.code} value={roleRevMap[role.code]}>
                        {role.display_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#191c1b] block mb-1">Account Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as UserStatus)}
                    disabled={editingUser.emailVerified !== true || editingUser.status === 'Inactive'}
                    className="w-full text-xs bg-white border border-[#E7E2D8] rounded-lg p-2 text-[#191c1b] focus:border-[#1e3a2f] outline-none disabled:bg-[#f6f3ef] disabled:text-[#89938f] disabled:cursor-not-allowed"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                  {(editingUser.emailVerified !== true || editingUser.status === 'Inactive') && (
                    <p className="mt-1 text-[11px] text-[#89938f]">
                      Status is locked. The account must be activated through OTP before it can become Active.
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#191c1b] block mb-1">Store ID</label>
                <input
                  type="number"
                  min="1"
                  required={formRole === 'Store Admin' || formRole === 'Merchandiser'}
                  value={formStoreId}
                  onChange={(e) => setFormStoreId(e.target.value)}
                  placeholder={formRole === 'System Admin' || formRole === 'End-Customer' ? 'Not applicable' : 'e.g. 1'}
                  disabled={formRole === 'System Admin' || formRole === 'End-Customer'}
                  className="w-full text-xs bg-white border border-[#E7E2D8] rounded-lg p-2 text-[#191c1b] focus:border-[#1e3a2f] outline-none disabled:bg-[#f6f3ef] disabled:text-[#89938f]"
                />
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
