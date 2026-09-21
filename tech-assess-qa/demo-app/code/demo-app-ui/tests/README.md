# Playwright suite: UI and API

End-to-end and API tests for the claims application, run against the Docker Compose stack.
Principle: **each behaviour is tested once, at the cheapest layer that can prove it.**
The API project owns business rules and access control; the UI project owns only what a
browser adds (journeys, form behaviour, route guards, real-time delivery).

## Layout

```
playwright.config.ts          projects: setup, api, ui
tests/
  setup/auth.setup.ts         logs in once per role, stores the session (git-ignored)
  api/*.e2e.ts                HTTP tests against the BFF (no browser)
  ui/*.e2e.ts                 browser tests
  support/
    config/env.ts             URLs, seeded users, timeouts
    api/                      BffApi client, ClaimSeeder, http status constants
    data/                     builders (claims, users), status workflow oracle
    pages/                    page objects (login, signup, wizard, my claims, admin claims)
    fixtures.ts               claimantApi / adminApi / seeder / claimantPage / adminPage / openPage
```

## Run it

```bash
# 1. Stack running (from demo-app/):  ./start-infra.sh && ./start-app.sh -d
# 2. Then, from code/demo-app-ui/:
npm install
npx playwright install chromium        # once, for the ui project

npm run e2e                # everything (about 3 minutes)
npm run e2e:api            # API only, no browser (about 30 seconds)
npm run e2e:ui             # UI only
npm run e2e:smoke          # critical path only
npm run e2e:stable         # everything except suspected defects
npm run e2e:defects        # only the tests that assert the contract where a bug is suspected
npm run e2e:report         # open the HTML report of the last run
```

Debugging a UI test: `npx playwright test tests/ui/auth.e2e.ts --headed` or `--ui`.
Other ports: `UI_URL=http://localhost:3000 BFF_URL=http://localhost:8090 npm run e2e`.

## Tags

- `@smoke`: the critical path (12 tests including the two session setups).
- `@defect`: asserts the documented behaviour where a bug is suspected or confirmed.
  **A failure here is a finding, not a broken test.** When fixed, or shown not to be a bug,
  remove the tag. `npm run e2e:stable` gives a green baseline without them.

## Coverage map (one layer per behaviour)

| Feature | Layer | Tests |
|---|---|---|
| Login, roles, wrong password, malformed token | API | 5 |
| Sign-up, duplicate email | API | 2 |
| Claim validation limits (amount, date, text lengths) | API | 14 |
| Claim status workflow (all 25 status pairs, persistence, unknown id) | API | 27 |
| Data isolation, read by id, 403/404 | API | 4 |
| Admin-only endpoints, admin list, dashboard totals | API | 6 |
| Route guard, login/logout, sign-up journey, claimant blocked from admin | UI | 7 |
| Submit-claim journey, wizard validation, back-navigation state | UI | 3 |
| Claim details dialog, incident date shown in another time zone | UI | 2 |
| Admin status change + cancel, valid options per status, filter, dashboard | UI | 5 |
| Real-time: owner sees status change, admin sees new claim, no cross-user leak | UI | 3 |

## Deliberately not automated (trade-offs)

| Left out | Why | Trade-off |
|---|---|---|
| Component and unit tests (Vitest and Testing Library) | This suite is Playwright only, as agreed | The brief also expects them; the next step is a small Vitest set (transitions util, wizard form) |
| API filter-by-status test | The UI filter test already exercises the same server path | Lose a cheaper failure point; gain no duplicate |
| Second and third RBAC checks on the UI | Server-side rule is proven once in the API | A UI-only guard regression on other pages would not be caught |
| Wizard cancel-and-discard dialog | Low impact, simple logic | Small UX regressions possible |
| Search by user id, admin users page, cache "demo" buttons | Read-only or demo features | Low risk; note only |
| Dark-mode visuals (DEF-02, DEF-03) | Logged as findings; a screenshot test is the right tool | No automated guard against visual regressions |
| WebSocket reconnect after an outage (S-07) | Needs stopping containers mid-test, which is slow and flaky | Manual check only |
| Concurrent-user identity mix-up (S-06) | Needs a load tool for a fair test | Suggested next: a small k6 script |
| Multi-browser and mobile layouts | Cost is high, risk is low for this app | Chromium desktop only |
| Debezium/CDC mode | Different compose file, not the default | Direct-Kafka path only |

## Notes on the design

- **Data:** every test creates its own claims and users with unique markers. Nothing is deleted (there is no delete API), so the database grows; assertions never depend on global counts. Wipe with `./stop-app.sh && ./stop-infra.sh -v`.
- **One worker:** real-time events and toasts are global side effects. Use `--workers=4` for API-only runs.
- **API auth:** the API client signs in through the public login endpoint and sends the token as a Bearer header.
- **Independent oracle:** `ALLOWED_TRANSITIONS` is written in the tests, not imported from the app, so a wrong rule in the app cannot make its own test pass. It records the current rules and should be confirmed with the product owner.
- **Selectors:** roles, labels and the few existing test ids. Tables are targeted by role `row`, because each list is rendered twice (table and mobile cards).

## Before you trust a UI failure

The UI tests were written from the source code and have not been run by their author against the live stack. If a UI test fails on the first run, check the selector first (`--headed`, then the trace in the HTML report) before assuming an application bug.
