# Browser tests

`tests/*.browser.mjs` drive a real headless Chrome through the DevTools protocol against a local Vite server.
All API traffic is intercepted with fixtures: no real backend, account, mining run or cart write is involved.
Any request that a fixture does not know lands in `unexpected`, and every test fails on a non-empty `unexpected`.

## Run all of them on macOS

Requirements: Node 22, `npm ci`, Google Chrome in `/Applications`.

1. Start Vite on port 3000 and leave it running:

```bash
npx vite --port=3000 --host=127.0.0.1
```

2. In another terminal, run every test one by one with [this script](#runner-script). Do not run them in parallel: they share the port.

**Chrome path.** Each script reads its own variable and falls back to the Windows path
`C:/Program Files/Google/Chrome/Application/chrome.exe`, which does not exist on macOS (`spawn … ENOENT`). Set all of them:

| Variable | Used by |
|---|---|
| `SESSION_TEST_CHROME` | `auth-session`, `f11`, `store-management` |
| `DATE_TEST_CHROME` | `date-picker` |
| `F02_TEST_CHROME` | `f02`, `f02.pagination`, `f02.tables` |
| `F03_TEST_CHROME` | `f03` |
| `F04_TEST_CHROME` | `f04` |
| `F05_TEST_CHROME` | `f05` |
| `F06_TEST_CHROME` | `f06.browser`, `f06.browse`, `f06.complete`, `f06.expiry` |
| `F07_TEST_CHROME` | `f07` |
| `CUSTOMER_TEST_CHROME` | `customer-resume` |
| `LEGACY_TEST_CHROME` | `legacy-route` |

**Origin.** The default is `http://127.0.0.1:3000`, except `f11`, which defaults to `3011`. Set `PASPM_TEST_ORIGIN=http://127.0.0.1:3000`
for all, plus `F07_TEST_ORIGIN` for `f07`. Set `PASPM_TEST_NO_ARTIFACTS=1` to skip screenshots in the temp folder.

**No `timeout` command.** macOS has no `timeout`. A hung test would block the run forever, so the script below starts each test
in the background and kills it after 240 s. (`brew install coreutils` provides `gtimeout` if you prefer it.)

### Runner script

```bash
#!/usr/bin/env bash
# Run from the repository root with Vite already serving http://127.0.0.1:3000.
export PASPM_TEST_NO_ARTIFACTS=1 PASPM_TEST_ORIGIN=http://127.0.0.1:3000 F07_TEST_ORIGIN=http://127.0.0.1:3000
C="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
export SESSION_TEST_CHROME="$C" DATE_TEST_CHROME="$C" F02_TEST_CHROME="$C" F03_TEST_CHROME="$C" F04_TEST_CHROME="$C" \
       F05_TEST_CHROME="$C" F06_TEST_CHROME="$C" F07_TEST_CHROME="$C" CUSTOMER_TEST_CHROME="$C" LEGACY_TEST_CHROME="$C"
for f in tests/*.browser.mjs; do
  node --import tsx "$f" > "/tmp/$(basename "$f" .mjs).log" 2>&1 &
  pid=$!
  ( sleep 240; kill "$pid" 2>/dev/null ) & watchdog=$!; disown "$watchdog"
  wait "$pid"; code=$?
  kill "$watchdog" 2>/dev/null
  echo "$(basename "$f" .mjs) exit=$code"
done
```

Each test prints a JSON result (`PASS …` or `FAIL` with `error`, `unexpected` and the last requests); the log is in `/tmp/<name>.log`.

## Rules for the fixtures

- Public storefront requests (`/api/storefront/*`) are answered by the shared `storefrontFixture()` in
  [`tests/storefront.fixtures.ts`](../tests/storefront.fixtures.ts), never by a per-test copy. It serves only the fixture Store
  (`fixture-store`) and returns `undefined` for anything else, so the stray-request assertion stays strict.
- A new browser test that renders a guest or customer screen must call `storefrontFixture(path, method)` in its fixture handler.
- The F02 product form always sends `imageUrl` and `description` (`null` when empty); the tests assert both keys.

## Test stability notes

| ID | Test | Diagnosis | Status |
|---|---|---|---|
| KI-01 | `f05.browser.mjs`, "Native Store keyboard selection" | On macOS headless Chrome, CDP arrow keys reach a closed native `<select>` as trusted, uncancelled events. The browser does not change its value or emit `input`/`change`. The same behavior reproduces without React or the account modal. | **Harness fixed.** macOS uses CDP character input and native type-ahead against uniquely named fixture Stores. Other platforms still send ArrowDown/ArrowUp. Both paths require values 2 then 1 and preserve the invitation payload assertion. The headed macOS picker was not retested. |

To reproduce the macOS diagnosis in a CDP page session, evaluate the setup below
in an empty page. Then dispatch `Input.dispatchKeyEvent` with
`{ type: 'keyDown', key: 'ArrowDown', code: 'ArrowDown', windowsVirtualKeyCode: 40 }`
followed by the same event with `type: 'keyUp'`.

```js
document.body.innerHTML = '<select><option value="1">Alpha</option><option value="2">Beta</option></select>';
const select = document.querySelector('select');
window.selectionEvents = [];
for (const type of ['keydown', 'keyup', 'input', 'change']) {
  select.addEventListener(type, event => {
    window.selectionEvents.push({ type, trusted: event.isTrusted, cancelled: event.defaultPrevented });
  });
}
select.focus();
```

On macOS headless Chrome, the closed dropdown stayed at `1`. Adding `size="2"`
to the minimal fixture made the same arrow events select `2` in the listbox.
With the original dropdown, CDP `keyDown` with
`{ key: 'b', code: 'KeyB', windowsVirtualKeyCode: 66, text: 'b', unmodifiedText: 'b' }`
plus `keyUp` selected `2` and emitted trusted `input` and `change`.

The customer resume and F06 expiry suites share [DevTools readiness discovery](../tests/browser-devtools.mjs).
It polls the port file and `/json/list` until a page target is available, with a
bounded deadline and per-request timeout. The F06 expiry test also waits for the
rules cards to render before checking their exact count. It sets the existing
login `returnTo` before authentication and waits for the Recommendations
heading, so the session remount cannot race the test's route change.
