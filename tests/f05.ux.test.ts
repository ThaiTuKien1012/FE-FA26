import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { StoreSnapshotOptions } from '../src/features/f05/components/StoreSnapshotOptions';
import { StoreAnalysisList } from '../src/features/f05/components/StoreAnalysisList';
import { StoreAnalysisContent } from '../src/features/f05/components/StoreAnalysisDetails';
import { MiningProgressCard } from '../src/features/f05/components/MiningProgressCard';
import { AnalysisPages } from '../src/features/f05/components/AnalysisPages';
import { analysisErrorMessage, analysisFailure, analysisRoundingNote, analysisStage } from '../src/features/f05/f05.presentation';
import { F05ApiError } from '../src/features/f05/f05.api';
import { requestFixture, runFixture } from './f05.fixtures';
import type { MiningProgressView } from '../src/features/f05/f05.types';
import { snapshot, matrix } from './f03.fixtures';
import { Matrix, FrozenConfiguration } from '../src/features/f03/components/UtilityMatrix';
import { SnapshotWarnings } from '../src/features/f03/components/SnapshotWarnings';
import { F06RecommendationDetailContent } from '../src/features/f06/components/F06RecommendationDetails';
import { recommendation } from './f06.fixtures';

const progress = (status: MiningProgressView['status'], percent: number, stage: MiningProgressView['stage'] = status === 'COMPLETED' ? 'COMPLETED' : status === 'FAILED' ? 'FAILED' : 'RUNNING'): MiningProgressView => ({ requestId:17,storeId:1,status,stage,stageStartedAt:null,currentRunId:null,algorithm:null,attemptNo:2,completedSteps:1,totalSteps:4,percent,elapsedMs:9,timeoutMs:null,comparisonStatus:'NOT_REQUESTED' });
const render = (element: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(element);

test('snapshot selection shows compact identity/dates/status and warning counts, never debug or long warnings', () => {
  const fixture = snapshot(6);
  const value = {...fixture,configuration:fixture.configuration??null,warnings:['MISSING_PUSH_DAY','Original warning']},before=JSON.stringify(value);
  const html=render(createElement(StoreSnapshotOptions,{items:[value],selected:value,locked:false,canSubmit:true,onSelect:()=>{}}));
  for(const label of ['Snapshot #6','01/10/2026','05/11/2026','READY','2 warnings'])assert.ok(html.includes(label),label);
  assert.equal(/MISSING_PUSH_DAY|Original warning|Scoring|Hash|Conversion|Technical|sourceHash/.test(html),false);
  assert.equal((html.match(/type="radio"/g)??[]).length,1);assert.equal(JSON.stringify(value),before);
  const readOnly=render(createElement(StoreSnapshotOptions,{items:[value],selected:null,locked:false,canSubmit:false,onSelect:()=>{}}));
  assert.equal(readOnly.includes('<input'),false);
});
test('history has five friendly columns and preserves request identity without debug columns', () => {
  const request=requestFixture('COMPLETED');const html=render(createElement(StoreAnalysisList,{items:[request],selectedId:17,onSelect:()=>{}}));
  for(const label of ['Analysis #17','Snapshot #2','Status','Created At','View Details'])assert.ok(html.includes(label),label);
  assert.equal(/Request #|Algorithms|Comparison|Requested By|requestKey|NOT_REQUESTED/.test(html),false);
});
test('simple progress uses actual backend percentage and gives terminal status precedence over missing run/legacy data', () => {
  for(const [status,percent] of [['COMPLETED',100],['FAILED',40],['RUNNING',25]] as const){
    const value=progress(status,percent),before=JSON.stringify(value);
    const html=render(createElement(MiningProgressCard,{progress:value,snapshotId:2,simple:true}));
    assert.ok(html.includes(`aria-valuenow="${percent}"`));
    assert.equal(/Waiting for a run|Completed steps|Current attempt|Stage elapsed|Current Run|Request \/ Snapshot/.test(html),false);
    assert.equal(JSON.stringify(value),before);
  }
  assert.equal(analysisStage(progress('COMPLETED',0,'LEGACY')),'Completed');
  const legacy=render(createElement(MiningProgressCard,{progress:progress('COMPLETED',0,'LEGACY'),snapshotId:2,simple:true}));
  assert.ok(legacy.includes('Completed'));assert.equal(legacy.includes('role="progressbar"'),false);
});
test('store analysis hides technical inputs while retaining legacy algorithms, counts, frozen data and rounding note', () => {
  const request={...requestFixture('COMPLETED'),conversionMode:'WHOLE_UNIT_HALF_UP' as const,roundingUnit:1};
  const runs=[{...runFixture('COMPLETED'),algorithm:'EFIM' as const},{...runFixture('COMPLETED'),runId:43,algorithm:'HUI_MINER' as const,patternCount:0}];
  const data={request,runs,runDetail:null,progress:progress('COMPLETED',100)},before=JSON.stringify(data);
  const html=render(createElement(StoreAnalysisContent,{data,selectedRunId:null,onRun:()=>{},onReadError:()=>{}}));
  for(const label of ['Analysis result','EFIM','HUI-Miner','Run #43','rounded to whole đồng','saved snapshot is unchanged'])assert.ok(html.includes(label),label);
  assert.doesNotMatch(html,/View Results|Hide Results|data-store-run-grid/);
  for(const hidden of ['Technical Details','Additional details','Request key','SPMF','WHOLE_UNIT_HALF_UP','LOSSLESS','Conversion version',request.inputHash,request.snapshotHash,request.requestKey])assert.equal(html.includes(hidden),false,hidden);
  assert.equal(JSON.stringify(data),before);
});
test('failure and rounding explanations are readable without changing source metadata or claiming success', () => {
  assert.equal(analysisRoundingNote({conversionMode:'LOSSLESS'}),'');
  assert.match(analysisRoundingNote({conversionMode:null}),/not recorded/);
  assert.match(analysisFailure('TIMED_OUT',null),/stopped/);
  assert.match(analysisFailure('OUTPUT_LIMIT','outputBytes=999999'),/more results/);
  assert.match(analysisErrorMessage(new F05ApiError(409,'Configure mining policy before execution')),/Minimum Utility.*System Admin/);
  assert.match(analysisErrorMessage(new F05ApiError(400,'Product 7 TWU exceeds SPMF int32 capacity')),/smaller sales period/);
});
test('compact pagination is absent for zero/one page and preserves page callbacks for multiple pages', () => {
  for(const totalElements of [0,1,10])assert.equal(render(createElement(AnalysisPages,{page:{items:[],page:0,pageSize:10,totalElements},label:'Snapshot',onPage:()=>{}})),'');
  assert.ok(render(createElement(AnalysisPages,{page:{items:[],page:0,pageSize:10,totalElements:11},label:'Snapshot',onPage:()=>{}})).includes('Snapshot pages'));
  const actualPage=render(createElement(AnalysisPages,{page:{items:Array(5).fill({}),page:1,pageSize:20,totalElements:25},label:'Product combination',onPage:()=>{}}));
  assert.ok(actualPage.includes('Showing 21–25 of 25 product combinations'));
});
test('F03 snapshot presentation can hide technical dumps without changing saved matrix/configuration/warnings', () => {
  const value=matrix(),before=JSON.stringify(value);
  const html=render(createElement(Matrix,{result:value,loadPage:()=>{},busy:false,technical:false}));
  assert.equal(/Technical Details|<pre|Algorithm Item ID/.test(html),false);assert.ok(html.includes('11.54074'));assert.equal(JSON.stringify(value),before);
  const config=render(createElement(FrozenConfiguration,{configuration:value.configuration,technical:false}));assert.equal(config.includes('Technical Details'),false);
  const warnings=render(createElement(SnapshotWarnings,{snapshot:{...snapshot(),warnings:['MISSING_PUSH_DAY','MISSING_PUSH_DAY']},originals:false}));assert.ok(warnings.includes('Repeated 2 times'));assert.equal(warnings.includes('<pre'),false);
});

test('Merchandiser recommendation details hide source diagnostics while retaining availability and immutable frozen evidence', () => {
  const item=recommendation(),before=JSON.stringify(item);
  const html=render(createElement(F06RecommendationDetailContent,{item,technical:false}));
  assert.equal(/Technical stock reference|<pre/.test(html),false);
  assert.doesNotMatch(html,/Technical source references|Input hash|Matrix hash|SPMF threshold|Library version/);
  assert.match(html,/<details[^>]*><summary[^>]*>More Details/);
  for(const label of ['Why this recommendation?','Current Availability','Availability when created','Review History','Historical utility'])assert.ok(html.includes(label),label);
  assert.equal(JSON.stringify(item),before);
});
