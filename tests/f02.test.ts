import assert from 'node:assert/strict';
import { test, type TestContext } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ProductFields } from '../src/features/store/components/ProductInventoryView';
import { GeneratedCodeField } from '../src/features/store/components/GeneratedCodeField';
import { authService, ROLE_PERMISSIONS, type AuthUser } from '../src/services/authService';
import { canManageCatalog, F02ApiError, f02ErrorMessage, needsProductNameConfirmation, storeApi, type F02Batch, type F02BatchPatchRequest, type F02Product, type F02Status } from '../src/features/store/store.api';
import { batchCreateRequest, batchPatchRequest, categoryRequest, emptyBatchForm, emptyProductForm, localDateTime, money, productRequest, storeDate, validatePushDay } from '../src/features/store/f02.forms';
import { user } from './f05.fixtures';
import { loadProductStats } from '../src/features/store/f02.product-stats';

test('Store product statistics use three unfiltered pageSize=1 queries and Backend totals, not page contents', async t => {
  const f = setup(t);
  t.mock.method(authService, 'request', async (path: string) => {
    f.calls.push({ path, init: {}, body: undefined });
    const query = new URL(path, 'http://fixture.invalid').searchParams;
    assert.equal(query.get('page'), '0'); assert.equal(query.get('pageSize'), '1');
    assert.deepEqual([...query.keys()].sort(), query.has('status') ? ['page', 'pageSize', 'status'] : ['page', 'pageSize']);
    return Response.json({ content: [product], totalElements: query.get('status') === 'ACTIVE' ? 240 : query.get('status') === 'INACTIVE' ? 120 : 360 });
  });
  const stats = await loadProductStats();
  assert.deepEqual(stats, { total: 360, active: 240, inactive: 120 });
  assert.equal(stats.active + stats.inactive, stats.total); assert.equal(f.calls.length, 3);
});

test('Empty Store counts are real zero; failed or malformed totals never become zero', async t => {
  const f = setup(t);
  f.respond(async () => Response.json({ content: [], totalElements: 0 }));
  assert.deepEqual(await loadProductStats(), { total: 0, active: 0, inactive: 0 });
  f.respond(async () => Response.json({ error: 'Unavailable' }, { status: 503 }));
  await assert.rejects(loadProductStats(), /Unavailable/);
  for (const totalElements of [undefined, null, -1, 1.5, '360', Number.MAX_SAFE_INTEGER + 1]) {
    f.respond(async () => Response.json({ totalElements }));
    await assert.rejects(loadProductStats(), /totals are unavailable/);
  }
});

const categories = [{ id: 1, name: 'Dairy', status: 'ACTIVE' as const }, { id: 2, name: 'Archived', status: 'INACTIVE' as const }];
const product: F02Product = { id: 4, sku: 'SKU-MILK-000001', name: 'Milk', unit: 'Bottle', requiresExpiry: true, category: categories[0], sellingPrice: 12.75, costPrice: 15.25, status: 'ACTIVE', stockQuantity: 100 };
const productForm = () => ({ ...emptyProductForm, name: ' Milk ', unit: ' Bottle ', categoryId: '1', sellingPrice: '12.75', costPrice: '15.25' });
const batch: F02Batch = { id: 9, productId: 4, batchCode: 'B-1', receivedAt: '2026-11-17T02:00:00Z', expiryDate: '2026-12-15', initialQuantity: 100, remainingQuantity: 80, pushDay: '2026-12-10', status: 'ACTIVE', effectiveStatus: 'ACTIVE', daysToExpiry: 10, warnings: [], createdAt: '2026-11-17T02:00:00Z', updatedAt: '2026-11-17T02:00:00Z' };
const batchForm = () => ({ ...emptyBatchForm(), receivedAt: '2026-11-17T09:00', expiryDate: '2026-12-15', initialQuantity: '100', remainingQuantity: '80', pushDay: '2026-12-10' });
function setup(t: TestContext, role: AuthUser['role'] = 'Store Admin') {
  const calls: { path: string; init: RequestInit; body: any }[] = [];
  let actor: AuthUser | null = { ...user, role, storeId: 1 };
  let respond = async () => Response.json(product);
  t.mock.method(authService, 'getCurrentUser', () => actor);
  t.mock.method(authService, 'getToken', () => 'fixture-only');
  t.mock.method(authService, 'request', async (path: string, init: RequestInit = {}) => {
    calls.push({ path, init, body: init.body ? JSON.parse(String(init.body)) : undefined }); return respond();
  });
  return { calls, role(value: AuthUser['role'] | null) { actor = value ? { ...user, role: value, storeId: 1 } : null; }, respond(fn: typeof respond) { respond = fn; } };
}

