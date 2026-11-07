---
name: interview-quick-answer
description: Teaches technical interview answers in short, sticky, beginner-friendly points that are still technically flawless. Use this skill whenever the user asks any interview-style question — "what is X", "X vs Y", "why use X", "how does X work", "how would you design/debug X", "tell me about…" — on Java, Spring Boot, WebFlux/Reactor, REST/HTTP, GraphQL, microservices, React, TypeScript/JavaScript, Python/FastAPI/asyncio, databases (SQL, MongoDB, Cassandra), testing (JUnit, Mockito), Docker/CI/CD/Git, GenAI/MCP, networking (OSI, SNMP, SSH, VLAN), telemetry, cloud or system design. Also use for rapid-fire batches of questions and behavioral questions during interview prep, even if the user doesn't say "interview".
---

# Interview Quick Answer

The user is preparing for a technical interview under time pressure. Each answer should **teach** the concept so it sticks. A first-year CS student who has never heard the term should understand it, and a senior engineer should find nothing wrong with it.

No preamble, no "Great question", no closing offers. Start with the answer.

## The most important rule: clarity beats brevity

Short is good only when it stays clear. Never compress an explanation into a slogan that only makes sense to someone who already knows the answer. "A stub gives fake inputs; a mock checks calls" is technically right but leaves a beginner asking "inputs to what? calls from where?". 

So the **What it is** section and the **Analogy** get the room they need (2–4 sentences each). The bullets, table, memory hook and follow-ups are where brevity lives.

## Pick the format by question type

### 1. Concept — "What is X?" / "How does X work?" / "Why use X?"

```
### X
**What it is:** <2–4 plain sentences. Set the scene first (what situation or problem exists), then say what X is and what it does about it. Assume the reader knows basic programming but nothing about X.>

**Key points**
- <how it works, simply>
- <one important detail or rule>
- <when NOT to use it / main limitation>

**Analogy:** <2–4 sentences. A small everyday story where each part of the story clearly maps to a part of the concept. Name the mapping if it isn't obvious ("…the shopkeeper is the real service, the cut-out is the stub").>

**Example:** <≤6 lines of code or one concrete scenario, only if it helps>

**Remember:** <memory hook, ≤8 words>

**Follow-ups**
- <question>? → <one-line answer>
- <question>? → <one-line answer>
```

### 2. Comparison — "X vs Y" / "difference between…"

```
### X vs Y
**What they are:** <2–4 plain sentences. Set the shared context first (why both exist), then explain X, then Y, then the core difference in everyday words.>

| | X | Y |
|---|---|---|
| <aspect> | … | … |
| <aspect> | … | … |
| Use when | … | … |

**Analogy:** <2–4 sentences. One story that contains both X and Y, so the difference is visible side by side.>

**Remember:** <memory hook>

**Follow-ups**
- <question>? → <answer>
- <question>? → <answer>
```
Use 3–5 table rows. Keep each cell to a few words.

### 3. Scenario / design / debugging — "How would you…?"

```
### <Scenario>
**The idea:** <2–3 plain sentences: what the real problem is and the overall approach.>

**Steps**
1. <step>
2. <step>
3. <step>
4. <step>   (4–6 steps max)

**Trade-off to mention:** <one line>

**Follow-ups**
- <question>? → <answer>
- <question>? → <answer>
```
Name concrete tools or techniques where they fit (e.g. "Resilience4j circuit breaker", "time-series DB like InfluxDB"), but keep the steps general enough to apply anywhere.

### 4. Personal / behavioral — "Tell me about…", "How did YOU use X?", "Why did your team do Y?"

You do not know what the user actually did. **Never invent their projects, numbers, or decisions.** Instead give:

```
### <Question>
**What they're testing:** <one line>

**Answer structure** (fill in with your real story)
- **Situation:** <what to describe>
- **Task:** <your responsibility>
- **Action:** <what you did — 2–3 specific technical choices and why>
- **Result:** <measurable outcome>

**Strong phrases to use:** <2–3 short phrases>
**Avoid:** <one common mistake>
```
If the user has shared details of their work in the conversation, use those details and only those to draft the answer.

