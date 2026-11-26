import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { authService } from '../../src/services/authService';
import { f11Api } from '../../src/features/f11/f11.api';
import { defaultPeriod, periodError, shiftDate, formatVnd, dashboardError } from '../../src/features/f11/f11.model';
import { BundleActivity } from '../../src/features/f11/BundleActivity';
import { getScreenFromPathname } from '../../src/utils/navigationRouter';

const activity = { from: '2026-11-24', to: '2026-11-25', timeZone: 'Asia/Ho_Chi_Minh', campaignId: null, totalAddActions: 3, addActionsByOrigin: { MINED: 1, MANUAL: 2 }, totalAddedProductUnits: 7, days: [
  { date: '2026-11-24', addActionsByOrigin: { MINED: 0, MANUAL: 0 }, addedProductUnits: 0 },
  { date: '2026-11-25', addActionsByOrigin: { MINED: 1, MANUAL: 2 }, addedProductUnits: 7 },
] };
afterEach(() => vi.restoreAllMocks());
describe('Store-local period', () => {
  it('defaults to 30 inclusive days across the UTC/local midnight boundary', () => {
    expect(defaultPeriod(new Date('2026-11-25T17:01:00Z'))).toEqual({ from: '2026-10-28', to: '2026-11-26' });
  });
  it('accepts 90 days and blocks 91', () => {
    expect(periodError('2026-01-01', '2026-03-31')).toBeNull();
    expect(periodError('2026-01-01', '2026-04-01')).toBeTruthy();
    expect(shiftDate('2026-01-01', 89)).toBe('2026-03-31');
  });
  it.each([['', '2026-01-01'], ['2026-02-30', '2026-03-01'], ['2026-03-01', '2026-02-28']])('rejects invalid dates %s %s', (from, to) => expect(periodError(from, to)).toBeTruthy());
});
describe('whole VND HALF_UP', () => {
  it.each([[0, '0'], [1234.49, '1.234'], [1234.5, '1.235'], [-1234.5, '-1.235'], [0.5, '1']])('formats %s', (value, expected) => expect(formatVnd(value).replace(/\s/g, '')).toBe(expected + '₫'));
});
it('renders real MINED/MANUAL totals, units, and zero days without relying on color', () => {
  const html = renderToStaticMarkup(createElement(BundleActivity, { data: activity }));
  for (const text of ['MINED', 'MANUAL', '2026-11-24', '2026-11-25', '3', '7', '>0<']) expect(html).toContain(text);
  expect(html).toContain('<table');
});
it('maps the dashboard route and limits access to Store staff', () => {
  expect(getScreenFromPathname('/store/dashboard')).toBe('f11-dashboard');
  for (const [role, allowed] of [['Store Admin', true], ['Merchandiser', true], ['System Admin', false], ['End-Customer', false]] as const) {
    expect(authService.isScreenAllowed({ role } as never, 'f11-dashboard')).toBe(allowed);
  }
});
describe('API transport', () => {
  const staff = () => vi.spyOn(authService, 'getCurrentUser').mockReturnValue({ id: 1, storeId: 2, role: 'Merchandiser' } as never);
  it('uses the shared session transport and default pagination, never sends Store IDs', async () => {
    staff(); const request = vi.spyOn(authService, 'request').mockResolvedValue(new Response(JSON.stringify({ items: [], page: 0, pageSize: 20, totalElements: 0 })));
    expect((await f11Api.snapshots()).items).toEqual([]);
    expect(request.mock.calls[0][0]).toBe('/api/dashboard/snapshot-utilities?page=0&pageSize=20');
  });
  it('omits both dates by default and sends explicit dates and campaign together', async () => {
    staff(); const request = vi.spyOn(authService, 'request').mockImplementation(async () => new Response(JSON.stringify(activity)));
    await f11Api.additions(); expect(request.mock.calls[0][0]).toBe('/api/dashboard/bundle-additions');
    await f11Api.additions({ from: activity.from, to: activity.to, campaignId: 42 });
    expect(request.mock.calls[1][0]).toBe('/api/dashboard/bundle-additions?from=2026-11-24&to=2026-11-25&campaignId=42');
  });
  it('blocks invalid pagination and 91-day requests before transport', async () => {
    staff(); const request = vi.spyOn(authService, 'request');
    await expect(f11Api.snapshots(0, 101)).rejects.toThrow();
    await expect(f11Api.additions({ from: '2026-01-01', to: '2026-04-01' })).rejects.toThrow();
    expect(request).not.toHaveBeenCalled();
  });
  it.each([400, 403, 404, 503])('preserves error status %s and code', async status => {
    staff(); vi.spyOn(authService, 'request').mockResolvedValue(new Response(JSON.stringify({ error: 'Denied', code: 'STORE_INACTIVE' }), { status }));
    await expect(f11Api.snapshots()).rejects.toMatchObject({ status, code: 'STORE_INACTIVE' });
  });
  it('rejects unsafe integers instead of displaying rounded event counts', async () => {
    staff(); vi.spyOn(authService, 'request').mockResolvedValue(new Response('{"totalAddActions":9007199254740993}'));
    await expect(f11Api.additions()).rejects.toThrow();
  });
  it('rejects a response after the session changes', async () => {
    staff(); const session = vi.spyOn(authService, 'getSessionId').mockReturnValue(1 as never);
    vi.spyOn(authService, 'request').mockImplementation(async () => { session.mockReturnValue(2 as never); return new Response('{}'); });
    await expect(f11Api.snapshots()).rejects.toThrow();
  });
});
it('distinguishes inactive Store, role denial, missing resource and network failure', () => {
  expect(dashboardError({ status: 403, code: 'STORE_INACTIVE' })).toContain('inactive');
  expect(dashboardError({ status: 403 })).toContain('permission');
  expect(dashboardError({ status: 404 })).toContain('not found');
  expect(dashboardError(new TypeError('Failed to fetch'))).toContain('connection');
});
it('loads a saved report through the existing F08 detail endpoint', async () => {
  vi.spyOn(authService, 'getCurrentUser').mockReturnValue({ id: 1, storeId: 2, role: 'Store Admin' } as never);
  const request = vi.spyOn(authService, 'request').mockResolvedValue(new Response('{"reportId":72}'));
  await expect(f11Api.report(72)).resolves.toEqual({ reportId: 72 });
  expect(request.mock.calls[0][0]).toBe('/api/campaign-reports/72');
});
it.each(['System Admin', 'End-Customer'])('denies %s before making dashboard calls', async role => {
  vi.spyOn(authService, 'getCurrentUser').mockReturnValue({ role } as never);
  const request = vi.spyOn(authService, 'request');
  await expect(f11Api.snapshots()).rejects.toMatchObject({ status: 403 });
  expect(request).not.toHaveBeenCalled();
});
it('does not display an aborted response', async () => {
  vi.spyOn(authService, 'getCurrentUser').mockReturnValue({ role: 'Store Admin' } as never);
  const controller = new AbortController();
  vi.spyOn(authService, 'request').mockImplementation(async () => { controller.abort(); return new Response('{}'); });
  await expect(f11Api.snapshots(0, 20, controller.signal)).rejects.toMatchObject({ name: 'AbortError' });
});
