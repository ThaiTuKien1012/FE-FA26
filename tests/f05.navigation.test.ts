import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AppLayout } from '../src/components/layout/AppLayout';
import { authService,ROLE_PERMISSIONS,SCREEN_OWNER_MAP } from '../src/services/authService';
import { SYSTEM_MINING_NAV,resolveSystemScreen,systemMiningView,systemScreenUrl,readMiningLocation } from '../src/features/f05/f05.navigation';
import { getPathForScreen,getScreenFromPathname } from '../src/utils/navigationRouter';
import { SystemMiningDashboard } from '../src/features/f05/components/SystemMiningDashboard';
import { MiningConfigurationView } from '../src/features/f05/components/MiningConfigurationView';
import { user,configuration } from './f05.fixtures';
import type { ActiveNavScreen } from '../src/types/mining';

test('each System Admin menu has one independent route/view; old links resolve safely',()=>{
  assert.equal(new Set(SYSTEM_MINING_NAV.map(x=>getPathForScreen(x.screen))).size,5);
  assert.equal(new Set(SYSTEM_MINING_NAV.map(x=>x.view)).size,5);
  for(const item of SYSTEM_MINING_NAV){
    assert.equal(getScreenFromPathname(getPathForScreen(item.screen)),item.screen);
    assert.equal(systemMiningView(item.screen),item.view);
    assert.ok(ROLE_PERMISSIONS['System Admin'].allowedScreens.includes(item.screen));
  }
  assert.equal(resolveSystemScreen('api-connections'),'overview');
  assert.equal(resolveSystemScreen('f03-configuration'),'lambda-policy');
  assert.equal(resolveSystemScreen('f05-mining'),'overview');
  assert.equal(resolveSystemScreen('results'),'admin-mining-history');
  assert.equal(resolveSystemScreen('failure'),'admin-mining-history');
  assert.equal(resolveSystemScreen('benchmark','?view=history&storeId=1'),'admin-mining-history');
  assert.equal(resolveSystemScreen('overview','?view=setup'),'admin-run-mining');
});

test('Store context is preserved while request/run context stays within History or Benchmark',()=>{
  const query='?storeId=2&requestId=17&runId=42&view=history';
  assert.equal(systemScreenUrl('setup',query),'/admin/setup?storeId=2');
  assert.equal(systemScreenUrl('overview',query),'/admin/overview?storeId=2');
  assert.equal(systemScreenUrl('admin-run-mining',query),'/admin/mining/run?storeId=2');
  assert.equal(systemScreenUrl('benchmark',query),'/admin/benchmark?storeId=2&requestId=17&runId=42');
  assert.equal(systemScreenUrl('lambda-policy',query),'/admin/lambda-policy?storeId=2');
  assert.equal(systemScreenUrl('users',query),'/admin/users?storeId=2');
  assert.equal(systemScreenUrl('setup','?storeId=1&algorithm=EFIM'),'/admin/setup?storeId=1&algorithm=EFIM');
});

test('sidebar matches the required groups and has exactly one active item for each destination',()=>{
  const menus=[...SYSTEM_MINING_NAV.map(x=>x.screen),'users','lambda-policy'] as ActiveNavScreen[];
  for(const screen of menus){
    const html=renderToStaticMarkup(createElement(AppLayout,{currentScreen:screen,currentUser:user,onNavigate:()=>{},children:null}));
    for(const group of ['OVERVIEW','MINING ENGINE MANAGEMENT','SYSTEM MANAGEMENT'])assert.ok(html.includes(group));
    for(const label of ['Dashboard','Algorithm Configuration','Run Mining','Mining History','Algorithm Benchmark','Users &amp; Roles','Lambda Policy'])assert.ok(html.includes(label));
    assert.equal((html.match(/aria-current="page"/g)||[]).length,1);
    assert.equal(html.includes('API Connections'),false);
    assert.equal(html.includes('Scheduled Mining'),false);
    assert.equal(html.includes('High Utility Mining'),false);
    assert.equal(html.includes('Mining Setup'),false);
  }
});

test('API Connections is denied even if a cached System Admin session claims the old screen',()=>{
  const cached={...user,allowedScreens:['api-connections'] as ActiveNavScreen[]};
  assert.equal(authService.isScreenAllowed(cached,'api-connections'),false);
  assert.equal(ROLE_PERMISSIONS['System Admin'].allowedScreens.includes('api-connections'),false);
  assert.equal(SCREEN_OWNER_MAP['api-connections']?.allowedRoles.includes('System Admin')??false,false);
  for(const screen of ['admin-run-mining','admin-mining-history','lambda-policy'] as const)assert.deepEqual(SCREEN_OWNER_MAP[screen]?.allowedRoles,['System Admin']);
  assert.equal(authService.isScreenAllowed(user,'lambda-policy'),true);
  for(const role of ['Store Admin','Merchandiser','End-Customer'] as const)assert.equal(authService.isScreenAllowed({...user,role},'lambda-policy'),false);
  assert.ok(ROLE_PERMISSIONS.Merchandiser.allowedScreens.includes('f03-preview'));
  assert.ok(ROLE_PERMISSIONS['Store Admin'].allowedScreens.includes('f04-import-transactions'));
});

test('Dashboard has real policy values or explicit no-data state and never includes forms or fake jobs',()=>{
  for(const config of [configuration,{version:0,algorithm:null,minUtilMode:null,minUtilValue:null,changedBy:null,changedAt:null},null]){
    const html=renderToStaticMarkup(createElement(SystemMiningDashboard,{config,loading:false,error:'',reader:null,onRefresh:()=>{},onConfigure:()=>{},onRun:()=>{},onRequest:()=>{}}));
    assert.equal(html.includes('<form'),false);assert.equal(html.includes('<input'),false);
    assert.equal(html.includes('#0024'),false);assert.equal(html.includes('DEMO'),false);
    assert.ok(html.includes('Choose a Store'));
    if(config?.version===1){assert.ok(html.includes('HUI-Miner'));assert.ok(html.includes('0.5%'));}
    else assert.ok(html.includes(config?'Not configured':'Unavailable'));
  }
});

test('configuration exposes backend audit metadata and explains Compare Algorithms semantics',()=>{
  const html=renderToStaticMarkup(createElement(MiningConfigurationView,{
    config:{...configuration,changedBy:27},loading:false,saving:false,locked:false,error:'',onRefresh:()=>{},onSave:async()=>{}
  }));
  assert.ok(html.includes('Updated by'));assert.ok(html.includes('Administrator #27'));assert.ok(html.includes('Last updated'));
  assert.ok(html.includes('when comparison is off'));assert.ok(html.includes('Existing')||html.includes('existing'));
});

test('Store F05 URL and permissions remain separate from System Admin routes',t=>{
  const old=Object.getOwnPropertyDescriptor(globalThis,'window');
  Object.defineProperty(globalThis,'window',{value:{location:{search:'?storeId=2&view=snapshots'}},configurable:true});
  t.after(()=>{if(old)Object.defineProperty(globalThis,'window',old);else Reflect.deleteProperty(globalThis,'window');});
  assert.equal(readMiningLocation(false,'history').storeId,null);
  assert.equal(readMiningLocation(false,'history').view,'snapshots');
  assert.equal(getPathForScreen('f05-mining'),'/mining');
  for(const role of ['Merchandiser','Store Admin'] as const){
    assert.ok(ROLE_PERMISSIONS[role].allowedScreens.includes('f05-mining'));
    assert.equal(ROLE_PERMISSIONS[role].allowedScreens.includes('admin-run-mining'),false);
  }
});