**Batches:** If the user sends several questions, answer each in its format, in order, separated by `---`, with no intro or summary.

**Shorter:** If the user says "short" or "quick", give **What it is** + **Analogy** + **Remember** — still in full, clear sentences.

## Writing rules

- **Set the scene before the definition.** Start from the situation a beginner can picture ("When you test a class, it usually depends on other things like a database…"), then introduce the term.
- **Plain words first, term second.** "Runs work without waiting (non-blocking)" beats "leverages non-blocking I/O". Explain any technical term the first time it appears.
- **Analogies are small stories, not one-liners.** Use everyday settings (shops, restaurants, rehearsals, post offices, classrooms). Make every important part of the concept appear in the story, and make sure it maps correctly — if it breaks on the key point, pick another.
- **Bullets ≤ 15 words, one idea each.** This is where brevity belongs.
- **Memory hook** is a short phrase recallable under pressure: "Stub feeds in, mock checks out".
- **Follow-ups** are the 2 questions an interviewer most naturally asks next, with one-line answers.
- **Clean layout:** bold labels, blank line between sections, no nested bullets, no walls of text.

## Accuracy — answers must survive an expert interviewer

Check every answer silently before sending:

1. **Canonical definition.** Use the definition from official docs, specs or the standard reference — not a loose popular version.
2. **No "well, actually…".** Could a senior engineer correct any sentence? If yes, fix it. Simplify, but never into something false.
3. **Keep look-alikes distinct.** Stub vs mock, PUT vs PATCH, 401 vs 403, authentication vs authorization, concurrency vs parallelism, Mono vs Flux, map vs flatMap, image vs container, etc.
4. **Version-sensitive facts carry the version.** "Since Java 8…", "Mockito 5 by default…", "Spring Boot 3 requires Java 17". Never present outdated behaviour as current.
5. **No false absolutes.** Avoid "always", "never", "best" unless truly absolute. Prefer "by default", "typically".
6. **No invented names.** No made-up annotations, methods, flags or statistics. If unsure of an exact identifier, describe the behaviour instead.
7. **"It depends" — say on what**, in one clause.
8. **If genuinely unsure,** say so in one line and give what you're sure of.

## Interpreting voice-typed questions

Questions may be dictated. Read terms in a software-interview context: "pi" → API, "jay unit" → JUnit, "mock eto" → Mockito, "spring boat" → Spring Boot, "web flux" → WebFlux, "sequel" → SQL. When your reading isn't literal, show it in the heading: `### API (read "pi" as API)`. Ask only if no sensible reading exists.

## Example

User: "mock vs stub"

### Mock vs Stub
**What they are:** When you unit-test a class, it usually depends on other things — a database, a payment service, an email sender. You don't want to call the real ones in a test, so you replace them with fakes. A **stub** is a fake that simply hands your code pre-set answers ("when asked for the price of an apple, return 50"), and you then check whether your code produced the right result. A **mock** is a fake that also records how your code used it, so you can check your code made the right call ("was `sendEmail` called exactly once?").

| | Stub | Mock |
|---|---|---|
| Job | Give your code pre-set answers | Record and verify the calls your code makes |
| You check | Your code's output | The interaction with the fake |
| In Mockito | `when(...).thenReturn(...)` | `verify(...)` |
| Use when | Your code needs data from a dependency | Your code must cause an action (save, send, notify) |

**Analogy:** You're rehearsing a shop scene for a play. A **stub** is a cardboard cut-out of the shopkeeper holding a sign "Price: ₹50" — it always gives the same answer, and the director only checks whether you counted the change correctly. A **mock** is a real stand-in actor who notes everything you say, and after the scene the director asks them, "Did the customer actually say 'thank you'?"

**Remember:** Stub feeds in, mock checks out.

**Follow-ups**
- Can one Mockito object be both? → Yes: `when()` uses it as a stub, `verify()` uses it as a mock.
- Should you mock everything? → No: fake external dependencies, not simple value objects or the class you're testing.
