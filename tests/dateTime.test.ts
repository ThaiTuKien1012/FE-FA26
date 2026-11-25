import assert from 'node:assert/strict';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { formatDate, formatFriendlyDate, formatDateRange, formatDateTime, isoDateToDisplay, displayDateToIso, dateInputError, isValidDisplayDate, localDateTimeToDisplay, displayDateTimeToLocal, moveCalendarDay, parseDateOnly } from '../src/utils/dateTime';
import { validatePushDay, batchCreateRequest, localDateTime } from '../src/features/store/f02.forms';
import { periodError } from '../src/features/f03/f03.validation';

test('ISO and display date conversion are strict, reversible calendar parts', () => {
  assert.equal(isoDateToDisplay('2026-11-18'), '18/11/2026'); assert.equal(displayDateToIso('05/11/2026'), '2026-11-05');
  assert.equal(formatDate('2026-01-31'), '31/01/2026'); assert.equal(formatFriendlyDate('2026-11-30'), '30 Nov 2026');
  assert.equal(formatDateRange('2026-11-01', '2026-11-30', true), '01 Nov – 30 Nov 2026');
  assert.equal(formatDateRange('2026-12-01', '2027-01-31', true), '01 Dec 2026 – 31 Jan 2027');
  assert.equal(formatDateRange('2026-11-01', '2026-11-30'), '01/11/2026 – 30/11/2026');
});
for (const value of ['31/01/2026', '29/02/2024', '29/02/2000', '01/01/0001', '31/12/9999']) test(`valid date ${value}`, () => assert.equal(isValidDisplayDate(value), true));
for (const value of ['29/02/2026', '29/02/1900', '31/04/2026', '00/11/2026', '18/13/2026', '18/11', '1/1/2026', '2026-11-18', '11/18/2026', '18-11-2026', '18/11/0000', '']) test(`invalid date ${value} never rolls forward`, () => assert.equal(displayDateToIso(value), null));
test('empty, required and min/max boundaries', () => {
  assert.equal(dateInputError(''), ''); assert.ok(dateInputError('', { required: true }));
  const bounds = { min: '2026-11-05', max: '2026-11-30' };
  assert.equal(dateInputError('05/11/2026', bounds), ''); assert.equal(dateInputError('30/11/2026', bounds), '');
  assert.ok(dateInputError('04/11/2026', bounds)); assert.ok(dateInputError('01/12/2026', bounds));
  assert.equal(formatDate(null), '—'); assert.equal(parseDateOnly('2026-04-31'), null);
});
test('ISO comparison and original Start/End and Push Day validations stay authoritative', () => {
  const start = displayDateToIso('30/11/2026')!, end = displayDateToIso('05/11/2026')!;
  assert.ok(periodError({ rangeStart: start, rangeEnd: end, asOfDate: start }));
  assert.ok(validatePushDay(start, end)); assert.equal(validatePushDay(end, end), '');
});
test('timestamps keep offsets and explicit display zones, with 24-hour output', () => {
  assert.equal(formatDateTime('2026-11-18T07:30:00Z', 'Asia/Ho_Chi_Minh'), '18/11/2026 14:30');
  assert.equal(formatDateTime('2026-11-18T14:30:00+07:00', 'UTC'), '18/11/2026 07:30');
  assert.equal(formatDateTime('2026-11-18T00:00:05Z', 'UTC', true), '18/11/2026 00:00:05');
  assert.equal(formatDateTime('2026-11-18', 'America/Los_Angeles'), '18/11/2026');
});
test('local date/time roundtrip preserves the existing F02 instant conversion', () => {
  const local = '2026-11-18T14:30'; assert.equal(localDateTimeToDisplay(local), '18/11/2026 14:30');
  assert.equal(displayDateTimeToLocal('18/11/2026 14:30'), local);
  for (const value of ['31/04/2026 14:30', '18/11/2026 24:00', '18/11/2026 14:60', '18/11/2026 2:30']) assert.equal(displayDateTimeToLocal(value), null);
  const form = { batchCode: 'B', receivedAt: displayDateTimeToLocal('18/11/2026 14:30')!, expiryDate: '', pushDay: '', initialQuantity: '1', remainingQuantity: '1' };
  assert.equal(batchCreateRequest(form, false).receivedAt, new Date(local).toISOString());
  assert.equal(localDateTime(new Date(batchCreateRequest(form, false).receivedAt)), local);
});
test('date-only formatting is unchanged across extreme browser/server time zones', () => {
  for (const TZ of ['America/Los_Angeles', 'Pacific/Kiritimati']) {
    const output = execFileSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', "import {formatDate} from './src/utils/dateTime.ts'; process.stdout.write(formatDate('2026-01-01'));"], { env: { ...process.env, TZ }, encoding: 'utf8' });
    assert.equal(output, '01/01/2026');
  }
  assert.equal(moveCalendarDay('2024-02-28', 1), '2024-02-29'); assert.equal(moveCalendarDay('2026-12-31', 1), '2027-01-01');
});