test('Product create/edit payloads select only V26 writable fields; decimal prices and below-cost sales survive', async t => {
  const f = setup(t), request = productRequest(productForm(), categories);
  assert.deepEqual(request, { name: 'Milk', unit: 'Bottle', categoryId: 1, requiresExpiry: false, sellingPrice: 12.75, costPrice: 15.25, status: 'ACTIVE' });
  const generated = { ...product, sku: 'SKU-00000000004' };
  f.respond(async () => Response.json(generated));
  const contaminated = { ...request, sku: 'attempted manual SKU', expiryPushDays: 7, stockQuantity: 999, category: categories[0], id: 44, pushDay: '2026-12-10', storeId: 99 };
  assert.deepEqual(await storeApi.createProduct(contaminated), generated);
  assert.deepEqual(await storeApi.updateProduct(4, contaminated), generated);
  assert.deepEqual(f.calls.map(c => [c.path, c.init.method]), [['/api/products', 'POST'], ['/api/products/4', 'PUT']]);
  for (const call of f.calls) assert.deepEqual(call.body, request);
  assert.equal('expiryPushDays' in product, false);
  assert.equal(money(12.75), '12.75 ₫'); assert.equal(money(1000.125), '1,000.125 ₫');
});
test('Product category can be null or a valid inactive Store category; statuses are catalog-only', () => {
  assert.equal(productRequest({ ...productForm(), categoryId: '' }, categories).categoryId, null);
  assert.equal(productRequest({ ...productForm(), categoryId: '2', status: 'INACTIVE' }, categories).status, 'INACTIVE');
  assert.throws(() => productRequest({ ...productForm(), categoryId: '99' }, categories), /this store/);
  assert.throws(() => productRequest({ ...productForm(), status: 'BLOCKED' as F02Status }, categories), /Active or Inactive/);
});
for (const [field, max] of [['name', 180], ['unit', 40]] as const) test(`Product ${field} rejects whitespace/too-long values; accepts exact limit`, () => {
  assert.throws(() => productRequest({ ...productForm(), [field]: '   ' }, categories), /required/);
  assert.throws(() => productRequest({ ...productForm(), [field]: 'x'.repeat(max + 1) }, categories), /at most/);
  assert.equal(productRequest({ ...productForm(), [field]: 'x'.repeat(max) }, categories)[field].length, max);
});
for (const field of ['sellingPrice', 'costPrice'] as const) test(`Product ${field} rejects invalid, non-finite, negative or precision-losing amounts`, () => {
  for (const value of ['', ' ', '-1', 'NaN', 'Infinity', '1e309', '12abc', '0x10', '1,000', '9007199254740993', '1.00000000000000001']) assert.throws(() => productRequest({ ...productForm(), [field]: value }, categories));
  for (const value of ['0', '0.10', '.25', '12.75', '1000000000.25']) assert.equal(productRequest({ ...productForm(), [field]: value }, categories)[field], Number(value));
});
test('Product expiry-tracking rejection preserves Backend information and does not mutate batches', async t => {
  const f = setup(t); f.respond(async () => Response.json({ error: 'Cannot require expiry while a batch has no expiry date' }, { status: 400 }));
  await assert.rejects(storeApi.updateProduct(4, { ...productRequest(productForm(), categories), requiresExpiry: true }), e => {
    assert.equal(f02ErrorMessage(e), 'Cannot enable expiry tracking because some existing batches have no expiry date.'); return true;
  }); assert.equal(f.calls.length, 1);
});
test('Batch create accepts absent, earlier, equal and past Push Day without inferring defaults', async t => {
  const f = setup(t); f.respond(async () => Response.json(batch));
  for (const pushDay of ['', '2026-12-01', '2026-12-15', '2020-01-01']) {
    const request = batchCreateRequest({ ...batchForm(), pushDay }, true);
    await storeApi.createBatch(4, { ...request, remainingQuantity: 12, status: 'BLOCKED', storeId: 22 } as typeof request);
    assert.deepEqual(f.calls.at(-1)!.body, request);
    assert.equal(request.pushDay, pushDay || null);
    assert.equal('remainingQuantity' in request, false);
  }
  assert.equal(batchCreateRequest({ ...batchForm(), expiryDate: '', pushDay: '' }, false).expiryDate, null);
});
test('Batch create validates required expiry, calendar dates, received time and positive int32 quantity', () => {
  assert.throws(() => batchCreateRequest({ ...batchForm(), expiryDate: '' }, true), /expiry date/);
  for (const value of ['0', '-1', '1.5', '', 'NaN', 'Infinity', '2147483648']) assert.throws(() => batchCreateRequest({ ...batchForm(), initialQuantity: value }, true));
  for (const value of ['', 'invalid', '2026-02-30T10:00']) assert.throws(() => batchCreateRequest({ ...batchForm(), receivedAt: value }, true), /date and time/);
  for (const value of ['2026-02-30', '2026-13-01', '2026-1-1']) assert.throws(() => batchCreateRequest({ ...batchForm(), expiryDate: value }, true), /valid date/);
  assert.throws(() => batchCreateRequest({ ...batchForm(), pushDay: '2026-12-16' }, true), /on or before/);
  assert.equal(validatePushDay('2026-12-15', '2026-12-15'), '');
});
test('PATCH Push Day only, quantity only and status only leave unrelated fields untouched', async t => {
  const f = setup(t); f.respond(async () => Response.json(batch));
  const push = batchPatchRequest(batch, { ...batchForm(), pushDay: '2026-12-15' });
  assert.deepEqual(push, { pushDay: '2026-12-15' }); await storeApi.updateBatch(9, push);
  const quantity = batchPatchRequest(batch, { ...batchForm(), remainingQuantity: '0' });
  assert.deepEqual(quantity, { remainingQuantity: 0 }); await storeApi.updateBatch(9, quantity);
  await storeApi.updateBatch(9, { status: 'BLOCKED' }); await storeApi.updateBatch(9, { status: 'ACTIVE' });
  assert.deepEqual(f.calls.map(c => c.body), [push, quantity, { status: 'BLOCKED' }, { status: 'ACTIVE' }]);
  assert.ok(f.calls.every(c => c.init.method === 'PATCH' && c.path === '/api/inventory-batches/9'));
});
test('PATCH rejects unchanged, invalid quantity and accidental clear; immutable fields never sent', async t => {
  const f = setup(t);
  for (const value of ['-1', '101', '1.5', '', 'NaN', 'Infinity']) assert.throws(() => batchPatchRequest(batch, { ...batchForm(), remainingQuantity: value }));
  assert.throws(() => batchPatchRequest(batch, batchForm()), /No changes/);
  assert.throws(() => batchPatchRequest(batch, { ...batchForm(), pushDay: '' }), /Clear Push Day/);
  assert.throws(() => batchPatchRequest(batch, { ...batchForm(), pushDay: '2026-12-16' }), /on or before/);
  await assert.rejects(storeApi.updateBatch(9, {}), /at least one/);
  await assert.rejects(storeApi.updateBatch(9, { pushDay: null }), /Clear Push Day/); assert.equal(f.calls.length, 0);
  await storeApi.updateBatch(9, { pushDay: null, remainingQuantity: 50, batchCode: 'Changed', receivedAt: '', initialQuantity: 200, storeId: 999 } as F02BatchPatchRequest);
  assert.deepEqual(f.calls[0].body, { pushDay: null, remainingQuantity: 50 }); assert.equal(f.calls[0].init.method, 'PATCH');
});
test('Explicit Clear Push Day uses DELETE with no body; summary uses Backend totals unchanged', async t => {
  const f = setup(t);
  f.respond(async () => Response.json({ ...batch, pushDay: null })); assert.equal((await storeApi.clearPushDay(9)).pushDay, null);
  assert.deepEqual([f.calls[0].path, f.calls[0].init.method, f.calls[0].body], ['/api/inventory-batches/9/push-day', 'DELETE', undefined]);
  const summary = { productId: 4, totalQuantity: 100, sellableQuantity: 60, expiredQuantity: 15, blockedQuantity: 25, expiringSoonQuantity: 40 };
  f.respond(async () => Response.json(summary)); assert.deepEqual(await storeApi.getSummary(4), summary);
  assert.equal(f.calls.at(-1)!.path, '/api/products/4/inventory-summary?expiringWithinDays=7');
});
test('Store calendar date uses configured timezone, including both sides of UTC midnight', () => {
  assert.equal(storeDate(new Date('2026-11-16T17:00:00Z')), '2026-11-17');
  assert.equal(storeDate(new Date('2026-11-16T16:59:59Z')), '2026-11-16');
  assert.equal(storeDate(new Date('2026-11-16T12:00:00Z'), 'Pacific/Kiritimati'), '2026-11-17');
  assert.equal(storeDate(new Date('2026-11-17T02:00:00Z'), 'America/Los_Angeles'), '2026-11-16');
});
test('datetime-local roundtrip uses local wall time and preserves the actual Instant', () => {
  const previous = process.env.TZ; process.env.TZ = 'Asia/Ho_Chi_Minh';
  try { const instant = new Date('2026-11-17T02:00:00Z'); assert.equal(localDateTime(instant), '2026-11-17T09:00'); assert.equal(batchCreateRequest({ ...batchForm(), receivedAt: localDateTime(instant) }, true).receivedAt, instant.toISOString()); }
  finally { if (previous === undefined) delete process.env.TZ; else process.env.TZ = previous; }
});
test('Common and custom Unit strings retain their meaning without replacing existing units', () => {
  for (const unit of ['Piece', 'Box', 'Pack', 'Bottle', 'Bag', 'cây', 'vỉ', 'hộp', 'gói', 'kg', 'EA']) assert.equal(productRequest({ ...productForm(), unit }, categories).unit, unit);
  assert.equal(productRequest({ ...productForm(), unit: 'v'.repeat(40) }, categories).unit.length, 40);
});
test('Category validation and create/edit/status retain supported API routes without Delete', async t => {
  const f = setup(t);
  for (const name of ['', '  ', 'x'.repeat(151)]) assert.throws(() => categoryRequest({ name, status: 'ACTIVE' }));
  assert.equal(categoryRequest({ name: 'x'.repeat(150), status: 'INACTIVE' }).name.length, 150);
  assert.throws(() => categoryRequest({ name: 'Dairy', status: 'BLOCKED' as F02Status }));
  const body = categoryRequest({ name: ' Dairy ', status: 'ACTIVE' });
  await storeApi.createCategory(body); await storeApi.updateCategory(1, body); await storeApi.updateCategoryStatus(1, 'INACTIVE');
  assert.deepEqual(f.calls.map(c => [c.path, c.init.method, c.body]), [['/api/categories', 'POST', body], ['/api/categories/1', 'PUT', body], ['/api/categories/1/status', 'PATCH', { status: 'INACTIVE' }]]);
});
test('Merchandiser can read only Product/Category; inventory and every F02 write are denied before transport', async t => {
  const f = setup(t, 'Merchandiser'); assert.equal(canManageCatalog(), false);
  await storeApi.listProducts({ search: 'milk', categoryId: 1, page: 2, pageSize: 10, status: 'ACTIVE', storeId: 99 }); await storeApi.getProduct(4); await storeApi.listCategories(); await storeApi.getCategory(1);
  assert.equal(new URL(f.calls[0].path, 'https://fixture.invalid').searchParams.has('storeId'), false);
  const before = f.calls.length;
  for (const action of [() => storeApi.createProduct(productRequest(productForm(), categories)), () => storeApi.updateProduct(4, productRequest(productForm(), categories)), () => storeApi.updateProductStatus(4, 'INACTIVE'), () => storeApi.createCategory({ name: 'X', status: 'ACTIVE' }), () => storeApi.updateCategory(1, { name: 'X', status: 'ACTIVE' }), () => storeApi.updateCategoryStatus(1, 'INACTIVE'), () => storeApi.listBatches(4), () => storeApi.getBatch(9), () => storeApi.createBatch(4, batchCreateRequest(batchForm(), true)), () => storeApi.updateBatch(9, { pushDay: '2026-12-10' }), () => storeApi.clearPushDay(9), () => storeApi.clearExpiryDate(9), () => storeApi.getSummary(4)]) await assert.rejects(action(), (e: F02ApiError) => e.status === 403);
  assert.equal(f.calls.length, before);
});
test('System Admin, End-Customer and anonymous cannot access F02 management; existing screen guards remain', async t => {
  const f = setup(t);
  for (const role of ['System Admin', 'End-Customer', null] as const) { f.role(role); await assert.rejects(storeApi.listProducts(), (e: F02ApiError) => e.status === (role ? 403 : 401)); }
  assert.equal(f.calls.length, 0);
  for (const role of ['System Admin', 'End-Customer', 'Merchandiser'] as const) for (const screen of ['store-inventory', 'store-edit-product', 'store-categories', 'store-batches'] as const) assert.equal(ROLE_PERMISSIONS[role].allowedScreens.includes(screen), false);
});
for (const status of [400, 401, 403, 404, 409, 500]) test(`F02 HTTP ${status} retains readable Backend error and does not retry writes`, async t => {
  const f = setup(t); f.respond(async () => Response.json({ error: 'Controlled Backend rejection' }, { status }));
  await assert.rejects(storeApi.updateBatch(9, { pushDay: '2026-12-10' }), (e: F02ApiError) => e.status === status && f02ErrorMessage(e) === 'Controlled Backend rejection'); assert.equal(f.calls.length, 1);
});
test('Network failures are surfaced with no automatic mutation retry or duplicate-code invention', async t => {
  const f = setup(t); f.respond(async () => { throw new TypeError('Failed to fetch'); });
  await assert.rejects(storeApi.createBatch(4, batchCreateRequest(batchForm(), true)), /Failed to fetch/); assert.equal(f.calls.length, 1);
  assert.equal(f02ErrorMessage(new Error('Database constraint failure')), 'Database constraint failure');
  assert.equal(f02ErrorMessage(new TypeError('Failed to fetch')), 'Unable to connect to the server. Please check your connection and try again.');
});

