import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { authService } from '../../services/authService';
import { f04Scope } from './f04.session';
import { ImportWorkflow } from './f04.import';

export const useF04Scope = () => useSyncExternalStore(authService.subscribe, f04Scope, f04Scope);

export function useImportWorkflow(batchId?: number) {
  const scope = useF04Scope();
  const workflow = useMemo(() => new ImportWorkflow(batchId), [scope, batchId]);
  const state = useSyncExternalStore(workflow.subscribe, workflow.getSnapshot, workflow.getSnapshot);
  useEffect(workflow.connect, [workflow]);
  return { ...state, workflow };
}
