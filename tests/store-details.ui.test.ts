import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createElement as h} from 'react';
import {renderToStaticMarkup as render} from 'react-dom/server';
import {AccountRoleBadge} from '../src/features/users/components/AccountRoleBadge';
import {AccountStatusBadge} from '../src/features/users/components/AccountStatusBadge';
import {StoreAssignedUsers,StoreContactInformation,StoreDetailsHeader,assignedAccountRole,assignedAccountStatus} from '../src/features/storeManagement/StoreDetailsPresentation';
import {StoreImagePreview,type SavedStoreImage} from '../src/features/storeManagement/StoreBranding';
import type {StoreDetail} from '../src/features/storeManagement/storeManagement.api';

const image:SavedStoreImage={key:'fixture',src:'',error:'',loading:false,exists:false,revision:0,retry:()=>{},loaded:()=>{},failed:()=>{}};
const store:StoreDetail={storeId:1,name:'Fresh Market',slug:'fresh-market',status:'ACTIVE',address:null,phone:'+84 123',iconUrl:null,bannerUrl:null,version:7,createdAt:null,updatedAt:null,deactivatedAt:null,deactivatedBy:null,assignedUserCount:12,assignedUsers:[
  {userId:21,name:'Linh Nguyen',email:'linh@example.invalid',role:'STORE_ADMIN',status:'ACTIVE'},
  {userId:22,name:'Minh Tran',email:'minh@example.invalid',role:'MERCHANDISER',status:'INACTIVE'},
  {userId:23,name:null,email:'pending@example.invalid',role:'END_CUSTOMER',status:'PENDING_VERIFICATION'},
  {userId:24,name:'Invited User',email:'invite@example.invalid',role:'SYSTEM_ADMIN',status:'INVITED'},
  {userId:25,name:'<script>bad</script>',email:'unknown@example.invalid',role:'constructor',status:'FUTURE_STATUS'}
]};

test('assigned role/status maps are explicit and never treat invited or unknown accounts as active',()=>{
  for(const code of ['ACTIVE','INACTIVE','PENDING_VERIFICATION'])assert.notEqual(assignedAccountStatus(code),null);
  assert.equal(assignedAccountStatus('PENDING_VERIFICATION'),'Pending Activation');
  for(const code of ['INVITED','UNKNOWN','active','','constructor'])assert.equal(assignedAccountStatus(code),null);
  for(const code of ['SYSTEM_ADMIN','STORE_ADMIN','MERCHANDISER','END_CUSTOMER'])assert.notEqual(assignedAccountRole(code),null);
  for(const code of ['ADMIN','unknown','constructor',''])assert.equal(assignedAccountRole(code),null);
});

test('assigned users reuse exact account badges, preserve authoritative count and expose read-only table and mobile rows',()=>{
  const html=render(h(StoreAssignedUsers,{store}));
  assert.match(html,/<h2[^>]*>Assigned Users<\/h2>/);assert.match(html,/data-assigned-account-count[^>]*>12<\/p>/);assert.ok(html.includes('Accounts assigned to this store.'));assert.ok(html.includes('Assigned accounts'));assert.equal(html.includes('<a'),false);
  for(const role of ['Store Admin','Merchandiser','End-Customer','System Admin'] as const)assert.ok(html.includes(render(h(AccountRoleBadge,{role}))));
  for(const status of ['Active','Inactive','Pending Activation'] as const)assert.ok(html.includes(render(h(AccountStatusBadge,{status}))));
  assert.ok(html.includes('Invited'));assert.ok(html.includes('Unknown status'));assert.ok(html.includes('Unknown role'));
  assert.equal((html.match(/>Active<\/span>/g)||[]).length,2,'Only the ACTIVE fixture gets Active, once per presentation');
  for(const label of ['Name','Role','Status'])assert.ok(html.includes('>'+label+'</th>'));
  assert.ok(html.includes('LN</span>'));assert.ok(html.includes('(Unnamed)'));assert.ok(html.includes('pending@example.invalid'));
  assert.ok(html.includes('&lt;script&gt;bad&lt;/script&gt;'));assert.equal(html.includes('<script>'),false);
  assert.equal(html.includes('<button'),false);assert.equal(html.includes('Edit'),false);
  const empty=render(h(StoreAssignedUsers,{store:{assignedUsers:[],assignedUserCount:0}}));
  assert.match(empty,/data-assigned-account-count[^>]*>0<\/p>/);assert.ok(empty.includes('No users are assigned'));assert.equal(empty.includes('<table'),false);
  for(const count of [1,1234]){
    const summary=render(h(StoreAssignedUsers,{store:{assignedUsers:[],assignedUserCount:count}}));
    assert.ok(summary.includes('>'+count.toLocaleString('en-US')+'</p>'));assert.ok(summary.includes('Assigned accounts'));
  }
});

test('Store Details has contact-only cards and a high contrast profile placeholder without changing My Store default',()=>{
  const html=render(h(StoreContactInformation,{store}));
  for(const text of ['Address','Phone Number','Not set','+84 123'])assert.ok(html.includes(text));
  assert.equal(html.includes(store.name),false);assert.equal(html.includes('Store URL'),false);
  const header=render(h(StoreDetailsHeader,{store,image,action:h('button',null,'Deactivate Store')}));
  assert.ok(header.includes('Fresh Market'));assert.ok(header.includes('/storefront?store=fresh-market'));assert.ok(header.includes('>Active</span>'));assert.ok(header.includes('Deactivate Store'));
  assert.ok(header.includes('text-[#EDF5EF]'));
  const own=render(h(StoreImagePreview,{image,kind:'icon',identity:true}));assert.ok(own.includes('text-[#6D7974]'));assert.equal(own.includes('text-[#EDF5EF]'),false);
});