test('Add/Edit Product labels mark required fields, retain optional Category and leave generated SKU unmarked', () => {
  for (const selected of [undefined, product]) {
    const html = renderToStaticMarkup(createElement(ProductFields, { form: productForm(), categories, product: selected, onChange: () => {} }));
    for (const label of ['Product name', 'Unit', 'Status', 'Cost price', 'Selling price']) assert.ok(html.includes(`${label} *`), label);
    assert.match(html, />Category<select/); assert.ok(html.includes('No category'));
    assert.match(html, />SKU<input/); assert.ok(html.includes('Expiry tracking</label>'));
    assert.doesNotMatch(html, /\(optional\)|Category \*|SKU \*|Expiry tracking \*/);
    assert.equal(productRequest({ ...productForm(), categoryId: '' }, categories).categoryId, null);
  }
});

test('Add Product shows a read-only SKU placeholder before any code is assigned', () => {
  const markup = renderToStaticMarkup(createElement(ProductFields, { form: productForm(), categories, onChange: () => {} }));
  assert.ok(markup.includes('SKU is generated automatically when the product is saved.'));
  const input = markup.match(/<input[^>]*aria-label="SKU"[^>]*>/)?.[0];
  assert.ok(input); assert.match(input, /readOnly=""/); assert.match(input, /value="Generated after saving"/);
  assert.doesNotMatch(input, /\b(?:disabled|required|name)=/);
  assert.equal('sku' in emptyProductForm, false);
});

