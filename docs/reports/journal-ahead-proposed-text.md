# Proposed text for the Journal chapter "Where Orrery is going"

Not applied. `apps/site/src/experiences/journal/chapters/08-ahead.mdx` is published content and still describes blueprint revision 2's roadmap. This is a proposed replacement for its front matter `summary` and `sources` and for the section "Growing in steps", written from [blueprint § 11](../blueprint.md#11-roadmap) in the chapter's existing impersonal voice. The sections "The Control Center" and "This Journal" are accurate and stay. The owner edits or approves it; then it is applied through a pull request (tracker, action O5).

```mdx
---
title: Where Orrery is going
summary: The roadmap as the blueprint now orders it: what is done, what comes next, and what waits for a reason.
sources:
  - docs/blueprint.md, § 11 Roadmap
  - docs/design/creative-process.md
  - docs/tracker.md
  - apps/control/README.md
---
import Claim from '../components/Claim.astro';

## Growing in steps

<Claim standing="planned">

The first plan for Orrery was written before any of it existed, and building it changed the order. The blueprint was revised once the platform was live. Each step below begins only when the one before it is finished and something real needs it.

</Claim>

<ol class="phases">
<li>

**The agreement.** A written contract between the platform and every experience: what an experience must provide, what it decides for itself, and what must be true before it is published. Done.

</li>
<li>

**A creative process.** The platform could prove that an unfinished page never reached the public, and could not say whether a finished one was any good. One experience was built in full, passed every check and was set aside for how it looked. So each new experience now starts from a one-page brief, is built one screen first, and is reviewed against that brief before the rest exists and again before it is published. The process is written and the tools for it are built; no new experience has yet been through it.

</li>
<li>

**New experiences.** Several, in deliberately different directions, each with its own typefaces and images, each through that process.

</li>
<li>

**A fuller Control Center.** Creating a draft experience from it, and seeing the results of the checks in it. Still local, still never running Git.

</li>
<li>

**Later, each when it has a reason.** Sign-in and experiences shared with chosen people, when there is something to share privately. Anonymous usage figures with a privacy page, when there is a question they would answer. Search, a feed and the platform's own domain have no date.

</li>
</ol>
```
