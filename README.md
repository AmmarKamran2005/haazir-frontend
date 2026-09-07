# HAAZIR — web

Next.js 15 (App Router) + React 19. The five surfaces from the prototype, running against the
real API in [`../api`](../api/) or against an in-process mock, decided by one environment
variable.

---

## Run it

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. With no `.env.local` this is the **mock**: the prototype engine
runs in the browser, no backend and no network required.

To run against the real API, start it first (from the repo root):

```bash
api/.venv/Scripts/python.exe -m uvicorn haazir.main:app --app-dir api/src --port 8000
```

then create `web/.env.local`:

```
NEXT_PUBLIC_HAAZIR_API=http://localhost:8000
```

`CORS_ORIGINS` in `api/.env` already allows `http://localhost:3000`. Restart `next dev` after
changing `.env.local` — Next reads it at boot.

There is also `.claude/launch.json` at the repo root with both servers configured.

---

## The two modes

`lib/api.ts` is the only place that knows which one is in use. Every function it exports
returns a Promise in **both** modes, so a page cannot tell them apart — a page that worked
only because the mock answered synchronously would break the moment the backend was switched
on, which is exactly what happened to all seven call sites when this was first wired.

```
lib/
  api.ts             the dispatcher — real or mock, one set of signatures
  api/config.ts      NEXT_PUBLIC_HAAZIR_API, and whether it is set
  api/http.ts        fetch wrapper: bearer token, JSON, errors that name the call
  api/rest.ts        one function per handler, against /v1
  api/adapt.ts       API shapes → the shapes the components already speak
  live/subscribe.ts  EventSource against /live/stream, or the mock hub
  mock/              the prototype engine, unchanged
  hooks/useAsync.ts  run a promise, render its result, ignore superseded ones
```

**Why an adapter rather than renaming things in the components.** The components were written
against the prototype's `HZ` objects and they call engine helpers with them
(`engine.trustBreakdown(v)`, `engine.dishBestWindow(d)`). Mapping the API into those shapes is
what keeps twenty rendering files untouched, and it keeps one definition of what a venue is
rather than two that drift.

**The engine has not been removed, deliberately.** The demo clock, the frontier panel, the
dish-time curves and the estimator panel have no server equivalent — a scrubbable clock and an
error against a hidden ground truth are simulator concepts. Those stay local. Everything with
a real endpoint behind it — search, venue card, live state, city, group, staff, partner, auth
— goes to the API when it is configured.

---

## What differs between the modes

Honest list, because both are shipped and a demo may use either.

| | Mock | Real API |
|---|---|---|
| Venues | 12 hand-written | 1,695 scraped, from Postgres |
| Live occupancy | Simulated tick stream | `live_state`, fused server-side |
| Live updates | In-process hub on the demo clock | SSE, `EventSource` with `Last-Event-ID` |
| "Excluded by hard constraints" | Listed | **Not shown** — see below |
| Average ticket | Present | Absent everywhere; price level shown instead |
| Estimator panel | The venue you are looking at | Labelled as the simulator |

**Excluded venues.** The prototype could list what it ruled out because it scored every venue
in memory. The server applies hard constraints as SQL predicates, so a venue that fails one is
never selected and there is nothing to report. Reconstructing the list would mean a second,
unconstrained query on every search — slowing the hottest endpoint in the product to populate
a diagnostic panel. If it is wanted it belongs behind an explicit flag, not on the default path.

**Average ticket.** No scraped venue has one: Google publishes a price level, not a figure. So
`Rs 0` is never rendered — the price level is, because zero is a claim and an absence is not.
The same rule is why the city surface shows an em dash for empty seats rather than `0`.

---

## What actually works, surface by surface

Checked against the running API, not inferred.

| Surface | State |
|---|---|
| Ask → results (search, ranking, `why`) | Works, no sign-in |
| Venue truth card (card, live, trust, facts) | Works, no sign-in |
| Live updates (SSE) | Works — `EventSource` connects and receives |
| City tonight (pulse, stats) | Works, no sign-in |
| **Voice input** | **Works** — the browser's own recogniser, listening in Urdu. Hidden where the browser has none |
| **Sign in** | **Works** — magic link. Outside production the API returns the link, so no mailbox is needed |
| **Check-in** | **Works** — signed in, geolocated, rate-limited, and it says which of those stopped it |
| **Hold a table** | **Works** — records a referral against the signed-in diner |
| **Group** | **Works** — create, one invite link each, private constraints, max-min solve |
| **Staff console** | **Works** — an admin issues a device token bound to one venue; taps are geofenced |
| Partner dashboard | Needs an owner account; there is no UI to claim a venue |
| Menu OCR | **Stub.** The button says so |

**Sign-in is a magic link and nothing else.** Browsing never needs it. It is required for the
things that have to belong to somebody — a check-in, a hold, a venue you own — and the reasons
are in the API, not here: a check-in is rate-limited per person per venue and weighted by
reporter trust, and a hold is only worth recording if it is attributable.

**A group needs no account at all**, deliberately. Requiring a sign-up to organise dinner for
six would put a login between five other people and the thing they are trying to do. Each
member gets one link, redeemable once, that opens their own slot and nothing else.

**Two geofences, and both refuse in public.** A diner check-in and a staff tap are only counted
if the server can place the reporter at the venue. Refusals are not errors and are not
presented as any: the server writes the sentence and the UI shows it. That distinction is the
reason either signal is worth anything.

**Nothing claims success it did not have.** Check-in used to toast "Check-in recorded" for a
request that returned 401; *Hold a table* was a button with no handler; the staff console
minted a token in the browser and then 401'd on every call it made. All three looked like they
worked. In a product whose claim is that its numbers are checkable, that is the worst class of
bug in it.

---

## Conventions worth knowing

**`useAsync(fn, deps)`** is the whole data layer. It re-runs on dep change and discards a
result from a call that has since been superseded, so typing two queries quickly cannot let
the slower one win. There is no react-query provider; it is a dependency in `package.json`
that nothing uses.

**Loading is a state, not a blank.** Every converted call site renders something specific
while waiting — "Searching…", "Solving…", zeroed staff counters — because a blank panel reads
as broken and a wrong-for-one-frame number does not.

**An unreachable API is not an empty result.** `ApiError` carries the status and the path, and
the surfaces say which happened. "Nothing matched" and "the backend is down" are fixed
differently.