test('Edit shows the exact returned SKU in a copyable read-only input for generated and legacy products', () => {
  for (const sku of ['SKU-00000000004', 'FM26-0001', 'legacy mixed Case']) {
    const markup = renderToStaticMarkup(createElement(ProductFields, { form: productForm(), categories, product: { ...product, sku }, onChange: () => {} }));
    assert.ok(markup.includes(sku));
    const input = markup.match(/<input[^>]*aria-label="SKU"[^>]*>/)?.[0];
    assert.ok(input); assert.match(input, /readOnly=""/); assert.ok(input.includes(`value="${sku}"`));
    assert.doesNotMatch(input, /\b(?:disabled|required|name)=/);
    assert.equal(markup.includes('Generated after saving'), false);
    assert.equal(markup.includes('Compatibility support is required'), false);
  }
});

test('Batch code uses the same read-only field, with a placeholder only before creation', () => {
  for (const code of [undefined, 'BATCH-20261123-001', 'legacy batch code']) {
    const markup = renderToStaticMarkup(createElement(GeneratedCodeField, { label: 'Batch code', code }));
    const input = markup.match(/<input[^>]*aria-label="Batch code"[^>]*>/)?.[0];
    assert.ok(input); assert.match(input, /readOnly=""/); assert.ok(input.includes(`value="${code ?? 'Generated after saving'}"`));
    assert.doesNotMatch(input, /\b(?:disabled|required|name)=/);
    assert.equal(markup.includes('Batch code is generated automatically when the batch is saved.'), code === undefined);
    assert.equal(markup.includes('Generated after saving'), code === undefined);
  }
});

