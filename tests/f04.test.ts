import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { validateImportFile } from '../src/features/f04/f04.files';
import assert from 'node:assert/strict';
import { test, type TestContext } from 'node:test';
import { authService, type AuthUser } from '../src/services/authService';
import { F04ApiError, f04Api } from '../src/features/f04/f04.api';
import { ImportWorkflow } from '../src/features/f04/f04.import';
import { f04Scope } from '../src/features/f04/f04.session';
import { user } from './f05.fixtures';
import { progress, summary } from './f04.fixtures';

const flush = async () => { for (let i = 0; i < 20; i++) await new Promise<void>(resolve => setImmediate(resolve)); };
class MemoryStorage {
  values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}
function setup(t: TestContext, role: AuthUser['role'] = 'Store Admin') {
  let actor: AuthUser | null = { ...user, role, storeId: 1 }, epoch = 'test-epoch';
  const listeners = new Set<() => void>();
  const storage = new MemoryStorage();
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
  Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: storage });
  t.after(() => { if (previous) Object.defineProperty(globalThis, 'sessionStorage', previous); else Reflect.deleteProperty(globalThis, 'sessionStorage'); });
  t.mock.method(authService, 'getCurrentUser', () => actor);
  t.mock.method(authService, 'getSessionId', () => epoch);
  t.mock.method(authService, 'getToken', () => 'fixture-token');
  t.mock.method(authService, 'subscribe', (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; });
  const calls: { path: string; init: RequestInit }[] = [];
  let respond = async (path: string, _init: RequestInit): Promise<Response> => Response.json(path.endsWith('/progress') ? progress() : summary());
  t.mock.method(authService, 'request', async (path: RequestInfo | URL, init: RequestInit = {}) => { calls.push({ path: String(path), init }); return respond(String(path), init); });
  const flow = (id?: number, format: 'csv' | 'excel' = 'csv') => { const workflow = new ImportWorkflow(id, format); t.after(workflow.connect()); return workflow; };
  return { calls, storage, flow, respond: (fn: typeof respond) => { respond = fn; }, change: (store = 2, session = epoch) => { actor = { ...actor!, storeId: store }; epoch = session; listeners.forEach(fn => fn()); } };
}
const file = () => new File(['source_order_id,occurred_at,sku,quantity,unit_price,unit_cost,status\n'], 'sales.csv', { type: 'text/csv' });
const status = (code: number | null) => (error: unknown) => error instanceof F04ApiError && error.status === code;

