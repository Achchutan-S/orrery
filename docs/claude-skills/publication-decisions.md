# Claude Skills Archive: publication decisions

The public record of what the archive (`/skills`, experience `skills`) publishes and why. The machine-readable form is `apps/site/src/experiences/skills/source/manifest.json`, which records each published file's SHA-256 and, for a file edited for publication, the original's SHA-256 and what changed. The discovery inventory, with machine paths and private notes, stays in `docs/claude-skills/private/`, which is gitignored and never committed.

**The repository is public.** Committing a source copy publishes it on GitHub, whatever the experience's release state (ADR-022). Removing a file later does not remove it from Git history; see [History](#history).

## Two layers

- **Editorial:** `apps/site/src/experiences/skills/entries/<slug>.ts`, written for the archive from each skill's text. It may be improved at any time.
- **Original:** `apps/site/src/experiences/skills/source/<slug>/`, copied by `pnpm --filter @pu/site skills:source --import <slug>`. Files are byte-for-byte copies unless the manifest marks them `edited`. Import never overwrites an edited file. The build, `pnpm test` and `skills:source` verify every published copy against its recorded SHA-256. On the owner's machine the script also checks each original against the hash it was published from, so a changed original is reported as out of date.

## Published (7 November 2026)

| Skill | Files | Edited for publication |
| --- | --- | --- |
| conceptcast | `SKILL.md` | no |
| deep-dive-audio | `SKILL.md`, `references/spoken-style.md`, `references/topic-playbooks.md` | no |
| interview-quick-answer | `SKILL.md` | yes: line 132 no longer describes how its author types questions; it now says "Questions may be dictated." |
| system-design-prep | `SKILL.md`, `references/output-format-example.md`, `references/tradeoffs-cheatsheet.md` | yes: the worked example no longer presents the author's own practice session (title, one added sentence marking the notes illustrative, one note reworded); the format it demonstrates is unchanged |
| sidequest | `SKILL.md`, `config.json`, `scripts/quest.py` | no |

All five are the owner's own work, and each has a full ZIP package. Kept as generic examples, not personal information: Kafka, the Chola empire, ₹50 and "fifty crore rupees", Ticketmaster and IRCTC as example systems, version facts about Java and Spring Boot, ConceptCast's default of Java and Spring Boot for code examples, and "outside my field" as a phrase a user would type.

Claude.ai's help page gives a 200-character limit for an uploaded skill's description (support article 12512198, read 7 November 2026). Four published skills have longer descriptions: deep-dive-audio, interview-quick-answer, sidequest and system-design-prep. Each keeps its original description in `SKILL.md` and its ZIP. Its entry also carries a separate `claudeAiDescription` of at most 200 characters, written by the archive and labelled as such in the install steps. `validate.ts` requires one wherever the original is longer than 200 characters.

## Removed (7 November 2026, owner decision)

| Skill | Reason |
| --- | --- |
| moral-oratory | Personal and political: its instructions describe the author, their motivation and current political events, and a reference file is a dated fact file. |
| problem-finder | Its instructions describe the author (role, stack, country) and calibrate results to that profile. |
| india-product-gap-finder | Its instructions describe the author (role, country). |
| vedic-astrology-tamil | The owner decided to remove it. Its scripts held example birth details that may be real, and they depend on AGPL-licensed pyswisseph and Swiss Ephemeris. |
| wayfinder | The owner decided to remove it. It is Matt Pocock's work (MIT), not the owner's, and depends on companion skills not in the archive. |

Removing a skill takes out its page, files, ZIP, shelf placement, related links, guide references and tests. No route for a removed skill exists in any build.

## History

`99b70f6` ("Publish skills", 7 November 2026) committed the archive with ten skills while it was still a draft. That commit, and therefore GitHub's history, still contains:
- the source copies of problem-finder, india-product-gap-finder, vedic-astrology-tamil's `SKILL.md` and wayfinder (with its MIT notice);
- the original, unedited text of the two files later edited for publication.

The history was not rewritten. Only an owner-led history rewrite, together with GitHub's cached-view removal, would take them out.

## Changing a decision

1. To publish a skill, add it to the private origin map, run `pnpm --filter @pu/site skills:source --import <slug>`, write its entry, and add it to this record. To remove one, delete `source/<slug>/`, its entry and its manifest record.
2. Edit a file for publication only by hand: change the copy, set `edited.originalSha256` (the original's hash) and `edited.note` (what changed) in the manifest, and update `sha256` and `bytes`.
3. Run `pnpm test`. The archive's tests check that the manifest, files and entries agree, that nothing private is published, and that removed skills leave nothing behind.