test('Legacy SKU is preserved by Backend while PUT sends writable fields only', async t => {
  const f = setup(t), legacy = { ...product, sku: 'FM26-0001' };
  f.respond(async () => Response.json(legacy));
  assert.deepEqual(await storeApi.getProduct(4), legacy);
  const body = { ...productRequest(productForm(), categories), name: 'Changed name only' };
  f.respond(async () => Response.json({ ...legacy, name: body.name }));
  const saved = await storeApi.updateProduct(4, { ...body, sku: 'attempted overwrite' } as typeof body);
  assert.equal(saved.sku, legacy.sku); assert.equal(saved.name, body.name);
  assert.deepEqual(f.calls.at(-1)!.body, body);
  assert.equal(Object.hasOwn(f.calls.at(-1)!.body, 'sku'), false);
  f.respond(async () => Response.json({ ...legacy, status: 'INACTIVE' }));
  await storeApi.updateProductStatus(4, 'INACTIVE');
  assert.deepEqual(f.calls.at(-1)!.body, { status: 'INACTIVE' });
});

test('Only the specific 409 code requires name confirmation; POST/PUT retain the explicit confirmation flag', async t => {
  const f = setup(t), body = productRequest(productForm(), categories);
  for (const id of [undefined, 4]) {
    const send = (value: typeof body) => id === undefined ? storeApi.createProduct(value) : storeApi.updateProduct(id, value);
    f.respond(async () => Response.json({ code: 'PRODUCT_NAME_CONFIRMATION_REQUIRED', error: 'Similar product name', confirmWith: 'confirmSimilarName=true' }, { status: 409 }));
    const count = f.calls.length;
    await assert.rejects(send(body), needsProductNameConfirmation);
    assert.equal(f.calls.length, count + 1, 'No automatic confirmation/retry');
    f.respond(async () => Response.json({ ...product, id: 874 }));
    assert.equal((await send({ ...body, confirmSimilarName: true })).id, 874);
    assert.deepEqual(f.calls.at(-1)!.body, { ...body, confirmSimilarName: true });
  }
  for (const error of [new F02ApiError(409, 'SKU already exists in this Store'), new F02ApiError(400, 'Invalid', 'PRODUCT_NAME_CONFIRMATION_REQUIRED'), new Error('PRODUCT_NAME_CONFIRMATION_REQUIRED')]) assert.equal(needsProductNameConfirmation(error), false);
  f.respond(async () => Response.json({ error: 'SKU already exists in this Store' }, { status: 409 }));
  const count = f.calls.length;
  await assert.rejects(storeApi.createProduct(body), (e: F02ApiError) => e.status === 409 && !needsProductNameConfirmation(e) && /SKU already exists/.test(e.message));
  assert.equal(f.calls.length, count + 1);
});

