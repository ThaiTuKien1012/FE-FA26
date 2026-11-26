import assert from './f06.assert';
import {test} from 'node:test';
import {createElement as h} from 'react';
import {renderToStaticMarkup as render} from 'react-dom/server';
import {detailPercentage,detailAvailabilityChanges} from '../src/features/f06/f06.details.presentation';
import {ExactRecommendationNumber} from '../src/features/f06/f06.numbers';
import {F06RecommendationDetails,F06RecommendationDetailContent,F06EligibilityCheck} from '../src/features/f06/components/F06RecommendationDetails';
import {F06ReviewActions} from '../src/features/f06/components/F06ReviewForm';
import {RecommendationBrowser,type RecommendationBrowseState} from '../src/features/f06/f06.browse';
import {recommendation,eligibility} from './f06.fixtures';
import type {RecView} from '../src/features/f06/f06.types';
const names={31:'Fresh Milk',32:'Butter Cookies'};
function available(){const check=eligibility();return {...check,warnings:[],products:check.products.map(product=>({...product,warnings:[],expiryStatus:'NOT_APPLICABLE',expiryPriorityScore:0}))};}
const content=(item:RecView)=>render(h(F06RecommendationDetailContent,{item,names}));
function modal(item:RecView,role:'Store Admin'|'Merchandiser'='Merchandiser'){
 const workflow=new RecommendationBrowser(),state={...workflow.getSnapshot(),role,detail:item,detailId:item.recommendationId,detailLoading:false,names};
 return render(h(F06RecommendationDetails,{state,workflow}));
}
test('Details display rounds decimal digits HALF_UP without changing exact ratios, including tiny nonzero and zero',()=>{
 for(const [raw,display,exact] of [['0.011494252873563218','1.15%','1.1494252873563218%'],['0.99995','100%','99.995%'],['0.000000000000000001','<0.01%','0.0000000000000001%'],['0','0%','0%'],['1','100%','100%']] as const){
  const source=ExactRecommendationNumber.fromJson(raw);assert.deepEqual(detailPercentage(source),{display,exact});assert.equal(String(source),raw);
 }
 assert.equal(detailPercentage(null).display,'N/A');assert.equal(detailPercentage(0.000001).display,'<0.01%');
});
test('single Banner uses purchased wording, two metrics and a full-width product row with accessible icon fallback',()=>{
 const item=recommendation({type:'BANNER',productIds:[31],currentEligibility:{...available(),products:[available().products[0]]},evidence:{...recommendation().evidence,totalTransactions:1044,supportCount:12,supportRatio:0.011494252873563218}}),html=content(item);
 const main=html.split('<details')[0];
 for(const text of ['Purchased in 12 of 1,044 analyzed transactions.','Transactions containing this product','1.15%','Based on historical purchases, not a sales forecast.'])assert.ok(main.includes(text),text);
 assert.doesNotMatch(main,/Bought together|No image|Expiry information|Expiry risk|Historical utility|sm:grid-cols-2">\s*<li/);
 assert.ok(main.includes('role="img" aria-label="Image unavailable for Fresh Milk"'));assert.equal((main.match(/data-status="ELIGIBLE"/g)||[]).length,1);
});
test('multi-product Bundle, FBT and Banner retain all products and historical group evidence',()=>{
 for(const type of ['BUNDLE','FBT','BANNER'] as const){const item=recommendation({type,currentEligibility:available()}),before=JSON.stringify(item),html=content(item);assert.ok(html.includes('Purchased together in 2 of 6 analyzed transactions.'));assert.ok(html.includes('Bought together'));assert.ok(html.includes('33.33%'));assert.ok(html.includes('Recorded value: 33.3333%'));assert.ok(html.includes('Fresh Milk'));assert.ok(html.includes('Butter Cookies'));assert.equal(JSON.stringify(item),before);}
});
test('Cross-sell keeps direction and correct group and anchor denominators with precise recorded values in More Details',()=>{
 const item=recommendation({type:'CROSS_SELL',anchorProductId:31,evidence:{status:'AVAILABLE',totalTransactions:1044,supportCount:120,supportRatio:ExactRecommendationNumber.fromJson('0.114942528735632184'),anchorSupportCount:300,confidence:0.4}}),before=String(item.evidence.supportRatio),html=content(item);
 for(const text of ['Starting product','Suggested addition','Purchased together in 120 of 1,044','11.49%','40%','300 analyzed transactions contained Fresh Milk','also contained Butter Cookies','11.4942528735632184%'])assert.ok(html.includes(text),text);
 assert.equal(String(item.evidence.supportRatio),before);assert.equal(html.includes('Minimum purchase frequency'),false);
});
test('unavailable historical evidence is never reconstructed and zero counts are not missing',()=>{
 const item=recommendation({evidence:{status:'EVIDENCE_UNAVAILABLE',totalTransactions:0,supportCount:null,supportRatio:null,anchorSupportCount:null,confidence:null}}),html=content(item);
 assert.ok(html.includes('Historical purchase data is unavailable.'));assert.doesNotMatch(html,/Purchased together in 0|0%/);
 const zero=content({...item,evidence:{...item.evidence,status:'AVAILABLE',totalTransactions:100,supportCount:0,supportRatio:0}});assert.ok(zero.includes('Purchased together in 0 of 100'));assert.ok(zero.includes('>0%</span>'));
});
test('date-only fingerprint changes do not imply stock changed; real observed stock changes name the products',()=>{
 const item=recommendation({inventoryChanged:true,currentEligibility:available(),generationEligibility:available()});
 assert.deepEqual(detailAvailabilityChanges(item,names),[]);assert.ok(content(item).includes('Availability checked against current inventory.'));assert.equal(content(item).includes('Availability has changed'),false);
 item.currentEligibility={...item.currentEligibility,products:item.currentEligibility.products.map(product=>({...product,sellableQuantity:product.productId===31?4:10}))};
 assert.deepEqual(detailAvailabilityChanges(item,names),['Fresh Milk: sellable stock was 10 when saved; now 4.']);assert.equal(item.inventoryChanged,true);
});
test('actionable product and overall warnings remain visible without duplicate prefixed copies',()=>{
 const check={...available(),status:'INELIGIBLE' as const,products:[{...available().products[0],status:'NEEDS_RECHECK' as const,warnings:['Missing required batch expiry metadata']},{...available().products[1],status:'INELIGIBLE' as const,productStatus:'INACTIVE',warnings:['Product inactive']}],warnings:['Product 31: Missing required batch expiry metadata','Check current stock before deciding.']};
 const html=render(h(F06EligibilityCheck,{title:'Current Availability',check,names}));
 for(const text of ['Needs recheck','Inactive product','Check current stock before deciding.','Missing required batch expiry metadata'])assert.ok(html.includes(text),text);
 assert.equal((html.match(/Missing required batch expiry metadata/g)||[]).length,1);assert.doesNotMatch(html,/Asia\/Ho_Chi_Minh|Store date|Expiry risk|Expiry information/);
});
test('four primary sections, compact header refresh and linked footer review controls',()=>{
 const html=modal(recommendation({currentEligibility:available()}));
 for(const text of ['Recommendation Details','Recommendation summary','Why this recommendation?','Current Availability','Your Decision','Decision actions','Reason for your decision *','rows="2"','maxLength="1000"','aria-label="Refresh details"','title="Refresh details"'])assert.ok(html.includes(text),text);
 assert.equal((html.match(/data-status="PENDING_REVIEW"/g)||[]).length,1);assert.equal((html.match(/<details/g)||[]).length,2);assert.match(html,/<footer[^>]*aria-label="Decision actions"/);
 assert.ok(html.indexOf('Your Decision')<html.indexOf('More Details'));assert.ok(html.includes('max-w-[960px]'));
});
test('Store Admin sees pending read-only guidance and saved decisions without review controls',()=>{
 for(const reviewStatus of ['PENDING_REVIEW','APPROVED','REJECTED'] as const){const html=modal(recommendation({reviewStatus}), 'Store Admin');assert.doesNotMatch(html,/<textarea|>Approve<|>Reject<|Confirm Approval|Confirm Rejection/);assert.ok(html.includes(reviewStatus==='PENDING_REVIEW'?'Review decisions are managed by the Merchandiser.':'Saved Decision'));}
});
test('saved approval and rejection keep reasons and timestamps; layout wording requires Backend readiness',()=>{
 const item=recommendation({reviewStatus:'APPROVED',reviewReason:'Suitable for promotion.',reviewedAt:'2026-11-24T02:33:00Z',currentEligibility:eligibility('INELIGIBLE')});
 const html=content(item);for(const text of ['Saved Decision','Reason: Suitable for promotion.','24/11/2026','Currently unavailable','not currently ready for Layout'])assert.ok(html.includes(text),text);assert.equal(html.includes('Approved and ready for layout.'),false);
 assert.ok(content({...item,readyForConsumption:true}).includes('Approved and ready for layout.'));
 const rejected=content({...item,reviewStatus:'REJECTED'});assert.match(rejected,/text-red-800[^>]*>Rejected/);assert.equal(rejected.includes('Approved and ready for layout.'),false);
 const stale=render(h(F06RecommendationDetailContent,{item,savedNotice:'Approved and ready for layout.'}));assert.equal(stale.includes('Approved and ready for layout.'),false);
});
test('both secondary sections stay collapsed, historical evidence remains intact and no technical records leak',()=>{
 const item=recommendation({reviewHistory:[{oldStatus:'PENDING_REVIEW',newStatus:'REJECTED',reviewedBy:3,reviewedAt:'2026-11-25T02:33:00Z',reason:'Historical reason',resultingVersion:2,eligibilityCheck:eligibility()}]}),before=JSON.stringify(item),html=content(item);
 assert.equal((html.match(/<details/g)||[]).length,2);assert.doesNotMatch(html,/<details[^>]*\bopen|fingerprint|F06_RULES|inputHash|<pre/);
 for(const text of ['More Details','Review History (1)','Historical reason','Availability when created','Availability at review','Utility Score represents weighted product value, not revenue or profit.'])assert.ok(html.includes(text),text);assert.equal(JSON.stringify(item),before);
});
test('review footer preserves blank, length, eligibility, refresh, pending and read-only restrictions',()=>{
 const workflow=new RecommendationBrowser(),base={...workflow.getSnapshot(),role:'Merchandiser' as const,detail:recommendation(),detailId:62};
 const actions=(reason:string,state:RecommendationBrowseState=base)=>render(h(F06ReviewActions,{state,workflow,reason}));
 for(const reason of ['', '   ', 'a'.repeat(1001)])assert.equal((actions(reason).match(/ disabled=""/g)||[]).length,2);
 assert.equal(actions('Good reason').includes(' disabled='),false);
 const ineligible=actions('Good reason',{...base,detail:recommendation({currentEligibility:eligibility('INELIGIBLE')})});assert.match(ineligible,/ disabled=""[^>]*>Approve/);assert.doesNotMatch(ineligible,/ disabled=""[^>]*>Reject/);
 for(const change of [{reviewNeedsRefresh:true},{reviewPending:true},{detailLoading:true}])assert.equal((actions('Reason',{...base,...change}).match(/ disabled=""/g)||[]).length,2);
 assert.equal(actions('Reason',{...base,role:'Store Admin'}),'');
});
