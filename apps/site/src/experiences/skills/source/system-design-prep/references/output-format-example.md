# Worked Example — Output Format (Ticketmaster)

This shows the exact structure to replicate for any new system's closing-gaps
reference doc. Truncated to 3 entries here for brevity — a real output should
cover every phase, weighted toward deep-dive/LLD questions. The *Your note*
lines below are illustrative, not from a real attempt.

---

### Q1. "Walk me through your capacity/scale estimate."
**Ideal answer:** "100M DAU, assume ~5 actions/user/day → 500M actions/day →
÷86,400s ≈ 5,800 QPS average, blended. I'd split that by a read:write ratio — say
100:1 for a ticketing platform since browsing dwarfs booking — so average booking
QPS is only ~60, average search/view QPS ~5,700. At peak hours, general traffic
runs 3–5x average, so ~20–30K QPS for search. But a hot on-sale can spike the
booking endpoint alone 100–1000x its own baseline in a 60-second window — that's
why booking needs isolated capacity via a queue, not shared headroom with search."
> *Your note: not attempted yet — do this math out loud before the mock, it's
> graded on the process, not the exact numbers.*

---

### Q2. "Two users click the same seat at the same instant — walk me through what happens."
**Ideal answer:** "Two layers. First, a Redis hold with a TTL gives instant UX
feedback. But the actual correctness guarantee is at the database: an atomic
conditional update — `UPDATE tickets SET status='held' WHERE id=? AND
status='available'` — and I check rows_affected == 1. Redis alone isn't
sufficient — if it's down or evicts early, two users could still race — so the
DB-level atomic check is the real source of truth."
> *Your note: named the Redis hold, but not the atomic DB update as the
> actual correctness guarantee — this is usually the single most-listened-for
> line in the whole interview.*

---

## Self-check before the mock round
Say each of these out loud, under 30 seconds, no notes:
- [ ] Q1 — the math chain (DAU → QPS → peak → storage)
- [ ] Q2 — the atomic update line, verbatim
