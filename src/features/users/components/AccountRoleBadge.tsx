import {BriefcaseBusiness,ShieldCheck,Store,UserRound,type LucideIcon} from 'lucide-react';
import type {SystemRole} from '../../../types/users';

const roleAppearance:Record<SystemRole,{icon:LucideIcon;className:string}>={
  'System Admin':{icon:ShieldCheck,className:'border-[#CDDDD3] bg-[#EAF1EC] text-[#294E3C]'},
  'Store Admin':{icon:Store,className:'border-[#D3DFEC] bg-[#EDF3FA] text-[#45648A]'},
  Merchandiser:{icon:BriefcaseBusiness,className:'border-[#E0E5D3] bg-[#F2F4EB] text-[#627343]'},
  'End-Customer':{icon:UserRound,className:'border-[#E2E3DE] bg-[#F4F4F1] text-[#666E64]'}
};

export function AccountRoleBadge({role}:{role:SystemRole}){
  const {icon:Icon,className}=roleAppearance[role];
  return <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border px-2.5 py-1.5 text-xs font-medium ${className}`}>
    <Icon aria-hidden="true" className="h-3.5 w-3.5 shrink-0"/>{role}
  </span>;
}
