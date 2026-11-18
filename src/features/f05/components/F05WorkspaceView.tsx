import { useState } from 'react';
import { authService, type AuthUser } from '../../../services/authService';
import { useMiningLocation, type MiningView } from '../f05.navigation';
import { miningButton, miningErrorMessage } from '../f05.display';
import type { RequestView, SnapshotView } from '../f05.types';
import { MiningHistoryView } from './MiningHistoryView';
import { SnapshotPicker } from './SnapshotPicker';
import { SystemMiningWorkspace } from './SystemMiningWorkspace';
import { MiningSubmissionPanel, restoreMiningSubmission } from './MiningSubmissionPanel';
interface Props { currentUser: AuthUser; initialView?: MiningView; }
function StoreWorkspace({currentUser}:Props) {
  const merchant=currentUser.role==='Merchandiser';
  const {location,navigate}=useMiningLocation(false,merchant?'setup':'history');
  const [selected,setSelected]=useState<SnapshotView|null>(null),[receipt,setReceipt]=useState<RequestView|null>(null);
  const [restored]=useState(()=>merchant?restoreMiningSubmission(currentUser.id):{pending:null,error:''});
  const [locked,setLocked]=useState(Boolean(restored.pending||restored.error)),[revision,setRevision]=useState(0);
  const tab=merchant?location.view:location.view==='setup'?'history':location.view;
  return <div className="mx-auto max-w-6xl space-y-5 text-[#191C1B]">
    <header><h1 className="text-2xl font-semibold sm:text-3xl">{merchant?'Product Combination Analysis':'Analysis History'}</h1><p className="mt-2 text-sm text-[#6D7974]">{merchant?'Discover valuable product combinations from your saved utility snapshots.':'Review completed and ongoing analyses for your store.'}</p>{!merchant&&<p className="mt-2 text-xs text-[#6D7974]">Store Admin · Read-only access</p>}</header>
    <nav aria-label="Mining workspace" className="flex flex-wrap gap-2">
      {merchant&&<button className={miningButton} aria-current={tab==='setup'?'page':undefined} onClick={()=>navigate('setup')}>Run Analysis</button>}
      <button className={miningButton} aria-current={tab==='history'?'page':undefined} onClick={()=>navigate('history')}>Analysis History</button>
    </nav>
    {receipt&&tab==='history'&&<p role="status" className="rounded-xl bg-[#EDF5F0] p-3 text-sm">Request #{receipt.requestId} accepted · Snapshot #{receipt.snapshotId}. Follow progress below.</p>}
    {tab==='setup'&&merchant&&<SnapshotPicker canSubmit canCreateSnapshot locked={locked} selected={selected} onSelect={setSelected} errorMessage={miningErrorMessage}/>}
    {merchant&&<div hidden={tab!=='setup'}><MiningSubmissionPanel user={currentUser} selected={selected} storeId={currentUser.storeId??null} confirmedStore onLocked={setLocked} onHistory={()=>navigate('history')} onAccepted={request=>{setReceipt(request);setRevision(x=>x+1);navigate('history',null,request.requestId);}}/></div>}
    {tab==='snapshots'&&<SnapshotPicker canSubmit={false} canCreateSnapshot={merchant} locked={false} selected={null} onSelect={()=>{}} errorMessage={miningErrorMessage}/>}
    {tab==='history'&&<MiningHistoryView key={revision} compact={!merchant} requestId={location.requestId} selectionError={location.error} onSelect={id=>navigate('history',null,id)}/>}
  </div>;
}
export function F05WorkspaceView({currentUser,initialView}:Props) {
  const key=JSON.stringify([currentUser.id,currentUser.role,currentUser.storeId,authService.getSessionId()]);
  if(currentUser.role==='System Admin')return <SystemMiningWorkspace key={key} currentUser={currentUser} initialView={initialView??'dashboard'}/>;
  if(currentUser.role!=='Merchandiser'&&currentUser.role!=='Store Admin')return null;
  return <StoreWorkspace key={key} currentUser={currentUser}/>;
}
