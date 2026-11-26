import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createElement as h} from 'react';
import {renderToStaticMarkup as render} from 'react-dom/server';
import {suggestStoreSlug,storeFieldErrors,storeInput,storeRoleLabel,storeAccountStatus} from '../src/features/storeManagement/storeManagement.presentation';
import {storesApi,StoreRequestError,StoreConflict,uncertainStoreWrite,validateStoreImage,type StoreView} from '../src/features/storeManagement/storeManagement.api';
import {StoreManagementForm} from '../src/features/storeManagement/StoreManagementForm';
import {StoreBrandImage,StoreImagePreview,type SavedStoreImage} from '../src/features/storeManagement/StoreBranding';
import {StoreManagementView} from '../src/features/storeManagement/StoreManagementView';
import {StoreOverview,StoreDirectoryContact} from '../src/features/storeManagement/StoreDirectoryPresentation';
import {UsersRolesView} from '../src/features/users/components/UsersRolesView';
import {authService} from '../src/services/authService';
import {user} from './f05.fixtures';
const record:StoreView={storeId:1,name:'Fresh Market',slug:'fresh-market',address:null,phone:null,status:'ACTIVE',version:7,iconUrl:null,bannerUrl:null,createdAt:null,updatedAt:null,deactivatedAt:null};
const image:SavedStoreImage={key:'fixture',src:'',error:'',loading:false,exists:false,revision:0,retry:()=>{},loaded:()=>{},failed:()=>{}};
test('Vietnamese store URL suggestions normalize accents, d-stroke, punctuation and boundary lengths',()=>{
 for(const [input,expected]of [['Fresh Market Đà Nẵng','fresh-market-da-nang'],['Bách Hóa Xanh','bach-hoa-xanh'],['WinMart 24/7','winmart-24-7'],[' ĐĐ-đ Café!!! ','dd-d-cafe'],['中文 😀',''],[' - - ','']])assert.equal(suggestStoreSlug(input),expected);
 const long=suggestStoreSlug('a'.repeat(49)+' '+ 'store');assert.equal(long,'a'.repeat(49));assert.ok(suggestStoreSlug('x'.repeat(100)).length<=50);
});
test('field constraints match Backend while Store Admin contact validation ignores identity fields',()=>{
 const valid={name:' Test ',slug:'test',address:'',phone:'+84 (123).45-6'};assert.deepEqual(storeFieldErrors(valid,true),{});
 for(const slug of ['', '-test','test-','test--two','UPPER','a'.repeat(51)])assert.ok(storeFieldErrors({...valid,slug},true).slug);
 assert.ok(storeFieldErrors({...valid,name:' '.repeat(4)},true).name);assert.ok(storeFieldErrors({...valid,name:'x'.repeat(151)},true).name);assert.ok(storeFieldErrors({...valid,address:'x'.repeat(256)},true).address);assert.ok(storeFieldErrors({...valid,phone:'abc'},true).phone);
 assert.deepEqual(storeFieldErrors({...valid,name:'',slug:''},false),{});assert.deepEqual(storeInput({...valid,address:'   ',phone:' 123 '}),{name:'Test',slug:'test',address:null,phone:'123'});
});
test('create form has automatic read-only URL, required identity, existing route preview and explicit footer',()=>{
 const html=render(h(StoreManagementForm,{identity:true,busy:false,serverError:'',dialog:true,onSubmit:async()=>true,onCancel:()=>{}}));
 for(const text of ['Store Name *','Store URL *','Customize','Automatically generated from your store name.','Address','Phone Number','New stores are active by default.','Create Store','Cancel'])assert.ok(html.includes(text),text);
 assert.match(html,/<button type="submit"[^>]*disabled=""/);assert.equal(html.includes('(optional)'),false);assert.ok(html.includes('readOnly=""'));assert.equal(html.includes('localhost'),false);assert.equal(html.includes('Status'),false);
});
test('edit form keeps existing URL and only includes authorized contact controls for Store Admin',()=>{
 const common={store:record,busy:false,serverError:'',onSubmit:async()=>true,onCancel:()=>{}};
 const admin=render(h(StoreManagementForm,{...common,identity:false}));assert.equal(admin.includes('Store Name *'),false);assert.equal(admin.includes('Store URL *'),false);assert.ok(admin.includes('Phone Number'));assert.match(admin,/<button type="submit"[^>]*disabled=""/);
 const system=render(h(StoreManagementForm,{...common,identity:true}));assert.ok(system.includes('/storefront?store=fresh-market'));assert.equal(system.includes('Customize'),false);assert.equal(system.includes('readOnly=""'),false);
 for(const [message,friendly]of [['Store name already exists','This store name is already in use.'],['Store slug already exists','This store URL is already in use.']])assert.ok(render(h(StoreManagementForm,{...common,identity:true,serverError:message})).includes(friendly));
});
test('Merchandiser branding renders no upload or removal controls; missing images and failures stay distinct',()=>{
 const html=render(h(StoreBrandImage,{record,kind:'icon',image,editable:false,busy:false,onUpload:async()=>{throw Error('No write');},onRemove:async()=>{throw Error('No write');}}));assert.ok(html.includes('No icon uploaded'));assert.equal(html.includes('<button'),false);assert.equal(html.includes('type="file"'),false);
 const failed=render(h(StoreImagePreview,{image:{...image,exists:true,error:'Image preview unavailable.'},kind:'banner'}));assert.ok(failed.includes('Image preview unavailable'));assert.equal(failed.includes('No banner uploaded'),false);
 const loading=render(h(StoreImagePreview,{image:{...image,exists:true,loading:true},kind:'banner'}));assert.ok(loading.includes('Loading image'));assert.equal(loading.includes('No banner uploaded'),false);
});
test('root component denies mismatched mode and never exposes controls to unauthorized roles',t=>{
 t.mock.method(authService,'subscribe',()=>()=>{});t.mock.method(authService,'getSessionId',()=> 'fixture');
 for(const role of ['System Admin','Store Admin','Merchandiser','End-Customer'] as const){t.mock.method(authService,'getCurrentUser',()=>({...user,role}));for(const mode of ['system','manage','read'] as const){const allowed=mode==='system'?role==='System Admin':mode==='manage'?role==='Store Admin':role==='Merchandiser';const html=render(h(StoreManagementView,{mode}));assert.equal(html.includes('unavailable for this role'),!allowed);}}
});
test('global count query is bounded and separate from paginated searched Store directory',async t=>{
 const request=t.mock.method(authService,'request',async()=>Response.json({items:[],page:0,pageSize:1,totalElements:45}));
 for(const status of ['ALL','ACTIVE','INACTIVE'] as const)await storesApi.list(0,'',status,undefined,1);
 assert.deepEqual(request.mock.calls.map(call=>String(call.arguments[0])),['/api/system/stores?page=0&pageSize=1&q=&status=ALL','/api/system/stores?page=0&pageSize=1&q=&status=ACTIVE','/api/system/stores?page=0&pageSize=1&q=&status=INACTIVE']);
});
test('failed reads and uncertain writes preserve HTTP distinctions without automatically retrying',async t=>{
 const request=t.mock.method(authService,'request',async()=>{throw Error('Connection lost');});await assert.rejects(storesApi.create({name:'Test',slug:'test'}),StoreRequestError);assert.equal(request.mock.callCount(),1);
 for(const status of [null,200,500,503])assert.equal(uncertainStoreWrite(new StoreRequestError(status,'error')),true);
 for(const status of [400,403,409,413])assert.equal(uncertainStoreWrite(new StoreRequestError(status,'error')),false);assert.equal(uncertainStoreWrite(new StoreConflict('Store version conflict')),false);
});
test('image validation preserves PNG/JPEG signature, decode, limits and max dimensions',async()=>{
 const jpeg=new File([Uint8Array.of(255,216,255,0,0,0,0,0)],'banner.jpg',{type:'image/jpeg'});await validateStoreImage(jpeg,'banner',async()=>({width:4000,height:4000}));
 await assert.rejects(validateStoreImage(jpeg,'banner',async()=>{throw Error('corrupt');}),/decoded/);await assert.rejects(validateStoreImage(new File([new Uint8Array(5*1048576+1)],'banner.jpg'),'banner'),/5 MiB/);
 assert.equal(storeRoleLabel('STORE_ADMIN'),'Store Admin');assert.equal(storeRoleLabel('MERCHANDISER'),'Merchandiser');assert.equal(storeAccountStatus('PENDING_VERIFICATION'),'Pending verification');
});

