# SmartDialer architecture

## Goal

The SmartDialer is a single-process engineering prototype for a CredResolve call center. It demonstrates how a dialer balances pacing, agent availability, provider trust, and safety checks under real operational volatility.

## Core layers

### 1. API layer

`server/index.ts` exposes the operational contract for:

- health checks
- overview and diagnostics
- campaign lifecycle commands
- provider selection
- dialing requests
- provider event intake
- simulation execution

### 2. Service layer

`server/service.ts` owns the authoritative state machine. It coordinates:

- campaign and mode state
- provider health
- reserved capacity and active call counts
- safety controller decisions
- pacing recommendations
- event processing and recovery

### 3. Persistence layer

`server/db.ts` keeps the state durable across runs using SQLite. The design is intentionally simple and testable, with a single row containing the serialized state JSON.

### 4. UI layer

`src/App.tsx` consumes the API and renders the current operational picture. This includes the campaign summary, safety history, provider health, pacing recommendation, and simulation controls.

## Safety-first invariant

The most important requirement is: every outbound dial request is evaluated by the Safety Controller before it is accepted.

The flow is:

1. The campaign receives a requested call volume.
2. The pacing engine calculates a recommended volume.
3. The Safety Controller checks whether the request is valid.
4. Agent capacity is reserved only after approval.
5. Provider events are processed with dedupe and ordering checks.

This makes the business rule independent from the UI and prevents a client-side bypass.

## Key rules

- no double reservation of the same agent for the same call batch
- reserved capacity must not exceed available capacity
- duplicate provider events must be rejected
- stale or out-of-order events cannot change state incorrectly
- provider circuits recover when a provider becomes healthy again
- a paused or stopped campaign cannot accept new dial work

## Operational outcomes

The system exposes actionable signals for operations teams:

- current utilization
- reserve and capacity numbers
- provider health and risk
- safety decisions and explanations
- pacing adjustments

These outputs are meant to be plausible to a real operations dashboard, rather than just a static mock.
