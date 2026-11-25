import { useSyncExternalStore } from 'react';
import { getPathForScreen } from '../../utils/navigationRouter';
import { parseMiningId } from '../f05/f05.numbers';

export function readRecommendationLocation(search: string) {
  const query = new URLSearchParams(search);
  try {
    if (query.getAll('miningRunId').length > 1) throw new Error('Choose one analysis at a time.');
    return { runId: query.has('miningRunId') ? parseMiningId(query.get('miningRunId')!) : null, error: '' };
  } catch {
    return { runId: null, error: 'This analysis link is invalid. Choose a completed analysis to continue.' };
  }
}
export function recommendationPath(runId: number | null) {
  return getPathForScreen('f06-recommendations') + (runId === null ? '' : '?miningRunId=' + parseMiningId(String(runId)));
}
export function openRunRecommendations(runId: number | null) {
  const path = recommendationPath(runId);
  if (window.location.pathname + window.location.search !== path) window.history.pushState({ screen: 'f06-recommendations' }, '', path);
  window.dispatchEvent(new Event('popstate'));
}
const subscribe = (listener: () => void) => { window.addEventListener('popstate', listener); return () => window.removeEventListener('popstate', listener); };
const snapshot = () => window.location.search;
export function useRecommendationLocation() {
  return readRecommendationLocation(useSyncExternalStore(subscribe, snapshot, () => ''));
}

/** Only the existing F06 route can be recovered; never accept an arbitrary redirect. */
export function recommendationReturnPath(search: string): string | null {
  const target = new URLSearchParams(search).get('returnTo');
  if (!target) return null;
  try {
    const url = new URL(target, 'https://paspm.invalid');
    if (url.origin !== 'https://paspm.invalid' || url.pathname !== getPathForScreen('f06-recommendations')) return null;
    return url.pathname + url.search;
  } catch { return null; }
}
