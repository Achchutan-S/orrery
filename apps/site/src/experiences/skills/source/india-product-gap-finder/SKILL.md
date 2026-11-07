---
name: india-product-gap-finder
description: "Find products or product categories that exist and work well elsewhere in the world but have no serious equivalent in the Indian market yet — across ANY product type: software/SaaS, physical consumer goods, industrial equipment, chemicals, machinery, components, FMCG, anything. This is a market-gap / import-substitution finder, distinct from problem-finder (which mines pain points). Use whenever the user wants to find 'what doesn't exist in India yet,' localization opportunities, import-substitution ideas, 'what's big abroad but missing here,' or wants to scan an industry/category for an unclaimed Indian market. Trigger even if the user only names a broad industry or says 'find me a product gap' without specifics."
---

# India Product Gap Finder

Finds product or product-category gaps: things that already work and have proven demand somewhere in the world, but have no serious Indian equivalent — whether that's a SaaS tool, a consumer good, a chemical, a machine, or a nut-and-bolt component. The core move is **comparison against a working global reference**, not raw pain-point mining (that's `problem-finder`).

Each run is stateless — treat every run as a fresh investigation.

## Who this is for

The user is a backend/AI software engineer based in India, but this skill is explicitly NOT limited to what they personally can build. Physical products, industrial goods, and capital-intensive categories are all in scope — flag buildability/capital requirements so the user can see the full space, including things they'd need a co-founder, manufacturer, or partner for.

## Step 1: Establish scope

Ask only what's missing after reading the request:
- **Industry/domain anchor** — fully open, or a named space (e.g. "consumer electronics," "farm equipment," "specialty chemicals," "dev tools")?
- **Sourcing direction** — global-category-scan (start from what exists abroad, check India), local-signal-mining (start from Indian complaints/import demand, work backward to what's missing), or both. Default to both unless told otherwise.
- **Product type breadth** — software only, physical only, or fully open across both? Default to fully open.

Always ask whether to use live web search — this skill is close to useless without it; almost every step below depends on verifying current Indian market presence, which can't be reasoned from training data alone (India's market moves fast and training data goes stale on exactly this).

## Step 2: Source candidates from both directions

**Global-scan direction:**
- Sweep a reference market's product/category lists for the chosen domain: for software, YC batches, Product Hunt, G2 categories; for physical goods, Amazon/Alibaba bestseller categories, trade show exhibitor lists, industry association product catalogs, import/export HS code categories; for industrial/chemical, supplier catalogs (ThomasNet, Alibaba, chemical distributor lines).
- For each category found, generate the specific product/sub-category, not just the top-level label ("productivity SaaS" is useless — "async standup bot for dev teams" is a candidate).

**Local-signal direction:**
- Search Indian sources for signals someone wants this but can't get it locally: import data / HS code trade statistics (high import volume = proven demand, no local supply), Indian forums/Reddit/Twitter "why is there no Indian X," IndiaMART/JustDial listings that are all resellers/importers rather than manufacturers, price complaints about imported goods (customs duty markup = latent local-production opportunity).

Aim for 10-20 raw candidates before filtering.

## Step 3: Verify the gap is real

This is the step most likely to produce false positives — don't skip it. For each candidate:
- Search Indian marketplaces/directories directly (Amazon.in, Flipkart, IndiaMART, JustDial, industry body member lists) for existing Indian players.
- Distinguish: **no Indian presence at all** (rare, flag prominently) vs **only imported/reseller presence, no local manufacturer/service** (common — often the real opportunity) vs **exists but with weak/low-quality/regional-only players** (a competitive gap, not an absence gap).
- If search is off, mark every candidate "unverified — reasoned only" rather than asserting a gap confidently.

## Step 4: Root-cause why the gap exists

Not every gap is an opportunity — some are gaps for good reason. Trace each surviving candidate through:

```
What exists elsewhere and works
→ what specifically is missing in India (no player / weak players / imports only)
→ why (pick the actual driver, don't default to "nobody's tried")
→ is that driver still true today, or has something changed (why now)
```

Common drivers to check against, roughly in order of how fatal they are to a newcomer:
- **Regulatory/licensing** (FSSAI, BIS certification, import licensing, drug/chemical controls) — can be a moat for whoever solves it, or a wall
- **Capital/manufacturing setup cost** — high capital gap = fewer competitors but higher barrier to entry for the user too
- **Technical know-how or IP** (process know-how, patents, specialized machinery)
- **Raw material access** (import-dependent inputs, regional availability)
- **Demand too small or nascent** — real but not yet worth serving; flag as "wait" not "build now"
- **Import tariffs make foreign goods viable enough** — reduces urgency unless tariffs are changing
- **Distribution/trust/last-mile** — solvable with the right go-to-market, often the most attackable driver
- **Nobody's actually tried yet** — genuinely happens, but verify rather than assume

## Step 5: Score and rank

Score each surviving candidate on:
- **Gap confidence** (verified absence → verified imports-only → reasoned, unverified)
- **Barrier type & height** (regulatory/capital-heavy → know-how/moderate → distribution-only/low)
- **Demand evidence** (import volume/spend, forum signal, or "reasoned, no evidence yet")
- **Why now** (nothing changed → mild tailwind → clear enabler — new regulation, PLI scheme, cheaper inputs, changed consumer behavior)

Order the shortlist by a rough blend — no fake precision, just ranked with a one-line reason each.

## Step 6: Output format

Ranked list, top 5-10 unless asked otherwise. Per candidate:

1. **Product/category** — specific, not a vague label ("cold-pressed neem-oil pesticide for smallholder farms," not "agritech")
2. **Reference** — where this works elsewhere, briefly (which market, roughly how big/proven)
3. **Gap status** — verified absent / imports-only / weak local players — plus the evidence
4. **Root cause** — the one-line chain from Step 4
5. **Barrier type** — 🔒 Regulatory · 💰 Capital-heavy · 🧪 Know-how/IP · 🚚 Distribution-only · 🌱 Demand-nascent
6. **Product type** — software / physical consumer good / industrial-B2B / chemical-material / machinery-equipment / service (tag freely, this list isn't exhaustive)
7. **Who'd need to build this** — 🔧 Solo/small-team buildable · 🏭 Needs manufacturing/capital partner · 🤝 Needs regulatory/domain partner

## Step 7: Recommend, don't just list

Close with a forced recommendation, same spirit as problem-finder:

```
Recommended next move

Build now: <candidate> — the 1-2 factors making it the pick
Investigate further: <candidate> — the specific unknown that would resolve it (e.g. "check actual import volume," "confirm BIS certification cost")
Avoid for now: <candidate> — the one reason it's not worth pursuing yet
```

End with a one-line prompt asking which candidate to dig into further (competitor deep-dive, import-data pull, regulatory pathway, MVP scoping) — don't do that unprompted.

## Relationship to problem-finder

If the user's request is really "what's annoying people" rather than "what's missing that exists elsewhere," that's `problem-finder`, not this skill. If they explicitly compare against a foreign market or ask what's "missing in India" / "not localized yet," use this one. When genuinely unsure, ask one clarifying question rather than guessing.

## Notes

- Resist "X for India" listicle output where X is just an untranslated foreign product name with no verification step done.
- Physical/industrial candidates need real Step 3 verification — it's easy to assume "no Indian manufacturer" when one exists three states away under a name that doesn't show up in an English-language search.
- If a domain is thin on signal, say so rather than padding with weak filler.
