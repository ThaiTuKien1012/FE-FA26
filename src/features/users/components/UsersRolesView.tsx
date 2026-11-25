import React, { useEffect, useRef, useState } from 'react';
import { Search, ChevronDown, ChevronLeft, ChevronRight, Shield, ShieldCheck, Store, BriefcaseBusiness, UserRound, UsersRound, UserCheck, UserMinus, RefreshCw } from 'lucide-react';
import { UserAccount, SystemRole } from '../../../types/users';

import { authService } from '../../../services/authService';
import { accountChanges, accountDraft, accountRequest, accountRoleCodes, createAccountPayload, mapAccount, planAccountUpdate, saveAccountUpdate } from '../account-management';
import type { AccountDraft } from '../account-management';
import { AccountFormModal } from './AccountFormModal';
import type { AccountRoleOption } from './AccountFormModal';
import { AccountStatusBadge } from './AccountStatusBadge';

const usersViewStateKey = 'system-users-view-state';
const readUsersViewState = () => { try { return JSON.parse(sessionStorage.getItem(usersViewStateKey) || '{}') as { searchQuery?: string; roleFilter?: string; statusFilter?: string; page?: number }; } catch { return {}; } };

const roleAppearance: Record<SystemRole, { icon: typeof Shield; className: string }> = {
  'System Admin': { icon: ShieldCheck, className: 'border-[#CDDDD3] bg-[#EAF1EC] text-[#294E3C]' },
  'Store Admin': { icon: Store, className: 'border-[#D3DFEC] bg-[#EDF3FA] text-[#45648A]' },
  'Merchandiser': { icon: BriefcaseBusiness, className: 'border-[#E0E5D3] bg-[#F2F4EB] text-[#627343]' },
  'End-Customer': { icon: UserRound, className: 'border-[#E2E3DE] bg-[#F4F4F1] text-[#666E64]' }
};

