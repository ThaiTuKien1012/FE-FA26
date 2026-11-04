import type { UserStatus } from '../../../types/users';

export function AccountStatusBadge({status}:{status:UserStatus}) {
  const style=status==='Active'?{badge:'border-[#CCE4D3] bg-[#EAF6EE] text-[#286342]',dot:'bg-[#43835B]'}:
    status==='Pending Activation'?{badge:'border-[#EADBA9] bg-[#FFF8E4] text-[#89651C]',dot:'bg-[#B69540]'}:
    {badge:'border-[#EBD7D3] bg-[#FBEEEB] text-[#95564C]',dot:'bg-[#BD7C70]'};
  return <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border px-2.5 py-1.5 text-xs font-medium ${style.badge}`}><span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${style.dot}`}/>{status}</span>;
}
