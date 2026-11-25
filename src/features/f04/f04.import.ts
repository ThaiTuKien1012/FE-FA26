import { importFormat, validateImportFile, type ImportFormat } from './f04.files';
import { authService } from '../../services/authService';
import { F04ApiError, f04Api } from './f04.api';
import { canReadImports, f04Scope } from './f04.session';
import type { ImportProgress, ImportStatus, ImportSummary } from './f04.types';

export const importIsTerminal = (status: ImportStatus) => ['COMPLETED', 'COMPLETED_WITH_ERRORS', 'FAILED'].includes(status);
interface PendingImport { key: string; batchId: number | null; filename: string; format?: ImportFormat; }
export interface ImportState {
  format?: ImportFormat;
  phase: 'idle' | 'uploading' | 'restoring' | 'tracking' | 'uncertain' | 'result';
  progress: ImportProgress | null;
  summary: ImportSummary | null;
  filename: string;
  error: string;
  busy: boolean;
  canRetryUpload: boolean;
}
const initial = (): ImportState => ({ format: 'csv', phase: 'idle', progress: null, summary: null, filename: '', error: '', busy: false, canRetryUpload: false });

export function importRequestError(error: unknown, format: ImportFormat = 'csv'): string {
  if (!(error instanceof F04ApiError)) return 'The response could not be read. Check your connection and refresh the import status.';
  const help: Record<number, string> = {
    400: format === 'excel' ? 'Check the workbook headers, cell types and single worksheet. Use the official template; formulas and Excel dates are not supported.' : 'Check the CSV header, column order, UTF-8 encoding and file contents.',
    401: 'Sign in again or complete session recovery before continuing.',
    403: 'This import is unavailable for your role or Store.',
    404: 'This batch is unavailable for your Store. Check Import History.',
    409: 'This upload conflicts with an earlier request. Check Import History before starting another import.',
    413: 'Choose a file no larger than 5 MiB.'
  };
  return error.status === null ? 'The server response could not be received. Check your connection.'
    : `HTTP ${error.status} · ${help[error.status] || 'The service could not return the import status. Try refreshing.'}${format === 'excel' && error.status === 400 ? ' ' + error.message : ''}`;
}

