import React, { useEffect, useRef, useState } from 'react';
import { Search, ChevronDown, UserPlus, X, Shield } from 'lucide-react';
import { UserAccount, SystemRole, UserStatus } from '../../../types/users';

import { authService } from '../../../services/authService';

const usersViewStateKey = 'system-users-view-state';
const readUsersViewState = () => { try { return JSON.parse(sessionStorage.getItem(usersViewStateKey) || '{}') as { searchQuery?: string; roleFilter?: string; statusFilter?: string; page?: number }; } catch { return {}; } };

export function AccountOverview({users,loading,error}:{users:UserAccount[];loading:boolean;error:string|null}){
  const metrics=[
    {label:'Total Accounts',value:users.length,description:'All registered accounts'},
    {label:'Active Accounts',value:users.filter(user=>user.status==='Active').length,description:'Accounts currently enabled'},
    {label:'Inactive Accounts',value:users.filter(user=>user.status!=='Active').length,description:'Accounts not active'},
    {label:'Store Staff Accounts',value:users.filter(user=>user.role==='Store Admin'||user.role==='Merchandiser').length,description:'Store Admins and Merchandisers'}
  ];
  return <section aria-labelledby="account-overview-title"><h2 id="account-overview-title" className="text-lg font-semibold">Account Overview</h2><p className="mt-1 text-xs text-[#6D7974]">Counts cover the accounts returned in this management list.</p>
    <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{metrics.map(metric=><article key={metric.label} className="rounded-xl border border-[#E7E2D8] bg-white p-5">
      <h3 className="text-sm font-medium text-[#6D7974]">{metric.label}</h3><p className="mt-3 text-3xl font-semibold tabular-nums text-[#191C1B]">{loading?'…':error?'—':metric.value.toLocaleString('en-GB')}</p><p className="mt-2 text-xs text-[#6D7974]">{loading?'Loading accounts...':error?'Account data unavailable':metric.description}</p>
    </article>)}</div>
  </section>;
}

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
  const [isLoading, setIsLoading] = useState(true);
  const [accountsError,setAccountsError]=useState<string|null>(null);
  const [isUpdatingUser,setIsUpdatingUser]=useState(false);
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
      return 'This email is already registered. Use a different email address.';
    }

    if (normalized.includes('store') && (normalized.includes('exist') || normalized.includes('constraint') || normalized.includes('invalid'))) {
      return 'The Store does not exist or is not valid for this role.';
    }

    if (normalized.includes('role') && (normalized.includes('invalid') || normalized.includes('constraint'))) {
      return 'This role is not valid. Choose an available account role.';
    }

    return 'Unable to create the account. Review the details and try again.';
  };

  const fetchBackendUsers = async () => {
    const token = authService.getToken();
    if (!token) {setAccountsError('Please sign in again to load accounts.');setIsLoading(false);return;}
    setIsLoading(true);
    setAccountsError(null);
    try {
      const res = await fetch('/api/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Accounts could not be loaded (HTTP '+res.status+').');
      if (res.ok) {
        const data = await res.json();
        if(!Array.isArray(data))throw new Error('The server returned an invalid account list.');
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
    } catch(e) {
      setAccountsError(e instanceof Error?e.message:'Could not connect to the account service.');setIsBackendLive(false);
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
    if (isCreatingUser || !formName.trim() || !formEmail.trim()) return;
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
          setSuccessMessage(`Account created. An activation invitation was sent to ${formEmail.trim()}.`);
          return;
        } else {
          const errData = await res.json().catch(() => null);
          const backendMessage = errData?.error || errData?.message;
          console.error('Create user failed:', backendMessage || res.statusText);
          setApiError(getUserFriendlyApiError(backendMessage));
          return;
        }
      } catch {
        setApiError('Could not connect to the account service. Please try again.');
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
    if (!editingUser || isUpdatingUser) return;
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
      setApiError('Enter a valid Store ID for this role.');
      return;
    }

    if (isBackendLive && token && !isNaN(userIdNum)) {
      setIsUpdatingUser(true);
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
        setSuccessMessage('Account changes saved. Role or status changes may require the user to sign in again.');
        return;
      } catch(e) {
        setApiError(e instanceof Error?e.message:'Unable to update the account. Review the role and Store ID, then try again.');return;
      } finally {setIsUpdatingUser(false);}
    }
    setApiError('The account service or your session is unavailable. Refresh accounts before trying again.');
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
            Manage accounts, store assignments and access roles.
          </p>
          {apiError && (
            <div role="alert" className="mt-2 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              {apiError}
            </div>
          )}
          {successMessage && (
            <div role="status" className="mt-2 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
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
            Add Account
          </button>
        </div>
      </section>

      <AccountOverview users={users} loading={isLoading} error={accountsError}/>
      {accountsError&&<div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-red-50 p-4 text-sm text-red-800"><p>{accountsError}</p><button type="button" disabled={isLoading} className="font-semibold underline" onClick={()=>void fetchBackendUsers()}>Retry accounts</button></div>}
      {/* User Management Card */}
      <section className="bg-white rounded-xl border border-[#E7E2D8] shadow-xs overflow-hidden">
        {/* Card Header & Filter Controls */}
        <div className="p-6 border-b border-[#E7E2D8] space-y-4">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-bold text-[#191c1b]">User Management</h2><button type="button" disabled={isLoading} className="rounded-xl border border-[#E7E2D8] px-3 py-2 text-xs font-semibold disabled:opacity-50" onClick={()=>{setApiError(null);void fetchBackendUsers();void fetchBackendRoles();}}>Refresh accounts</button></div>
            <p className="text-xs text-[#6d7974] mt-0.5">
              Search, review and update the accounts in this list.
            </p>
          </div>

          {/* Filter & Search Bar Row */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-1">
            {/* Search Input */}
            <div className="md:col-span-6 relative">
              <input
                className="w-full text-sm bg-white border border-[#E7E2D8] rounded-lg px-3.5 py-2 text-[#191c1b] placeholder-[#89938f] focus:border-[#1e3a2f] outline-none transition"
                aria-label="Search accounts" placeholder="Search name or email..."
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
              <tr className="text-[11px] font-semibold text-[#89938f] uppercase tracking-wider border-b border-[#E7E2D8] bg-[#FAF8F5]">
                <th className="py-3 px-6" scope="col">NAME</th>
                <th className="py-3 px-6" scope="col">EMAIL</th>
                <th className="py-3 px-6" scope="col">ROLE</th>
                <th className="py-3 px-6" scope="col">STATUS</th>
                <th className="py-3 px-6 text-right" scope="col">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7E2D8]/60 text-[#191c1b]">
              {!isLoading&&!accountsError&&visibleUsers.map((user) => (
                <tr key={user.id} className="hover:bg-[#FAF8F5] transition-colors">
                  <td className="py-3.5 px-6 font-semibold text-[#191c1b] whitespace-nowrap">
                    {user.name}
                  </td>
                  <td className="py-3.5 px-6 text-[#6d7974] whitespace-nowrap">
                    {user.email}
                  </td>
                  <td className="py-3.5 px-6 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-[#F3F7F4] text-[#1e3a2f]">
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
              {(isLoading||accountsError||visibleUsers.length===0)&&<tr><td colSpan={5} className="px-6 py-8 text-sm text-[#6D7974]">{isLoading?<span role="status">Loading accounts...</span>:accountsError?'Accounts could not be loaded. Use Retry accounts to try again.':users.length===0?'No accounts were returned.':'No accounts match your search and filters.'}</td></tr>}
            </tbody>
          </table>
        </div>

        {/* Table Footer Pagination */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E7E2D8] px-6 py-3.5 text-xs text-[#89938f]">
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
              Global mining settings, mining runs, benchmarks and account management.
            </p>
          </div>

          {/* Store Admin */}
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-[#1e3a2f]">Store Admin</h4>
            <p className="text-xs text-[#6d7974] leading-relaxed">
              Products, inventory and transaction imports for the assigned Store.
            </p>
          </div>

          {/* Merchandiser */}
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-[#1e3a2f]">Merchandiser</h4>
            <p className="text-xs text-[#6d7974] leading-relaxed">
              Utility configuration, snapshots and read-only mining results for the assigned Store.
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
        <p>Role and status changes are saved through the backend and can revoke existing sessions. Activation still requires OTP verification.</p>
      </footer>

      {/* Add User Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#191c1b]/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div role="dialog" aria-modal="true" aria-label="Account details" className="bg-white rounded-xl border border-[#E7E2D8] shadow-xl max-w-md w-full max-h-[90dvh] overflow-y-auto p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E2D8]">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-[#1e3a2f]" />
                <h3 className="text-sm font-bold text-[#191c1b]">Add New Account</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-[#89938f] hover:bg-[#FAF8F5] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAddUser} className="mt-4 space-y-4"><p className="text-xs leading-relaxed text-[#6D7974]">An activation invitation is sent by email. New accounts remain inactive until OTP activation is complete.</p>{apiError&&<p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{apiError}</p>}
              <div>
                <label className="text-xs font-semibold text-[#191c1b] block mb-1">Full Name</label>
                <input
                  type="text"
                  aria-label="Full Name"
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
                  aria-label="Email Address"
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
                    aria-label="Account Role"
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
              aria-label="Store ID"
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
                  className="px-3 py-1.5 border border-[#E7E2D8] text-xs font-medium text-[#6d7974] rounded-lg hover:bg-[#FAF8F5] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingUser||backendRoles.length===0}
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
          <div role="dialog" aria-modal="true" aria-label="Account details" className="bg-white rounded-xl border border-[#E7E2D8] shadow-xl max-w-md w-full max-h-[90dvh] overflow-y-auto p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E2D8]">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#1e3a2f]" />
                <h3 className="text-sm font-bold text-[#191c1b]">Edit User &amp; Permissions</h3>
              </div>
              <button
                disabled={isUpdatingUser} onClick={() => setEditingUser(null)}
                className="p-1 rounded-lg text-[#89938f] hover:bg-[#FAF8F5] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditUser} className="mt-4 space-y-4">{apiError&&<p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{apiError}</p>}
              <div>
                <label className="text-xs font-semibold text-[#191c1b] block mb-1">Full Name</label>
                <input
                  type="text"
                  aria-label="Full Name" disabled={isUpdatingUser}
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
                  aria-label="Email Address"
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
                    aria-label="Account Role" disabled={isUpdatingUser}
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
                    aria-label="Account Status"
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as UserStatus)}
                    disabled={isUpdatingUser || editingUser.emailVerified !== true || editingUser.status === 'Inactive'}
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
                  aria-label="Store ID"
                  min="1"
                  required={formRole === 'Store Admin' || formRole === 'Merchandiser'}
                  value={formStoreId}
                  onChange={(e) => setFormStoreId(e.target.value)}
                  placeholder={formRole === 'System Admin' || formRole === 'End-Customer' ? 'Not applicable' : 'e.g. 1'}
                  disabled={isUpdatingUser || formRole === 'System Admin' || formRole === 'End-Customer'}
                  className="w-full text-xs bg-white border border-[#E7E2D8] rounded-lg p-2 text-[#191c1b] focus:border-[#1e3a2f] outline-none disabled:bg-[#f6f3ef] disabled:text-[#89938f]"
                />
              </div>

              <div className="mt-6 pt-4 border-t border-[#E7E2D8] flex justify-end gap-2">
                <button
                  type="button"
                  disabled={isUpdatingUser} onClick={() => setEditingUser(null)}
                  className="px-3 py-1.5 border border-[#E7E2D8] text-xs font-medium text-[#6d7974] rounded-lg hover:bg-[#FAF8F5] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingUser}
                  className="px-4 py-1.5 bg-[#1e3a2f] text-white text-xs font-semibold rounded-lg hover:bg-[#294d3f] cursor-pointer"
                >
                  {isUpdatingUser?'Saving...':'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
