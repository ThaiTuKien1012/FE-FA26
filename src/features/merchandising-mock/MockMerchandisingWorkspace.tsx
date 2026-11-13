import { DemoAnalyticsContext } from '../demo/DemoAnalyticsContext';
import { DEMO_MODE } from '../../demo/demo.config';
import { rememberCustomerStore } from '../customer/data/customerStores';
import { useState } from 'react';
import type { AuthUser } from '../../services/authService';
import { MERCHANDISING_MOCK_ENABLED } from './mock.config';
import { mockStores } from './mock.fixtures';
import { saveDraft } from './mock.engine';
import { mockStore, useMockState } from './useMockStore';
import type { MockState } from './mock.types';
import { MockLayoutEditor } from './MockLayoutEditor';
import { MockCampaigns } from './MockCampaigns';
import { MockAnalytics } from './MockAnalytics';
import './mock-workspace.css';

export function MockMerchandisingWorkspace({currentUser,initialTab='layout'}:{currentUser:AuthUser;initialTab?:'layout'|'campaigns'|'analytics'}) {
  const state=useMockState();
  const [storeId,setStoreId]=useState(mockStores[(currentUser.storeId||1)-1]?.id||mockStores[0].id);
  const [tab,setTab]=useState<'layout'|'campaigns'|'analytics'>(initialTab);
  const [notice,setNotice]=useState<{error:boolean;text:string}|null>(null);
  if(!MERCHANDISING_MOCK_ENABLED) return <div className="mock-workspace mock-panel"><h1>Không bật không gian mô phỏng</h1><p>Khởi động môi trường phát triển với VITE_ENABLE_MERCHANDISING_MOCK=true để dùng F07–F11 mô phỏng.</p></div>;
  if(currentUser.role!=='Merchandiser'&&currentUser.role!=='Store Admin') return <p role="alert">Chỉ Merchandiser và Store Admin được truy cập.</p>;
  const actor={role:currentUser.role,...(DEMO_MODE?{storeId}:{})};
  const run=(operation:(state:MockState)=>MockState,success:string)=>{
    try {mockStore.update(operation);setNotice({error:false,text:success});return true}
    catch(error){setNotice({error:true,text:error instanceof Error?error.message:'Không thực hiện được thao tác.'});return false}
  };
  const active=state.layouts.find(l=>l.id===state.activeByStore[storeId]);
  return <div className="mock-workspace">
    <header className="mock-workspace-header"><div><span className="mock-eyebrow">PASPM · F07–F11</span><h1>Không gian trưng bày</h1><p>Từ nhóm sản phẩm đã duyệt đến cửa hàng đang hiển thị.</p></div><a className="mock-primary" href="/customer-home" onClick={()=>rememberCustomerStore(storeId)} target="_blank" rel="noreferrer">Mở cửa hàng mô phỏng ↗</a></header>
    <div className="mock-disclosure"><strong>DỮ LIỆU MÔ PHỎNG · Không tạo đơn hàng thật</strong><p>Các cửa hàng thử nghiệm độc lập với cửa hàng backend. {DEMO_MODE?'Persona và quyền thao tác chỉ dùng trong demo.':'Tài khoản và phân quyền vẫn dùng phiên đăng nhập thật.'} Dữ liệu được lưu trong trình duyệt này.</p></div>
    <div className="mock-context"><label>Cửa hàng thử nghiệm<select disabled={DEMO_MODE} value={storeId} onChange={e=>{setStoreId(e.target.value);setNotice(null)}}>{mockStores.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label><span>Vai trò: <strong>{currentUser.role}</strong></span><span>ACTIVE: <strong>{active?`${active.name} · v${active.version}`:'Chưa kích hoạt'}</strong></span></div>
    {mockStore.getWarning() && <p role="alert" className="mock-error">{mockStore.getWarning()}</p>}
    {notice&&<div role={notice.error?'alert':'status'} className={notice.error?'mock-error':'mock-success'}>{notice.text}<button aria-label="Đóng thông báo" onClick={()=>setNotice(null)}>×</button></div>}
    <nav className="mock-tabs" aria-label="Quy trình trưng bày">{([{id:'layout',label:'F07 · Layout Simulator'},{id:'campaigns',label:'F08 · Campaign & A/B'},{id:'analytics',label:'F11 · Analytics'}] as const).map(t=><button key={t.id} aria-current={tab===t.id?'page':undefined} onClick={()=>{setTab(t.id);setNotice(null)}}>{t.label}</button>)}</nav>
    <div key={`${storeId}:${currentUser.id}`}>
      <div hidden={tab!=='layout'}><MockLayoutEditor state={state} storeId={storeId} readOnly={actor.role!=='Merchandiser'} onSave={(name,placements)=>run(s=>saveDraft(s,actor,storeId,name,placements),'Đã lưu phiên bản DRAFT mới. Chưa công bố hoặc kích hoạt.')} /></div>
      <div hidden={tab!=='campaigns'}><MockCampaigns state={state} storeId={storeId} actor={actor} run={run} /></div>
      <div hidden={tab!=='analytics'}>{DEMO_MODE&&<DemoAnalyticsContext storeId={storeId} state={state}/>}<MockAnalytics state={state} storeId={storeId} /></div>
    </div>
  </div>;
}
