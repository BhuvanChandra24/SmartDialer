# Simulation notes

The local simulation is meant to model a realistic but bounded dialer environment. It simulates:

- a provider with a failure rate
- duplicate event generation
- out-of-order event generation
- varied agent availability
- borrower and answer-rate variation
- a campaign running under a chosen pacing mode

## Simulation goal

The simulation exists to test the resilience of the system under realistic noise and imperfect event delivery. The design is not a fully distributed load test; instead, it focuses on the correctness of state transitions and operational decisions.

## Main invariants checked during simulation

- capacity is never overcommitted
- duplicate provider events do not double count outcomes
- stale events are ignored
- provider gaps are recovered by the service after failure
- safety decisions remain auditable and consistent
