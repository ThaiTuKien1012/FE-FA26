import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { TestContext } from 'node:test';
import { authService } from '../src/services/authService';
import { accountChanges, accountDraft, canChangeAccountStatus, createAccountPayload, mapAccount, planAccountUpdate, saveAccountUpdate } from '../src/features/users/account-management';
import type { UserAccount } from '../src/types/users';

const dto=(status='ACTIVE',verified=true)=>({userId:6,name:'Account Fixture',email:'account@example.invalid',roleCode:'STORE_ADMIN',storeId:1,status,emailVerified:verified,avatarUrl:null});
const actor=(t:TestContext)=>{
  t.mock.method(authService,'getCurrentUser',()=>({id:'1',role:'System Admin'}) as ReturnType<typeof authService.getCurrentUser>);
  t.mock.method(authService,'getToken',()=> 'account-test-only-token');
  t.mock.method(globalThis,'fetch',async()=>{throw new Error('Unexpected fetch: live endpoints are never used in this test');});
};
test('ACTIVE accounts preserve actual verification and can be disabled through the status endpoint',()=>{
  const account=mapAccount(dto());assert.equal(account.status,'Active');assert.equal(account.emailVerified,true);
  assert.equal(canChangeAccountStatus(account),true);
  assert.deepEqual(planAccountUpdate(account,{...accountDraft(account),status:'Inactive'},'1'),[
    {field:'status',method:'PATCH',path:'/api/users/6/status',body:{status:'INACTIVE'}}
  ]);
});
test('verified INACTIVE accounts can request reactivation without reassigning role or name',()=>{
  const account=mapAccount(dto('INACTIVE'));assert.equal(canChangeAccountStatus(account),true);
  assert.deepEqual(planAccountUpdate(account,{...accountDraft(account),status:'Active'},'1'),[
    {field:'status',method:'PATCH',path:'/api/users/6/status',body:{status:'ACTIVE'}}
  ]);
});
test('pending activation is distinct; neither pending nor unverified accounts bypass OTP',()=>{
  for(const verified of [false,true]){
    const account=mapAccount(dto('PENDING_VERIFICATION',verified));
    assert.equal(account.status,'Pending Activation');assert.equal(account.emailVerified,verified);
    assert.equal(canChangeAccountStatus(account),false);
    assert.throws(()=>planAccountUpdate(account,{...accountDraft(account),status:'Active'},'1'),/OTP activation/);
    assert.throws(()=>planAccountUpdate(account,{...accountDraft(account),status:'Inactive'},'1'),/OTP activation/);
    assert.deepEqual(planAccountUpdate(account,accountDraft(account),'1'),[]);
  }
  const unverified=mapAccount(dto('INACTIVE',false));
  assert.throws(()=>planAccountUpdate(unverified,{...accountDraft(unverified),status:'Active'},'1'),/OTP activation/);
  assert.equal(mapAccount(dto('ACTIVE',false)).emailVerified,false);
  assert.throws(()=>mapAccount({...dto(),emailVerified:undefined}),/invalid account/);
  assert.throws(()=>mapAccount(dto('UNKNOWN')),/invalid account/);
});
test('name-only edits and unchanged drafts do not send status/role updates for any account status',()=>{
  for(const status of ['ACTIVE','INACTIVE','PENDING_VERIFICATION']){
    const account=mapAccount(dto(status,status!=='PENDING_VERIFICATION'));
    const operations=planAccountUpdate(account,{...accountDraft(account),name:'Updated Fixture'},'1');
    assert.deepEqual(operations,[{field:'name',method:'PUT',path:'/api/users/6',body:{name:'Updated Fixture'}}]);
    assert.deepEqual(planAccountUpdate(account,accountDraft(account),'1'),[]);
  }
});
test('Role/Store edits use the exact role payload and leave status unchanged',()=>{
  const account=mapAccount(dto());
  const draft={...accountDraft(account),role:'Merchandiser' as const,storeId:'2'};
  assert.deepEqual(accountChanges(account,draft),{name:false,access:true,status:false});
  assert.deepEqual(planAccountUpdate(account,draft,'1'),[{field:'access',method:'PUT',path:'/api/users/6/role',body:{roleCode:'MERCHANDISER',storeId:2}}]);
  assert.deepEqual(planAccountUpdate(account,{...accountDraft(account),role:'System Admin',storeId:''},'1')[0].body,{roleCode:'SYSTEM_ADMIN',storeId:null});
});