function AccountRoleBadge({ role }: { role: SystemRole }) {
  const { icon: Icon, className } = roleAppearance[role];
  return <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border px-2.5 py-1.5 text-xs font-medium ${className}`}>
    <Icon aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />{role}
  </span>;
}

export function AccountOverview({users,loading,error}:{users:UserAccount[];loading:boolean;error:string|null}){
  const metrics=[
    {label:'Total Accounts',value:users.length,description:'All registered user accounts',icon:UsersRound,accent:'#748F80',iconStyle:'bg-[#EDF2EF] text-[#456653]'},
    {label:'Active Accounts',value:users.filter(user=>user.status==='Active').length,description:'Accounts currently enabled',icon:UserCheck,accent:'#6D9B7A',iconStyle:'bg-[#EAF5ED] text-[#3D7750]'},
    {label:'Inactive Accounts',value:users.filter(user=>user.status==='Inactive').length,description:'Accounts currently disabled',icon:UserMinus,accent:'#A0A99A',iconStyle:'bg-[#F1F3EE] text-[#727D66]'},
    {label:'Store Staff Accounts',value:users.filter(user=>user.role==='Store Admin'||user.role==='Merchandiser').length,description:'Store Admin and Merchandiser accounts',icon:Store,accent:'#879775',iconStyle:'bg-[#F0F3EA] text-[#677A52]'}
  ];
  return <section aria-label="Account statistics" data-account-statistics>
    <div className="grid auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {metrics.map(metric=>{
        const Icon=metric.icon;
        return <article key={metric.label} aria-label={`${metric.label}: loaded account list only`} title="Based on the loaded account list, not a system-wide total." className="flex h-full flex-col rounded-2xl border border-t-2 border-[#E7E2D8] bg-white p-5 shadow-[0_1px_2px_rgba(30,58,47,0.03)]" style={{borderTopColor:metric.accent}}>
          <div className="flex items-start justify-between gap-3">
            <h3 className="pt-1 text-sm font-medium leading-5 text-[#59685F]">{metric.label}</h3>
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${metric.iconStyle}`}><Icon aria-hidden="true" className="h-5 w-5" strokeWidth={1.7}/></span>
          </div>
          <p data-account-value className="mt-2 text-3xl font-semibold tracking-tight tabular-nums text-[#1E3A2F]">{loading?'…':error?'—':metric.value.toLocaleString('en-GB')}</p>
          <p className="mt-2 text-xs leading-5 text-[#6D7974]">{loading?'Loading accounts...':error?'Account data unavailable':metric.description}</p>
        </article>;
      })}
    </div>
    <p className="mt-2.5 text-xs leading-5 text-[#788479]">Statistics reflect the loaded account list, not system-wide totals.</p>
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
  const [isLoading, setIsLoading] = useState(true);
  const [accountsError,setAccountsError]=useState<string|null>(null);
  const [isUpdatingUser,setIsUpdatingUser]=useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [backendRoles,setBackendRoles]=useState<AccountRoleOption[]>([]);
  const [rolesLoading,setRolesLoading]=useState(false),[rolesError,setRolesError]=useState('');

  const [modalMode,setModalMode]=useState<'add'|'edit'|null>(null);
  const [editingUser,setEditingUser]=useState<UserAccount|null>(null);
  const [draft,setDraft]=useState<AccountDraft>(()=>accountDraft());
  const [loadingAccount,setLoadingAccount]=useState(false);
  const mutationBusy=useRef(false);
  const detailController=useRef<AbortController|null>(null);
  const detailTarget=useRef<UserAccount|null>(null);
  useEffect(()=>()=>detailController.current?.abort(),[]);
  useEffect(() => { sessionStorage.setItem(usersViewStateKey, JSON.stringify({ searchQuery, roleFilter, statusFilter, page })); }, [searchQuery, roleFilter, statusFilter, page]);
  useEffect(() => { if (tableScrollY.current > 0) requestAnimationFrame(() => window.scrollTo({ top: tableScrollY.current, behavior: 'auto' })); }, [page]);

  const fetchBackendUsers=async()=>{
    setIsLoading(true);setAccountsError(null);
    try {
      const data=await accountRequest('/api/users');
      if(!Array.isArray(data))throw new Error('The server returned an invalid account list.');
      setUsers(data.map(mapAccount));
    } catch(e){setAccountsError(e instanceof Error?e.message:'Could not load accounts.');}
    finally{setIsLoading(false);}
  };
  const fetchBackendRoles=async()=>{
    setRolesLoading(true);setRolesError('');
    try {
      const data=await accountRequest('/api/roles');
      if(!Array.isArray(data))throw new Error('The server returned an invalid role list.');
      const mapped:AccountRoleOption[]=data.map((value:unknown)=>{
        const role=value as {code?:unknown;display_name?:unknown}|null;
        const label=Object.entries(accountRoleCodes).find(([,code])=>code===role?.code)?.[0] as SystemRole|undefined;
        if(!role||!label||typeof role.display_name!=='string')throw new Error('The server returned an unsupported account role.');
        return {code:role.code as string,display_name:role.display_name,role:label};
      });
      setBackendRoles(mapped);
      if(mapped.length===0)setRolesError('No account roles are available.');
    } catch(e){setRolesError(e instanceof Error?e.message:'Unable to load account roles.');}
    finally{setRolesLoading(false);}
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
      const selectedStatus=statusFilter==='pending_verification'?'Pending Activation':statusFilter==='active'?'Active':'Inactive';
      if(u.status!==selectedStatus)return false;
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

  const closeModal=()=>{
    if(mutationBusy.current)return;
    detailController.current?.abort();setModalMode(null);setEditingUser(null);setApiError(null);
  };
  const handleOpenAddModal=()=>{
    if(mutationBusy.current)return;
    detailController.current?.abort();setDraft(accountDraft());setEditingUser(null);setLoadingAccount(false);
    setApiError(null);setSuccessMessage(null);setModalMode('add');
  };
  const handleOpenEditModal=async(user:UserAccount)=>{
    if(mutationBusy.current)return;
    detailController.current?.abort();
    const controller=new AbortController();detailController.current=controller;detailTarget.current=user;
    setModalMode('edit');setLoadingAccount(true);setEditingUser(null);setApiError(null);setSuccessMessage(null);
    try {
      const account=mapAccount(await accountRequest('/api/users/'+user.id,{signal:controller.signal}));
      if(controller.signal.aborted)return;
      if(account.id!==user.id)throw new Error('The account details do not match the selected account.');
      setEditingUser(account);setDraft(accountDraft(account));
      setUsers(previous=>previous.map(value=>value.id===account.id?account:value));
    } catch(e){if(!controller.signal.aborted)setApiError(e instanceof Error?e.message:'Unable to load account details.');}
    finally{if(!controller.signal.aborted)setLoadingAccount(false);}
  };
  const handleSaveAddUser=async(event:React.FormEvent<HTMLFormElement>)=>{
    event.preventDefault();
    if(mutationBusy.current)return;
    setApiError(null);setSuccessMessage(null);
    let payload:ReturnType<typeof createAccountPayload>;
    try {payload=createAccountPayload(draft);}catch(e){setApiError(e instanceof Error?e.message:'Review the account details.');return;}
    mutationBusy.current=true;setIsCreatingUser(true);
    try {
      const created=mapAccount(await accountRequest('/api/users',{method:'POST',body:JSON.stringify(payload)}));
      if(created.status!=='Pending Activation'||created.emailVerified!==false||created.email.toLowerCase()!==payload.email.toLowerCase()||
         accountRoleCodes[created.role]!==payload.roleCode||(created.storeId??null)!==payload.storeId)throw new Error('The invitation response could not be verified. Refresh accounts before creating another invitation.');
      await fetchBackendUsers();setModalMode(null);
      setSuccessMessage('Account created. An activation invitation was sent to '+payload.email+'.');
    } catch(e){setApiError(e instanceof Error?e.message:'Unable to create the account. Please try again.');}
    finally{mutationBusy.current=false;setIsCreatingUser(false);}
  };
  const handleSaveEditUser=async(event:React.FormEvent<HTMLFormElement>)=>{
    event.preventDefault();
    if(mutationBusy.current||!editingUser||loadingAccount)return;
    const actor=authService.getCurrentUser();
    if(!actor||actor.role!=='System Admin'){setApiError('Please sign in as System Admin.');return;}
    let operations:ReturnType<typeof planAccountUpdate>;
    try{operations=planAccountUpdate(editingUser,draft,actor.id);}catch(e){setApiError(e instanceof Error?e.message:'Review the account details.');return;}
    if(operations.length===0)return;
    const changes=accountChanges(editingUser,draft);
    let confirmedCount=0;
    mutationBusy.current=true;setIsUpdatingUser(true);setApiError(null);setSuccessMessage(null);
    try {
      await saveAccountUpdate(editingUser,draft,actor.id,confirmed=>{
        confirmedCount++;
        // Keep confirmed partial writes as the retry baseline, while preserving the draft.
        setEditingUser(confirmed);
        setUsers(previous=>previous.map(user=>user.id===confirmed.id?confirmed:user));
        setDraft(previous=>({...previous,...(!changes.status?{status:confirmed.status}:{}),
          ...(!changes.access?{role:confirmed.role,storeId:confirmed.storeId==null?'':String(confirmed.storeId)}:{})}));
      });
      await fetchBackendUsers();setModalMode(null);setEditingUser(null);
      setSuccessMessage('Account changes saved.'+(changes.access||changes.status?' Existing sessions for this account have been revoked.':''));
    } catch(e){setApiError((confirmedCount?'Some changes have been saved. Review the remaining draft before retrying. ':'')+(e instanceof Error?e.message:'Unable to save account changes. Your draft has been kept.'));}
    finally{mutationBusy.current=false;setIsUpdatingUser(false);}
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
          {apiError && !modalMode && (
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
            data-account-add
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
      <section aria-labelledby="user-management-title" className="overflow-hidden rounded-2xl border border-[#E7E2D8] bg-white shadow-[0_1px_3px_rgba(30,58,47,0.04)]">
        <div className="space-y-5 border-b border-[#E7E2D8] p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><h2 id="user-management-title" className="text-lg font-semibold text-[#191C1B]">User Management</h2><p className="mt-1 text-sm text-[#6D7974]">Find accounts and manage their access.</p></div>
            <button type="button" disabled={isLoading} onClick={()=>{setApiError(null);void fetchBackendUsers();void fetchBackendRoles();}} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[#DDE4DC] bg-white px-3 text-sm font-medium text-[#365543] transition-colors hover:border-[#BDCEC1] hover:bg-[#F3F7F3] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#356B54] disabled:cursor-not-allowed disabled:opacity-50">
              <RefreshCw aria-hidden="true" className={`h-3.5 w-3.5 ${isLoading?'animate-spin motion-reduce:animate-none':''}`}/>Refresh accounts
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-12">
            <div className="sm:col-span-2 lg:col-span-6">
              <label htmlFor="accounts-search" className="text-xs font-semibold text-[#59685F]">Search accounts</label>
              <div className="relative mt-2">
                <Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#87958B]"/>
                <input id="accounts-search" aria-label="Search accounts" placeholder="Search by name or email" type="search" value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} className="h-11 w-full rounded-xl border border-[#DDE4DC] bg-[#FCFDFB] pl-10 pr-3.5 text-sm text-[#191C1B] outline-none transition placeholder:text-[#8A968E] focus:border-[#689477] focus:bg-white focus:ring-2 focus:ring-[#356B54]/10"/>
              </div>
            </div>
            <div className="lg:col-span-3">
              <label htmlFor="accounts-role" className="text-xs font-semibold text-[#59685F]">Role</label>
              <div className="relative mt-2">
                <select id="accounts-role" aria-label="Filter by role" value={roleFilter} onChange={e=>setRoleFilter(e.target.value)} className="h-11 w-full appearance-none rounded-xl border border-[#DDE4DC] bg-[#FCFDFB] pl-3.5 pr-10 text-sm text-[#405247] outline-none transition focus:border-[#689477] focus:bg-white focus:ring-2 focus:ring-[#356B54]/10">
                  <option value="all">All roles</option><option value="admin">System Admin</option><option value="store">Store Admin</option><option value="merchandiser">Merchandiser</option><option value="customer">End-Customer</option>
                </select>
                <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#87958B]"/>
              </div>
            </div>
            <div className="lg:col-span-3">
              <label htmlFor="accounts-status" className="text-xs font-semibold text-[#59685F]">Status</label>
              <div className="relative mt-2">
                <select id="accounts-status" aria-label="Filter by status" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="h-11 w-full appearance-none rounded-xl border border-[#DDE4DC] bg-[#FCFDFB] pl-3.5 pr-10 text-sm text-[#405247] outline-none transition focus:border-[#689477] focus:bg-white focus:ring-2 focus:ring-[#356B54]/10">
                  <option value="all">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option><option value="pending_verification">Pending Activation</option>
                </select>
                <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#87958B]"/>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">User accounts with roles, status and editing actions</caption>
            <thead className="border-b border-[#E2E7DE] bg-[#F5F7F2] text-xs text-[#64745F]">
              <tr>
                <th className="whitespace-nowrap px-5 py-3.5 font-semibold sm:px-6" scope="col">Name</th>
                <th className="whitespace-nowrap px-5 py-3.5 font-semibold sm:px-6" scope="col">Email</th>
                <th className="whitespace-nowrap px-5 py-3.5 font-semibold sm:px-6" scope="col">Role</th>
                <th className="whitespace-nowrap px-5 py-3.5 font-semibold sm:px-6" scope="col">Status</th>
                <th className="whitespace-nowrap px-5 py-3.5 text-right font-semibold sm:px-6" scope="col">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EBEEE7] text-[#191C1B]">
              {!isLoading&&!accountsError&&visibleUsers.map(user=>(
                <tr key={user.id} className="transition-colors hover:bg-[#F5F9F4] focus-within:bg-[#F5F9F4]">
                  <td className="whitespace-nowrap px-5 py-4 sm:px-6">
                    <div className="flex items-center gap-3">
                      <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#DFE7DC] bg-[#F0F5ED] text-xs font-semibold text-[#607557]">{user.name.trim().split(/\s+/).slice(0,2).map(part=>part.charAt(0)).join('').toUpperCase()||'–'}</span>
                      <span className="font-semibold text-[#263C2E]">{user.name||'(Unnamed)'}</span>
                    </div>
                  </td>
                  <td className="max-w-[280px] px-5 py-4 text-[#6D7974] sm:px-6"><span className="block truncate" title={user.email}>{user.email}</span></td>
                  <td className="px-5 py-4 sm:px-6"><AccountRoleBadge role={user.role}/></td>
                  <td className="px-5 py-4 sm:px-6"><AccountStatusBadge status={user.status}/></td>
                  <td className="px-5 py-4 text-right sm:px-6">
                    <button type="button" aria-label={`Edit ${user.name}`} onClick={()=>handleOpenEditModal(user)} className="inline-flex h-9 min-w-[60px] items-center justify-center rounded-lg border border-[#D5E0D3] bg-white px-3.5 text-sm font-semibold text-[#365D3E] transition-colors hover:border-[#AFC5AE] hover:bg-[#EDF5E9] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#356B54]">
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
              {(isLoading||accountsError||visibleUsers.length===0)&&<tr><td colSpan={5} className="px-6 py-10 text-center text-sm text-[#6D7974]">
                <div className="flex flex-col items-center gap-3">{isLoading?<RefreshCw aria-hidden="true" className="h-5 w-5 animate-spin text-[#6C8B70] motion-reduce:animate-none"/>:<UsersRound aria-hidden="true" className="h-6 w-6 text-[#9BA997]"/>}
                  <p role={isLoading?'status':undefined}>{isLoading?'Loading accounts...':accountsError?'Accounts could not be loaded. Use Retry accounts to try again.':users.length===0?'No accounts were returned.':'No accounts match your search and filters.'}</p>
                </div>
              </td></tr>}
            </tbody>
          </table>
        </div>

        <footer className="flex flex-col gap-4 border-t border-[#E7E2D8] bg-[#FDFEFB] px-5 py-4 text-xs text-[#6D7974] sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="space-y-1">
            <p>{isLoading?'Loading accounts...':accountsError?'Account list unavailable':<>Showing <span className="font-medium tabular-nums text-[#3D5640]">{visibleUsers.length===0?0:page*pageSize+1}–{Math.min((page+1)*pageSize,filteredUsers.length)}</span> of <span className="font-medium tabular-nums text-[#3D5640]">{filteredUsers.length}</span> accounts</>}</p>
            <p className="text-[#8A9689]">Page {page+1} of {totalPages} · {pageSize} accounts per page</p>
          </div>
          <nav aria-label="Account pages" className="flex flex-wrap items-center gap-1.5">
            <button type="button" disabled={isLoading||Boolean(accountsError)||page===0} onClick={()=>{tableScrollY.current=window.scrollY;setPage(current=>current-1);}} className="inline-flex h-9 items-center justify-center gap-1 rounded-lg border border-[#DFE5D9] bg-white pl-2.5 pr-3 font-medium text-[#536A4C] transition-colors hover:bg-[#F0F5EB] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#356B54] disabled:cursor-not-allowed disabled:text-[#B3BCAE]">
              <ChevronLeft aria-hidden="true" className="h-3.5 w-3.5"/>Previous
            </button>
            {Array.from({length:totalPages},(_,index)=><button type="button" key={index} aria-label={`Go to page ${index+1}`} aria-current={page===index?'page':undefined} disabled={isLoading||Boolean(accountsError)} onClick={()=>{tableScrollY.current=window.scrollY;setPage(index);}} className={`inline-flex h-9 min-w-9 items-center justify-center rounded-lg border px-2 font-semibold tabular-nums transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#356B54] disabled:cursor-not-allowed disabled:opacity-50 ${page===index?'border-[#356B54] bg-[#356B54] text-white':'border-[#DFE5D9] bg-white text-[#536A4C] hover:bg-[#F0F5EB]'}`}>{index+1}</button>)}
            <button type="button" disabled={isLoading||Boolean(accountsError)||page+1>=totalPages} onClick={()=>{tableScrollY.current=window.scrollY;setPage(current=>current+1);}} className="inline-flex h-9 items-center justify-center gap-1 rounded-lg border border-[#DFE5D9] bg-white pl-3 pr-2.5 font-medium text-[#536A4C] transition-colors hover:bg-[#F0F5EB] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#356B54] disabled:cursor-not-allowed disabled:text-[#B3BCAE]">
              Next<ChevronRight aria-hidden="true" className="h-3.5 w-3.5"/>
            </button>
          </nav>
        </footer>
      </section>

      {/* Footer Note */}
      <footer className="pt-2 pb-6 text-xs text-[#89938f]">
        <p>Role and status changes are saved through the backend and can revoke existing sessions. Activation still requires OTP verification.</p>
      </footer>

      {modalMode&&<AccountFormModal mode={modalMode} current={editingUser} actorId={authService.getCurrentUser()?.id??''} draft={draft}
        loading={loadingAccount} submitting={isCreatingUser||isUpdatingUser} error={apiError} roles={backendRoles} rolesLoading={rolesLoading} rolesError={rolesError}
        onRefreshRoles={()=>void fetchBackendRoles()} onReload={()=>{if(detailTarget.current)void handleOpenEditModal(detailTarget.current);}}
        onChange={patch=>{setDraft(previous=>({...previous,...patch}));setApiError(null);}} onClose={closeModal}
        onSubmit={modalMode==='add'?handleSaveAddUser:handleSaveEditUser}/>}
    </div>
  );
};
