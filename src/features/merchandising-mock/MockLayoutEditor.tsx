import React, { useState } from 'react';
import { GroupDetail, ProductRecommendations, StorefrontLayoutRenderer } from '../customer/components/StorefrontMerchandising';
import type { CustomerActiveLayout, CustomerPlacement, PlacementType } from '../customer/merchandising';
import type { MockState } from './mock.types';
import { approvedGroups, mockProducts } from './mock.fixtures';

const control = 'min-h-11 rounded-xl border border-[#bdcfbf] bg-white px-3 py-2 text-sm text-[#183d29] disabled:cursor-not-allowed disabled:opacity-50';
const action = `${control} font-semibold hover:bg-[#e8f3e9]`;
const clone = (placements: CustomerPlacement[]) => placements.map(p => ({ ...p, items: p.items.map(item => ({ ...item })) }));

type Props = { state: MockState; storeId: string; onSave: (name: string, placements: CustomerPlacement[]) => boolean; readOnly?: boolean };
export function MockLayoutEditor(props: Props) {
  return <StoreEditor key={props.storeId} {...props} />;
}
function StoreEditor({ state, storeId, onSave, readOnly = false }: Props) {
  const [name, setName] = useState('');
  const [placements, setPlacements] = useState<CustomerPlacement[]>([]);
  const [restoredId, setRestoredId] = useState('');
  const [notice, setNotice] = useState('');
  const [mobile, setMobile] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [productId, setProductId] = useState('');
  const groups = approvedGroups(storeId).filter(group => group.approved && group.storeId === storeId);
  const products = mockProducts(storeId);
  const versions = state.layouts.filter(layout => layout.storeId === storeId).slice().sort((a,b) => b.version - a.version);
  const detail = placements.find(placement => placement.id === detailId);
  const preview: CustomerActiveLayout = { id: 'draft-preview', version: JSON.stringify(placements), status: 'ACTIVE', storeId, placements };
  const previewPurchase = () => setNotice('Chỉ xem trước: không thay đổi giỏ hàng.');
  const shared = { products, cart: {}, onAddGroup: previewPurchase, onOpenProduct: (product: typeof products[number]) => { setProductId(product.id); setNotice(`Đang xem gợi ý cho ${product.name}.`); } };
  const change = (id: string, patch: Partial<CustomerPlacement>) => {
    if (readOnly) return;
    setPlacements(current => current.map(p => p.id === id ? { ...p, ...patch } : p)); setNotice('');
  };
  const add = (groupId: string, beforeId?: string) => {
    if (readOnly) return;
    const group = groups.find(item => item.id === groupId);
    if (!group) { setNotice('Chỉ có thể thêm nhóm đã duyệt của cửa hàng này.'); return; }
    const placement: CustomerPlacement = { id: `placement-${crypto.randomUUID()}`, groupId: group.id, type: 'BUNDLE', order: 0, title: group.title, items: group.items.map(item => ({ ...item })) };
    setPlacements(current => { const next = [...current]; const index = beforeId ? next.findIndex(p => p.id === beforeId) : next.length; next.splice(index < 0 ? next.length : index, 0, placement); return next.map((p,order) => ({...p,order})); }); setNotice(`Đã thêm ${group.title} vào bản đang soạn.`);
  };
  const move = (id: string, target: number) => {
    if (readOnly) return;
    setPlacements(current => { const index = current.findIndex(p => p.id === id); if (index < 0 || target < 0 || target >= current.length) return current; const next = [...current]; const [item] = next.splice(index,1); next.splice(target,0,item); return next.map((p,order) => ({...p,order})); });
    setNotice('Đã đổi thứ tự vị trí trong bản đang soạn.');
  };
  const drop = (event: React.DragEvent, beforeId?: string) => {
    event.preventDefault(); event.stopPropagation();
    const existing = event.dataTransfer.getData('application/x-mock-placement');
    if (existing) {
      const from = placements.findIndex(p => p.id === existing);
      const before = beforeId ? placements.findIndex(p => p.id === beforeId) : placements.length;
      if (from >= 0 && before >= 0) move(existing, before > from ? before - 1 : before);
    }
    else add(event.dataTransfer.getData('application/x-mock-approved-group'),beforeId);
  };
  const save = () => {
    if (readOnly) return;
    if (!name.trim() || !placements.length) { setNotice('Nhập tên và thêm ít nhất một vị trí trước khi lưu.'); return; }
    if (placements.some(p => !p.title.trim() || !groups.some(g => g.id === p.groupId) || p.items.some(item => !Number.isSafeInteger(item.quantity) || item.quantity < 1) || (p.type === 'CROSS_SELL' && !p.anchorProductId))) { setNotice('Kiểm tra tiêu đề, số lượng nguyên dương và sản phẩm neo của từng vị trí.'); return; }
    if (onSave(name.trim(),clone(placements))) setNotice('Đã lưu phiên bản nháp mới. Chưa xuất bản hoặc kích hoạt.');
    else setNotice('Chưa lưu được. Bản đang soạn vẫn được giữ lại; xem thông báo bên trên.');
  };
  return <section className="min-w-0 space-y-6 text-sm text-[#183d29]" aria-label="Trình soạn bố cục">
    <div><h2 className="text-2xl font-semibold">Soạn bố cục cửa hàng</h2><p className="mt-2 text-base text-[#526a59]">Mỗi lần lưu tạo một phiên bản nháp mới. Việc xem trước không thay đổi bố cục đang hoạt động.</p>{readOnly && <p className="mt-2">Chỉ xem — tài khoản này không thể chỉnh sửa.</p>}</div>
    <fieldset disabled={readOnly} className="min-w-0 space-y-5">
      <div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-2">Tên bản nháp<input className={control} maxLength={120} value={name} onChange={e => {setName(e.target.value);setNotice('');}} placeholder="Ví dụ: Kệ bữa sáng" /></label>
        <label className="grid gap-2">Khôi phục phiên bản<select className={control} value={restoredId} onChange={e => { const found = versions.find(v => v.id === e.target.value); setRestoredId(e.target.value); if (found) { setName(found.name); setPlacements(clone(found.placements).sort((a,b)=>a.order-b.order)); setDetailId(null);setNotice('Đã đưa phiên bản vào bản đang soạn. Phiên bản gốc không thay đổi.'); } }}><option value="">Chọn phiên bản đã lưu</option>{versions.map(v => <option key={v.id} value={v.id}>{v.name} · v{v.version} · {v.status}</option>)}</select></label></div>
      <div className="grid min-w-0 gap-5 xl:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="space-y-3 rounded-2xl bg-[#eef5ec] p-4"><h3 className="text-lg font-semibold">Nhóm đã duyệt</h3><p className="leading-relaxed">Kéo nhóm vào vị trí mong muốn hoặc chọn Thêm. Nguồn: grocery-demo-v1; Utility là trọng số mô phỏng, không phải lợi nhuận.</p>{groups.length === 0 && <p>Chưa có nhóm đã duyệt cho cửa hàng này.</p>}{groups.map(group => <article key={group.id} draggable={!readOnly} onDragStart={e => {e.dataTransfer.setData('application/x-mock-approved-group',group.id);e.dataTransfer.effectAllowed='copy';}} className="rounded-xl border border-[#cbdcca] bg-white p-3"><h4 className="font-semibold">{group.title}</h4><p className="my-2">{group.items.length} sản phẩm · {group.utility} fixture utility units</p><button type="button" className={action} onClick={()=>add(group.id)} aria-label={`Thêm ${group.title}`}>Thêm vào bố cục</button></article>)}</aside>
        <div className="min-w-0 space-y-4 rounded-2xl border-2 border-dashed border-[#bdcfbf] p-4" onDragOver={e=>e.preventDefault()} onDrop={e=>drop(e)} aria-label="Các vị trí theo thứ tự"><h3 className="text-lg font-semibold">Các vị trí ({placements.length})</h3>{!placements.length && <p className="py-10 text-center text-base">Chưa có vị trí. Thêm nhóm đã duyệt để bắt đầu.</p>}{placements.map((p,index)=><article key={p.id} className="min-w-0 space-y-4 rounded-xl border border-[#cbdcca] bg-white p-4" draggable={!readOnly} onDragStart={e=>{e.stopPropagation();e.dataTransfer.setData('application/x-mock-placement',p.id);e.dataTransfer.effectAllowed='move';}} onDragOver={e=>e.preventDefault()} onDrop={e=>drop(e,p.id)}>
          <div className="flex flex-wrap items-center justify-between gap-2"><h4 className="text-base font-semibold">Vị trí {index+1}</h4><div className="flex flex-wrap gap-2"><button type="button" className={action} disabled={index===0} onClick={()=>move(p.id,index-1)} aria-label={`Đưa vị trí ${index+1} lên`}>Lên</button><button type="button" className={action} disabled={index===placements.length-1} onClick={()=>move(p.id,index+1)} aria-label={`Đưa vị trí ${index+1} xuống`}>Xuống</button><button type="button" className={action} onClick={()=>{setPlacements(current=>current.filter(item=>item.id!==p.id).map((item,order)=>({...item,order})));setNotice('Đã xóa vị trí khỏi bản đang soạn.');}}>Xóa</button></div></div>
          <div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-2">Loại hiển thị<select className={control} value={p.type} onChange={e=>change(p.id,{type:e.target.value as PlacementType,anchorProductId:e.target.value==='CROSS_SELL' ? p.anchorProductId || p.items[0]?.productId : p.anchorProductId})}><option value="BANNER">Banner</option><option value="BUNDLE">Bundle</option><option value="FBT">Thường mua cùng (FBT)</option><option value="CROSS_SELL">Bán chéo (Cross-sell)</option></select></label><label className="grid gap-2">Tiêu đề<input className={control} maxLength={160} value={p.title} onChange={e=>change(p.id,{title:e.target.value})}/></label></div>
          {p.type==='BANNER' && <div className="grid gap-3 sm:grid-cols-2"><label>Mô tả banner<input className={control} maxLength={200} value={p.description||''} onChange={e=>change(p.id,{description:e.target.value})}/></label><label>Hình banner<select className={control} value={p.imageUrl||''} onChange={e=>change(p.id,{imageUrl:e.target.value||undefined})}><option value="">Không dùng hình</option><option value="/images/customer-home/banners/garden.jpg">Rau xanh</option><option value="/images/customer-home/banners/morning.jpg">Bữa sáng</option><option value="/images/customer-home/banners/fruit.jpg">Trái cây</option><option value="/images/customer-home/banners/pantry.jpg">Căn bếp</option></select></label></div>}
          {p.type==='CROSS_SELL' && <label className="grid gap-2">Sản phẩm neo<select className={control} value={p.anchorProductId || ''} onChange={e=>change(p.id,{anchorProductId:e.target.value || undefined})}><option value="">Chọn sản phẩm neo</option>{products.filter(product=>p.items.some(item=>item.productId===product.id)).map(product=><option key={product.id} value={product.id}>{product.name}</option>)}</select></label>}
          <div className="grid gap-3 sm:grid-cols-2">{p.items.map(item=><label key={item.productId} className="grid min-w-0 gap-2">Số lượng · {products.find(product=>product.id===item.productId)?.name || item.productId}<input className={control} type="number" min={1} max={999} step={1} value={item.quantity} onChange={e=>change(p.id,{items:p.items.map(other=>other.productId===item.productId?{...other,quantity:Number(e.target.value)}:other)})}/></label>)}</div>
        </article>)}</div>
      </div><button type="button" className={`${action} bg-[#e8f3e9]`} onClick={save}>Lưu bản nháp</button>
    </fieldset>
    <p role="status" aria-live="polite" className="min-h-6 leading-relaxed">{notice}</p>
    <section className="min-w-0 rounded-2xl border border-[#cbdcca] bg-[#f7faf5] p-4 sm:p-6" aria-label="Xem trước bố cục"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-xl font-semibold">Xem trước</h3><div className="flex gap-2"><button type="button" className={action} aria-pressed={!mobile} onClick={()=>setMobile(false)}>Máy tính</button><button type="button" className={action} aria-pressed={mobile} onClick={()=>setMobile(true)}>Di động · 390px</button></div></div><p className="my-4 leading-relaxed">Chỉ xem trước: mọi nút mua hàng không thay đổi giỏ hàng. FBT và bán chéo hiển thị theo sản phẩm được chọn bên dưới.</p>
      <div className={`mx-auto min-w-0 max-w-full rounded-xl bg-white p-3 sm:p-4 ${mobile ? 'mock-mobile-preview' : ''}`} style={{width:mobile?'390px':'100%'}}>
        {!placements.length && <p className="py-8 text-center">Thêm vị trí để xem bố cục khách hàng.</p>}
        <StorefrontLayoutRenderer {...shared} layout={preview} onOpenGroup={p=>setDetailId(p.id)}/>
        {detail && <section className="my-6 rounded-xl border border-[#cbdcca] p-4"><div className="flex items-center justify-between gap-2"><h4 className="text-lg font-semibold">{detail.title}</h4><button type="button" className={action} onClick={()=>setDetailId(null)}>Đóng chi tiết</button></div><GroupDetail {...shared} placement={detail}/></section>}
        {placements.some(p=>p.type==='FBT'||p.type==='CROSS_SELL') && <div className="space-y-5"><label className="grid gap-2">Xem gợi ý trên sản phẩm<select className={`${control} w-full`} value={productId} onChange={e=>setProductId(e.target.value)}><option value="">Chọn sản phẩm để xem gợi ý</option>{products.map(product=><option key={product.id} value={product.id}>{product.name}</option>)}</select></label>{productId && <ProductRecommendations {...shared} layout={preview} productId={productId}/>}</div>}
      </div>
    </section>
  </section>;
}
