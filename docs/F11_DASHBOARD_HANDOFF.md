# F11 Store dashboard handoff

## Implementation

Route: `/store/dashboard`. Only Store Admin and Merchandiser can enter or see the navigation item. The existing staff shell, compact mobile navigation and session transport are reused.

- Snapshot utilities: READY snapshots in server order (createdAt, snapshotId descending), 20/50/100 pagination, analysis date and training window, frozen score with up to six decimals. Scores are not currency and are never added across snapshots.
- Bundle additions: last 30 inclusive Store-local days by default; paired ISO dates with a 90-day inclusive maximum, native date bounds and submission validation; optional campaign filter includes ENDED campaigns and follows all server pages. Independent total actions, MINED/MANUAL actions and actual added Product units. Native SVG solid/dashed trend plus a semantic daily table exposes labels and genuine zero days without color or hover. No chart dependency was present or added.
- A/B: existing campaign/report list adapter and extracted, unchanged F08 read-only report component; detail uses the existing `/api/campaign-reports/{reportId}` contract. “Mô phỏng” labeling, evaluation dates/count, frozen A/B revisions, nullable metrics/coverage, and explicit actual product counts when nExceedsBaseline is true. No mutation controls.
- Each panel has loading, empty, error and retry states. Filter 400 preserves form inputs. Selected campaign/report 404 clears the selection and refreshes the relevant list. STORE_INACTIVE uses the existing session termination/notice. Abort and session-scope checks prevent old data from being rendered after navigation/session changes.
- vi-VN whole-VND formatter uses Intl's default halfExpand (decimal HALF_UP) and is tested, including negative ties. F11 has no monetary amount to display: utility remains a score.
- Unsafe JSON numbers are rejected with a visible error through the existing precision guard; they are never silently rounded. A future lossless int64 UI would be needed to display counts above Number.MAX_SAFE_INTEGER.

## Source revisions and contract review

- FE base: `f38d3ad542ec0e9529a9b651c20665606475502b` (local `origin/dev`).
- BE contract/code: `114576d76ec22ed363e9b2edc0abf075aedf0ed8` (local `origin/dev`).
- Reviewed F11 API/handoff, F07/F08 API/handoff, API_CHANGELOG, OpenAPI, DashboardContracts/Controller/Service/Repository and LayoutContracts/Controller from that BE revision.
- No endpoint/field/date-limit/order mismatch found between F11 contracts, OpenAPI and merged backend code. F08 report fields also match.
- Documentation status is stale: F11 API/handoff and product docs still say “implemented on the stacked branch”; some older diagrams/skill notes say “planned”. The implementation and OpenAPI routes already exist in the inspected `origin/dev` tree. This is not proof of deployment.
- The existing F07/F08 campaign-list adapter types list items as CampaignView although the backend returns CampaignSummary (without reportIds). F11 reads only campaignId/name/status; it does not depend on the overtyped fields or change that shared adapter.
- No fetch/push or remote availability verification was performed, as requested. Local backend `http://localhost:8080/actuator/health` was unreachable (curl exit 7, HTTP 000), including outside the sandbox. Live TDP-01 smoke test: **NOT RUN**. No database was accessed.

## Changed files

- `src/features/f11/`: API, DTOs, period/format/error helpers, bundle table/trend, three dashboard panels and scoped CSS.
- `src/features/f07f08/components/F08ReportDetails.tsx`: extracted existing read-only rendering; `F08CampaignPanel.tsx` reuses it without restyling.
- Minimal registration additions in `App.tsx`, `AppLayout.tsx`, `authService.ts`, `types/mining.ts`, `utils/navigationRouter.ts`.
- `tests/f11/dashboard.test.ts`, `tests/f11.browser.mjs`, `vitest.config.ts`, package scripts/lockfile and this handoff.

## Verification

Node v22.20.0. Vitest 4.1.9 installed from locally cached tarballs; cache metadata recovery happened only under `/private/tmp`, not in the repository. Plain `npm ci --offline --cache /private/tmp/f11-cache --no-audit --no-fund` successfully reproduced the lockfile without legacy-peer flags.

