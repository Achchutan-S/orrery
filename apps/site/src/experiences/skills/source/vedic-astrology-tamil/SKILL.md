---
name: "vedic-astrology-tamil"
description: Calculate a Vedic (Tamil-tradition) birth chart from birth date, time, and place — Janma Rasi, Janma Nakshatra and pada, Lagna, and the full Rasi (D1) chart with all 9 grahas — plus dasha, transits, Ashtakavarga, and daily guidance. Use whenever the user gives birth details and asks for their horoscope, jathakam, birth chart, kundli, rasi, nakshatra, pada, dasha, or "chart mapping" in a Tamil/Vedic context — even if they only give a city name or only ask for the nakshatra.
---

# Vedic Astrology (Tamil) Birth Chart

Computes a real sidereal chart with the Swiss Ephemeris (`pyswisseph`). Never estimate positions yourself — sidereal and tropical zodiacs differ by ~24°, so only a computed ephemeris is reliable.

## Setup

```bash
pip install pyswisseph --break-system-packages
```

Scripts live in `scripts/`. All take the same birth inputs:
`--date YYYY-MM-DD --time HH:MM --lat <deg> --lon <deg> --tz <hours> [--ayanamsa lahiri|raman|kp]`

- `--time`: 24-hour local time at birthplace
- `--lat/--lon`: signed decimal degrees (N/E positive)
- `--tz`: UTC offset as decimal (India = `5.5`)

## Step 1 — Collect inputs

1. **Date of birth**
2. **Time of birth** — approximate is OK. Moon nakshatra is robust to small errors; Lagna and houses are not (Lagna changes sign every ~2 hours). Mention this if the time is vague or the Lagna is within ~3° of a sign edge.
3. **Place of birth** — look up lat/lon yourself; don't ask the user for coordinates.
4. **UTC offset** for that historical date (India: fixed +5:30 since 1947; check DST elsewhere).
5. **Ayanamsa** — default Lahiri. Don't ask unless the user raises it.

Ask only for what's missing.

## Step 2 — Compute the chart

```bash
python3 scripts/calculate_chart.py <birth args>
python3 scripts/chart_analysis.py  <birth args>
```

**`calculate_chart.py`** returns:
- `lagna` — sign, degree, nakshatra, pada
- `moon_birth_star` — Janma Nakshatra + pada (what Tamils mean by "my star")
- `planets` — 9 grahas: rasi, degree, nakshatra, pada, retrograde
- `rasi_chart_houses` — whole-sign houses 1–12 with occupants

**`chart_analysis.py`** returns:
- `dignity` — exalted / debilitated / own / moolatrikona / friend / neutral / enemy (five-fold Panchadha Maitri)
- `combustion` — combust flag, degree gap, orb
- `functional_nature` — **lagna-specific**: Yogakaraka, Functional Benefic/Malefic, Neutral, Mixed, plus `is_maraka` (owns 2nd/7th). Always trust this over a planet's generic reputation.
- `aspects` — graha drishti with target rasi + house. Rahu/Ketu use the 5/7/9 pattern — a modern convention, not original BPHS.
- `yogas` — only Gajakesari + 5 Panch Mahapurusha. Empty is normal and honest.

If a script errors, fix the inputs. Never fall back to manual estimation.

## Step 3 — Present the chart

**Summary** (in this order):
1. Lagna sign (+ degree and nakshatra)
2. Janma Rasi (Moon's sign)
3. Janma Nakshatra + pada
4. What's notable — Yogakaraka, exalted/debilitated or combust planets, retrograde planets, conjunctions, aspects on the Lagna or Moon, yogas (or "none present")

Don't list all planets mechanically. Pick out what matters.

**Chart diagram** — use the Visualizer (`diagram` module) in the **South Indian format**:
- 4×4 grid, centre 2×2 merged (use for a short label)
- Signs are **fixed**: top row L→R Meenam, Mesham, Rishabam, Mithunam; right column Kadagam, Simmam; bottom row R→L Kanni, Thulam, Viruchigam, Dhanusu; left column Makaram, Kumbam
- Mark the Lagna cell clearly ("Lagnam" / "ASC") and highlight it
- Planet labels short: Suriyan, Chandran, Chevvai, Budhan, Guru, Sukran, Sani, Rahu, Kethu; add "(R)" for retrograde

## Step 4 — "Now" view: dasha + transits

Use when the user asks what's happening now, their current dasha, transits, or a specific date.

```bash
python3 scripts/today_view.py <birth args> [--as-of YYYY-MM-DD]
```

Returns:
- `vimshottari_dasha` — Mahadasha → Antardasha (bhukti) → Pratyantardasha, with dates
- `transits` — each graha's position, `house_from_moon`, `house_from_lagna`, a `traditional_note`, and (7 classical planets only) `ashtakavarga` bindus + sign SAV total
- `flags` — Sade Sati (with phase), Ashtama / Kantaka Shani, Chandrashtamam
- `daily_guidance` — weekday deity, dasha-lord deities + Navagraha shrine, `what_to_do`, `what_to_be_cautious_about`

**Present in this order:**
1. Dasha nesting with plain dates
2. Flags (or say none are active)
3. Only notable transits — e.g. weak (≤2 bindus, SAV <25) or strong (6+ bindus, SAV 30+). Skip middling ones.
4. Daily guidance (see Step 6)

Don't dump the full transit table. Don't compute flags or yogas the script doesn't output — say they aren't implemented.

## Step 5 — Ashtakavarga (whole chart)

`today_view.py` already attaches transit bindus. Run this only for full tables or "which areas of my life are strong/weak":

```bash
python3 scripts/ashtakavarga.py <birth args>
```

- SAV totals always sum to **337** (sanity check)
- Map signs to houses: `(rasi_index - lagna_rasi_index) % 12 + 1`
- Read: 30+ strong, 25–30 average, <25 needs more effort — a convention, not a verdict

## Step 6 — Daily guidance

From `daily_guidance`:
- Weekday deity — note it's common practice and varies by family
- Dasha-lord deity + shrine — e.g. Rahu → Thirunageswaram, Guru → Alangudi
- What to do / be cautious about — if nothing is flagged, say it's an ordinary day

Mention well-known general practices if asked (e.g. Saturday fasting during Sade Sati). Don't prescribe mantras, gemstones, or remedies beyond common convention — suggest a family priest for anything serious.

## Tone rules

- Panchangam / elder style: "traditionally read as", "classically considered" — never "this means" or "you will"
- Never turn flags into alarming predictions; they're about caution and timing
- Output is mechanical positions, not a forecast. A real reading needs a jyotishar's judgment.
- Birth details are sensitive — use them only for the chart; don't speculate on character or life beyond the data

## Scope and conventions

**Computed:** D1 placements, nakshatra/pada, dignity, combustion, functional nature, drishti, limited yogas, Vimshottari dasha, gochara, Ashtakavarga bindus.

**Not computed** (say so plainly, offer to extend): porutham / compatibility, muhurta, navamsa and other divisional charts, shadbala, Ashtakavarga shodhana, Raja/Dhana/Neecha Bhanga/Vipareeta and other yogas.

**Conventions:** whole-sign houses (never Placidus); mean node for Rahu/Ketu, both always retrograde (true node available only on request).
