# 001: Modular monolith

## Context

The sprint needs a clean architecture without introducing infrastructure overhead or premature service boundaries.

## Decision

Use a modular monolith with feature-oriented modules in the API and a small set of shared packages for domain and validation.

## Consequences

- Clear boundaries without microservice complexity.
- Easier local development and testing.
- Future extraction is still possible if the system grows.
