import assert from 'node:assert/strict';
import test from 'node:test';
import { arrangeProductFrames, migrateShelfLayout, parseProductFrames, vacantProductFrame } from '../src/features/store/storeLayoutFrames';

test('legacy shelf assignments become distinct product frames in visual order', () => {
  const frames = migrateShelfLayout(
    [{ id: 2, x: 635, y: 205, capacity: 2 }, { id: 1, x: 95, y: 205, capacity: 2 }],
    { 'aisle-1-slot-1': 11, 'aisle-1-slot-2': 12, 'aisle-2-slot-1': 13, 'aisle-2-slot-2': 11 },
  );
  assert.deepEqual(Object.keys(frames), ['11', '12', '13']);
  assert.deepEqual(frames['11'], { x: 36, y: 36 });
  assert.deepEqual(frames['13'], { x: 420, y: 36 });
});

test('auto arrangement grows to more than one row without losing products', () => {
  const frames = arrangeProductFrames(Array.from({ length: 30 }, (_, index) => index + 1));
  assert.equal(Object.keys(frames).length, 30);
  assert.deepEqual(frames['8'], { x: 36, y: 246 });
  assert.ok(frames['30'].y > frames['8'].y);
});

test('saved frame positions reject malformed or negative coordinates', () => {
  assert.deepEqual(parseProductFrames('{"11":{"x":120,"y":80},"12":{"x":-10,"y":20},"bad":{"x":1,"y":1}}'), { '11': { x: 120, y: 80 } });
  assert.equal(parseProductFrames('invalid'), null);
});

test('adding onto an occupied frame chooses a nearby visible position', () => {
  const original = { x: 36, y: 36 };
  const placed = vacantProductFrame(original, { '1': original }, 900);
  assert.notDeepEqual(placed, original);
  assert.ok(placed.x + 168 <= 1400 && placed.y + 184 <= 900);
});
