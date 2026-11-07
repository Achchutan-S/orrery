---
name: deep-dive-audio
description: Turns any topic into a thoroughly researched, story-structured explanation written to be listened to through text-to-speech, like a personal podcast episode for one curious listener. Use whenever the user invokes deep-dive-audio, /listen, "listen and learn", or asks for something they can listen to, play aloud, hear on a walk, commute or at the gym, or says "explain X like a podcast", "audio explainer", "deep dive on X I can listen to", "narrate X for me", even if they don't name the skill. Also use when they ask to learn a whole topic (a technology, company, historical event, scientific idea, field or trend) end to end in a conversational, spoken style.
---

# Deep Dive Audio

The user gives you a topic. You give back a script they can press play on and follow with their eyes closed — while walking, commuting or at the gym. It should feel like a knowledgeable friend who did the homework is explaining the subject to them personally, not like a Wikipedia page read aloud.

The guiding line for everything below:

**Research deeply. Think structurally. Explain simply. Write conversationally. Make it enjoyable to listen to.**

## Workflow

### 1. Work out what they actually want to learn

Read the topic and decide the real question behind it. "Kafka" from a backend engineer probably means "how does it work and why does everyone use it", not the novelist. "The Cholas" probably means the empire's rise, how it ran, and why it matters, not a list of kings.

Only ask a clarifying question when the topic is genuinely ambiguous in a way that would change the whole script (two very different subjects share a name, or the scope could be a ten-minute overview or a two-hour course). Otherwise pick the most useful reading, say it in one line at the top, and go. Asking costs the listener more than a reasonable guess does.

Also read depth signals: "quick", "five minutes", "overview" means short; "exhaustive", "everything", "in depth", "full course" means go much longer. With no signal, let the subject's size decide (see Length).

### 2. Research behind the scenes

Search the web for anything that is factual, current, or that you would otherwise be filling in from memory: dates, figures, who did what, current status, latest versions. Stable concepts you know well need less searching, but anything about the present state of the world needs checking.

- Scale effort to the topic: roughly 5 searches for a narrow concept, 10 to 20 for a large field, company, or historical era.
- Prefer primary and authoritative sources. For technology: official docs, original papers, the company's own engineering blog, standards. For history, science, economics and current affairs: sources appropriate to that domain, such as academic or institutional ones, and reputable journalism.
- Cross-check any claim the script leans on. If two sources disagree, either resolve it or say so in the script ("historians still argue about this").
- Watch publication dates. Don't present something outdated as current.
- Never invent statistics, quotes, studies or sources. If you can't verify a detail, leave it out or soften it honestly.

The research stays invisible. The output is an explanation, not a research report, unless the user asks for one.

### 3. Curate before you write

Deep research, intelligent selection, simple explanation — not deep research followed by an information dump. If there are a hundred things one could know, find the twenty or thirty that build the strongest understanding. Cut trivia that doesn't serve the story, however interesting it was to find. (If the user asked for exhaustive, keep more.)

Then sketch the teaching order privately: what does the listener need to know first so that everything after it makes sense? Big picture first, then foundations, then details. Every term should be explained before it's relied on.

### 4. Pick a shape that fits the subject

Structure it as a journey, not a set of filing-cabinet categories. A common default arc:

- **Introduction** — what this is, why it matters, what they'll understand by the end.
- **The foundation** — the basic ideas everything else rests on.
- **How it developed** — history or sequence, where that helps.
- **The important concepts** — one by one.
- **How they connect** — relationships, trade-offs, cause and effect, common confusions.
- **Real-world examples** — where this shows up in reality.
- **The bigger picture** — why it matters, where it's heading.

That's a template, not a form to fill. Different kinds of topics want different arcs — a technology, a historical event, a company, a scientific idea and a cultural movement each tell their story differently. Read `references/topic-playbooks.md` for the arc that suits each type, and drop any section that would be filler.

### 5. Write it for the ear

This is the part that makes or breaks the skill. Read `references/spoken-style.md` before writing — it covers how to write sentences, numbers, abbreviations, transitions and analogies so they sound right through text-to-speech, plus phrases to avoid. The short version:

- Write the way a sharp person talks: natural spoken English, short and medium sentences, clear transitions, the occasional rhetorical question.
- **Simplify the explanation, not the idea.** Never dumb the subject down; make the path to it easier.
- Introduce a technical term, explain it in plain English straight away, give an example if useful, then use it freely.
- Give each big concept a mental picture — an analogy or concrete example — but never one that misleads.
- Say why things exist and why they matter. "What problem was this solving?" and "So why does this matter?" moments are what make it stick.
- Separate fact from opinion, prediction and dispute, out loud.
- Restate a key idea when a listener would otherwise have lost the thread. That's repetition that helps, not padding.

### 6. Format so it plays cleanly

The script will be read by a text-to-speech engine, which reads symbols literally or skips them awkwardly. So:

- Use section headings as spoken signposts, written as short sentences: "Part One. Where This Started." "Part Three. Why Everyone Adopted It." Avoid numbered academic headings like "2.3.4".
- Write in paragraphs. Use a short bullet list only when it truly helps (for example the closing recap). Avoid tables unless the user is reading too; a spoken comparison is almost always better.
- Keep links, citation markers and footnotes out of the body. Sources go at the very end.
- Avoid code blocks, emoji, decorative symbols, nested parentheses, and slash-joined words.

Use this overall shape unless the user asks for something else:

```
[One-line note on the angle you took, only if you had to choose one]

[Title]

[Short conversational introduction]

Part One. [Natural heading]
[Paragraphs]

Part Two. [Natural heading]
[Paragraphs]

... as many parts as the subject needs ...

Before you move on, remember these few things.
[3 to 7 memorable points that compress the topic into a mental model — not a summary of every section]

[One or two closing sentences that land the idea. No "hope this helped".]

Sources and further reading
[A short list of the most useful sources, as links]
```

### 7. Length

Text-to-speech runs at about 150 words a minute. Let the subject set the length:

- A narrow concept (what is a hash function, what was the Treaty of Westphalia): about 5 to 10 minutes, roughly 800 to 1,500 words.
- A substantial topic (how Kafka works, the rise of the Chola empire, how mRNA vaccines work): about 15 to 25 minutes, roughly 2,200 to 3,800 words.
- A whole field or an "exhaustive" request: 30 minutes or more. If it would run past about 6,000 words, deliver it in clearly labelled episodes (Episode One of Three) and offer to continue, rather than cutting depth.

Length comes from explanation, never from repetition or filler.

### 8. Deliver

Give the script directly in the reply so it can be played straight away. If the user wants to keep it, share it, or listen on another device, offer to save it as a document. Don't add a preamble about how you researched it, and don't end with offers or pleasantries — the script's own closing is the ending, followed only by the sources.

## Final check before sending

Quietly run through these, and fix anything that fails:

- Did I research enough, and is every factual claim something I checked or genuinely know?
- Could someone follow this with their eyes closed? Are there symbols, tables, links or parentheses in the body that will trip the voice?
- Is every term explained before it's relied on?
- Does it flow as a story, with each part leading into the next?
- Did I explain why things exist and why they matter, not just what they are?
- Did I curate, or did I dump?
- Is it clear what's fact, what's opinion, and what's disputed?
- Does it sound like a knowledgeable person talking to a curious friend — and would I enjoy listening to it for fifteen minutes?
