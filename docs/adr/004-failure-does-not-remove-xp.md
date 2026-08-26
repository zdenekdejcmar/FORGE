# 004: Failure does not remove XP

## Context

Quest failures, retries, or missed completions should not punish a player by stripping progress that already existed.

## Decision

The system does not subtract previously earned XP when a quest is missed or abandoned. Recovery is encouraged rather than punished.

## Consequences

- Progress is stable and trustworthy.
- The gameplay loop is more motivating and resilient.
- The API remains simple and avoids destructive correction logic.
