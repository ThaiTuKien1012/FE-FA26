import assert from 'node:assert/strict';
import test from 'node:test';
import { ProductUnitCache, UNIT_MAX_PAGES, UNIT_PAGE_SIZE, uniqueUnits } from '../src/features/store/f02.units';
import type { F02Product, F02ProductPage } from '../src/features/store/store.api';

const product = (id: number, unit: string) => ({ id, unit } as F02Product);
const page = (content: F02Product[], index = 0, total = content.length): F02ProductPage => ({ content, page: index, pageSize: 100, totalElements: total, totalPages: Math.ceil(total / 100) });

test('units deduplicate case and whitespace without changing saved Product data', () => {
  const raw = ['  Hộp  lớn ', 'hộp lớn', 'BOTTLE', 'bottle', '', 'Thùng'];
  assert.deepEqual(uniqueUnits(raw), ['Hộp lớn', 'BOTTLE', 'Thùng']);
  assert.equal(raw[0], '  Hộp  lớn ');
});
test('unit history reads every page, including units beyond the current 10/100 rows', async () => {
  const reads: number[] = [], cache = new ProductUnitCache();
  const result = await cache.load('login:account:store', async params => {
    reads.push(params.page); assert.equal(params.pageSize, 100); assert.equal(params.sortBy, 'name');
    return page(Array.from({ length: params.page === 0 ? 100 : 1 }, (_, i) => product(params.page * 100 + i, params.page ? 'Thùng' : 'Bottle')), params.page, 101);
  });
  assert.deepEqual(reads, [0, 1]); assert.deepEqual(result.units, ['Bottle', 'Thùng']); assert.equal(result.complete, true);
});
test('unit loading has a fixed 20 request cap and reports incomplete coverage', async () => {
  let reads = 0;
  const result = await new ProductUnitCache().load('a', async params => { reads++; return page(Array.from({ length: 100 }, (_, i) => product(params.page * 100 + i, 'Box')), params.page, 3000); });
  assert.equal(reads, UNIT_MAX_PAGES); assert.equal(UNIT_PAGE_SIZE, 100); assert.equal(result.loaded, 2000); assert.equal(result.total, 3000); assert.equal(result.complete, false);
});
test('repeated pages stop loading and do not claim complete Store history', async () => {
  let reads = 0;
  const result = await new ProductUnitCache().load('a', async params => { reads++; return page([product(1, 'Box')], params.page, 1000); });
  assert.equal(reads, 2); assert.equal(result.complete, false); assert.equal(result.loaded, 1);
});
test('cache coalesces pending loads, expires after five minutes and remembers only saved units', async () => {
  let now = 1, reads = 0;
  const cache = new ProductUnitCache(() => now), fetch = async () => { reads++; return page([product(1, 'Box')]); };
  const [first, second] = await Promise.all([cache.load('a', fetch), cache.load('a', fetch)]);
  assert.deepEqual(first, second); assert.equal(reads, 1);
  cache.remember('a', 'Vỉ'); assert.deepEqual((await cache.load('a', fetch)).units, ['Vỉ', 'Box']); assert.equal(reads, 1);
  now += 300_001; await cache.load('a', fetch); assert.equal(reads, 2);
});
test('account, Store and new login scopes cannot reuse prior suggestions', async () => {
  const cache = new ProductUnitCache();
  await cache.load('epoch:user1:store1', async () => page([product(1, 'Private unit')]));
  for (const scope of ['epoch:user1:store2', 'epoch:user2:store2', 'new-login:user2:store2']) {
    assert.deepEqual((await cache.load(scope, async () => page([product(2, scope)]))).units, [scope]);
  }
  cache.clear(); assert.deepEqual((await cache.load('new-login:user2:store2', async () => page([]))).units, []);
});
test('late previous-session results cannot replace the new scope or request more pages', async () => {
  let release!: (value: F02ProductPage) => void, oldReads = 0;
  const cache = new ProductUnitCache();
  const old = cache.load('old', () => { oldReads++; return new Promise(done => { release = done; }); });
  await cache.load('new', async () => page([product(2, 'New unit')]));
  release(page([product(1, 'Old unit')], 0, 1000)); await old;
  assert.equal(oldReads, 1); assert.deepEqual((await cache.load('new', async () => { throw Error('Should be cached'); })).units, ['New unit']);
});
test('failed page retains known units, reports partial history and retries explicitly', async () => {
  const cache = new ProductUnitCache(); let reads = 0;
  const result = await cache.load('a', async params => { reads++; if (params.page) throw Error('offline'); return page([product(1, 'Box')], 0, 101); });
  assert.equal(result.failed, true); assert.equal(result.complete, false); assert.deepEqual(result.units, ['Box']);
  await cache.load('a', async () => { throw Error('Cached error must prevent hammering'); }); assert.equal(reads, 2);
  const retry = await cache.load('a', async () => page([product(1, 'Box'), product(2, 'Crate')]), true);
  assert.equal(retry.failed, false); assert.equal(retry.complete, true); assert.deepEqual(retry.units, ['Box', 'Crate']);
});
