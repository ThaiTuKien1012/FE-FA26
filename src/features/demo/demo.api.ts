import { importDemoCsv } from './demo.csv';
import { getDemoRepository, saveDemoRepository, type DemoState, type DemoProduct } from './demo.repository';
export { resetDemoRepository, getDemoCustomerProducts, subscribeDemoRepository } from './demo.repository';
export interface DemoActor { role:string; storeId?:number|null }
class DemoError extends Error {constructor(public status:number,message:string){super(message);}}
function requireValue(condition:unknown,message:string,status=400):asserts condition {if(!condition)throw new DemoError(status,message);}
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
const now=()=>new Date().toISOString();
export async function demoRequest(input:RequestInfo|URL,init:RequestInit={},actor:DemoActor):Promise<Response> {
 try {
 init.signal?.throwIfAborted();
 const url=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url,'http://demo.local');
 const path=url.pathname,method=(init.method??(input instanceof Request?input.method:'GET')).toUpperCase();
 const write=method!=='GET';
 const role=actor.role.replaceAll('_',' ').toLowerCase();
 const system=role==='system admin',admin=role==='store admin',merch=role==='merchandiser';
 requireValue(system||admin||merch,'This demo operation requires a staff persona.',403);
 const state=structuredClone(getDemoRepository());
 const selected=path.match(/^\/api\/system\/mining\/stores\/(\d+)/);
 const scope=selected?Number(selected[1]):actor.storeId;
 if(path.startsWith('/api/system/')||path.startsWith('/api/users')||path==='/api/roles')requireValue(system,'System Admin permission required.',403);
 else requireValue(admin||merch,'Choose a Store Admin or Merchandiser persona.',403);
 if(!system)requireValue(scope&&state.stores.some(s=>s.storeId===scope),'Select an assigned demo store.',403);
 const body:Record<string,any>=typeof init.body==='string'?JSON.parse(init.body):{};
 const id=()=>state.nextId++;
 const scoped=<T extends {storeId:number}>(rows:T[])=>rows.filter(x=>x.storeId===scope);
 const find=<T>(rows:T[],predicate:(x:T)=>boolean):T=>{const x=rows.find(predicate);requireValue(x,'Record not found in this store.',404);return x;};
 const page=<T>(rows:T[],field='items')=>{const p=Number(url.searchParams.get('page')??0),size=Number(url.searchParams.get('pageSize')??20);requireValue(Number.isInteger(p)&&p>=0&&Number.isInteger(size)&&size>0&&size<=100000,'Invalid pagination.');return {[field]:rows.slice(p*size,(p+1)*size),items:rows.slice(p*size,(p+1)*size),page:p,pageSize:size,totalElements:rows.length,totalPages:Math.ceil(rows.length/size)};};
 const finish=(data:unknown,status=200)=>{if(write)saveDemoRepository(state);return json(data,status);};
 const product=(n:number)=>find(scoped(state.products),p=>p.id===n);
 const refreshStock=(p:DemoProduct)=>{p.stockQuantity=state.batches.filter(b=>b.productId===p.id&&b.storeId===p.storeId&&b.status==='ACTIVE'&&(!b.expiryDate||b.expiryDate>=now().slice(0,10))).reduce((a,b)=>a+b.remainingQuantity,0);};
 const matches=path.match(/^\/api\/products\/(\d+)(?:\/(.*))?$/);
 if(path==='/api/system/stores')return finish(page(state.stores));
 if(path==='/api/roles')return finish(['SYSTEM_ADMIN','STORE_ADMIN','MERCHANDISER','END_CUSTOMER'].map((roleCode,i)=>({roleId:i+1,roleCode,code:roleCode,display_name:['System Admin','Store Admin','Merchandiser','End-Customer'][i],name:roleCode})));
 if(path==='/api/users'||/^\/api\/users\/\d+/.test(path)){
  const m=path.match(/^\/api\/users\/(\d+)(?:\/(role|status))?$/);
  if(!write)return finish(m?find(state.users,u=>u.userId===Number(m[1])):state.users);
  if(method==='POST'){
   requireValue(typeof body.name==='string'&&body.name.trim()&&typeof body.email==='string'&&body.email.includes('@'),'Name and email are required.');
   requireValue(!state.users.some(u=>u.email.toLowerCase()===body.email.toLowerCase()),'This email already exists.',409);
   requireValue(['SYSTEM_ADMIN','STORE_ADMIN','MERCHANDISER','END_CUSTOMER'].includes(body.roleCode),'Invalid role.');
   if(['STORE_ADMIN','MERCHANDISER'].includes(body.roleCode))requireValue(state.stores.some(s=>s.storeId===body.storeId),'Assign an existing store.');
   const user={userId:id(),name:body.name,email:body.email,roleCode:body.roleCode,storeId:body.storeId??null,status:'PENDING_VERIFICATION',emailVerified:false};state.users.push(user);return finish(user,201);
  }
  requireValue(m,'Unknown account operation.',404);const user=find(state.users,u=>u.userId===Number(m[1]));
  if(m[2]==='role'){requireValue(['SYSTEM_ADMIN','STORE_ADMIN','MERCHANDISER','END_CUSTOMER'].includes(body.roleCode),'Invalid role.');if(['STORE_ADMIN','MERCHANDISER'].includes(body.roleCode))requireValue(state.stores.some(s=>s.storeId===body.storeId),'Assign an existing store.');user.roleCode=body.roleCode;user.storeId=body.storeId??null;}
  else if(m[2]==='status'){requireValue(user.emailVerified,'Pending demo invitations cannot change status.',409);requireValue(['ACTIVE','INACTIVE'].includes(body.status),'Invalid status.');user.status=body.status;}else {requireValue(typeof body.name==='string'&&body.name.trim(),'Name required.');user.name=body.name;}
  return finish(user);
 }
 if(path.startsWith('/api/categories')){
  if(write)requireValue(admin,'Only Store Admin can edit categories.',403);
  const n=Number(path.split('/')[3]);
  if(!write)return finish(n?find(scoped(state.categories),c=>c.id===n):scoped(state.categories));
  requireValue(!body.name||typeof body.name==='string','Invalid name.');requireValue(!body.status||['ACTIVE','INACTIVE','BLOCKED'].includes(body.status),'Invalid status.');
  if(method==='POST'){requireValue(body.name?.trim(),'Category name required.');const c={id:id(),name:body.name,status:body.status??'ACTIVE',storeId:scope!};state.categories.push(c);return finish(c,201);}
  const c=find(scoped(state.categories),c=>c.id===n);Object.assign(c,body.name?{name:body.name}:{},body.status?{status:body.status}:{});state.products.filter(p=>p.category?.id===c.id).forEach(p=>p.category={...c});return finish(c);
 }
 if(path==='/api/products'||matches){
  if(write)requireValue(admin,'Only Store Admin can edit inventory.',403);
  const p=matches?product(Number(matches[1])):undefined,sub=matches?.[2];
  if(sub==='batches'){
   if(!write)return finish(state.batches.filter(b=>b.productId===p!.id));
   requireValue(Number.isInteger(body.initialQuantity)&&body.initialQuantity>0&&body.batchCode&&body.receivedAt,'Valid batch code, received date and quantity required.');
   requireValue(!p!.requiresExpiry||body.expiryDate,'This product requires an expiry date.');
   requireValue(!state.batches.some(b=>b.productId===p!.id&&b.batchCode===body.batchCode),'Duplicate batch code.',409);
   const b={id:id(),storeId:scope!,productId:p!.id,batchCode:body.batchCode,receivedAt:body.receivedAt,expiryDate:body.expiryDate??null,initialQuantity:body.initialQuantity,remainingQuantity:body.initialQuantity,status:'ACTIVE' as const};state.batches.push(b);refreshStock(p!);return finish(b,201);
  }
  if(sub==='inventory-summary'){const b=state.batches.filter(x=>x.productId===p!.id);return finish({productId:p!.id,totalQuantity:b.reduce((a,x)=>a+x.remainingQuantity,0),sellableQuantity:p!.stockQuantity,expiredQuantity:b.filter(x=>x.expiryDate&&x.expiryDate<now().slice(0,10)).reduce((a,x)=>a+x.remainingQuantity,0),blockedQuantity:b.filter(x=>x.status!=='ACTIVE').reduce((a,x)=>a+x.remainingQuantity,0),expiringSoonQuantity:0});}
  if(!write){if(p)return finish(p);let rows=scoped(state.products);const search=(url.searchParams.get('search')??url.searchParams.get('q')??'').toLowerCase();rows=rows.filter(p=>(p.name+' '+p.sku).toLowerCase().includes(search));for(const key of ['status','categoryId']){const v=url.searchParams.get(key);if(v)rows=rows.filter(p=>key==='status'?p.status===v:p.category?.id===Number(v));}return finish(page(rows,'content'));}
  if(sub==='status'){requireValue(['ACTIVE','INACTIVE','BLOCKED'].includes(body.status),'Invalid status.');p!.status=body.status;return finish(p);}
  requireValue(body.name?.trim()&&body.sku?.trim()&&body.unit?.trim(),'Name, SKU and unit required.');requireValue(Number.isFinite(body.sellingPrice)&&body.sellingPrice>=0&&Number.isFinite(body.costPrice)&&body.costPrice>=0,'Prices must be nonnegative.');
  requireValue(!scoped(state.products).some(x=>x.sku===body.sku&&x.id!==p?.id),'Duplicate SKU.',409);
  const category=body.categoryId?find(scoped(state.categories),c=>c.id===body.categoryId):null;
  if(p){Object.assign(p,{name:body.name,sku:body.sku,unit:body.unit,sellingPrice:body.sellingPrice,costPrice:body.costPrice,requiresExpiry:Boolean(body.requiresExpiry),status:body.status??p.status,expiryPushDays:body.expiryPushDays??7,category});return finish(p);}
  const n=id(),template=state.products.find(p=>p.storeId===scope)!.presentation;
  const created={id:n,customerId:`demo-product-${n}`,storeId:scope!,presentation:{...template,id:`demo-product-${n}`},name:body.name,sku:body.sku,unit:body.unit,sellingPrice:body.sellingPrice,costPrice:body.costPrice,requiresExpiry:Boolean(body.requiresExpiry),status:body.status??'ACTIVE',expiryPushDays:body.expiryPushDays??7,category,stockQuantity:0};state.products.push(created);return finish(created,201);
 }
 if(path.startsWith('/api/inventory-batches/')){const b=find(scoped(state.batches),b=>b.id===Number(path.split('/')[3]));if(write){requireValue(admin,'Store Admin required.',403);if(body.remainingQuantity!==undefined){requireValue(Number.isInteger(body.remainingQuantity)&&body.remainingQuantity>=0&&body.remainingQuantity<=b.initialQuantity,'Quantity must fit the original batch.');b.remainingQuantity=body.remainingQuantity;}if(body.status){requireValue(['ACTIVE','INACTIVE','BLOCKED'].includes(body.status),'Invalid status.');b.status=body.status;}refreshStock(product(b.productId));}return finish(b);}
 if(path==='/api/system/utility/lambda-policy'){if(write){requireValue(Number.isFinite(body.lambdaMin)&&Number.isFinite(body.lambdaMax)&&body.lambdaMin>=0&&body.lambdaMax>=body.lambdaMin,'Invalid lambda bounds.');state.policy={lambdaMin:body.lambdaMin,lambdaMax:body.lambdaMax,version:state.policy.version+1};}return finish(state.policy);}
 if(path.startsWith('/api/utility/')||path==='/api/mining/snapshots'){
  const config=state.configs[scope!];
  const configView=()=>({config,lambdaPolicy:state.policy,lambdaValid:config.lambda>=state.policy.lambdaMin&&config.lambda<=state.policy.lambdaMax});
  const frozen=()=>({config:{...config},lambdaPolicy:{...state.policy},effectiveCoefficients:{alpha:config.alpha,beta:config.beta,gamma:config.gamma},analysisDate:body.asOfDate??'2026-11-10',source:'DEMO_REFERENCE',utilityScale:100,roundingMode:'HALF_UP',itemMapping:'PRODUCT_ID',timeZone:'Asia/Ho_Chi_Minh'});
  if(path.startsWith('/api/utility/config')){if(write){requireValue(admin||merch,'Store staff required.',403);if(path.endsWith('expiry-window')){requireValue(Number.isInteger(body.expiryWindowDays)&&body.expiryWindowDays>0,'Invalid window.');config.expiryWindowDays=body.expiryWindowDays;}else {for(const key of ['alpha','beta','gamma','lambda'])requireValue(Number.isFinite(body[key])&&body[key]>=0,`Invalid ${key}.`);requireValue(body.lambda>=state.policy.lambdaMin&&body.lambda<=state.policy.lambdaMax,'Lambda outside system policy.');for(const key of ['enableStock','enableExpiry','enableSeason'])requireValue(typeof body[key]==='boolean',`Invalid ${key}.`);Object.assign(config,body);}config.version++;}return finish(configView());}
  const scoreMatch=path.match(/products\/(\d+)\/scores/);
  if(scoreMatch){const p=product(Number(scoreMatch[1])),key=`${scope}:${p.id}`;const scores=state.scores[key]??{stockPriorityScore:1,seasonalPriorityScore:1};if(write){for(const k of ['stockPriorityScore','seasonalPriorityScore'] as const)if(body[k]!==undefined){requireValue(Number.isFinite(body[k])&&body[k]>=0,`Invalid ${k}.`);scores[k]=body[k];}state.scores[key]=scores;}
   return finish({productId:p.id,...scores,expiryScore:0,weightValue:config.lambda+config.alpha*scores.stockPriorityScore+config.gamma*scores.seasonalPriorityScore,expiryStatus:'NOT_IN_PUSH_WINDOW',expiryEvidence:{expiryPushDays:p.expiryPushDays,earliestEligibleExpiryDate:null,daysRemaining:null,asOfDate:'2026-11-10',reason:'DEMO_REFERENCE',batches:[]},expiryPushDays:p.expiryPushDays,asOfDate:'2026-11-10',timeZone:'Asia/Ho_Chi_Minh',configVersion:config.version,lambdaValid:configView().lambdaValid,ready:true,warnings:['Demo scoring fixture; not measured profit.']});}
  if(path.includes('expiry-push-batches'))return finish({...page([]),asOfDate:url.searchParams.get('asOfDate')??'2026-11-10',timeZone:'Asia/Ho_Chi_Minh',warnings:['No eligible expiry batches in reference scenario.']});
  const matrix=()=>{const items=scoped(state.transactions).filter(t=>(!body.rangeStart||t.occurredAt>=body.rangeStart)&&(!body.rangeEnd||t.occurredAt.slice(0,10)<=body.rangeEnd)).flatMap(t=>t.items.map(line=>({transactionId:t.transactionId,productId:line.productId,algorithmItemId:line.productId,quantity:line.quantity,baseUtility:(line.unitPrice-line.unitCost)*line.quantity,stockScore:1,expiryScore:0,seasonalScore:1,expiryStatus:'NOT_IN_PUSH_WINDOW',weightValue:config.lambda+config.alpha+config.gamma,weightedUtility:(line.unitPrice-line.unitCost)*line.quantity*(config.lambda+config.alpha+config.gamma),transactionUtility:t.totalAmount,expiryEvidence:null})));return {...page(items),totalWeightedUtility:items.reduce((a,b)=>a+b.weightedUtility,0),sourceHash:`demo-reference-${scope}`,matrixHash:`demo-matrix-${scope}-v${config.version}`,warnings:['Synthetic reference data, weighted Utility is not realized profit.'],ready:true,configuration:frozen()};};
  if(path==='/api/utility/preview')return finish(matrix());
  if(path==='/api/mining/snapshots')return finish(page(scoped(state.snapshots).map(s=>({...s,configuration:s.configuration??null}))));
  if(path==='/api/utility/snapshots'&&write){requireValue(body.rangeStart&&body.rangeEnd&&body.asOfDate&&body.rangeStart<=body.rangeEnd,'Valid date range required.');const m=matrix();const snapshot={snapshotId:id(),storeId:scope!,createdBy:scope!*10,rangeStart:body.rangeStart,rangeEnd:body.rangeEnd,asOfDate:body.asOfDate,configuration:frozen(),sourceHash:m.sourceHash,matrixHash:m.matrixHash,totalWeightedUtility:m.totalWeightedUtility,roundingScale:2,status:'READY',createdAt:now(),warnings:m.warnings};state.snapshots.push(snapshot);state.matrices??={};state.matrices[snapshot.snapshotId]=m;return finish(snapshot,201);}
  const sm=path.match(/snapshots\/(\d+)(\/matrix)?$/);if(sm){find(scoped(state.snapshots),s=>s.snapshotId===Number(sm[1]));if(sm[2]){const stored=state.matrices?.[Number(sm[1])];if(!stored)return json({error:'Matrix rows unavailable for this historical reference snapshot. Create a fresh snapshot.'},409);return finish({...stored,...page(stored.items)});}return finish(scoped(state.snapshots).find(s=>s.snapshotId===Number(sm[1])));}
 }
 if(path.startsWith('/api/transactions')){
  if(path==='/api/transactions/imports/csv'){requireValue(admin&&method==='POST','Only Store Admin can import CSV.',403);return finish(await importDemoCsv(state,scope!,init.body),201);}
  if(path.includes('/imports')){const m=path.match(/imports\/(\d+)(\/errors)?$/);if(m){const batch=find(scoped(state.imports),b=>b.importBatchId===Number(m[1]));return finish(m[2]?page(batch.errors,'content'):batch);}return finish(page(scoped(state.imports),'content'));}
  const n=Number(path.split('/')[3]);if(n)return finish(find(scoped(state.transactions),t=>t.transactionId===n));
  const rows=scoped(state.transactions).filter(t=>(!url.searchParams.get('status')||t.status===url.searchParams.get('status'))&&(!url.searchParams.get('from')||t.occurredAt>=url.searchParams.get('from')!)&&(!url.searchParams.get('to')||t.occurredAt.slice(0,10)<=url.searchParams.get('to')!)).map(t=>({...t,items:[]}));return finish(page(rows,'content'));
 }
 if(path==='/api/system/mining/config'){
  if(write){requireValue(body.expectedVersion===state.miningConfig.version,'Configuration changed; refresh and retry.',409);requireValue(['EFIM','HUI_MINER'].includes(body.algorithm)&&['PERCENTAGE','ABSOLUTE'].includes(body.minUtilMode)&&Number.isFinite(body.minUtilValue)&&body.minUtilValue>0&&(body.minUtilMode!=='PERCENTAGE'||body.minUtilValue<=100),'Invalid mining configuration.');state.miningConfig={algorithm:body.algorithm,minUtilMode:body.minUtilMode,minUtilValue:body.minUtilValue,version:state.miningConfig.version+1,changedBy:1,changedAt:now()};}return finish(state.miningConfig);
 }
 if(path==='/api/system/mining/requests'&&write){
  const snapshot=find(state.snapshots,s=>s.snapshotId===body.snapshotId&&s.storeId===body.storeId);requireValue(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.requestKey),'A UUID request key is required.');
  const existing=state.requests.find(r=>r.requestKey.toLowerCase()===body.requestKey.toLowerCase());if(existing){requireValue(existing.storeId===body.storeId&&existing.snapshotId===body.snapshotId&&existing.algorithms.length===(body.compareAlgorithms?2:1),'Request key reused with different input.',409);return finish(existing);}
  const c=state.miningConfig;requireValue(c.algorithm&&c.minUtilMode&&c.minUtilValue,'Configure mining first.',409);
  const effectiveMinUtility=c.minUtilMode==='PERCENTAGE'?snapshot.totalWeightedUtility*c.minUtilValue/100:c.minUtilValue;
  const minUtilSpmf=Math.max(1,Math.ceil(effectiveMinUtility*100));requireValue(Number.isSafeInteger(minUtilSpmf)&&minUtilSpmf<=2147483647,'Threshold exceeds supported demo scaled integer range.');
  const matrix=state.matrices?.[snapshot.snapshotId];
  const reference=state.transactions.filter(t=>t.storeId===body.storeId&&t.f03Eligible&&t.occurredAt>=snapshot.rangeStart&&t.occurredAt.slice(0,10)<=snapshot.rangeEnd);
  const productIds=[...new Set(matrix?matrix.items.map(i=>i.productId):reference.flatMap(t=>t.items.map(i=>i.productId)))].slice(0,3);
  const utility=matrix?matrix.items.filter(i=>productIds.includes(i.productId)).reduce((sum,i)=>sum+(i.weightedUtility??0),0):reference.flatMap(t=>t.items).filter(i=>productIds.includes(i.productId)).reduce((sum,i)=>sum+(i.unitPrice-i.unitCost)*i.quantity*3,0);
  const candidate=productIds.length>0&&utility>=effectiveMinUtility?{productIds,utility,utilitySpmf:Math.round(utility*100),patternSize:productIds.length,supportCount:null}:null;
  const request={requestId:id(),storeId:body.storeId,requestedBy:1,requestKey:body.requestKey,snapshotId:body.snapshotId,algorithms:body.compareAlgorithms?['HUI_MINER' as const,'EFIM' as const]:[c.algorithm],minUtilMode:c.minUtilMode,minUtilValue:c.minUtilValue,minUtilSpmf,effectiveMinUtility,status:'COMPLETED' as const,comparisonStatus:body.compareAlgorithms?'MATCH' as const:'NOT_REQUESTED' as const,snapshotHash:snapshot.matrixHash,inputHash:snapshot.sourceHash,conversionVersion:'SIMULATED_CANDIDATE_FILTER_V1_NOT_ALGORITHM_EVIDENCE',utilityScale:100,roundingMode:'HALF_UP',divisor:1,totalScaledUtility:Math.round(snapshot.totalWeightedUtility*100),transactionCount:1,distinctItems:3,inputBytes:0,snapshot:{...snapshot,configuration:snapshot.configuration??null},createdAt:now()};state.requests.push(request);
  request.algorithms.forEach(algorithm=>state.runs.push({runId:id(),requestId:request.requestId,storeId:request.storeId,snapshotId:request.snapshotId,algorithm,attemptNo:1,libraryVersion:'synthetic-demo-v1',status:'COMPLETED',minUtilSpmf,inputHash:request.inputHash,conversionVersion:request.conversionVersion,startedAt:null,completedAt:null,runtimeMillis:null,memoryMiB:null,memoryMethod:'NOT_MEASURED',runtimeMethod:'NOT_MEASURED',environment:'SIMULATED candidate filtering only; no HUI-Miner or EFIM algorithm is executed.',patternCount:candidate?1:0,failureCode:null,failureMessage:null}));state.patterns??=[];for(const run of state.runs.filter(r=>r.requestId===request.requestId)){if(candidate)state.patterns.push({patternId:id(),runId:run.runId,...candidate});}return finish(request,202);
 }
 if(path.startsWith('/api/mining/')||selected){
  const suffix=selected?path.slice(selected[0].length):path.slice('/api/mining'.length);
  if(suffix==='/snapshots')return finish(page(scoped(state.snapshots).map(s=>({...s,configuration:s.configuration??null}))));
  if(suffix==='/requests')return finish(page(scoped(state.requests)));
  const rm=suffix.match(/^\/requests\/(\d+)(\/runs)?$/);if(rm){const r=find(scoped(state.requests),r=>r.requestId===Number(rm[1]));return finish(rm[2]?state.runs.filter(x=>x.requestId===r.requestId):r);}
  const run=suffix.match(/^\/runs\/(\d+)(?:\/(patterns|benchmark))?$/);if(run){const r=find(scoped(state.runs),r=>r.runId===Number(run[1]));if(run[2]==='patterns')return finish(page((state.patterns??[]).filter(p=>p.runId===r.runId)));if(run[2]==='benchmark'){const request=find(state.requests,q=>q.requestId===r.requestId);return finish({run:r,snapshotHash:request.snapshotHash,transactionCount:request.transactionCount,distinctItems:request.distinctItems,inputBytes:0,divisor:1,utilityScale:100,effectiveMinUtility:request.effectiveMinUtility,comparisonStatus:request.comparisonStatus,repetitionPolicy:'Unavailable: no measured mining runs in demo.'});}return finish(r);}
 }
 throw new DemoError(501,`Local demo does not support ${method} ${path}. No network request was sent.`);
 } catch(error){if(error instanceof DOMException&&error.name==='AbortError')throw error;return json({error:error instanceof Error?error.message:'Invalid demo request.'},error instanceof DemoError?error.status:400);}
}
