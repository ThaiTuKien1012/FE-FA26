import type { AuthUser } from '../src/services/authService';
import type { BenchmarkView, ManualMiningRequest, MiningConfiguration, RequestView, RunView, SnapshotView, MiningProgressView } from '../src/features/f05/f05.types';
import { COLD_RUN_POLICY, HEAP_METHOD, WALL_TIME_METHOD } from '../src/features/f05/f05.results';

export const user:AuthUser={id:'f05-test',name:'Test User',email:'test@example.invalid',role:'System Admin',avatarText:'TU',department:'Test',defaultScreen:'overview',allowedScreens:['f05-mining']};
export const payload:ManualMiningRequest={storeId:1,snapshotId:2,requestKey:'009f3ef1-d4ba-4291-9854-b74c6878d26b',};
export const configuration:MiningConfiguration={version:1,algorithm:'EFIM',minUtilMode:'PERCENTAGE',minUtilValue:0.5,changedBy:1,changedAt:'2026-11-03T00:00:00Z'};
export function snapshot(storeId=1):SnapshotView {
  return {snapshotId:2,storeId,createdBy:1,rangeStart:'2026-09-01',rangeEnd:'2026-09-30',asOfDate:'2026-10-27',
    configuration:{config:{enableStock:true,enableExpiry:true,enableSeason:true,alpha:1,beta:1,gamma:1,lambda:0.1,expiryWindowDays:null,version:1,scoringVersion:'v1.2'},
      lambdaPolicy:{lambdaMin:0,lambdaMax:0.5,version:1},effectiveCoefficients:{alpha:1,beta:1,gamma:1},analysisDate:'2026-10-27',source:'F04_DATABASE_V1',utilityScale:6,roundingMode:'HALF_UP',itemMapping:'PRODUCT_ID',timeZone:'Asia/Ho_Chi_Minh'},
    sourceHash:'source',matrixHash:'matrix',totalWeightedUtility:48.123456,roundingScale:6,status:'READY',createdAt:'2026-10-27T00:00:00Z',warnings:[]};
}
export function requestFixture(status:RequestView['status']='PENDING',storeId=1):RequestView {
  return {requestId:17,storeId,requestedBy:1,requestKey:payload.requestKey,snapshotId:2,algorithms:['HUI_MINER','EFIM'],
    minUtilMode:'PERCENTAGE',minUtilValue:0.5,minUtilSpmf:1,effectiveMinUtility:0.5,status,
    comparisonStatus:status==='COMPLETED'?'MATCH':'PENDING',snapshotHash:'matrix',inputHash:'input',conversionVersion:'v1',utilityScale:6,
    roundingMode:'HALF_UP',divisor:1,totalScaledUtility:100,transactionCount:2,distinctItems:3,inputBytes:30,snapshot:snapshot(storeId),createdAt:'2026-11-03T00:00:00Z'};
}
export function runFixture(status:RunView['status']='PENDING',storeId=1):RunView {
  return {runId:42,requestId:17,storeId,snapshotId:2,algorithm:'HUI_MINER',attemptNo:1,libraryVersion:'SPMF_2.67a',status,minUtilSpmf:1,
    inputHash:'input',conversionVersion:'v1',startedAt:null,completedAt:null,runtimeMillis:null,memoryMiB:null,
    memoryMethod:HEAP_METHOD,runtimeMethod:WALL_TIME_METHOD,environment:null,patternCount:null,failureCode:null,failureMessage:null};
}
export function benchmarkFixture(algorithm:RunView['algorithm']='HUI_MINER'):BenchmarkView {
  return {run:{...runFixture('COMPLETED'),algorithm,runId:algorithm==='HUI_MINER'?42:43,runtimeMillis:0,memoryMiB:12.5,patternCount:0,environment:'test environment'},
    snapshotHash:'matrix',transactionCount:2,distinctItems:3,inputBytes:30,divisor:1,utilityScale:6,effectiveMinUtility:0.5,comparisonStatus:'MATCH',repetitionPolicy:COLD_RUN_POLICY};
}

/** New-write fixtures are separate from historical HUI-Miner/comparison reads. */
export function efimRequestFixture(status:RequestView['status']='PENDING',storeId=1):RequestView {return {...requestFixture(status,storeId),algorithms:['EFIM'],comparisonStatus:'NOT_REQUESTED'};}
export function progressFixture(status:RequestView['status']='PENDING',storeId=1):MiningProgressView {return {requestId:17,storeId,status,stage:status==='PENDING'?'QUEUED':status,stageStartedAt:status==='PENDING'?null:'2026-11-18T00:00:00Z',currentRunId:status==='PENDING'?null:42,algorithm:status==='PENDING'?null:'EFIM',attemptNo:status==='PENDING'?0:1,completedSteps:status==='COMPLETED'?2:0,totalSteps:2,percent:status==='COMPLETED'?100:0,elapsedMs:status==='PENDING'?null:1000,timeoutMs:status==='RUNNING'?60000:null,comparisonStatus:'NOT_REQUESTED'};}

export function conversionRequestFixture(mode: 'LOSSLESS' | 'WHOLE_UNIT_HALF_UP', status: RequestView['status'] = 'COMPLETED', storeId = 1): RequestView {
  const whole = mode === 'WHOLE_UNIT_HALF_UP';
  return { ...efimRequestFixture(status, storeId), conversionMode: mode, roundingUnit: whole ? 1 : null,
    conversionVersion: whole ? 'F03_WHOLE_UNIT_HALF_UP_INT32_DENSE_V1' : 'F03_SCALE6_GCD_INT32_DENSE_V1',
    utilityScale: whole ? 0 : 6, divisor: 1, totalScaledUtility: whole ? 48 : 48_123_456,
    minUtilSpmf: whole ? 1 : 240_618, effectiveMinUtility: whole ? 1 : 0.240618 };
}
export function conversionRunFixture(mode: 'LOSSLESS' | 'WHOLE_UNIT_HALF_UP', status: RunView['status'] = 'COMPLETED', storeId = 1): RunView {
  const request = conversionRequestFixture(mode, 'COMPLETED', storeId);
  return { ...runFixture(status, storeId), algorithm: 'EFIM', conversionVersion: request.conversionVersion,
    conversionMode: request.conversionMode, roundingUnit: request.roundingUnit, minUtilSpmf: request.minUtilSpmf,
    patternCount: status === 'COMPLETED' ? 0 : null };
}
