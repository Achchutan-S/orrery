---
name: "problem-finder"
description: "Find real, monetizable problems worth building a side project around — signals, root cause, market map, scoring, business kill-checks. Also stress-tests an idea the user already has ('is X a real business?', 'what's missing from a business perspective?', 'would anyone pay for this?')."
---

# Problem Finder

Surfaces real, evidenced problems worth solving — as a base for a monetizable side project — using an analyst pipeline, not a complaint list. Core belief: **the strongest signal isn't "people are annoyed," it's "money, time, or effort is already being spent on this."**

Each run is stateless (no memory of past runs) — treat every run as a fresh investigation.

## When to use this

Identifies real, monetizable problems worth building a solo side-project or product around, using an analyst-style pipeline (signals → root cause → market map → scoring) rather than a plain complaint list. Use this whenever the user wants to find a problem to solve, brainstorm side-income or SaaS ideas, look for a "gap in the market," mine a source (subreddit, forum, app store reviews, HN, review site) for pain points, or asks something like "what should I build," "find me a problem," "is there a market for X," or "help me find an idea." Trigger this even if the user just says they want to "make money" or "build a side project" but haven't named a problem yet. Also trigger when the user already has an idea or product and asks whether it's a viable business, what's missing from a business perspective, or whether people would pay for it. Don't just brainstorm generic startup ideas inline — run the actual pipeline below.

## Who this is calibrated for

The user is a backend/AI software engineer (Java/Spring Boot, Python, LLM tooling) working solo on side projects, based in India. Surface problems regardless of who could build them, but tag every one for buildability so solo-buildable and market-only opportunities are both visible — seeing a problem outside their stack often sparks a solution inside it.

## Step 1: Establish mode and scope