/** One mounted observer; jobs belong to the server. Timers start only after GET settles. */
export class ImportWorkflow {
  private state = initial();
  private listeners = new Set<() => void>();
  private scope = f04Scope();
  private storageKey = `paspm:f04:pending:${this.scope}`;
  private pending: PendingImport | null = null;
  private file: File | null = null;
  private controller: AbortController | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private active = false;
  private generation = 0;
  private unsubscribe: (() => void) | null = null;
  constructor(private readonly batchId?: number, private readonly format: ImportFormat = 'csv') { this.state = {...initial(),format}; }
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private update(patch: Partial<ImportState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach(listener => listener());
  }
  private current(run: number) { return this.active && run === this.generation && this.scope === f04Scope(); }
  private readPending(): PendingImport | null {
    try {
      const value = JSON.parse(sessionStorage.getItem(this.storageKey) || 'null');
      return value && typeof value.key === 'string' && /^[A-Za-z0-9._:-]{1,128}$/.test(value.key) &&
        (value.format === undefined || value.format === 'csv' || value.format === 'excel') &&
        (value.batchId === null || Number.isSafeInteger(value.batchId) && value.batchId > 0) && typeof value.filename === 'string' ? value : null;
    } catch { return null; }
  }
  private savePending() {
    if (this.batchId !== undefined || !this.pending) return;
    try { sessionStorage.setItem(this.storageKey, JSON.stringify(this.pending)); } catch { /* History remains available when tab storage is disabled. */ }
  }
  private clearPending() {
    if (this.batchId !== undefined) return;
    try {
      if (this.readPending()?.key === this.pending?.key) sessionStorage.removeItem(this.storageKey);
    } catch { /* Storage can be disabled. */ }
    this.pending = null;
  }
  connect = () => {
    this.active = true;
    this.unsubscribe = authService.subscribe(() => {
      if (f04Scope() !== this.scope) { this.disconnect(); this.state = initial(); this.listeners.forEach(listener => listener()); }
    });
    if (!canReadImports()) return () => this.disconnect();
    if (this.batchId !== undefined) {
      this.update({ phase: 'restoring', busy: true });
      void this.read(this.batchId);
    } else {
      this.pending = this.readPending();
      if (this.pending?.batchId) {
        // Do not expose cached batch metadata until authenticated GET verifies it.
        this.update({ phase: 'restoring', busy: true });
        void this.read(this.pending.batchId);
      } else if (this.pending) {
        this.update({ phase: 'uncertain', filename: this.pending.filename, format: this.pending.format ?? 'csv', error: 'An earlier upload has no confirmed response. Check Import History before starting another import.' });
      }
    }
    return () => this.disconnect();
  };
  disconnect = () => {
    this.active = false;
    this.generation++;
    this.controller?.abort();
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.unsubscribe?.();
    this.unsubscribe = null;
  };
  private signal() {
    this.controller = new AbortController();
    return AbortSignal.any([this.controller.signal, AbortSignal.timeout(30000)]);
  }
  submit = async (file: File) => {
    if (!this.active || this.scope !== f04Scope() || this.state.phase !== 'idle' || this.state.busy) return;
    const existing = this.readPending();
    if (existing) {
      this.pending = existing;
      if (existing.batchId) {
        this.update({ phase: 'restoring', busy: true });
        void this.read(existing.batchId);
        return;
      }
      this.update({ phase: 'uncertain', filename: this.pending.filename, format: this.pending.format ?? 'csv', error: 'Another import is awaiting confirmation. Check Import History before continuing.' });
      return;
    }
    const invalid = validateImportFile(file);
    if (invalid) { this.update({error:invalid}); return; }
    const format=importFormat(file.name)!;
    this.file = file;
    this.pending = { key: crypto.randomUUID(), batchId: null, filename: file.name, format };
    this.update({format});
    this.savePending();
    await this.send();
  };
  retryUpload = async () => {
    if (!this.active || this.scope !== f04Scope() || this.state.busy || !this.state.canRetryUpload || !this.file || !this.pending) return;
    await this.send(); // Exact original File object and original key; explicit action only.
  };
  private async send() {
    if (!this.file || !this.pending) return;
    const run = ++this.generation;
    this.update({ phase: 'uploading', filename: this.file.name, error: '', busy: true, canRetryUpload: false });
    try {
      if(this.pending.format==='excel') {
        const summary=await f04Api.uploadExcel(this.file,this.signal());
        if(!this.current(run))return;
        this.clearPending(); this.file=null;
        this.update({summary,progress:null,phase:'result',busy:false,error:''});
        return;
      }
      const progress = await f04Api.uploadCsvAsync(this.file, this.pending.key, this.signal());
      if (!this.current(run)) return;
      this.pending.batchId = progress.importBatchId;
      this.savePending();
      this.update({ progress, phase: 'tracking', busy: false });
      await this.accept(progress, run);
    } catch (error) {
      if (!this.current(run)) return;
      if (this.pending?.batchId) {
        this.update({ phase: 'tracking', busy: false, error: importRequestError(error, this.state.format) });
        return;
      }
      // A lost/invalid success or server failure may have already created a batch.
      const uncertain = !(error instanceof F04ApiError) || error.status === null || error.status === 409 || error.status >= 500 || error.status >= 200 && error.status < 300;
      if (!uncertain) this.clearPending();
      this.update({ phase: uncertain ? 'uncertain' : 'idle', busy: false, error: importRequestError(error, this.state.format), canRetryUpload: this.state.format !== 'excel' && uncertain && !(error instanceof F04ApiError && error.status === 409) });
    }
  }
  private async accept(progress: ImportProgress, run: number) {
    if (importIsTerminal(progress.status)) {
      this.update({ busy: true });
      const summary = await f04Api.getImport(progress.importBatchId, this.signal());
      if (!this.current(run)) return;
      if (summary.importBatchId !== progress.importBatchId || !importIsTerminal(summary.status)) throw new F04ApiError(200, 'The import result is not available yet.');
      this.clearPending();
      this.file = null;
      this.update({ summary, phase: 'result', busy: false, error: '' });
    } else {
      this.timer = setTimeout(() => { this.timer = null; void this.read(progress.importBatchId); }, 1500);
    }
  }
  private async read(id: number) {
    if (!this.active || this.scope !== f04Scope()) return;
    const run = ++this.generation;
    this.update({ busy: true, error: '' });
    try {
      if(this.format==='excel') {
        const summary=await f04Api.getImport(id,this.signal());
        if(!this.current(run))return;
        if(summary.importBatchId!==id || !importIsTerminal(summary.status)) throw new F04ApiError(200,'The saved Excel result is not available. Refresh Import History.');
        this.update({summary,phase:'result',busy:false,error:''}); return;
      }
      const progress = await f04Api.getImportProgress(id, this.signal());
      if (!this.current(run)) return;
      this.update({ progress, phase: 'tracking', filename: this.pending?.filename || '', busy: false });
      await this.accept(progress, run);
    } catch (error) {
      if (!this.current(run)) return;
      // Keep the accepted batch, stop automatic requests, and offer a manual GET.
      this.update({ busy: false, error: importRequestError(error) });
    }
  }
  refresh = () => {
    const id = this.batchId ?? this.pending?.batchId ?? this.state.progress?.importBatchId;
    if (!id || this.state.busy || this.state.phase === 'result') return;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    void this.read(id);
  };
  reset = () => {
    if (this.state.busy || this.state.phase === 'tracking' || this.state.phase === 'restoring') return;
    this.clearPending();
    this.file = null;
    this.generation++;
    this.update(initial());
  };
}
