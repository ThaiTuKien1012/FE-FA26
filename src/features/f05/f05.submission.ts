import { f05Api, validateCreateRequest } from './f05.api';
import { parseSafeMiningJson } from './f05.numbers';
import type { CreateRequest, RequestView } from './f05.types';

function storageKey(userId: string): string {
  return `paspm:f05:pending:${encodeURIComponent(userId)}`;
}

export function readPendingSubmission(userId: string): CreateRequest | null {
  const saved = sessionStorage.getItem(storageKey(userId));
  if (saved === null) return null;
  const payload = parseSafeMiningJson(saved) as CreateRequest;
  if (!payload || typeof payload !== 'object') throw new Error('The saved submission is invalid.');
  validateCreateRequest(payload);
  return payload;
}

export function clearPendingSubmission(userId: string): void {
  sessionStorage.removeItem(storageKey(userId));
}

// Keep a single POST per user even if the workspace unmounts and is reopened.
// A retry while that POST is in flight joins its promise instead of sending again.
const activeSubmissions = new Map<string, { body: string; promise: Promise<RequestView> }>();

export function sendSubmission(userId: string, payload: CreateRequest): Promise<RequestView> {
  validateCreateRequest(payload);
  const { requestKey, snapshotId, algorithms, minUtilMode, minUtilValue } = payload;
  const body = JSON.stringify({ requestKey, snapshotId, algorithms, minUtilMode, minUtilValue });
  const active = activeSubmissions.get(userId);
  if (active) {
    if (active.body !== body) throw new Error('Another mining submission is still in progress. Retry its saved payload before starting a different submission.');
    return active.promise;
  }
  // Persist before sending. If storage is unavailable, do not risk an unrecorded POST.
  try {
    sessionStorage.setItem(storageKey(userId), body);
  } catch {
    throw new Error('The pending submission could not be saved for safe retries. No mining request was sent. Enable session storage and retry the same submission.');
  }
  const promise = f05Api.createRequest(payload).finally(() => activeSubmissions.delete(userId));
  activeSubmissions.set(userId, { body, promise });
  // The view clears storage only after it has received and displayed the receipt.
  // If it unmounts, the saved payload remains available for an idempotent retry.
  return promise;
}
