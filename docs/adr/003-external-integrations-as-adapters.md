# 003: External integrations as adapters

## Context

The product may eventually integrate with external systems, but they are not part of the core gameplay loop in this sprint.

## Decision

Keep domain logic independent from OAuth, API clients, and other external integrations behind adapter boundaries.

## Consequences

- The core progression loop remains portable and testable.
- Future integrations can be added without disturbing the design.
- Sprint scope remains disciplined.
