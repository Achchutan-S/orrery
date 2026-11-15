# ADR-029 — CI is the release gate: `main` changes only by pull request

Status: accepted (13 November 2026); **the GitHub setting is the owner's to apply and is not yet confirmed** ([tracker](../tracker.md)) · Implements blueprint decision D16 and tracker decision 7 · Extends [ADR-015](adr-015-ci.md) · Written by an agent after the decision it implements; the owner accepts this text by merging the pull request that adds it

## Context

Vercel builds every push to `main` in parallel with GitHub Actions, and `main` had no branch protection. The production build gate covers typecheck, boundaries, validation, metadata, leaks and budgets, but not unit or browser tests. On 3 November 2026 commit `f49d6dc` failed the hosted browser job (run 41582947609) and was deployed 29 seconds later.

## Decision

1. `main` is protected: changes arrive by pull request; the two CI jobs, "Typecheck, tests and guardrails" and "Browser (Playwright and axe)", are required status checks; the branch must be up to date before merging; force pushes and deletion are blocked; the rule applies to administrators.
2. Direct pushes to `main` stop. The owner opens a pull request from a branch and merges it when both jobs pass. No review by a second person is required: there is one owner.
3. Vercel keeps building `main` on merge. Because only commits that passed CI can reach `main`, the production build then only ever sees tested commits. Vercel's own deployment checks are not used: one gate, in one place.
4. A pull request that publishes an experience names its design review record and manual accessibility result (`.github/pull_request_template.md`), so the review-enforced prerequisites of contract § 8.5 are asked for at the one place every release now passes through.
5. CI still uses no secrets and a read-only token. Dependabot's pull requests go through the same gate.

## Alternatives considered

- *Vercel deployment checks or `ignoreCommand`:* a second place to configure, tied to one host.
- *Rely on the build gate:* it does not run tests; `f49d6dc` is the counter-example.
- *Keep direct pushes and check CI by hand:* that was contract P3, and it was not followed.

## Consequences

- Every change costs one pull request and a CI run (about five to ten minutes).
- Contract P3 is enforced by GitHub once the setting is on; until the owner confirms it, P3 stays a manual check.
- A hotfix cannot bypass the gate. Vercel Instant Rollback remains the fast path for a bad deployment ([deployment.md § Rollback](../deployment.md#rollback)).
