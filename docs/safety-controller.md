# Safety Controller contract

The Safety Controller is a core actor in the SmartDialer and not merely a UI label.

## Required behavior

Every dialing request is reviewed by a server-side check before it is accepted. The controller evaluates:

- total requested calls
- currently available capacity
- reserved capacity
- active provider load
- campaign status
- provider health and circuit state
- prior safety decisions and risk context

## Decision outcomes

The controller can approve, reject, or partially throttle the request.

- Approve: safe to continue with allocation
- Reject: the request violates operational constraints
- Throttle: reduce the requested volume to an acceptable level

## Why this matters

This design intentionally ensures the safety rule remains independent from the frontend and cannot be bypassed by user input or UI manipulation. In other words, the UI may display a request, but the backend still decides whether the system is allowed to act.