test('Batch create drops response IDs/code even from contaminated input and uses generated response', async t => {
  const f = setup(t), body = batchCreateRequest(batchForm(), true);
  f.respond(async () => Response.json({ ...batch, id: 923, batchCode: 'BATCH-20261117-017' }));
  const saved = await storeApi.createBatch(4, { ...body, id: 999, productId: 123, batchCode: 'CLIENT-CODE' } as typeof body);
  assert.equal(saved.id, 923); assert.equal(saved.batchCode, 'BATCH-20261117-017');
  assert.deepEqual(f.calls.at(-1)!.body, body);
  for (const key of ['id', 'productId', 'batchCode']) assert.equal(key in f.calls.at(-1)!.body, false);
});

test('Batch expiry PATCH validates the effective Push Day, supports combined changes and never clears via null', async t => {
  const f = setup(t); f.respond(async () => Response.json({ ...batch, expiryDate: '2026-12-12' }));
  const patch = batchPatchRequest(batch, { ...batchForm(), expiryDate: '2026-12-12' }, true);
  assert.deepEqual(patch, { expiryDate: '2026-12-12' });
  assert.equal((await storeApi.updateBatch(9, patch)).expiryDate, '2026-12-12');
  assert.deepEqual(f.calls.at(-1)!.body, patch);
  assert.throws(() => batchPatchRequest(batch, { ...batchForm(), expiryDate: '2026-12-09' }, true), /on or before/);
  assert.deepEqual(batchPatchRequest(batch, { ...batchForm(), expiryDate: '2026-12-09', pushDay: '2026-12-08', remainingQuantity: '20' }, true), { expiryDate: '2026-12-09', pushDay: '2026-12-08', remainingQuantity: 20 });
  assert.throws(() => batchPatchRequest(batch, { ...batchForm(), expiryDate: '' }, true), /expiry date/);
  assert.throws(() => batchPatchRequest(batch, { ...batchForm(), expiryDate: '' }, false), /Clear Expiry Date/);
  assert.throws(() => batchPatchRequest(batch, { ...batchForm(), expiryDate: '2026-02-30' }, false), /valid date/);
  await assert.rejects(storeApi.updateBatch(9, { expiryDate: null }), /Clear Expiry Date/);
});

