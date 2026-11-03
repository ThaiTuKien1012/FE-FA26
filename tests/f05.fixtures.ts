import type { AuthUser } from '../src/services/authService';
import type { BenchmarkView, ManualMiningRequest, MiningConfiguration, RequestView, RunView, SnapshotView } from '../src/features/f05/f05.types';
import { COLD_RUN_POLICY, HEAP_METHOD, WALL_TIME_METHOD } from '../src/features/f05/f05.results';

export const user:AuthUser={id:'f05-test',name:'Test User',email:'test@example.invalid',role:'System Admin',avatarText:'TU',department:'Test',defaultScreen:'overview',allowedScreens:['f05-mining']};
export const payload:ManualMiningRequest={storeId:1,snapshotId:2,requestKey:'009f3ef1-d4ba-4291-9854-b74c6878d26b',compareAlgorithms:true};
export const configuration:MiningConfiguration={version:1,algorithm:'HUI_MINER',minUtilMode:'PERCENTAGE',minUtilValue:0.5,changedBy:1,changedAt:'2026-11-03T00:00:00Z'};
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
