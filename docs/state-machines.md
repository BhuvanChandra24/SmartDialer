# Dialer state models

## Agent state

Agents move through a lightweight state machine:

- AVAILABLE
- RESERVED
- ACTIVE
- OFFLINE
- UNAVAILABLE

A reservation is not a final commitment. It is a temporary hold while the Safety Controller validates demand and the provider accepts the workload.

## Call state

Calls follow this general lifecycle:

- QUEUED
- DIALING
- CONNECTED
- COMPLETED
- FAILED
- DECLINED

The service records each event with a provider event id, timestamp, and sequence so duplicate or stale updates can be rejected.

## Provider state

Providers can be in normal or degraded conditions:

- HEALTHY
- DEGRADED
- CIRCUIT_OPEN
- RECOVERING

A degraded provider has lower confidence for a burst of new demand, while a circuit-open provider refuses new calls until the circuit is recovered.

## Campaign state

Campaigns are expected to be in one of these modes:

- IDLE
- RUNNING
- PAUSED
- STOPPED

State transitions are applied by the service layer so there is no drift between the API layer and the underlying state machine.