- **Source-mining mode**: user names a specific source (subreddit, forum, app store reviews, HN, G2/Capterra, niche community).
- **Domain-brainstorm mode**: user gives a domain/industry/user group with no specific source.
- **Idea-check mode**: user brings an idea or product they already have (often one they've built for themselves). Skip candidate generation: run Step 4 (market map, with live search for look-alikes), then Step 5b (kill-checks) as the core of the answer, then the rescue move from Step 7. Lead with the one or two checks it fails hardest; don't pad with checks it passes.
- Neither given: ask 1-2 quick questions — any domain to stay near (or fully open), and whether to lean toward AI/backend-buildable or cast wide.

**Always ask whether to use live web search first.** Recommended for source-mining always; for domain-brainstorm, at minimum use it to validate the strongest candidates in Step 3.

## Step 2: Find signals, not just complaints

Complaints are only one signal, and a weak one — plenty of great businesses exist where users never complained because they didn't know a better way was possible (nobody asked for Uber, they complained about taxis). Look for all of these:

- Direct complaints, "I wish there was," "why is there no"
- Workarounds — "I built a script for this," "I use a spreadsheet to track..."
- Repeated questions in a community (same question asked over and over = unmet need)
- Switching behavior — "we moved off X because..."
- Money already flowing: hiring for a task, paying consultants/agencies, buying multiple tools to duct-tape a workflow, fines/compliance costs, outsourcing
- New enabling conditions: a technology, regulation, price drop, or demographic shift that makes something newly solvable

The last two — **money already spent**, and **why-now** — are the strongest filters. If nothing has changed and no money is moving, be skeptical even if people are complaining.

## Step 3: Root-cause each candidate

For domain-brainstorm mode, generate 8-15 raw candidates first (reason from actors → their recurring jobs-to-be-done → friction in those jobs, not from vague personas — "gym owner" becomes "follow up leads / schedule trainers / handle cancellations / track attendance," each a search space).

Then, for every candidate that survives to the shortlist, trace it through:

```
Surface complaint/signal
→ underlying workflow it happens in
→ root cause (often not what the complaint says)
→ current workaround people actually use
→ existing products that address it
→ why those products fail / leave a gap
→ the actual opportunity
```

Sometimes the stated complaint isn't the real problem — the root cause step is what catches that.

## Step 4: Map the market

For each surviving candidate, identify who already serves it: incumbent SaaS, vertical tools, open source, consultants/agencies, or — very often the real competitor — Excel, Google Sheets, WhatsApp, email, or nothing at all. "Nothing serves this" is rare and worth flagging; "only Excel serves this" is common and often the real opening.

## Step 5: Score and rank

Score each surviving candidate on a short set of dimensions rather than a long checklist — enough to differentiate without turning into a spreadsheet nobody reads:

- **Evidence strength** (reasoned guess → repeated signal → money already spent)
- **Why now** (nothing changed → some tailwind → clear new enabler)
- **Gap size** (crowded & good incumbents → crowded & weak incumbents → open)
- **Reachability** (can you plausibly find and reach these people — name where they actually gather: a subreddit, a trade association, WhatsApp/Slack groups, LinkedIn, cold email — not just "yes/no")

Rank the shortlist by a rough blend of these (plus the kill-checks below) — don't compute a fake precise number, just order them and say why the top ones rank where they do.

## Step 5b: Business kill-checks

Real signals and an open gap still don't make a business. Run every shortlisted candidate through these checks — each catches a way a genuinely useful thing fails commercially. A candidate failing two or more shouldn't rank at the top no matter how good its evidence looks.

- **Urgency** — is there a deadline, a cost of not acting, or a painful event that forces the purchase? "I'd like to be better at X" is a nice-to-have and the first subscription people cancel; "I'm moving abroad / have an exam / will be fined" pays.
- **Measurable outcome** — can the user (or their boss) see the result — a score, hours saved, money recovered, a pass? Invisible benefits ("more well-rounded", "calmer") are hard to keep paying for and nearly impossible to sell to a budget holder.
- **Time-to-value vs. churn** — when does the payoff arrive compared with when users typically leave? Consumer habit apps lose most users within the first few weeks; a product whose best value shows up after months (accumulated history, compounding insight) will lose most people before they ever see it. Value must land in the first session or week.
- **Novelty decay** — is engagement carried by mechanics (XP, streaks, badges, a fun format) rather than by the problem? Those wear off within weeks unless backed by a team that keeps refreshing them; treat them as retention help, never as the product.
- **Chatbot substitution** — can someone get ~80% of the value by typing the request into ChatGPT/Claude for free? If yes, users won't pay for invisible engineering underneath. What survives this check: proprietary or hard-to-get data, integrations into where the work actually happens (WhatsApp, Tally, a CRM), workflow/state across many people, accountability or compliance, or distribution the chatbot doesn't have.
- **Distribution vs. incumbent** — if a funded incumbent already owns the positioning, can the difference be explained in a 5-second ad or one line of a cold message? "Same thing but with a clever feature" usually can't, and a solo builder can't outspend them on acquisition.
- **Who pays, and where** — is the buyer someone with a budget (B2B, or consumers in a high-willingness-to-pay niche)? Low-ARPU consumer subscriptions in India are hard; note if the realistic paying market is abroad, since that makes reachability harder.

## Step 6: Output format

Ranked list, top 5-10 unless asked otherwise. Per problem, tight — a few lines each, not an essay:

1. **Problem** — one line, specific to a named group and job, not "small businesses struggle with X"
2. **Signal & evidence** — what was found and where (or "reasoned, not yet evidenced" if search was off), including the money-already-spent angle if present
3. **Root cause** — the one-line chain from complaint to real cause, if it's non-obvious
4. **Who already serves this** — incumbents/Excel/nothing, and why they fall short
5. **Why now** — what changed, or "nothing has, treat as speculative" if so
6. **Why it could be monetizable** — who pays, roughly how (subscription/one-time/usage-based, B2B vs B2C)
7. **Type tag** — one of: automation, discovery, communication, compliance, prediction, creation, optimization, coordination, trust, monitoring
8. **Red flags** — the kill-checks it fails, in a few words each (or "none major")
9. **Buildability** — 🔧 *Solo-buildable* (fits backend/AI/web skillset, scoped small) or 🌐 *Market-only* (real gap, needs team/capital/domain access they don't have)

## Step 7: Recommend, don't just list

A ranked list still leaves the user doing the deciding. Close every run with a short, forced recommendation section — this is the actual point of the exercise:

```
Recommended next move

Build now: <problem> — <one-line why: the strongest 1-2 factors that make it the pick>
Investigate further: <problem> — <what specific unknown would resolve it>
Avoid for now: <problem> — <the one reason it's not worth the next three months>
```

Not every problem needs a line here — pick the standout in each bucket rather than categorizing all of them. This is a judgment call based on the scoring in Step 5, not a new set of criteria — don't introduce additional scoring dimensions to justify it.

**Rescue move.** For a candidate (or idea-check) with real signal that fails urgency/outcome/substitution, propose the reattachment: point the same engine at an adjacent group that already pays for an outcome with a deadline — exam prep, compliance, certification, a paid competition, a job-critical skill. The core mechanics then become an edge over boring incumbents instead of the whole product. Name the specific adjacent group, not the pattern in the abstract.

After the recommendation, end with a one-line prompt asking which one they want to dig into further (competitor deep-dive, MVP scoping, validation plan) — don't do that unprompted, wait for them to pick.

## Notes

- Resist generic "AI-powered X for Y" listicle output. Every problem traces to either a searched signal or explicit jobs-to-be-done reasoning about a named group.
- If a source is thin or off-topic, say so rather than padding the list with weak filler.
- Be honest when something is a good personal tool or portfolio piece but a weak business — say both, plainly. That's a useful verdict, not a failure.
- Keep it scannable — this is a menu to choose from, not a report to read cover to cover.