- `npm run lint`: PASS (repository lint is `tsc --noEmit`).
- `npm exec -- tsc --noEmit`: PASS.
- `npm test`: 593 existing Node tests and 26 F11 Vitest tests PASS.
- `npm run build`: PASS. Existing Vite warnings remain: native-config `__dirname` compatibility and main chunk above 500 kB.
- `node tests/f11.browser.mjs`: controlled fixtures, not backend evidence. Tests cover both staff roles, pagination, precision, ENDED filter, reports/null/zero/actual counts, 91-day block, server 400, 404 reset, independent 403, empty snapshot list, network recovery, centralized STORE_INACTIVE sign-out and responsive layouts (1440/1024/768/390).
- Browser screenshots inspected for desktop/mobile panels. The dashboard uses the existing compact navigation to keep its title visible on mobile. All fixture API calls are intercepted, with zero real backend writes.
- `git diff --check`: PASS.

## Manual check with a disposable TDP-01 backend

1. Start the approved backend revision with TDP-01 in a **separate disposable test database**. Do not repoint the application at a teammate's database or run migrations/seeds there. Record the deployed SHA and seed identity.
2. From this worktree run `npm ci`, then `npm run dev -- --port 3011 --host 127.0.0.1`. The existing proxy forwards `/api` to port 8080. Open `http://127.0.0.1:3011/store/dashboard`, sign in with the seed's Store Admin account, and open Store Dashboard if login returns to the default screen. Repeat with Merchandiser.
3. In DevTools Network confirm dashboard URLs carry no Store override. Check only own-Store READY snapshots, newest first, exact six-decimal scores, page sizes 20/50/100, Previous/Next, and the empty Store case. No VND symbol belongs on utility.
4. Reset the bundle panel: confirm both dates are omitted from the API call, the response ends on today in Asia/Ho_Chi_Minh and includes 30 days. For a fixed boundary test set 2026-01-01 through 2026-03-31 (90 days); it is accepted. 2026-04-01 would be day 91 and must be unavailable/blocked. A direct authenticated API request with that 91-day window must return 400. Reversed/partial dates must also be rejected. On a forced server 400, preserve inputs and keep the other panels visible.
5. Select an ENDED campaign and verify campaignId is sent; clear it and verify omission. Compare displayed MINED/MANUAL action totals and actual added Product units with the TDP-01 fixture evidence. A successful bundle containing A×1 and B×1 adds one action and two units; rejected additions, removals and quantity edits must not inflate this panel. Verify zero days explicitly display 0. Creating these events is a manual operation only in the disposable environment.
6. Choose a campaign and saved report. Verify the detail endpoint, report date range/evaluation count, exact A/B versions, numeric zero versus N/A/null, priority coverage denominator and nExceedsBaseline actual counts. Confirm the panel says “Mô phỏng” and has no campaign write controls.
7. Test a second Store account: the first Store's snapshots/campaigns/reports must not appear; a direct foreign-resource request is 404. Test a missing campaign/report: selection clears and list reloads. System Admin and End-Customer must not see the nav item and must fail the direct-route guard.
8. In the disposable setup test inactive Store (403 STORE_INACTIVE ends the session), normal 403, offline/network failure and backend unavailable/503. An unavailable panel must not claim zero activity. Retry must recover without losing the other panels.
9. At 390px use the existing navigation toggle; tab through filters, horizontal tables and retry/page buttons. Compare the labeled solid/dashed chart with its daily table. Rapidly change filters/report and navigate away; old responses must not replace the current selection.

## Local delivery

Branch: `Khoi/feat/fe-dashboard`. No push, force, rebase or hook bypass.

From the workspace root, the exact push command is:

```sh
git -C outputs/fe-dashboard-wt push -u origin Khoi/feat/fe-dashboard
```

If a later fetch updates origin/dev, merge it into this branch (do not rebase), rerun checks, then push. Merge to dev only through a PR with green CI.
