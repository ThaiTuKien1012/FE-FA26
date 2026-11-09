import type { AuthUser } from '../../../services/authService';
import { useMiningLocation } from '../f05.navigation';
import type { MiningView } from '../f05.navigation';
import { miningButton, miningErrorMessage } from '../f05.display';
import { MiningHistoryView } from './MiningHistoryView';
import { SnapshotPicker } from './SnapshotPicker';
import { SystemMiningWorkspace } from './SystemMiningWorkspace';

interface Props { currentUser: AuthUser; initialView?: MiningView; }
function StoreWorkspace({currentUser}:Props) {
  const {location,navigate}=useMiningLocation(false,'history');
  if (currentUser.role === 'Store Admin') return <div className="mx-auto max-w-6xl space-y-6 text-[#191C1B]">
    <header><h1 className="text-3xl font-semibold">Mining Results</h1><p className="mt-2 text-[#6D7974]">View completed analyses and discovered product patterns for your store.</p></header>
    <MiningHistoryView compact requestId={location.requestId} selectionError={location.error} onSelect={id=>navigate('history',null,id)} />
    <details open={location.view === 'snapshots'} onToggle={event => {
      if (event.currentTarget.open !== (location.view === 'snapshots')) navigate(event.currentTarget.open ? 'snapshots' : 'history', null, location.requestId);
    }} className="rounded-2xl border border-[#E7E2D8] bg-white p-5 sm:p-6">
      <summary className="cursor-pointer text-sm font-semibold text-[#356B54]">Source snapshots</summary>
      {location.view === 'snapshots' && <div className="mt-5"><SnapshotPicker canSubmit={false} locked={false} selected={null} onSelect={()=>{}} errorMessage={miningErrorMessage} /></div>}
    </details>
  </div>;
  return <div className="mx-auto max-w-6xl space-y-6 text-[#191C1B]">
    <header><h1 className="text-3xl font-semibold">High Utility Mining</h1>
      <p className="mt-2 text-[#6D7974]">Read-only snapshots, mining history and high-utility patterns for your Store.</p>
      <p className="mt-3 text-sm font-semibold text-[#356B54]">{currentUser.role} · Read-only access</p>
      <p className="mt-2 text-sm text-[#6D7974]">System Admin configures and runs mining. Merchandisers can continue creating frozen snapshots in F03. Benchmarks are available to System Admin.</p>
    </header>
    <nav aria-label="Mining workspace" className="flex flex-wrap gap-2">
      <button type="button" aria-current={location.view==='snapshots'?'page':undefined} className={miningButton} onClick={()=>navigate('snapshots')}>Snapshots</button>
      <button type="button" aria-current={location.view==='history'?'page':undefined} className={miningButton} onClick={()=>navigate('history')}>Request history</button>
    </nav>
    {location.view==='snapshots' ? <SnapshotPicker canSubmit={false} canCreateSnapshot={currentUser.role==='Merchandiser'} locked={false} selected={null} onSelect={()=>{}} errorMessage={miningErrorMessage}/> :
      <MiningHistoryView requestId={location.requestId} selectionError={location.error} onSelect={id=>navigate('history',null,id)}/>}
  </div>;
}
export function F05WorkspaceView({currentUser,initialView}:Props) {
  if (currentUser.role==='System Admin') return <SystemMiningWorkspace key={currentUser.id} currentUser={currentUser} initialView={initialView??'dashboard'}/>;
  if (currentUser.role!=='Merchandiser' && currentUser.role!=='Store Admin') return null;
  return <StoreWorkspace key={`${currentUser.id}:${currentUser.role}`} currentUser={currentUser}/>;
}
