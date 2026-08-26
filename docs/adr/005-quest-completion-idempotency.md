# 005: Quest completion idempotency

## Context

Repeated requests, refreshes, and network retries must not award XP more than once for the same quest.

## Decision

Quest completion is idempotent: a second completion request returns the existing state and never creates a second XP reward. The database also enforces uniqueness on a completion per quest and transaction uniqueness by source type and source ID.

## Consequences

- Double-click protection is built in.
- Race conditions are mitigated by database-level constraints.
- The API can safely support retrying the same request.
