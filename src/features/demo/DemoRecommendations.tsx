import {useState,useSyncExternalStore} from 'react';
import type {AuthUser} from '../../services/authService';
import type {ActiveNavScreen} from '../../types/mining';
import {demoApprovals} from './demo.approvals';
import {mockStores,seedApprovedGroups,mockProducts} from '../merchandising-mock/mock.fixtures';
import '../merchandising-mock/mock-workspace.css';
export function DemoRecommendations({user,onNavigate}:{user:AuthUser;onNavigate:(screen:ActiveNavScreen)=>void}) {
  const state=useSyncExternalStore(demoApprovals.subscribe,demoApprovals.getSnapshot,demoApprovals.getSnapshot);
  const [notice,setNotice]=useState('');
  const storeId=mockStores[(user.storeId||1)-1]?.id||mockStores[0].id;
  const groups=[...seedApprovedGroups,...state.groups].filter(g=>g.storeId===storeId);
  return <section className="mock-workspace"><header className="mock-workspace-header"><div><span className="mock-eyebrow">F06 · DEMO RECOMMENDATIONS</span><h1>Nhóm sản phẩm đề xuất</h1><p>{mockStores.find(s=>s.id===storeId)?.name} · Duyệt nhóm để đưa vào trình soạn F07.</p></div><button className="mock-primary" onClick={()=>onNavigate('merchandising-mock')}>Mở Layout Editor</button></header>
    <p className="mock-disclosure">Bằng chứng mô phỏng: trọng số Utility của fixture v1, đơn vị utility; không phải lợi nhuận hay kết quả mining thực. Nhóm đã duyệt được giữ nguyên để bảo toàn phiên bản layout.</p>
    {notice&&<p role="status">{notice}</p>}
    <div className="grid gap-4 sm:grid-cols-2">{groups.map(group=><article className="mock-panel min-w-0" key={group.id}><span className="mock-badge">{group.approved?'APPROVED':'PENDING'}</span><h2>{group.title}</h2><ul>{group.items.map(item=><li key={item.productId}>{mockProducts(storeId).find(p=>p.id===item.productId)?.name||item.productId} × {item.quantity}</li>)}</ul><p>Utility: {group.utility} fixture utility units</p><p>Nguồn: grocery-demo-v1 · không có telemetry khách hàng.</p>{!group.approved&&<button onClick={()=>{try{demoApprovals.approve({role:user.role,storeId},group.id);setNotice('Đã duyệt nhóm. Nhóm hiện có trong F07.')}catch(e){setNotice((e as Error).message)}}}>Duyệt nhóm</button>}</article>)}</div>
  </section>;
}
