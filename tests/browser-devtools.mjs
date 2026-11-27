import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

export async function waitForDevToolsPage(profile, timeoutMs = 15000) {
  const deadline = performance.now() + timeoutMs;
  const portFile = join(profile, 'DevToolsActivePort');
  let cause;
  while (performance.now() < deadline) {
    try {
      const [port] = (await readFile(portFile, 'utf8')).split(/\r?\n/);
      if (!/^\d{1,5}$/.test(port) || Number(port) === 0 || Number(port) > 65535) {
        throw new Error('Chrome DevTools port is not ready');
      }
      const remaining = Math.ceil(deadline - performance.now());
      if (remaining <= 0) break;
      // The port file can appear before Chrome accepts requests or exposes a page.
      const response = await fetch(`http://127.0.0.1:${port}/json/list`, {
        signal: AbortSignal.timeout(Math.min(remaining, 500)),
      });
      if (!response.ok) throw new Error(`Chrome DevTools returned HTTP ${response.status}`);
      const targets = await response.json();
      const page = targets.find(target => target.type === 'page' && typeof target.webSocketDebuggerUrl === 'string');
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
      throw new Error('Chrome DevTools has no page target yet');
    } catch (error) {
      cause = error;
    }
    await sleep(Math.max(0, Math.min(100, deadline - performance.now())));
  }
  throw new Error(`Chrome DevTools page was not ready within ${timeoutMs} ms`, { cause });
}
