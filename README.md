# SmartDialer

A lightweight SmartDialer prototype built for the CredResolve recruitment assignment. It models the key dialer problems that matter in a real collections environment: progressive and predictive pacing, agent reservation, provider health, safety gating, duplicate provider events, and basic operational monitoring.

## What this project includes

- React + TypeScript + Vite frontend
- Express backend with an in-memory service layer backed by SQLite persistence
- Agent and borrower allocation logic
- Progressive and predictive dialing logic
- Independent Safety Controller enforcement
- Mock provider health and failure simulation
- Event deduplication and stale event rejection
- Operational dashboard and simulation views
- Regression tests for the core safety invariants

## Architecture

The backend is centered on `SmartDialerService` in `server/service.ts`. It holds the authoritative state for:

- campaign state
- agent lifecycle
- borrower state
- call records and event history
- provider health and circuit state
- safety decisions
- pacing recommendations

The request flow is intentionally simple and interview-friendly:

Campaign -> Pacing Engine -> Safety Controller -> Allocation -> Provider Event Processing

## Running locally

```bash
npm install
npm run dev
```

Then open the frontend at:

- http://localhost:5173/

The backend API runs at:

- http://localhost:3001/

## Useful commands

```bash
npm test -- --run
npm run build
npm run dev:server
npm run dev:client
```

## Safety model

The critical rule is that predictive pacing never calls the provider directly. The pacing engine can recommend a volume, but the Safety Controller must authorize the actual dialing batch before agents are reserved and outbound calls are created.

## Current limitations

- This is a single-process prototype, not a distributed multi-worker deployment.
- The database is SQLite rather than a full production-grade multi-node system.
- The historical chart data is derived from seeded operational values rather than a long-term analytics store.

## Key files

- `server/service.ts` — core dialer and safety logic
- `server/index.ts` — REST API entrypoint
- `server/db.ts` — SQLite persistence layer
- `server/types.ts` — domain models
- `server/tests/safety.test.ts` — safety and invariant regressions
- `src/App.tsx` — frontend dashboard

## Assignment fit

The project is designed to demonstrate the most important engineering behaviors from the assignment:

- safe agent allocation under contention
- capacity checks before calling the provider
- deduplicated provider events
- stale event rejection
- provider circuit recovery
- explainable predictive pacing
- operational dashboard for live state