test('Explicit Clear Expiry Date uses DELETE without payload and consumes updated batch', async t => {
  const f = setup(t); f.respond(async () => Response.json({ ...batch, expiryDate: null }));
  const updated = await storeApi.clearExpiryDate(9);
  assert.equal(updated.expiryDate, null); assert.equal(updated.pushDay, batch.pushDay);
  assert.deepEqual(f.calls.map(c => [c.path, c.init.method, c.body]), [['/api/inventory-batches/9/expiry-date', 'DELETE', undefined]]);
});

test('All nine Product sorts pass through with search/filter/pagination and no client reordering', async t => {
  const f = setup(t), response = { content: [product, { ...product, id: 3 }], page: 2, pageSize: 10, totalElements: 360, totalPages: 36 };
  f.respond(async () => Response.json(response));
  for (const sortBy of ['name', 'sku', 'category', 'unit', 'costPrice', 'sellingPrice', 'status', 'requiresExpiry', 'stockQuantity']) for (const sortDirection of ['asc', 'desc']) {
    assert.deepEqual(await storeApi.listProducts({ sortBy, sortDirection, page: 2, pageSize: 10, search: 'FM26', categoryId: 1, status: 'ACTIVE' }), response);
    const query = new URL(f.calls.at(-1)!.path, 'https://fixture.invalid').searchParams;
    assert.deepEqual(Object.fromEntries(query), { search: 'FM26', categoryId: '1', status: 'ACTIVE', page: '2', pageSize: '10', sortBy, sortDirection });
  }
});

