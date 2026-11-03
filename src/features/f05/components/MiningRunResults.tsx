import { useState } from 'react';
import { miningButton } from '../f05.display';
import type { RequestView, RunView } from '../f05.types';
import { MiningBenchmarkView } from './MiningBenchmarkView';
import { MiningPatternsView } from './MiningPatternsView';

interface Props { request: RequestView; runs: RunView[]; run: RunView; onReadError: (error: unknown) => void; }

export function MiningRunResults({ request, runs, run, onReadError }: Props) {
  const [panel, setPanel] = useState<'patterns' | 'benchmark' | null>(null);
  return <div className="mt-5 border-t border-[#CADACF] pt-4">
    <div className="flex flex-wrap gap-2">
      <button type="button" aria-expanded={panel === 'patterns'} className={miningButton} onClick={() => setPanel(panel === 'patterns' ? null : 'patterns')}>{panel === 'patterns' ? 'Hide patterns' : 'Show patterns'}</button>
      <button type="button" aria-expanded={panel === 'benchmark'} className={miningButton} onClick={() => setPanel(panel === 'benchmark' ? null : 'benchmark')}>{panel === 'benchmark' ? 'Hide benchmark' : 'Show benchmark'}</button>
    </div>
    {panel === 'patterns' && <MiningPatternsView key={run.runId} run={run} onReadError={onReadError} />}
    {panel === 'benchmark' && <MiningBenchmarkView key={request.requestId} request={request} runs={runs} selectedRun={run} onReadError={onReadError} />}
  </div>;
}
