---
name: "system-design-prep"
description: Runs a structured system design interview prep session for any system (Ticketmaster, IRCTC, WhatsApp, Duolingo, URL shortener, etc.) through phases — Requirements/Scope, FR, NFR, Core Entities, APIs, HLD, DB/Schema, Deep Dives (LLD) — ending in a Q&A ideal-answer reference doc. Use whenever the user says "/system-design", asks to practice a system design interview, prep for a FAANG-style round, or go phase by phase through requirements/entities/API/HLD/LLD for a system. Also covers study mode — if the user just names an unfamiliar system ("Duolingo system design", "notes on designing Spotify") with no attempt of their own, generate the full ideal FR/NFR/entities/HLD/deep-dive breakdown directly as study notes. Also use for a mock interview round or gap-analysis of a design the user already drafted.
---

# System Design Interview Prep

A phase-by-phase walkthrough for practicing system design interviews, ending in a
retainable reference doc. Built from working through Ticketmaster end-to-end;
reusable for any system (IRCTC, WhatsApp, URL shortener, ride-sharing, etc.).

## Trigger and mode

The user may invoke this as `/system-design <system name>` or just describe the
system and ask to work through it. Two modes:

- **Build mode** — user is starting fresh or partway through a system, dictating
  their own attempt. Walk phases below, eliciting their answers.
- **Review mode** — user already has notes/a transcript for a system and wants gaps
  found + a reference doc. Skip straight to "Closing gaps" below.
- **Study mode** — user names a system with no attempt of their own ("Duolingo
  system design", "give me notes on designing Spotify", "teach me how X would be
  designed") — they want to learn the system before trying it themselves. See
  "Study mode" section below instead of eliciting answers.

Ask the user which mode up front only if it's not obvious from their message. A
bare system name with no dictated content defaults to study mode; a system name
plus the user's own requirements/notes defaults to build mode.

## Study mode

Generate the complete ideal design yourself, phase by phase, without waiting for
the user to attempt it first — this is a learning pass, not an interview
simulation.

- Go through the same phase order below, but *you* fill in each phase directly:
  realistic FR/NFR for that specific system, its actual core entities, a sensible
  API surface, HLD, DB choice, and — most important — name the system's
  **distinctive hard problem(s)** early (the thing that makes this system different
  from a generic CRUD app) and go deep on it. E.g. Duolingo's distinctive problems
  are spaced-repetition scheduling and adaptive difficulty, not seat locking or
  inventory.
- Research current, real details where it plausibly changes the answer (e.g. actual
  scale figures, known architecture choices) rather than only inventing numbers —
  use web search if the system is a real product and specifics would strengthen
  the notes, but don't let research turn into extensive citation-heavy prose; keep
  it in the same practical, spoken-answer register as build mode.
- Apply the same trade-off cheatsheet (`references/tradeoffs-cheatsheet.md`) inline
  as each decision comes up.
- Output as a markdown study-notes file (not the Q&A "your note" format from
  Closing Gaps, since there's no user attempt to grade) — plain phase-by-phase
  notes the user can read to learn the system, written the way a strong candidate
  would explain it out loud.
- End with 3-5 follow-up questions an interviewer would likely ask on this system,
  so the user knows what to expect if they later practice it in build mode.
- After producing study notes, offer (don't force) to switch into build mode so
  they can attempt the same system themselves and get graded against it.

## Phase order

Go through these in order, but let the user dictate out of order or skip ahead if
they say so — don't force rigidity. After each phase, briefly note anything
missing before moving on, but don't lecture at length until the "closing gaps" step —
let them finish dictating each phase first, the way a real interview does.

1. **Scope & Requirements** — scale (DAU/QPS-class), functional requirements (what
   can users do), non-functional requirements (consistency vs availability, latency,
   read:write ratio). Explicitly state what's out of scope.
2. **Core Entities** — the nouns of the system and how they relate (not full schema
   yet, just entities + relationships).
3. **APIs** — endpoints that satisfy the FRs. Note REST vs GraphQL vs gRPC choice
   and why (see references/tradeoffs-cheatsheet.md).
4. **High-Level Design (HLD)** — components (client, gateway, services), how they
   connect, where data flows.
5. **Database / Schema** — actual columns per entity, SQL vs NoSQL choice and why,
   sharding/replication if scale demands it.
6. **Deep dives (LLD)** — the 1-3 hardest engineering problems specific to this
   system (e.g. for Ticketmaster: double-booking prevention, thundering herd on a
   popular event; for a URL shortener: ID generation/collision; for a chat app:
   message ordering/delivery guarantees). This is where most interview signal lives
   — don't skip or rush it.

## Back-of-envelope math

Whenever scale numbers come up (phase 1 or on request), walk the math live rather
than stating a number:
DAU → actions/day → QPS avg (÷86,400) → split by read:write ratio → apply a peak
multiplier (3-5x normal, 100-1000x for flash-crowd events on the write path
specifically) → rough storage estimate. The interviewer grades the method, not the
exact figure — always narrate the steps, don't just give a final number.

## Recurring trade-offs

Before answering "why did you pick X over Y" for any technology choice, check
`references/tradeoffs-cheatsheet.md` — it has one-liner justifications for the
trade-offs that recur across almost every system design problem (SQL vs NoSQL,
REST vs GraphQL, push vs pull, sync vs async, strong vs eventual consistency,
sharding triggers, caching, real-time delivery). Apply the relevant ones inline as
each phase comes up rather than saving them all for the end.

## Closing gaps — the output format

Once the user has dictated what they have (or asks to wrap up / "close the gaps" /
"give me the reference doc"), produce a markdown file using this exact structure —
this is the format that was tested and preferred over a plain evaluation table:

- **Lead with the question an interviewer would ask**, not with a verdict on what
  the user said.
- **Give the full ideal answer** as something they could say verbatim in an
  interview — complete sentences, not bullet fragments, written in first person
  ("I'd...") as if the candidate is speaking.
- **End each entry with a one-line note**, prefixed `> *Your note:*`, stating
  briefly whether they covered it, missed it, or partially covered it — and if
  partial, the one phrase that would complete it. This note is secondary, not the
  headline.
- Cover every phase, weighted toward the deep-dive/LLD questions since that's
  where interviews concentrate.
- Close with a **self-check checklist** — one line per question, phrased as
  something to say out loud in under 30 seconds with no notes.

See `references/output-format-example.md` for a worked example (Ticketmaster) if a
concrete template is useful before generating a new one.

Always create this as an actual markdown file (via create_file + present_files),
not just inline chat text — it's meant to be saved and reused, per the file-creation
rules already in the system prompt for reference content the user will keep.

## Mock round (optional, on request)

If the user wants to rehearse rather than just read the reference doc: ask the
questions from the closing-gaps doc one at a time, cold (don't show the ideal
answer first), let them answer out loud/in text, then grade against the ideal
answer and flag anything missing before moving to the next question.

## Extending to a new system

When the user starts a new system (e.g. after Ticketmaster, moves to IRCTC), reuse
the same phase structure and trade-off cheatsheet, but actively look for what's
*different* about this system's hardest problem — that's usually the real signal.
E.g. IRCTC's distinctive hard problem is quota-based allocation (tatkal/general/
ladies) and a waitlist that reorders on cancellation, not just seat locking. Name
the system's distinctive hard problem early in the deep-dive phase rather than
defaulting to the same answers as the last system.