test('360 FoodMart legacy Product references survive all 36 pages without SKU rewriting', async t => {
  const f = setup(t), legacy = Array.from({ length: 360 }, (_, index) => ({ ...product, id: index + 1, sku: `FM26-${String(index + 1).padStart(4, '0')}` }));
  const received: F02Product[] = [];
  for (let page = 0; page < 36; page++) {
    f.respond(async () => Response.json({ content: legacy.slice(page * 10, (page + 1) * 10), page, pageSize: 10, totalElements: 360, totalPages: 36 }));
    const result = await storeApi.listProducts({ page, pageSize: 10, sortBy: 'sku', sortDirection: 'asc' });
    received.push(...result.content);
    assert.equal(result.totalElements, 360); assert.equal(result.totalPages, 36);
  }
  assert.deepEqual(received, legacy);
  assert.ok(f.calls.every(c => !c.init.method || c.init.method === 'GET'));
});

test('Product POST and PUT never retry an uncertain network response', async t => {
  const f = setup(t); f.respond(async () => { throw new TypeError('Failed to fetch'); });
  const body = productRequest(productForm(), categories);
  await assert.rejects(storeApi.createProduct(body), /Failed to fetch/);
  assert.equal(f.calls.length, 1);
  await assert.rejects(storeApi.updateProduct(4, body), /Failed to fetch/);
  assert.equal(f.calls.length, 2);
});

test('soft delete sends DELETE without a body, accepts 204, and preserves refusal details', async t => {
  const f = setup(t);
  f.respond(async () => new Response(null, { status: 204 }));
  await storeApi.deleteProduct(4);
  assert.equal(f.calls[0].init.method, 'DELETE');
  assert.equal(f.calls[0].path, '/api/products/4');
  assert.equal(f.calls[0].body, undefined);
  const campaigns = [{ campaignId: 12, status: 'ACTIVE' }];
  for (const code of ['PRODUCT_HAS_SELLABLE_STOCK', 'PRODUCT_IN_LIVE_CAMPAIGN']) {
    f.respond(async () => Response.json({ code, error: 'Product cannot be deleted', reason: 'A specific backend reason', campaigns }, { status: 409 }));
    await assert.rejects(storeApi.deleteProduct(4), { status: 409, code, reason: 'A specific backend reason', campaigns });
  }
  f.respond(async () => Response.json({ error: 'Product does not exist' }, { status: 404 }));
  await assert.rejects(storeApi.deleteProduct(4), { status: 404 });
});
