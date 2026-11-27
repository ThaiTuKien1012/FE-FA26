import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { waitForDevToolsPage } from './browser-devtools.mjs';

test('DevTools discovery retries until the debugger endpoint returns a page', async t => {
  const profile = await mkdtemp(join(tmpdir(), 'paspm-devtools-test-'));
  t.after(() => rm(profile, { recursive: true, force: true }));
  await writeFile(join(profile, 'DevToolsActivePort'), '32123\n/devtools/browser/fixture');
  const url = 'ws://127.0.0.1:32123/devtools/page/fixture';
  const fetch = t.mock.method(globalThis, 'fetch', async (input: string) => {
    assert.equal(input, 'http://127.0.0.1:32123/json/list');
    switch (fetch.mock.callCount()) {
      case 0: throw new TypeError('fetch failed');
      case 1: return new Response(null, { status: 503 });
      case 2: return Response.json([]);
      default: return Response.json([{ type: 'page', webSocketDebuggerUrl: url }]);
    }
  });
  assert.equal(await waitForDevToolsPage(profile, 2000), url);
  assert.equal(fetch.mock.callCount(), 4);
});

test('DevTools discovery times out when the port file is absent', async t => {
  const profile = await mkdtemp(join(tmpdir(), 'paspm-devtools-test-'));
  t.after(() => rm(profile, { recursive: true, force: true }));
  await assert.rejects(waitForDevToolsPage(profile, 25), /Chrome DevTools page was not ready within 25 ms/);
});