test('202 async multipart preserves the key and authenticated transport; sync API remains compatible', async t => {
  const f = setup(t);
  f.respond(async path => Response.json(path.endsWith('/async') ? progress() : summary(), { status: path.endsWith('/async') ? 202 : 201 }));
  assert.equal((await f04Api.uploadCsvAsync(file(), 'request-key')).status, 'QUEUED');
  const { init, path } = f.calls[0];
  assert.equal(path, '/api/transactions/imports/csv/async'); assert.equal(init.method, 'POST');
  assert.equal(new Headers(init.headers).get('Idempotency-Key'), 'request-key');
  assert.equal(new Headers(init.headers).get('Authorization'), 'Bearer fixture-token');
  assert.equal(new Headers(init.headers).has('Content-Type'), false);
  assert.equal((init.body as FormData).getAll('file').length, 1);
  assert.equal((await f04Api.uploadCsv(file())).acceptedOrderCount, 490);
});
test('only Store Admin uploads; Merchandiser reads progress; other actors are denied', async t => {
  const f = setup(t, 'Merchandiser');
  await assert.rejects(f04Api.uploadCsvAsync(file(), 'key'), status(403));
  await f04Api.getImportProgress(41); assert.equal(f.calls.length, 1);
  t.mock.method(authService, 'getCurrentUser', () => ({ ...user, role: 'End-Customer' }));
  await assert.rejects(f04Api.getImportProgress(41), status(403)); assert.equal(f.calls.length, 1);
});
for (const code of [400, 401, 403, 404, 409, 413]) test(`HTTP ${code} propagates without automatic POST retries`, async t => {
  const f = setup(t); f.respond(async () => Response.json({ error: 'Controlled failure' }, { status: code }));
  await assert.rejects(f04Api.uploadCsvAsync(file(), 'key'), status(code)); assert.equal(f.calls.length, 1);
});
test('queued → processing 0/50/100 → terminal summary; 100% alone does not imply completion', async t => {
  const f = setup(t); t.mock.timers.enable({ apis: ['setTimeout'] });
  let count = 0;
  f.respond(async path => Response.json(path.endsWith('/async') ? progress() : path.endsWith('/progress') ? progress({ status: ++count === 4 ? 'COMPLETED' : 'PROCESSING', stage: 'IMPORTING', progressPercent: [0, 50, 100, 100][count - 1], processedCount: [0, 500, 1000, 1000][count - 1] }) : summary(), { status: path.endsWith('/async') ? 202 : 200 }));
  const w = f.flow(); assert.equal(w.getSnapshot().phase, 'idle');
  await w.submit(file()); assert.equal(w.getSnapshot().progress?.status, 'QUEUED');
  for (const percent of [0, 50, 100]) { t.mock.timers.tick(1500); await flush(); assert.equal(w.getSnapshot().progress?.progressPercent, percent); assert.equal(w.getSnapshot().summary, null); }
  t.mock.timers.tick(1500); await flush(); assert.equal(w.getSnapshot().phase, 'result'); assert.equal(w.getSnapshot().summary?.acceptedOrderCount, 490);
  const reads = f.calls.length; t.mock.timers.tick(60000); await flush(); assert.equal(f.calls.length, reads); assert.equal(f.storage.values.size, 0);
});
for (const state of ['COMPLETED', 'COMPLETED_WITH_ERRORS', 'FAILED'] as const) test(`${state} loads actual summary and preserves row-error counters`, async t => {
  const f = setup(t); t.mock.timers.enable({ apis: ['setTimeout'] });
  f.respond(async path => Response.json(path.endsWith('/async') ? progress({ status: state, progressPercent: state === 'FAILED' ? null : 100 }) : summary({ status: state, rejectedCount: 4, conflictOrderCount: 2, errorSummary: 'Review affected rows' })));
  const w = f.flow(); await w.submit(file()); assert.equal(w.getSnapshot().summary?.status, state); assert.equal(w.getSnapshot().summary?.conflictOrderCount, 2);
  t.mock.timers.tick(90000); await flush(); assert.equal(f.calls.length, 2);
});
test('nullable percentage and exact counts survive unchanged', async t => {
  const f = setup(t); f.respond(async () => Response.json(progress({ status: 'RECEIVING', stage: 'RECEIVING', progressPercent: null, totalCount: null })));
  const w = f.flow(41); await flush(); assert.equal(w.getSnapshot().progress?.progressPercent, null); assert.equal(w.getSnapshot().progress?.totalCount, null);
});
test('duplicate clicks send once; uncertain response retries only explicitly with original bytes/key', async t => {
  const f = setup(t); let release!: (r: Response) => void;
  f.respond(() => new Promise<Response>(r => { release = r; }));
  const w = f.flow(), original = file(), pending = w.submit(original);
  await w.submit(original); assert.equal(f.calls.length, 1); assert.equal(w.getSnapshot().phase, 'uploading');
  release(new Response('invalid JSON', { status: 202 })); await pending; assert.equal(w.getSnapshot().phase, 'uncertain');
  const first = f.calls[0].init; f.respond(async () => Response.json(progress(), { status: 202 }));
  await w.retryUpload(); assert.equal(f.calls.length, 2);
  assert.equal(new Headers(f.calls[1].init.headers).get('Idempotency-Key'), new Headers(first.headers).get('Idempotency-Key'));
  assert.equal((f.calls[1].init.body as FormData).get('file'), (first.body as FormData).get('file'));
});
test('network/503 uncertainty and 409 retain pending intent; no automatic re-submission', async t => {
  const f = setup(t); t.mock.timers.enable({ apis: ['setTimeout'] });
  f.respond(async () => { throw new Error('Connection lost'); });
  const w = f.flow(); await w.submit(file()); assert.equal(w.getSnapshot().phase, 'uncertain');
  t.mock.timers.tick(90000); await flush(); assert.equal(f.calls.length, 1);
  f.respond(async () => Response.json({ error: 'Conflict' }, { status: 409 })); await w.retryUpload();
  assert.equal(w.getSnapshot().canRetryUpload, false); assert.equal(f.storage.values.size, 1);
  await w.retryUpload(); assert.equal(f.calls.length, 2);
});
test('reload verifies saved batch by GET; no POST, no token/file bytes stored', async t => {
  const f = setup(t); f.respond(async path => Response.json(path.endsWith('/async') || path.endsWith('/progress') ? progress() : summary()));
  const w = f.flow(); await w.submit(file()); w.disconnect();
  const stored = [...f.storage.values.values()].join(''); assert.ok(stored.includes('sales.csv')); assert.equal(/fixture-token|source_order_id/.test(stored), false);
  const restored = f.flow(); assert.equal(restored.getSnapshot().progress, null); assert.equal(restored.getSnapshot().filename, '');
  await flush(); assert.equal(restored.getSnapshot().progress?.importBatchId, 41); assert.equal(f.calls.at(-1)?.path, '/api/transactions/imports/41/progress');
  assert.equal(f.calls.filter(c => c.init.method === 'POST').length, 1);
});
test('unknown upload after reload blocks new intent until deliberate history acknowledgement', async t => {
  const f = setup(t); f.respond(async () => { throw new Error('lost'); });
  const w = f.flow(); await w.submit(file()); w.disconnect(); const restored = f.flow();
  assert.equal(restored.getSnapshot().phase, 'uncertain'); assert.equal(restored.getSnapshot().canRetryUpload, false);
  await restored.submit(file()); assert.equal(f.calls.length, 1); restored.reset(); assert.equal(f.storage.values.size, 0);
});
test('slow GET never overlaps; cleanup aborts it and discards late result', async t => {
  const f = setup(t); t.mock.timers.enable({ apis: ['setTimeout'] }); let release!: (r: Response) => void;
  f.respond(() => new Promise<Response>(r => { release = r; })); const w = f.flow(41);
  t.mock.timers.tick(10000); w.refresh(); assert.equal(f.calls.length, 1); w.disconnect();
  assert.equal(f.calls[0].init.signal?.aborted, true); release(Response.json(progress())); await flush(); assert.equal(w.getSnapshot().progress, null);
});
test('Store/session changes hide all data and ignore stale POSTs; normal token refresh retains scope', async t => {
  const f = setup(t); let release!: (r: Response) => void; f.respond(() => new Promise<Response>(r => { release = r; }));
  const w = f.flow(), pending = w.submit(file()); const old = f04Scope();
  t.mock.method(authService, 'getToken', () => 'rotated'); assert.equal(f04Scope(), old);
  f.change(2); release(Response.json(progress())); await pending; assert.equal(w.getSnapshot().phase, 'idle'); assert.equal(w.getSnapshot().progress, null);
  const next = f.flow(); assert.equal(next.getSnapshot().phase, 'idle'); assert.equal(f.calls.length, 1);
});
test('progress GET errors stop automatic requests and allow manual status refresh', async t => {
  const f = setup(t); t.mock.timers.enable({ apis: ['setTimeout'] }); f.respond(async () => Response.json({ error: 'Unavailable' }, { status: 404 }));
  const w = f.flow(41); await flush(); t.mock.timers.tick(90000); await flush(); assert.equal(f.calls.length, 1); assert.match(w.getSnapshot().error, /HTTP 404/);
  f.respond(async () => Response.json(progress())); w.refresh(); await flush(); assert.equal(w.getSnapshot().progress?.status, 'QUEUED');
});
test('terminal summary failure never offers or retries POST; refresh recovers summary', async t => {
  const f = setup(t); let fail = true;
  f.respond(async path => path.endsWith('/async') || path.endsWith('/progress') ? Response.json(progress({ status: 'COMPLETED', progressPercent: 100 })) : fail ? Response.json({}, { status: 503 }) : Response.json(summary()));
  const w = f.flow(); await w.submit(file()); assert.equal(w.getSnapshot().phase, 'tracking'); assert.equal(w.getSnapshot().canRetryUpload, false);
  fail = false; w.refresh(); await flush(); assert.equal(w.getSnapshot().summary?.status, 'COMPLETED'); assert.equal(f.calls.filter(c => c.init.method === 'POST').length, 1);
});
test('legacy history and errors use original pagination endpoints; legacy progress is supported', async t => {
  const f = setup(t); f.respond(async path => Response.json(path.endsWith('/progress') ? progress({ status: 'COMPLETED', stage: 'LEGACY', progressPercent: 100 }) : path.endsWith('/41') ? summary() : { content: [], page: 2, pageSize: 20, totalElements: 41 }));
  const w = f.flow(41); await flush(); assert.equal(w.getSnapshot().summary?.status, 'COMPLETED');
  await f04Api.listImports(2, 20); await f04Api.getImportErrors(41, 2, 20);
  assert.equal(f.calls.at(-1)?.path, '/api/transactions/imports/41/errors?page=2&pageSize=20'); assert.ok(f.calls.some(c => c.path === '/api/transactions/imports?page=2&pageSize=20'));
});
test('mismatched batch and invented percentages are rejected', async t => {
  const f = setup(t); f.respond(async () => Response.json(progress({ importBatchId: 999 })));
  await assert.rejects(f04Api.getImportProgress(41), status(200));
  f.respond(async () => Response.json(progress({ progressPercent: 101 })));
  await assert.rejects(f04Api.uploadCsvAsync(file(), 'key'), status(202));
});
test('an existing pending batch is verified instead of overwritten by a new submission', async t => {
  const f = setup(t), w = f.flow();
  const key = `paspm:f04:pending:${f04Scope()}`;
  f.storage.setItem(key, JSON.stringify({ key: 'earlier-request', batchId: 41, filename: 'earlier.csv' }));
  await w.submit(file()); await flush();
  assert.equal(w.getSnapshot().progress?.importBatchId, 41);
  assert.equal(f.calls.filter(call => call.init.method === 'POST').length, 0);
  assert.equal(JSON.parse(f.storage.getItem(key)!).key, 'earlier-request');
});
test('503 after submission is uncertain and does not automatically retry', async t => {
  const f = setup(t); t.mock.timers.enable({ apis: ['setTimeout'] });
  f.respond(async () => Response.json({}, { status: 503 }));
  const w = f.flow(); await w.submit(file()); assert.equal(w.getSnapshot().phase, 'uncertain'); assert.equal(w.getSnapshot().canRetryUpload, true);
  t.mock.timers.tick(90000); await flush(); assert.equal(f.calls.length, 1);
});
test('changing session during a slow read clears previous progress and cancels timers', async t => {
  const f = setup(t); t.mock.timers.enable({ apis: ['setTimeout'] });
  const w = f.flow(41); await flush(); assert.equal(w.getSnapshot().progress?.status, 'QUEUED');
  f.change(1, 'new-login'); assert.equal(w.getSnapshot().progress, null);
  t.mock.timers.tick(90000); await flush(); assert.equal(f.calls.length, 1);
});

