# PR Review Spec

This file is the contract Claude should review against.

## Required Checks

### SEC-001: No Secrets

The PR must not add hardcoded passwords, tokens, private keys, API keys, credentials, or connection strings.

Failure behavior:
- Reject the PR.
- Leave a blocker comment on the changed file.
- Suggest moving the value to a secret manager or environment variable.

### TEST-001: Tests For New Behavior

New business logic, user-facing behavior, bug fixes, and critical workflows must include relevant tests.

Failure behavior:
- Reject the PR when meaningful behavior is added without tests.
- Explain what test should be added.

### ERR-001: Error Handling

Risky operations must include explicit error handling.

Risky operations include:
- Network calls
- Database calls
- File system reads/writes
- Authentication and authorization logic
- Payment or billing logic

Failure behavior:
- Reject when missing error handling could cause user-visible failure, data loss, or security risk.

### ARCH-001: Architecture Boundaries

The PR must respect existing module, layer, and dependency boundaries.

Failure behavior:
- Reject if business logic is placed in the wrong layer or if dependencies point in an unsafe direction.

### PERF-001: Avoid Obvious Performance Regressions

The PR must not introduce obvious N+1 calls, unbounded loops in request paths, or unnecessary expensive work.

Failure behavior:
- Reject when the performance issue is likely to affect production traffic.

## Scoring

- 90-100: Clean PR with no meaningful issues.
- 70-89: Acceptable PR with minor non-blocking comments.
- 50-69: Risky PR with at least one issue that should be fixed.
- 0-49: Unsafe PR with serious security, correctness, or architecture problems.

Any blocker finding should normally produce a `REJECT` verdict.
