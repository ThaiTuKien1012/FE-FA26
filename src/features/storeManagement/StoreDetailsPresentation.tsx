import type {ReactNode} from 'react';
import {UsersRound} from 'lucide-react';
import type {SystemRole,UserStatus} from '../../types/users';
import {customerPath} from '../customer/customerRoutes';
import {AccountRoleBadge} from '../users/components/AccountRoleBadge';
import {AccountStatusBadge} from '../users/components/AccountStatusBadge';
import {StoreImagePreview,type SavedStoreImage} from './StoreBranding';
import {StoreStatusBadge,panel} from './StoreManagementShared';
import type {StoreDetail,StoreView} from './storeManagement.api';

export function StoreDetailsHeader({store,image,action}:{store:StoreView;image:SavedStoreImage;action:ReactNode}){
  return <div data-store-profile-header className="flex flex-wrap items-center gap-4 bg-[#1D3C30] p-5 text-white">
    <div className="flex min-w-0 flex-1 basis-[240px] items-center gap-4">
      <StoreImagePreview image={image} kind="icon" identity dark/>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-3"><h2 className="break-words text-xl font-semibold">{store.name}</h2><StoreStatusBadge status={store.status}/></div>
        <a href={customerPath(store.slug)} className="mt-2 block break-words text-sm text-[#D6E4DB] underline-offset-4 hover:underline focus-visible:outline-2">{customerPath(store.slug)}</a>
      </div>
    </div>
    {action&&<div className="ml-auto shrink-0">{action}</div>}
  </div>;
}

export function StoreContactInformation({store}:{store:Pick<StoreView,'address'|'phone'>}){
  return <dl data-store-contact className="grid auto-rows-fr gap-3 sm:grid-cols-2">
    {([['Address',store.address],['Phone Number',store.phone]] as const).map(([label,value])=><div key={label} className="min-w-0 rounded-xl border border-[#EBEEE7] bg-[#F8F9F6] px-4 py-3">
      <dt className="text-xs font-medium text-[#6D7974]">{label}</dt><dd className="mt-1.5 break-words text-sm font-medium leading-6 text-[#263C2E]">{value||'Not set'}</dd>
    </div>)}
  </dl>;
}

// Only explicitly supported Backend codes may use account badges.
export function assignedAccountRole(code:string):SystemRole|null{
  switch(code){case 'SYSTEM_ADMIN':return 'System Admin';case 'STORE_ADMIN':return 'Store Admin';case 'MERCHANDISER':return 'Merchandiser';case 'END_CUSTOMER':return 'End-Customer';default:return null;}
}
export function assignedAccountStatus(code:string):UserStatus|null{
  switch(code){case 'ACTIVE':return 'Active';case 'INACTIVE':return 'Inactive';case 'PENDING_VERIFICATION':return 'Pending Activation';default:return null;}
}
function AssignedRole({code}:{code:string}){
  const role=assignedAccountRole(code);
  return role?<AccountRoleBadge role={role}/>:<span title={code} className="inline-flex rounded-lg border border-[#E2E3DE] bg-[#F4F4F1] px-2.5 py-1.5 text-xs font-medium text-[#666E64]">Unknown role</span>;
}
function AssignedStatus({code}:{code:string}){
  const status=assignedAccountStatus(code);
  return status?<AccountStatusBadge status={status}/>:<span title={code} className="inline-flex rounded-lg border border-[#E2E3DE] bg-[#F4F4F1] px-2.5 py-1.5 text-xs font-medium text-[#666E64]">{code==='INVITED'?'Invited':'Unknown status'}</span>;
}
function AssignedName({user}:{user:StoreDetail['assignedUsers'][number]}){
  const name=user.name?.trim()||'(Unnamed)',initials=user.name?.trim().split(/\s+/).slice(0,2).map(part=>part.charAt(0)).join('').toUpperCase()||'–';
  return <div className="flex min-w-0 items-center gap-3">
    <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#DFE7DC] bg-[#F0F5ED] text-xs font-semibold text-[#607557]">{initials}</span>
    <div className="min-w-0"><p className="break-words font-semibold text-[#263C2E]">{name}</p><p className="mt-1 break-all text-xs leading-5 text-[#6D7974]">{user.email}</p></div>
  </div>;
}
export function StoreAssignedUsers({store}:{store:Pick<StoreDetail,'assignedUserCount'|'assignedUsers'>}){
  return <section aria-label="Assigned users" className={panel+' overflow-hidden shadow-[0_1px_3px_rgba(30,58,47,0.04)]'}>
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E7E2D8] p-5 sm:px-6">
      <div className="min-w-0 flex-1 basis-[140px]"><h2 className="text-lg font-semibold">Assigned Users</h2><p className="mt-1 text-sm text-[#6D7974]">Accounts assigned to this store.</p></div>
      <div data-assigned-account-summary className="ml-auto flex shrink-0 items-center gap-2.5 rounded-xl bg-[#EDF4E9] px-3 py-2">
        <UsersRound aria-hidden="true" className="h-5 w-5 shrink-0 text-[#456A3E]"/>
        <div><p data-assigned-account-count className="text-xl font-semibold leading-6 tabular-nums text-[#1E3A2F]">{store.assignedUserCount.toLocaleString('en-US')}</p><p className="text-xs leading-4 text-[#59685F]">Assigned accounts</p></div>
      </div>
    </header>
    {!store.assignedUsers.length?<p className="px-5 py-6 text-sm text-[#6D7974] sm:px-6">No users are assigned to this store.</p>:<>
      <table aria-label="Assigned users" className="hidden w-full table-fixed text-left text-sm lg:table">
        <colgroup><col/><col style={{width:200}}/><col style={{width:176}}/></colgroup>
        <thead className="border-b border-[#E2E7DE] bg-[#F5F7F2] text-xs text-[#64745F]"><tr>{['Name','Role','Status'].map(label=><th key={label} scope="col" className="whitespace-nowrap px-5 py-3.5 font-semibold sm:px-6">{label}</th>)}</tr></thead>
        <tbody className="divide-y divide-[#EBEEE7] text-[#191C1B]">{store.assignedUsers.map(user=><tr key={user.userId} className="transition-colors hover:bg-[#F5F9F4]">
          <td className="px-5 py-4 sm:px-6"><AssignedName user={user}/></td><td className="px-5 py-4 sm:px-6"><AssignedRole code={user.role}/></td><td className="px-5 py-4 sm:px-6"><AssignedStatus code={user.status}/></td>
        </tr>)}</tbody>
      </table>
      <ul aria-label="Assigned users" className="divide-y divide-[#EBEEE7] lg:hidden">{store.assignedUsers.map(user=><li key={user.userId} className="space-y-3 px-5 py-4 text-sm sm:px-6">
        <AssignedName user={user}/><dl className="flex flex-wrap gap-x-5 gap-y-3"><div><dt className="mb-1.5 text-xs text-[#6D7974]">Role</dt><dd><AssignedRole code={user.role}/></dd></div><div><dt className="mb-1.5 text-xs text-[#6D7974]">Status</dt><dd><AssignedStatus code={user.status}/></dd></div></dl>
      </li>)}</ul>
    </>}
  </section>;
}
