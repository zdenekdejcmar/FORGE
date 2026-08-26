# 002: XP ledger

## Context

XP must be auditable and should not be vulnerable to mutation bugs or duplicate rewards.

## Decision

Store XP as append-only transaction records, with character totals derived from the ledger.

## Consequences

- Every XP change can be explained by an immutable source event.
- Auditing and debugging become straightforward.
- The character total is a projection, not the source of truth.
