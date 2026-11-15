## What changes

<!-- One or two sentences. -->

## Checks

- [ ] `pnpm typecheck && pnpm test && pnpm check && pnpm test:browser` passed locally

## Only if this publishes or materially changes an experience (contract § 8.5)

- Direction record: `docs/design/registry/<id>.md`
- [ ] P0: its direction was approved before the bulk was built
- [ ] P2: a person ran the manual accessibility checklist; result recorded in `docs/accessibility.md` § Results
- [ ] P4: `pnpm smoke <preview-url> --env preview` passed on this branch's preview
- [ ] P7: the final design review in the record is marked approved by the owner
- [ ] Resume changes only: the local private-terms check passed (`docs/resume.md` § Privacy check)

Leave a box unticked rather than tick what did not happen, and say why.
