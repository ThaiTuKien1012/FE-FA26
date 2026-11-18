import { authService } from '../../services/authService';
import { F05ApiError, miningId } from './f05.http';
import { f05Api } from './f05.api';
import { validateRequestKey } from './f05.http';
import { parseSafeMiningJson } from './f05.numbers';
import type { StoreMiningRequest, RequestView } from './f05.types';
export type MiningSubmission = StoreMiningRequest;
// New EFIM namespace never reads or replays old comparison/algorithm drafts.
function owner(userId: string) {
  const user=authService.getCurrentUser();
  if (!user || user.id!==userId || !authService.getToken()) throw new F05ApiError(401,'This submission belongs to another session.');
  if (user.role!=='Merchandiser') throw new F05ApiError(403,'Only Merchandisers can run analysis through this Frontend.');
  return user;
}
function namespace(userId: string) { const user=owner(userId);return 'paspm:f05:efim:v3:'+encodeURIComponent(user.role)+':'+encodeURIComponent(userId); }
function target(userId: string, storeId?: number): number | null {
  const user=owner(userId);
  if(storeId!==undefined&&storeId!==user.storeId)throw new F05ApiError(403,'The submission belongs to another Store.');
  return miningId(user.storeId!,true);
}
function key(userId:string,storeId:number) {return namespace(userId)+':store:'+storeId;}
function validate(userId:string,payload:MiningSubmission) {
  const user=owner(userId);
  validateRequestKey(payload?.requestKey);miningId(payload?.snapshotId,true);
  if(Object.keys(payload).sort().join(',')!=='requestKey,snapshotId') throw new F05ApiError(400,'The saved request uses an unsupported contract. No request was sent.');
  return miningId(user.storeId!,true);
}
function serialize(payload:MiningSubmission) {return JSON.stringify({requestKey:payload.requestKey,snapshotId:payload.snapshotId});}
export function readPendingSubmission(userId:string,storeId?:number):MiningSubmission|null {
  if(authService.getCurrentUser()?.role!=='Merchandiser')return null;
  const store=target(userId,storeId);if(store===null)return null;
  const saved=sessionStorage.getItem(key(userId,store));if(saved===null)return null;
  const payload=parseSafeMiningJson(saved) as MiningSubmission;
  if(validate(userId,payload)!==store)throw new Error('The saved attempt belongs to another Store. It was not replayed.');
  return payload;
}
const active=new Map<string,{body:string;promise:Promise<RequestView>}>();
export function clearPendingSubmission(userId:string,storeId?:number):void {
  const store=target(userId,storeId);
  if(store===null)return;
  const storageKey=key(userId,store);if(active.has(storageKey))throw new Error('Wait for the current submission before clearing its saved key.');
  sessionStorage.removeItem(storageKey);
  if(sessionStorage.getItem(namespace(userId)+':store')===String(store))sessionStorage.removeItem(namespace(userId)+':store');
}
export function sendSubmission(userId:string,payload:MiningSubmission):Promise<RequestView> {
  const store=validate(userId,payload), storageKey=key(userId,store), body=serialize(payload), current=[...active.entries()].find(([k])=>k.startsWith(namespace(userId)+':store:'))?.[1];
  if(current){if(current.body!==body)throw new Error('Another submission is in progress. Keep its original key and payload.');return current.promise;}
  try {
    const previous=readPendingSubmission(userId);
    if(previous&&serialize(previous)!==body)throw new Error('Resolve or explicitly discard the saved attempt before creating a different submission.');
    sessionStorage.setItem(storageKey,body);sessionStorage.setItem(namespace(userId)+':store',String(store));
  } catch(e) {throw new Error((e instanceof Error?e.message:'Session storage is unavailable.')+' No new request was sent.');}
  const promise=f05Api.createRequest(payload).finally(()=>active.delete(storageKey));
  active.set(storageKey,{body,promise});return promise;
}