test('Store overview preserves authoritative counts, zero and unavailable values with clickable status context',()=>{
 const html=render(h(StoreOverview,{counts:{ALL:1234,ACTIVE:0},loading:false,status:'INACTIVE',onStatus:()=>{}}));
 const text=html.replace(/<[^>]*>/g,'');
 for(const label of ['Total Stores','All registered stores','Active Stores','Stores currently operating','Inactive Stores','Stores currently disabled','1,234','Unavailable'])assert.ok(text.includes(label),label);
 assert.equal((html.match(/aria-pressed="true"/g)||[]).length,1);assert.match(html,/data-store-metric="INACTIVE" aria-pressed="true"/);
 assert.match(html,/data-store-value[^>]*>0<\/span>/);
 const loading=render(h(StoreOverview,{counts:{ALL:45},loading:true,status:'ACTIVE',onStatus:()=>{}}));assert.ok(loading.includes('45'));assert.equal(loading.includes('Unavailable'),false);
});

test('directory contact text labels missing and saved values explicitly and escapes Backend strings',()=>{
 assert.equal(render(h(StoreDirectoryContact,{store:{address:null,phone:null}})).replace(/<[^>]*>/g,''),'Address: Not setPhone: Not set');
 const saved=render(h(StoreDirectoryContact,{store:{address:'<script>bad</script>',phone:'+84 123'}}));assert.ok(saved.includes('Address: '));assert.ok(saved.includes('Phone: '));assert.ok(saved.includes('+84 123'));assert.equal(saved.includes('<script>'),false);
});

test('Store Management, both My Store roles and Accounts & Roles share responsive page heading hierarchy',t=>{
 t.mock.method(authService,'getSessionId',()=> 'visual-fixture');t.mock.method(authService,'subscribe',()=>()=>{});
 const title='text-2xl sm:text-3xl font-semibold tracking-tight text-[#191C1B]';
 for(const [role,mode] of [['System Admin','system'],['Store Admin','manage'],['Merchandiser','read']] as const){
  t.mock.method(authService,'getCurrentUser',()=>({...user,role}));
  const html=render(h(StoreManagementView,{mode}));assert.ok(html.includes('<h1 class="'+title+'">'));assert.ok(html.includes('mt-1 text-sm sm:text-base leading-6 text-[#6D7974]'));
  if(mode==='system'){assert.ok(html.includes('role="search" aria-label="Store filters"'));assert.equal(html.includes('>Search</button>'),false);}
 }
 const accounts=render(h(UsersRolesView));assert.ok(accounts.includes('<h1 class="'+title+'">'));assert.equal(accounts.includes('sm:text-[28px]'),false);
});
