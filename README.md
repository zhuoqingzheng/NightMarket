# Night Market

Stall bookings for night-market food vendors. Vendors sign in, browse upcoming markets and pick their exact pitch on a cinema-style floor plan. Stalls are first come, first served, and the map updates live as other vendors book.

## Quick start

Requires **Node.js 24** or newer.

```bash
npm install
npm run dev
```

Open http://localhost:5173 and sign in with a demo account. Both are one click away on the sign-in page.

| Vendor                              | Email                  | Password   |
| ----------------------------------- | ---------------------- | ---------- |
| Alex Chen, Golden Dumpling Co.      | `demo@nightmarket.app` | `demo1234` |
| Sam Rivera, Smoke & Fire Tacos      | `sam@nightmarket.app`  | `demo1234` |

To see first come, first served in action, sign in as Alex in one window and as Sam in a private window, then open the same market. When one of them books a stall, it disappears from the other's map in real time.

## Scripts

| Command             | What it does                                                                   |
| ------------------- | ------------------------------------------------------------------------------ |
| `npm run dev`       | API on port 4000 (restarts on change) plus the web app on port 5173 with hot reload |
| `npm run build`     | Production build of the web app into `client/dist`                             |
| `npm start`         | Build, then serve the web app and the API together on http://localhost:4000    |
| `npm run typecheck` | Type-check the shared API contract, the server and the client                 |
| `npm run db:reset`  | Restore the demo data. Safe to run while the server is up.                      |

## How it works

**Stack.** TypeScript end to end:

- **API:** Express 5 on Node 24. Node runs the `.ts` files directly, so the server has no build step. Data lives in SQLite via the built-in `node:sqlite` module.
- **Web app:** React 19 with Vite, Tailwind CSS 4, TanStack Query and React Router.
- **Shared contract:** `shared/src/index.ts` declares every request, response and error code once. The API routes and the web app's API client both compile against it, so if one side changes a field or an error code, the other fails to type-check until it matches.

**First come, first served.** The database enforces it, not the UI:

- Partial unique indexes allow only one confirmed booking per stall, and one per vendor per market.
- Every booking change runs inside a `BEGIN IMMEDIATE` transaction.
- If two vendors press Reserve at the same moment, exactly one wins. The other gets a clear "Someone just beat you to it".
- Switching stalls keeps the same booking reference. The old stall is released in the same transaction.

**Live floor plans.**

- Each market page keeps a server-sent events stream open at `/api/events/:slug/live`.
- When anyone books, switches or cancels, the server pushes a `stalls` event and every open map refetches.
- Stalls that someone else just took flash briefly. If one was the stall you were looking at, a message tells you.

**Accounts.** Passwords are hashed with scrypt. Sessions are random tokens in an HTTP-only cookie, and the database stores only a SHA-256 hash of each token.

**Data.** The database file is created and seeded on first run at `server/data/nightmarket.db`. Set `DB_PATH` or `PORT` to override the defaults.

## Adding or changing a market

Markets are defined in `server/src/seed.ts`. Each floor plan is drawn as text, one character per grid cell:

```
P  prime stall      C  corner stall      S  standard stall
.  walkway          #  feature area (stage seating, gardens…)
```

```ts
layout: [
  'CSSSSSP.PSSSSSC',
  'CSSSSSP.PSSSSSC',
  '...............',
  // …
],
```

Rows containing stalls are lettered A, B, C… and their stalls are numbered left to right. Walkway rows and columns render as narrow aisles. Each market sets its own price per tier. After editing, run `npm run db:reset`.

## Project structure

```
shared/src
  index.ts            The API contract: every request, response and error code

server/src
  index.ts            Express app; also serves client/dist in production
  db.ts               Schema, indexes and the transaction helper
  seed.ts             Demo vendors, markets and floor plans
  auth.ts             Password hashing and sessions
  live.ts             Server-sent events, one channel per market
  routes/             auth, events, bookings

client/src
  pages/              Sign in, register, markets, market floor plan, my bookings
  components/         StallMap, BookingPanel, NightScene illustrations, UI kit
  lib/                API client, query cache helpers, live updates, formatting
```
