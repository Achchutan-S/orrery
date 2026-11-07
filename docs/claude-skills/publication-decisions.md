# Claude Skills Archive: publication decisions

The public record of what the archive (`/skills`, experience `skills`) publishes from each skill and why. The machine-readable form is `apps/site/src/experiences/skills/source/manifest.json`, which also records each published file's SHA-256. The full discovery inventory, with machine paths and private notes, stays in `docs/claude-skills/private/`, which is gitignored and never committed.

**The repository is public.** Committing a source copy publishes it on GitHub, whatever the experience's release state (ADR-022). The experience itself has no release entry: it is an owner-only draft, built locally and in previews, never in production, until the owner publishes it through the Control Center.

## Two layers

- **Editorial:** `apps/site/src/experiences/skills/entries/<slug>.ts`, written for the archive from each skill's text. It may be improved at any time.
- **Original:** `apps/site/src/experiences/skills/source/<slug>/`, a byte-for-byte copy made by `pnpm --filter @pu/site skills:source --import <slug>`. It is never edited by hand. The build, `pnpm test` and `pnpm --filter @pu/site skills:source` all verify every copy against its recorded SHA-256. On the owner's machine the script also compares each copy with its original and reports any that are out of date.

## Decisions (7 November 2026)

| Skill | Provenance | Source | Package | Reason |
| --- | --- | --- | --- | --- |
| conceptcast | original | published (1 file) | yes | — |
| deep-dive-audio | original | published (3 files) | yes | — |
| interview-quick-answer | original | published (1 file) | yes | — |
| system-design-prep | original | published (3 files) | yes | — |
| problem-finder | original | published (1 file) | yes | Its instructions describe the author's role and country; the public resume already states both. |
| india-product-gap-finder | original | published (1 file) | yes | Same note as problem-finder. |
| sidequest | original | published (3 files: SKILL.md, config.json, scripts/quest.py) | yes | Written for Claude.ai (memory tools, code execution); the page says it is not portable as written. |
| wayfinder | collected: Matt Pocock, [mattpocock/skills](https://github.com/mattpocock/skills), MIT | published (1 file) plus `LICENSE.txt` | yes | MIT allows redistribution with its notice, so the archive adds the notice as a separate, labelled file. This copy predates later upstream revisions and needs companion skills that are not included. |
| vedic-astrology-tamil | original (listed under the owner's own skills) | SKILL.md only | no | The four scripts are withheld. Their usage examples give a birth date and time that may be a real person's, and they import pyswisseph (AGPL-3.0) over the Swiss Ephemeris (AGPL or a professional licence), which needs a licence decision. |
| moral-oratory | original | withheld (10 files) | no | SKILL.md contains identifying personal context and refers to specific current political events, and one reference file is a dated fact file of graded allegations. The page explains the method only. |

## Publication review (7 November 2026)

**Source files.** All 15 published copies were compared with their originals and their recorded SHA-256 (`skills:source`: intact). A full read and a pattern scan found no credentials, tokens, URLs, contact details, machine paths, account identifiers, dates or employer names. `quest.py` imports only the Python standard library and reads only the memory file it is given. The reference files are the author's own prose; none reproduces third-party text.

**Lines that describe the author.** These are published unchanged, because the original is never edited:

| File | Line | Text (start) |
| --- | --- | --- |
| `problem-finder/SKILL.md` | 16–18 | `## Who this is calibrated for` / `The user is a backend/AI software engineer (Java/Spring Boot, Python, LLM tooling) working solo on side projects, based in India.` |
| `india-product-gap-finder/SKILL.md` | 12–14 | `## Who this is for` / `The user is a backend/AI software engineer based in India, but this skill is explicitly NOT limited to what they personally can build.` |

`problem-finder` lines 25 and 99 also say "AI/backend-buildable" and "fits backend/AI/web skillset". These describe the work, not the person.

**vedic-astrology-tamil examples.** The withheld scripts have two example birth inputs. Whether they are real cannot be determined from the files; only the owner can say.
- `calculate_chart.py` and `today_view.py`: `1998-06-15 14:32` at 13.0827, 80.2707, the commonly published coordinates of central Chennai. This reads as a generic demonstration.
- `ashtakavarga.py` and `chart_analysis.py`: `2002-06-26 22:52` at 12.9165, 79.1325, the commonly published coordinates of Vellore, with a minute-precise time. This is consistent with a real person's details.

The scripts stay withheld until the owner answers. Even then, publishing them unchanged would publish these lines, so a script with real details would need the owner to decide what to publish; the archive never edits an original.

**Licensing requirements for the Vedic scripts (if ever published).** This is a summary of the published licence terms, not legal advice.
- The scripts import `swisseph` from **pyswisseph**, licensed under the GNU Affero General Public License v3 (README and PyPI, read 7 November 2026). pyswisseph wraps the **Swiss Ephemeris** by Astrodienst, which is dual-licensed: AGPL, or the paid Swiss Ephemeris Professional License (astro.com/swisseph/swephinfo_e.htm; github.com/aloistr/swisseph LICENSE).
- The scripts contain neither library's code and ship no ephemeris data files. They call `pip install pyswisseph` and use `FLG_SWIEPH` without an ephemeris path. Publishing them distributes only the owner's own code.
- A program built on an AGPL library is normally distributed under AGPL-compatible terms. The straightforward path is to licence the scripts AGPL-3.0-or-later, include the licence text, and credit pyswisseph and the Swiss Ephemeris (Astrodienst AG). The alternative, a Professional License, is for software that cannot be AGPL.
- AGPL §13 adds obligations when the software is offered to users over a network. The archive serves the files statically and never runs them, so §13 would not apply to the archive itself.

**Claude.ai's description limit.** Anthropic's help page for custom skills (support.claude.com, article 12512198, read 7 November 2026) gives a 200-character maximum for an uploaded skill's description. The Agent Skills API allows 1,024, and Claude Code reads longer descriptions, truncating its listing at 1,536. Seven published skills have longer descriptions: deep-dive-audio, india-product-gap-finder, interview-quick-answer, problem-finder, sidequest, system-design-prep and vedic-astrology-tamil. Each keeps its original description in `SKILL.md` and in its ZIP. Its entry also has a separate `claudeAiDescription` of at most 200 characters, written by the archive and labelled as such, which the install section offers as a replacement line for a Claude.ai upload. `validate.ts` requires one wherever the original is longer than 200 characters.

## Open decisions for the owner

1. **Publishing the experience:** add a release entry, through the Control Center or a reviewed edit, when ready.
2. **vedic-astrology-tamil scripts:** say whether either example birth input is real, and choose a licence for the scripts (AGPL-3.0-or-later is the straightforward choice) before they can be published.
3. **moral-oratory:** stays private. A public version only as a separate skill the owner writes and approves; the original stays unedited and excluded.
4. **problem-finder, india-product-gap-finder:** publish them with the lines above, or withdraw them. They cannot be published without those lines.
5. **The seven compliant descriptions:** review the wording; the archive wrote them, not the skill's author.

## Changing a decision

1. Update the private origin map, then run `pnpm --filter @pu/site skills:source --import <slug>` (publish) or delete `source/<slug>/` (withdraw).
2. Edit the skill's `withheld` record in `manifest.json`, then update this table.
3. Run `pnpm test`. The archive's tests check that the manifest, the files and the entries agree, and that nothing private is published.