const excelFile = (extension='xlsx') => new File([readFileSync(new URL('../public/templates/f04/transactions-template.'+extension,import.meta.url))], 'sales.'+extension, {type:extension==='xls'?'application/vnd.ms-excel':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
for(const extension of ['xlsx','xls']) test('Excel '+extension+' uploads official bytes to synchronous multipart endpoint only',async t=>{
 const f=setup(t);f.respond(async()=>Response.json(summary({filename:'sales.'+extension}),{status:201}));
 const w=f.flow();await w.submit(excelFile(extension));
 assert.equal(w.getSnapshot().phase,'result');assert.equal(w.getSnapshot().progress,null);assert.equal(w.getSnapshot().summary?.acceptedOrderCount,490);
 assert.equal(f.calls.length,1);const {path,init}=f.calls[0];assert.equal(path,'/api/transactions/imports/excel');assert.equal(init.method,'POST');
 const form=init.body as FormData;assert.deepEqual([...form.keys()],['file']);assert.equal((form.get('file') as File).name,'sales.'+extension);
 assert.equal(new Headers(init.headers).has('Content-Type'),false);assert.equal(new Headers(init.headers).has('Idempotency-Key'),false);
 assert.equal(f.storage.values.size,0);
});
for(const role of ['Merchandiser','System Admin','End-Customer'] as const)test(role+' cannot upload Excel',async t=>{
 const f=setup(t,role);await assert.rejects(f04Api.uploadExcel(excelFile()),status(403));assert.equal(f.calls.length,0);
});
for(const code of [400,401,403,413])test('Excel HTTP '+code+' is definite rejection without retry/polling',async t=>{
 const f=setup(t);f.respond(async()=>Response.json({error:'Workbook contains unsupported formulas'},{status:code}));const w=f.flow();await w.submit(excelFile());
 assert.equal(w.getSnapshot().phase,'idle');assert.equal(w.getSnapshot().canRetryUpload,false);assert.match(w.getSnapshot().error,new RegExp('HTTP '+code));
 if(code===400){assert.match(w.getSnapshot().error,/workbook/i);assert.match(w.getSnapshot().error,/formulas/);}
 assert.equal(f.calls.length,1);assert.equal(f.storage.values.size,0);
});
for(const failure of ['network','server','unreadable','invalid-summary'])test('Excel '+failure+' remains uncertain across reload, without resubmit',async t=>{
 const f=setup(t);t.mock.timers.enable({apis:['setTimeout']});f.respond(async()=>{
  if(failure==='network')throw new TypeError('Failed to fetch');
  return failure==='server'?Response.json({error:'Unavailable'},{status:503}):failure==='unreadable'?new Response('unreadable',{status:201}):Response.json({importBatchId:1},{status:201});
 });
 const w=f.flow();await w.submit(excelFile());assert.equal(w.getSnapshot().phase,'uncertain');assert.equal(w.getSnapshot().canRetryUpload,false);
 await w.retryUpload();t.mock.timers.tick(60000);await flush();assert.equal(f.calls.length,1);
 w.disconnect();const restored=f.flow();assert.equal(restored.getSnapshot().format,'excel');assert.equal(restored.getSnapshot().filename,'sales.xlsx');
 assert.equal(restored.getSnapshot().phase,'uncertain');await restored.retryUpload();await restored.submit(excelFile());assert.equal(f.calls.length,1);
});
test('Excel duplicate-submit guard, mixed counters/errors and cross-format duplicate/conflict results remain authoritative',async t=>{
 const f=setup(t);let release!:(r:Response)=>void;f.respond(()=>new Promise(resolve=>release=resolve));const w=f.flow();const pending=w.submit(excelFile());
 await w.submit(excelFile());assert.equal(f.calls.length,1);assert.equal(w.getSnapshot().phase,'uploading');assert.equal(w.getSnapshot().progress,null);
 const mixed=summary({filename:'sales.xlsx',status:'COMPLETED_WITH_ERRORS',acceptedOrderCount:1,duplicateOrderCount:2,rejectedOrderCount:1,conflictOrderCount:1,rejectedCount:2});
 release(Response.json(mixed,{status:201}));await pending;assert.deepEqual(w.getSnapshot().summary,mixed);
 f.respond(async path=>path.endsWith('/errors?page=0&pageSize=100')?Response.json({content:[{rowNumber:2,sourceOrderId:'existing-csv-order',status:'CONFLICT',errorDetails:'Different contents'}],page:0,pageSize:100,totalElements:1}):Response.json(summary({filename:'sales.xls',acceptedOrderCount:0,duplicateOrderCount:490}),{status:201}));
 assert.equal((await f04Api.getImportErrors(41)).content[0].status,'CONFLICT');w.reset();await w.submit(excelFile('xls'));assert.equal(w.getSnapshot().summary?.acceptedOrderCount,0);assert.equal(w.getSnapshot().summary?.duplicateOrderCount,490);
});
test('Excel History reads summary directly, with no progress polling',async t=>{
 const f=setup(t);const w=f.flow(41,'excel');await flush();assert.equal(w.getSnapshot().phase,'result');assert.deepEqual(f.calls.map(c=>c.path),['/api/transactions/imports/41']);
});
test('Late Excel response after Store switch cannot populate the new Store',async t=>{
 const f=setup(t);let release!:(r:Response)=>void;f.respond(()=>new Promise(resolve=>release=resolve));const w=f.flow();const pending=w.submit(excelFile());f.change(2);release(Response.json(summary(),{status:201}));await pending;
 assert.equal(w.getSnapshot().summary,null);assert.equal(w.getSnapshot().phase,'idle');assert.equal(f.calls.length,1);
});
test('File validation and byte-identical official templates match Backend dev 6d2a877',()=>{
 for(const [extension,hash] of [['xlsx','ce11f5a2716766d36b0e84b5963afee95c77dd4c9dc2961fd925dda5f6280747'],['xls','49e0525b00bc2c41e4db218aa966afc7a312e41635f4989139f8adcd2b6e38fa']]){
  const bytes=readFileSync(new URL('../public/templates/f04/transactions-template.'+extension,import.meta.url));assert.equal(createHash('sha256').update(bytes).digest('hex'),hash);assert.equal(validateImportFile(excelFile(extension)),null);
 }
 assert.match(validateImportFile(new File(['data'],'bad.xlsm'))!,/CSV.*Excel/);assert.match(validateImportFile(new File([],'empty.xlsx'))!,/empty/);
 assert.match(validateImportFile(new File([new Uint8Array(5*1024*1024+1)],'large.xlsx'))!,/5 MiB/);
});

test('Unauthenticated Excel upload returns 401 without sending bytes',async t=>{
 const f=setup(t);t.mock.method(authService,'getCurrentUser',()=>null);await assert.rejects(f04Api.uploadExcel(excelFile()),status(401));assert.equal(f.calls.length,0);
});