test('status-only changes do not validate or rewrite unrelated nullable legacy name/Store fields',()=>{
  const current=mapAccount({...dto('INACTIVE'),name:null,storeId:null});
  assert.deepEqual(planAccountUpdate(current,{...accountDraft(current),status:'Active'},'1'),[{field:'status',method:'PATCH',path:'/api/users/6/status',body:{status:'ACTIVE'}}]);
});
test('the current administrator cannot disable or demote their own account',async t=>{
  actor(t);const account=mapAccount({...dto(),userId:1,roleCode:'SYSTEM_ADMIN',storeId:null});
  assert.throws(()=>planAccountUpdate(account,{...accountDraft(account),status:'Inactive'},'1'),/own administrator account/);
  assert.throws(()=>planAccountUpdate(account,{...accountDraft(account),role:'Store Admin',storeId:'1'},'1'),/own administrator access/);
  assert.throws(()=>planAccountUpdate(account,{...accountDraft(account),status:'Inactive'},'usr-1'),/own administrator account/);
  assert.throws(()=>planAccountUpdate(account,{...accountDraft(account),role:'Store Admin',storeId:'1'},'usr-1'),/own administrator access/);
  await assert.rejects(saveAccountUpdate(account,{...accountDraft(account),name:'Admin Changed',status:'Inactive'},'1',()=>assert.fail('No confirmation allowed')),/own administrator account/);
  assert.deepEqual(planAccountUpdate(account,{...accountDraft(account),name:'Admin Changed'},'1'),[{field:'name',method:'PUT',path:'/api/users/1',body:{name:'Admin Changed'}}]);
});
test('backend password eligibility rejection never invents an ACTIVE confirmation',async t=>{
  actor(t);const current=mapAccount(dto('INACTIVE'));let calls=0;
  const draft={...accountDraft(current),status:'Active' as const};
  t.mock.method(globalThis,'fetch',async(url:RequestInfo|URL,init?:RequestInit)=>{
    calls++;assert.equal(url,'/api/users/6/status');assert.equal(init?.method,'PATCH');
    assert.deepEqual(JSON.parse(String(init?.body)),{status:'ACTIVE'});
    return Response.json({error:'Account must complete OTP activation first'},{status:400});
  });
  await assert.rejects(saveAccountUpdate(current,draft,'1',()=>assert.fail('Rejected status cannot update UI')),/OTP activation/);
  assert.equal(current.status,'Inactive');assert.equal(draft.status,'Active');assert.equal(calls,1);
});
test('save errors preserve the original account/draft; partial confirmations make retries send only remaining changes',async t=>{
  actor(t);const current=mapAccount(dto());const draft={...accountDraft(current),name:'Updated Fixture',storeId:'2'};
  const calls:string[]=[];let confirmed:UserAccount=current;
  t.mock.method(globalThis,'fetch',async(url:RequestInfo|URL)=>{
    calls.push(String(url));
    if(String(url).endsWith('/role'))return Response.json({error:'Role update failed'},{status:500});
    return Response.json({...dto(),name:'Updated Fixture'});
  });
  await assert.rejects(saveAccountUpdate(current,draft,'1',user=>confirmed=user),/Role update failed/);
  assert.deepEqual(calls,['/api/users/6','/api/users/6/role']);
  assert.equal(current.name,'Account Fixture');assert.equal(draft.storeId,'2');assert.equal(confirmed.name,'Updated Fixture');
  assert.deepEqual(planAccountUpdate(confirmed,draft,'1').map(op=>op.field),['access']);
});
test('successful status updates use a verified response; unsafe or mismatched responses are rejected',async t=>{
  actor(t);const current=mapAccount(dto('INACTIVE'));const draft={...accountDraft(current),status:'Active' as const};
  let confirmed:UserAccount|null=null;
  t.mock.method(globalThis,'fetch',async()=>Response.json(dto()));
  await saveAccountUpdate(current,draft,'1',user=>confirmed=user);
  assert.equal((confirmed as UserAccount|null)?.status,'Active');
  for(const response of [{...dto(),userId:7},dto('INACTIVE')]){
    t.mock.method(globalThis,'fetch',async()=>Response.json(response));
    await assert.rejects(saveAccountUpdate(current,draft,'1',()=>assert.fail('Mismatched response')),/could not be verified/);
  }
});

test('a newly confirmed pending/unverified state blocks a later status PATCH in a multi-field save',async t=>{
  actor(t);const current=mapAccount(dto('INACTIVE'));const calls:string[]=[];
  t.mock.method(globalThis,'fetch',async(url:RequestInfo|URL)=>{calls.push(String(url));return Response.json({...dto('PENDING_VERIFICATION',false),name:'Updated Fixture'});});
  await assert.rejects(saveAccountUpdate(current,{...accountDraft(current),name:'Updated Fixture',status:'Active'},'1',()=>{}),/activation requirements changed/);
  assert.deepEqual(calls,['/api/users/6']);
});
test('invitations send only existing DTO fields and validate real Store IDs',()=>{
  const draft={...accountDraft(),name:'New Fixture',email:'new@example.invalid',storeId:'2'};
  assert.deepEqual(createAccountPayload(draft),{name:'New Fixture',email:'new@example.invalid',roleCode:'MERCHANDISER',storeId:2});
  assert.deepEqual(createAccountPayload({...draft,role:'End-Customer'}).storeId,null);
  for(const storeId of ['','0','1.5','2147483648'])assert.throws(()=>createAccountPayload({...draft,storeId}),/assigned Store/);
});

