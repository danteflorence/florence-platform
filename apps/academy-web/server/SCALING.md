# Live Class Server — Scaling

How the Socket.IO live server (`liveServer.mjs`) behaves under load and how to
scale it for many concurrent cohorts. Measure with `node server/loadTest.mjs`.

## What one instance handles

Load test (1 instructor + N students through join → poll → all answer → reveal),
after coalescing the answer/leave fan-out:

| N students | question fan-out p95 | live tally | join p95 (burst) | RSS |
|---|---|---|---|---|
| 200 | ~2 ms | ~124 ms | ~110 ms | ~93 MB |
| 400 | ~2 ms | ~123 ms | ~290 ms | ~185 MB |
| 800 | ~7 ms | ~124 ms | ~900 ms | ~200 MB |

Tally is **flat** with cohort size (was O(N²) ≈ 2 s at 800 before coalescing).
So **one instance comfortably runs a single large class.** The remaining
single-instance limit is *burst join fan-in* (hundreds connecting in the same
second) and total sockets per core — both addressed by scaling out.

## Capacity guards (per instance)

Past these, joins/connections are refused with a clear error instead of
degrading everyone (`MAX_*` env, defaults shown):

- `MAX_ROOM_MEMBERS` (1000) — a full class is rejected with "This class is full."
- `MAX_ROOMS` (1000) — a brand-new room past the cap → "Server is at room capacity."
- `MAX_SOCKETS` (20000) — new sockets past the cap are disconnected.
- `FLUSH_MS` (120) — coalescing window for answer/presence fan-out.

## Scaling out (many cohorts)

The natural unit is the **room (cohort)**: one class fits on one instance, so
scale by distributing rooms across instances.

Room **state** (slide index, poll, answers, members) lives in each instance's
memory. Therefore:

1. **Room-affinity routing (required).** The load balancer must send all sockets
   for a given room code to the **same** instance (consistent hashing on the
   `room` query param, or sticky sessions keyed by room). This keeps each room's
   state coherent and is what lets state stay in-memory (fast, simple).
2. **Redis adapter (set `REDIS_URL`).** Attaches `@socket.io/redis-adapter` so
   any cross-instance emits fan out correctly. Required if affinity isn't strict;
   recommended regardless. `redis` + `@socket.io/redis-adapter` are optional deps,
   imported lazily — install them in the deploy image:
   ```
   npm i @socket.io/redis-adapter redis
   REDIS_URL=redis://… node server/liveServer.mjs
   ```
   The startup log shows `(redis)` or `(single-process)`.

> A future option is to move room state into Redis (shared) so any instance can
> serve any room without affinity — a larger refactor, not needed until a single
> class exceeds one instance, which the numbers above show is far off.

## What to provision

A managed **Redis** + a load balancer that supports **room-affinity / sticky
routing**. Nothing else changes in the app. Re-run `node server/loadTest.mjs`
against a deployed instance to confirm the numbers hold on your hardware.
