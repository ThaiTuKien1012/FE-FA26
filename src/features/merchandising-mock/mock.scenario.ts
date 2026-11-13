import { initialMockState,saveDraft,createCampaign,simulateCampaign,publishCampaign,activateLayout } from './mock.engine';
import { mockStores,approvedGroups } from './mock.fixtures';
import type {CustomerPlacement} from '../customer/merchandising';
/** Reproducible populated grocery scenario, seeded only in standalone mode. */
export function createDemoMerchandisingScenario() {
  let state=initialMockState();
  for(const store of mockStores) {
    const groups=approvedGroups(store.id);
    const first=groups[0],second=groups[1]||first;
    if(!first)continue;
    const placements:CustomerPlacement[]=(['BANNER','BUNDLE','FBT','CROSS_SELL'] as const).map((type,index)=>{
      const group=index===1?second:first;
      return {id:`${store.id}-${type}`,groupId:group.id,type,title:type==='BANNER'?`Tươi ngon mỗi ngày · ${store.name}`:group.title,order:index,items:group.items.map(i=>({...i})),...(type==='CROSS_SELL'?{anchorProductId:group.items[0].productId}:{})};
    });
    state=saveDraft(state,{role:'Merchandiser'},store.id,'Bố cục cửa hàng mẫu',placements);
    const baseline=state.layouts.at(-1)!;
    state=createCampaign(state,{role:'Merchandiser'},store.id,'Chiến dịch mẫu',baseline.id,null);
    const campaign=state.campaigns.at(-1)!;
    state=simulateCampaign(state,{role:'Merchandiser'},campaign.id,42,1000);
    state=publishCampaign(state,{role:'Merchandiser'},campaign.id);
    state=activateLayout(state,{role:'Store Admin'},store.id,baseline.id);
    state=saveDraft(state,{role:'Merchandiser'},store.id,'Phương án bố cục mới',placements.map((p,i)=>({...p,order:placements.length-i-1})));
    state=createCampaign(state,{role:'Merchandiser'},store.id,'Thử nghiệm phương án B',state.layouts.at(-1)!.id,baseline.id);
    state=simulateCampaign(state,{role:'Merchandiser'},state.campaigns.at(-1)!.id,123,1000);
  }
  return state;
}
