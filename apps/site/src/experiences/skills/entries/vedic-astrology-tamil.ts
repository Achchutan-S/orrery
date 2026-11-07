import type { SkillEntry } from '../types.ts';

export default {
  slug: 'vedic-astrology-tamil',
  title: 'Vedic Astrology (Tamil)',
  purpose: 'Computes a sidereal birth chart in the Tamil tradition with the Swiss Ephemeris, then reads dasha, transits and the day.',
  shelf: 'exploration',
  tags: ['jathakam', 'astrology', 'tamil', 'swiss ephemeris', 'python'],
  artefact: 'palmleaf',
  provenance: { kind: 'original', note: 'Listed under the owner’s own Claude.ai skills. Its scripts compute with pyswisseph by Astrorigin over the Swiss Ephemeris by Astrodienst, neither of which is included.' },
  runs: { surfaces: ['claude-ai'], note: 'Written for Claude.ai: Python scripts in the code-execution container, a pip install of pyswisseph, and the Visualizer for the chart grid.' },

  why: 'A Tamil jathakam is read from exact planetary positions, and sidereal and tropical zodiacs differ by about 24 degrees. A model guessing positions is simply wrong, so this skill computes them and keeps the reading in an elder’s careful register.',
  problem: 'Chatbot horoscopes estimate placements, mix zodiacs, and turn traditional cautions into alarming predictions.',
  useWhen: [
    'You give birth details and ask for a jathakam, rasi, nakshatra and pada, lagna or the full Rasi chart.',
    'You ask about your current dasha, transits, Sade Sati or a specific date.',
    'You want Ashtakavarga tables or daily guidance in the Tamil tradition.',
  ],
  avoidWhen: [
    'You want compatibility (porutham), muhurta, navamsa, shadbala or most yogas: the skill says plainly they are not computed.',
    'You want predictions or remedies; it reads conventions, not forecasts, and suggests a family priest for anything serious.',
  ],
  benefits: 'People in the Tamil tradition who want an accurate, computed chart presented in familiar terms, without a fortune-teller’s tone.',

  workflow: [
    { step: 'Collect inputs', detail: 'Date, time and place of birth, looking up coordinates and the historical UTC offset itself; Lahiri ayanamsa by default.' },
    { step: 'Compute', detail: 'calculate_chart.py and chart_analysis.py return the lagna, birth star, nine grahas, dignity, combustion, functional nature, aspects and a limited set of yogas.' },
    { step: 'Present', detail: 'A summary in a fixed order, then a South Indian 4×4 chart with fixed sign cells and the lagna highlighted.' },
    { step: 'The “now” view', detail: 'today_view.py: Vimshottari dasha nesting, flags such as Sade Sati and Chandrashtamam, notable transits only, and daily guidance.' },
    { step: 'Ashtakavarga on request', detail: 'ashtakavarga.py, with the sanity check that sign totals sum to 337.' },
  ],
  decisions: ['Whether the birth time is precise enough for the lagna, which changes sign about every two hours.', 'Which transits are notable enough to mention.'],
  distinctive: [
    '“Never estimate positions yourself”: every figure comes from the ephemeris, and a failing script means fixing inputs, never guessing.',
    'A panchangam elder’s register: “traditionally read as”, never “you will”.',
    'It treats birth details as sensitive and uses them only for the chart.',
  ],
  inputs: ['Date and time of birth (approximate is acceptable, with caveats), and place of birth.'],
  outputs: ['A chart summary and a South Indian chart diagram.', 'On request: dasha periods with dates, active flags, notable transits, Ashtakavarga and daily guidance.'],
  dependencies: [
    'Code execution with Python 3 and network access for pip install pyswisseph.',
    'pyswisseph (AGPL-3.0) and the Swiss Ephemeris (AGPL or the Swiss Ephemeris Professional License).',
    'Four scripts in scripts/, which this archive withholds (see below).',
    'Claude.ai’s Visualizer, for the chart grid.',
  ],
  limitations: ['Many classical calculations are out of scope and named as such.', 'Mechanical positions, not a reading: it says a real reading needs a jyotishar’s judgment.'],
  example: {
    invocation: 'What is my nakshatra? Born in Madurai, 14 March 1995, around 6:40 in the morning.',
    request: 'Show my rasi chart and current dasha. (Birth details in this example are invented for the archive.)',
    outputShape: ['Lagna sign, degree and nakshatra', 'Janma Rasi; Janma Nakshatra and pada', 'What is notable: yogakaraka, dignities, retrogrades, aspects', 'South Indian chart diagram', 'Dasha nesting with dates, flags, notable transits, daily guidance'],
    scenario: 'Someone gives an approximate birth time. The skill computes the chart, warns that the lagna sits near a sign edge, and presents the birth star with confidence because the Moon’s nakshatra is robust to small time errors.',
  },
  related: [
    { slug: 'sidequest', why: 'The other script-backed skill on the Personal Exploration shelf.' },
    { slug: 'deep-dive-audio', why: 'For learning about the Tamil calendar or the history of jyotisha.' },
  ],
  claudeAiDescription: "Computes a Vedic (Tamil-tradition) birth chart from birth date, time and place: rasi, nakshatra, lagna, D1 chart, dasha and transits. Use when given birth details for a jathakam.",
  portability: 'Not portable from this archive. SKILL.md is published exactly; the four scripts it runs are withheld, so the skill cannot work from a download here.',
} satisfies SkillEntry;
