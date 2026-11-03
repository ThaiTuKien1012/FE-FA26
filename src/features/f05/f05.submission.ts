import { authService } from '../../services/authService';
import { F05ApiError, requireMiningRole } from './f05.http';
import { f05SystemApi, validateManualRequest } from './f05.system.api';
import { parseSafeMiningJson } from './f05.numbers';
import type { ManualMiningRequest, RequestView } from './f05.types';

// New namespace: retired Store-submission drafts are never read or replayed.
function storageKey(userId: string): string { return `paspm:f05:system:v2:pending:${encodeURIComponent(userId)}`; }
function serialize(payload: ManualMiningRequest): string {
  const {storeId,snapshotId,requestKey,compareAlgorithms}=payload;
  return JSON.stringify({storeId,snapshotId,requestKey,compareAlgorithms});
}
export function readPendingSubmission(userId: string): ManualMiningRequest | null {
  const saved=sessionStorage.getItem(storageKey(userId));
  if (saved===null) return null;
  const payload=parseSafeMiningJson(saved) as ManualMiningRequest;
  validateManualRequest(payload);
  if (Object.keys(payload).sort().join(',')!=='compareAlgorithms,requestKey,snapshotId,storeId') {
    throw new Error('The saved submission uses an unsupported contract. It was not retried.');
  }
  return payload;
}
const activeSubmissions=new Map<string,{body:string;promise:Promise<RequestView>}>();
export function clearPendingSubmission(userId: string): void {
  if (activeSubmissions.has(userId)) throw new Error('Wait for the current submission before clearing its saved key.');
  sessionStorage.removeItem(storageKey(userId));
}
export function sendSubmission(userId: string,payload: ManualMiningRequest): Promise<RequestView> {
  requireMiningRole(true);
  if (authService.getCurrentUser()?.id!==userId) throw new F05ApiError(401,'The submission belongs to another session.');
  validateManualRequest(payload);
  const body=serialize(payload);
  const active=activeSubmissions.get(userId);
  if (active) {
    if (active.body!==body) throw new Error('Another submission is in progress. Do not reuse its key or submit a different payload concurrently.');
    return active.promise;
  }
  try {
    const previous=readPendingSubmission(userId);
    if (previous && serialize(previous)!==body) throw new Error('Resolve or explicitly discard the saved attempt before creating a different submission.');
    sessionStorage.setItem(storageKey(userId),body);
  } catch (e) {
    throw new Error(`${e instanceof Error ? e.message : 'Session storage is unavailable.'} No new request was sent.`);
  }
  const promise=f05SystemApi.createRequest(payload).finally(()=>activeSubmissions.delete(userId));
  activeSubmissions.set(userId,{body,promise});
  return promise;
}
