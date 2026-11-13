import { useState } from 'react';
import type { MockState, MockActor } from './mock.types';
import { createCampaign, editCampaign, simulateCampaign, publishCampaign, activateLayout } from './mock.engine';

type Props = { state: MockState; storeId: string; actor: MockActor; run: (operation: (state: MockState) => MockState, success: string) => boolean };
const money = (value:number) => new Intl.NumberFormat('vi-VN',{style:'currency',currency:'VND'}).format(value);
export function MockCampaigns({ state, storeId, actor, run }: Props) {
  const layouts=state.layouts.filter(layout=>layout.storeId===storeId);
  const campaigns=state.campaigns.filter(campaign=>campaign.storeId===storeId);
  const [name,setName]=useState('');
  const [editingId,setEditingId]=useState<string|null>(null);
  const [baseline,setBaseline]=useState(state.activeByStore[storeId]||'');
  const [proposed,setProposed]=useState('');
  const [seed,setSeed]=useState('42');
  const [visitors,setVisitors]=useState('1000');
  const merchant=actor.role==='Merchandiser';
  return <section aria-labelledby="mock-campaign-title" className="mock-panel">
    <div className="mock-section-heading"><div><span className="mock-eyebrow">F08 · MÔ PHỎNG</span><h2 id="mock-campaign-title">Chiến dịch & thử nghiệm A/B</h2></div><span className="mock-badge">Công bố ≠ Kích hoạt</span></div>
    <p>Mỗi chiến dịch giữ nguyên phiên bản A và B. Kết quả có thể tái lập bằng cùng seed và lượng truy cập; không phải dữ liệu khách hàng thật.</p>
    {merchant && <form className="mock-form-grid" onSubmit={e=>{e.preventDefault();if(run(s=>editingId?editCampaign(s,actor,editingId,name,proposed,baseline||null):createCampaign(s,actor,storeId,name,proposed,baseline||null),editingId?'Đã cập nhật chiến dịch; cần chạy mô phỏng lại.':'Đã tạo chiến dịch mô phỏng.')){setName('');setEditingId(null)}}}>
      <label>Tên chiến dịch<input required maxLength={100} value={name} onChange={e=>setName(e.target.value)} placeholder="Ví dụ: Giỏ rau cho bữa tối" /></label>
      <label>Layout A — đối chứng<select value={baseline} onChange={e=>setBaseline(e.target.value)}><option value="">Danh mục cơ bản (không nhóm)</option>{layouts.map(l=><option key={l.id} value={l.id}>{l.name} · v{l.version}</option>)}</select></label>
      <label>Layout B — đề xuất<select required value={proposed} onChange={e=>setProposed(e.target.value)}><option value="">Chọn bản nháp đã lưu</option>{layouts.filter(l=>l.status==='DRAFT').map(l=><option key={l.id} value={l.id}>{l.name} · v{l.version}</option>)}</select></label>
      <button className="mock-primary" disabled={!proposed}>{editingId?'Lưu chỉnh sửa':'Tạo chiến dịch'}</button>{editingId&&<button type="button" onClick={()=>{setEditingId(null);setName('');setProposed('')}}>Hủy chỉnh sửa</button>}
    </form>}
    {merchant && <div className="mock-simulation-inputs"><label>Seed tái lập<input type="number" min="0" max="4294967295" step="1" value={seed} onChange={e=>setSeed(e.target.value)} /></label><label>Lượt truy cập mỗi phương án<input type="number" min="1" max="1000000" step="1" value={visitors} onChange={e=>setVisitors(e.target.value)} /></label></div>}
    {!campaigns.length && <div className="mock-empty">Chưa có chiến dịch. Lưu layout trong F07 rồi tạo chiến dịch tại đây.</div>}
    <div className="mock-campaign-list">{campaigns.map(c=>{
      const b=layouts.find(l=>l.id===c.proposedId);const a=layouts.find(l=>l.id===c.baselineId);const active=state.activeByStore[storeId]===b?.id;
      return <article key={c.id} className="mock-campaign-card"><div className="mock-section-heading"><h3>{c.name}</h3><span className="mock-badge">{active?'ACTIVE':b?.status==='PUBLISHED'?'PUBLISHED':'DRAFT'}</span></div><p>A: {a?`${a.name} · v${a.version}`:'Danh mục cơ bản'} → B: {b?.name} · v{b?.version}</p>
        {c.result && <><p className="mock-muted">Kết quả mô phỏng · seed {c.result.seed} · {c.result.visitors.toLocaleString('vi-VN')} lượt / phương án</p><div className="mock-comparison"><div><strong>Layout A</strong><span>{c.result.a.orders} đơn mô phỏng</span><span>{money(c.result.a.revenue)}</span><span>CTR: {c.result.a.ctr===undefined?"Chưa có":`${(c.result.a.ctr*100).toFixed(2)}%`} · Conversion: {((c.result.a.conversion??c.result.a.orders/c.result.visitors)*100).toFixed(2)}%</span></div><div><strong>Layout B</strong><span>{c.result.b.orders} đơn mô phỏng</span><span>{money(c.result.b.revenue)}</span><span>CTR: {c.result.b.ctr===undefined?"Chưa có":`${(c.result.b.ctr*100).toFixed(2)}%`} · Conversion: {((c.result.b.conversion??c.result.b.orders/c.result.visitors)*100).toFixed(2)}%</span></div></div></>}
        {(c.history?.length||0)>0 && <details className="my-4"><summary className="min-h-11 cursor-pointer py-3 font-semibold">Lịch sử mô phỏng ({c.history!.length})</summary><ol className="space-y-3">{c.history!.map((run,index)=><li key={index} className="rounded-xl border border-emerald-100 p-3 text-sm"><strong>Lần {index+1} · {run.result.ranAt || 'Ngày không có trong dữ liệu cũ'}</strong><p>A: {run.baselineId||'Danh mục cơ bản'} → B: {run.proposedId} · Seed {run.result.seed} · {run.result.visitors} lượt</p><p>B: {run.result.b.orders} đơn mô phỏng · {money(run.result.b.revenue)} · CTR {run.result.b.ctr===undefined?'Chưa có':`${(run.result.b.ctr*100).toFixed(2)}%`} · Conversion {(run.result.b.orders/run.result.visitors*100).toFixed(2)}%</p></li>)}</ol></details>}
        <div className="mock-actions">{merchant && <>{b?.status==='DRAFT'&&<button onClick={()=>{setEditingId(c.id);setName(c.name);setBaseline(c.baselineId||'');setProposed(c.proposedId);}}>Chỉnh sửa chiến dịch</button>}<button onClick={()=>run(s=>simulateCampaign(s,actor,c.id,Number(seed),Number(visitors)),'Đã tạo kết quả A/B mô phỏng.')} disabled={seed.trim()===''||visitors.trim()===''}>Chạy mô phỏng A/B</button><button className="mock-primary" disabled={!c.result||b?.status!=='DRAFT'} onClick={()=>run(s=>publishCampaign(s,actor,c.id),'Đã công bố layout. Store Admin cần kích hoạt riêng.')}>Công bố layout B</button></>}
        {!merchant && <button className="mock-primary" disabled={b?.status!=='PUBLISHED'||active} onClick={()=>b&&run(s=>activateLayout(s,actor,storeId,b.id),'Đã kích hoạt layout cho cửa hàng mô phỏng. Storefront đã được cập nhật.')}>{active?'Đang kích hoạt':'Kích hoạt layout B'}</button>}</div>
        {!merchant && b?.status!=='PUBLISHED' && <p className="mock-muted">Chờ Merchandiser công bố trước khi kích hoạt.</p>}
      </article>;
    })}</div>
    <p className="mock-muted">CTR = lượt nhấp mô phỏng / lượt truy cập; conversion = đơn mô phỏng / lượt truy cập. Seed tái lập kết quả, không phải hành vi khách hàng thật. Sửa chiến dịch giữ lịch sử nhưng yêu cầu chạy lại trước công bố.</p>
    <p className="mock-muted">Chỉ Store Admin được kích hoạt. Không tự kích hoạt sau khi lưu, mô phỏng hoặc công bố.</p>
  </section>;
}
