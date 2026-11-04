import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AccountOverview } from '../src/features/users/components/UsersRolesView';
import { SystemMiningDashboard } from '../src/features/f05/components/SystemMiningDashboard';
import { MiningStatusBadge } from '../src/features/f05/components/MiningStatusBadge';
import { formatMiningNumber, formatThreshold } from '../src/features/f05/f05.display';
import { benchmarkRuntimeDifference } from '../src/features/f05/f05.results';
import { ROLE_PERMISSIONS } from '../src/services/authService';
import type { UserAccount } from '../src/types/users';
import { configuration, requestFixture, benchmarkFixture } from './f05.fixtures';

test('utility display preserves decimal meaning; only sampled heap presentation uses two decimals',()=>{
  assert.equal(formatMiningNumber(898000),'898,000');
  assert.equal(formatMiningNumber(0),'0');
  assert.equal(formatMiningNumber(null),'Not measured');
  assert.equal(formatMiningNumber(12.123456),'12.123456');
  assert.equal(formatMiningNumber(11.135678,2),'11.14');
  assert.equal(formatThreshold(0.5,'PERCENTAGE'),'0.5%');
  assert.equal(formatThreshold(898000,'ABSOLUTE'),'898,000 frozen utility units');
});

test('runtime summary uses only compatible measured MATCH results, including ties and nulls',()=>{
  const request=requestFixture('COMPLETED');
  const hui=benchmarkFixture(),efim=benchmarkFixture('EFIM');
  hui.run.runtimeMillis=289;efim.run.runtimeMillis=242;
  assert.deepEqual(benchmarkRuntimeDifference(request,[hui,efim]),{algorithm:'EFIM',differenceMillis:47});
  hui.run.runtimeMillis=200;
  assert.deepEqual(benchmarkRuntimeDifference(request,[hui,efim]),{algorithm:'HUI_MINER',differenceMillis:42});
  hui.run.runtimeMillis=242;
  assert.deepEqual(benchmarkRuntimeDifference(request,[hui,efim]),{algorithm:null,differenceMillis:0});
  for(const status of ['PENDING','FAILED','BLOCKED'] as const)assert.equal(benchmarkRuntimeDifference({...request,comparisonStatus:status},[hui,efim]),null);
  efim.run.runtimeMillis=null;assert.equal(benchmarkRuntimeDifference(request,[hui,efim]),null);
  efim.run.runtimeMillis=242;efim.run.environment='other environment';
  assert.equal(benchmarkRuntimeDifference(request,[hui,efim]),null);
});

const accounts:UserAccount[]=[
  {id:'1',name:'Admin',email:'admin@example.invalid',role:'System Admin',status:'Active'},
  {id:'2',name:'Store',email:'store@example.invalid',role:'Store Admin',status:'Active'},
  {id:'3',name:'Merch',email:'merch@example.invalid',role:'Merchandiser',status:'Inactive'},
  {id:'4',name:'Customer',email:'customer@example.invalid',role:'End-Customer',status:'Inactive'},
  {id:'5',name:'Merch 2',email:'merch2@example.invalid',role:'Merchandiser',status:'Active'}
];
test('account overview counts only loaded API accounts and distinguishes Store staff from System Admin',()=>{
  const html=renderToStaticMarkup(createElement(AccountOverview,{users:accounts,loading:false,error:null}));
  const numbers=[...html.matchAll(/tabular-nums[^>]*>(\d+)<\/p>/g)].map(match=>Number(match[1]));
  assert.deepEqual(numbers,[5,3,2,3]);
  for(const old of ['Active Directory','Role Profiles','Admin Privileges','Verified','RBAC matrix tiers'])assert.equal(html.includes(old),false);
  assert.ok(html.includes('Counts cover the accounts returned'));
});
test('account failures and loading never masquerade as successful zero counts',()=>{
  for(const [loading,error] of [[true,null],[false,'offline']] as const){
    const html=renderToStaticMarkup(createElement(AccountOverview,{users:[],loading,error}));
    assert.equal(/tabular-nums[^>]*>0<\/p>/.test(html),false);
    assert.ok(html.includes(loading?'Loading accounts':'Account data unavailable'));
  }
  const empty=renderToStaticMarkup(createElement(AccountOverview,{users:[],loading:false,error:null}));
  assert.equal([...empty.matchAll(/tabular-nums[^>]*>0<\/p>/g)].length,4);
});
test('Dashboard separates global settings from the Store selector and activity, with no configuration form',()=>{
  const html=renderToStaticMarkup(createElement(SystemMiningDashboard,{config:configuration,loading:false,error:'',reader:null,storeSelector:createElement('div',{'data-test-store':'true'},'Store selector'),onRefresh:()=>{},onConfigure:()=>{},onRun:()=>{},onRequest:()=>{}}));
  assert.ok(html.indexOf('Global Mining Configuration')<html.indexOf('data-test-store'));
  assert.ok(html.indexOf('data-test-store')<html.indexOf('Recent Mining Activity'));
  assert.equal(html.includes('<form'),false);assert.equal(html.includes('Policy version'),false);
  assert.ok(html.includes('Applies to all stores'));assert.ok(html.includes('Configuration Version'));
});
test('friendly status labels and unrelated role permissions remain accurate',()=>{
  const html=renderToStaticMarkup(createElement(MiningStatusBadge,{kind:'run',status:'TIMED_OUT',friendly:true}));
  assert.ok(html.includes('>Timed out<'));
  assert.ok(ROLE_PERMISSIONS.Merchandiser.allowedScreens.includes('f03-preview'));
  assert.ok(ROLE_PERMISSIONS.Merchandiser.allowedScreens.includes('f03-configuration'));
  for(const screen of ['store-inventory','store-batches','f04-import-transactions','f04-import-history','f04-transactions'] as const)assert.ok(ROLE_PERMISSIONS['Store Admin'].allowedScreens.includes(screen));
});

