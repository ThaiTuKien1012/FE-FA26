import {useSyncExternalStore} from 'react';
import {getDemoRepository,subscribeDemoRepository} from './demo.repository';
import {useCustomerShopping} from '../customer/hooks/useCustomerShopping';
import {approvedGroups,mockStores} from '../merchandising-mock/mock.fixtures';
import type {MockState} from '../merchandising-mock/mock.types';
export function DemoAnalyticsContext({storeId,state}:{storeId:string;state:MockState}){
 const data=useSyncExternalStore(subscribeDemoRepository,getDemoRepository,getDemoRepository);
 const {storeCarts}=useCustomerShopping();const numeric=mockStores.findIndex(s=>s.id===storeId)+1;
 const products=data.products.filter(p=>p.storeId===numeric);const cart=storeCarts[storeId]||{};
 const total=products.reduce((sum,p)=>sum+(cart[p.customerId]||0)*p.sellingPrice,0);
 const active=state.layouts.find(l=>l.id===state.activeByStore[storeId]);
 return <section className="mock-panel mb-6" aria-label="Demo activity and reference evidence"><h2>Dữ liệu tham chiếu và hoạt động demo</h2><p>Giá vốn seed là giả định 70% giá bán ban đầu; chỉ để thử UI. Không phải chi phí được kiểm toán hoặc lợi nhuận thực.</p><div className="grid gap-4 sm:grid-cols-2"><div><h3>Giỏ hàng demo · phiên trình duyệt</h3><p>{Object.values(cart).reduce((a,b)=>a+b,0)} đơn vị · {total.toLocaleString('vi-VN')} VND</p><p>Chưa thanh toán. Không cộng vào doanh thu mô phỏng.</p></div><div><h3>Bố trí ACTIVE</h3><p>{active?.placements.length||0} vị trí · {new Set(active?.placements.map(p=>p.groupId)).size} nhóm khác nhau</p><p>{['BANNER','BUNDLE','FBT','CROSS_SELL'].map(type=>`${type}: ${active?.placements.filter(p=>p.type===type).length||0}`).join(' · ')}</p></div></div><div className="overflow-x-auto"><table className="w-full text-left text-sm"><caption className="py-3 text-left">Nhóm đã duyệt · tham chiếu hiện tại, không lọc theo ngày chạy chiến dịch</caption><thead><tr><th className="p-2">Nhóm</th><th className="p-2">Utility (fixture units)</th><th className="p-2">Chênh lệch giá tham chiếu (VND)</th></tr></thead><tbody>{approvedGroups(storeId).map(g=><tr key={g.id}><th className="p-2 font-medium">{g.title}</th><td className="p-2">{g.utility}</td><td className="p-2">{g.items.reduce((sum,i)=>{const p=products.find(p=>p.customerId===i.productId);return sum+(p?(p.sellingPrice-p.costPrice)*i.quantity:0)},0).toLocaleString('vi-VN')}</td></tr>)}</tbody></table></div></section>;
}
