import { F05ApiError } from './f05.api';
import type { MiningConversionMetadata, MiningProgressView } from './f05.types';

export function analysisStage(progress: MiningProgressView): string {
  if (progress.status === 'COMPLETED') return 'Completed';
  if (progress.status === 'FAILED') return 'Failed';
  if (progress.status === 'PENDING' || progress.stage === 'QUEUED') return 'Waiting';
  return progress.stage === 'SAVING' ? 'Saving Results' : 'Analyzing';
}

export function analysisRoundingNote(value: MiningConversionMetadata): string {
  return value.conversionMode === 'WHOLE_UNIT_HALF_UP'
    ? 'Values used for this analysis were rounded to whole đồng. The saved snapshot is unchanged.'
    : value.conversionMode === null ? 'Input rounding information was not recorded for this historical analysis. Its saved results are shown unchanged.' : '';
}

export function friendlyAnalysisText(value: string): string {
  return value.replaceAll('MISSING_PUSH_DAY', 'Some batches have no Push Day. Ask Store Admin to review Inventory Batches.')
    .replaceAll('SLOW_MOVING_NO_RECENT_SALES', 'No recent sales were recorded for some products.')
    .replaceAll('SLOW_MOVING', 'Some products have slow sales.')
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, '(saved reference)')
    .replace(/\b[0-9a-f]{32,}\b/gi, '(saved reference)')
    .replace(/\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+\b/g, text => text.toLowerCase().replaceAll('_', ' '));
}

export function analysisErrorMessage(error: unknown): string {
  const text = error instanceof Error ? error.message : 'The analysis could not be completed.';
  if (/configure mining policy|not configured/i.test(text)) return 'Minimum Utility has not been configured. Contact a System Admin to set it before running an analysis.';
  if (/lambda policy changed|snapshot exceeds.*lambda/i.test(text)) return 'This snapshot no longer meets the current priority settings. Create a new snapshot in Utility Planner.';
  if (/int32|TWU|numeric.*limit|capacity|too many.*(?:items|transactions)/i.test(text)) return 'This snapshot exceeds the analysis size or numeric limits. Use a smaller sales period and create a new snapshot.';
  if (/cannot be used safely for navigation/.test(text)) return text;
  if (/unsafe|precision|conversion metadata|unreadable|malformed/i.test(text)) return 'The response could not be read safely. No scores were changed. Refresh manually or contact System Admin.';
  if (/outputBytes|exception|stack trace|java|inputHash|snapshotHash|divisor|SPMF/i.test(text)) return 'The analysis service could not process this data. Ask System Admin to check it before retrying manually.';
  if (error instanceof F05ApiError) {
    if (error.status === null) return 'Could not reach the analysis service or read its response. Check your connection, then refresh manually.';
    if (error.status === 401) return 'Your session has ended. Please sign in again.';
    if (error.status === 403) return 'Your account cannot access this analysis. Check your role and store.';
    if (error.status === 404) return 'This snapshot or analysis is unavailable in your store. Refresh the list.';
    if (error.status === 503) return 'The analysis service is unavailable. Ask System Admin to check it, then retry manually.';
    if (error.status === 409 && /key|payload/i.test(text)) return 'The saved submission conflicts with other inputs. Check Analysis History before discarding it.';
  }
  return friendlyAnalysisText(text.split('\n')[0]);
}

export function analysisFailure(code: string | null, message: string | null): string {
  const combined = `${code ?? ''} ${message ?? ''}`;
  if (/TIMED_OUT|TIMEOUT/i.test(combined)) return 'The analysis took too long and was stopped. Ask System Admin to review the selected data and settings.';
  if (/MEMORY|HEAP|OUT_OF_MEMORY/i.test(combined)) return 'The analysis exceeded the available memory and was stopped. Use a smaller sales period or ask System Admin for help.';
  if (/OUTPUT_LIMIT/i.test(combined)) return 'The analysis found more results than the service can save. Ask System Admin to review the analysis settings.';
  if (/SPMF|JAVA|PROCESS|RUNTIME|ENVIRONMENT/i.test(combined)) return 'The analysis service could not finish this run. Ask System Admin to check the service, then retry manually.';
  return message ? friendlyAnalysisText(message.split('\n')[0]) : 'This analysis failed. Refresh Details or contact System Admin for help.';
}
