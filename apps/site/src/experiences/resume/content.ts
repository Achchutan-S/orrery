// The resume's single source of truth. The page renders it; the PDF and the link-preview image
// are produced from that page by `pnpm --filter @pu/site resume:assets` (docs/resume.md).
// Every statement here must be supported by docs/resume.md's fact list. Wording is deliberately
// about participation, not ownership, and internal names are generalised.

export type Role = {
  organisation: string;
  title: string;
  /** ISO year-month; `end: null` means current. */
  start: string;
  end: string | null;
  points: string[];
};

export type Project = { name: string; href: string; host: string; kind: string; summary: string; points?: string[] };

export const resume = {
  name: 'Achchutan S',
  role: 'Software Engineer',
  summary:
    'Software engineer at Verizon since July 2024, after an internship there. I work on backend services and APIs in Java and Spring Boot, and on front ends in React. Outside work I build Orrery, a static personal platform, and small browser tools.',
  links: [
    { label: 'GitHub', href: 'https://github.com/Achchutan-S', text: 'github.com/Achchutan-S' },
    { label: 'Website', href: 'https://orrery-teal.vercel.app/', text: 'orrery-teal.vercel.app' },
  ],
  experience: [
    {
      organisation: 'Verizon',
      title: 'Software Engineer I',
      start: '2024-07',
      end: null,
      points: [
        'Work on Spring Boot APIs and their unit tests, written with JUnit and Mockito.',
        'Explore and integrate existing APIs, including reactive services and GraphQL.',
        'Contributed to migration work involving a data grid.',
        'Work on customer journeys, including assisted-sales flows.',
        'Involved in AI-related projects: lead scoring, OCR, and a voice bot using Twilio and Gemini.',
      ],
    },
    {
      organisation: 'Verizon',
      title: 'Intern',
      start: '2024-02',
      end: '2024-07',
      points: [
        'Worked on a React redesign of a homepage built on existing APIs, including its global navigation and search.',
        'Demonstrated the work to senior stakeholders.',
      ],
    },
  ] satisfies Role[],
  projects: [
    {
      name: 'Orrery',
      href: 'https://orrery-teal.vercel.app/',
      host: 'orrery-teal.vercel.app',
      kind: 'Personal project',
      summary: 'A personal platform of independent experiences on one static site, built with AI coding assistance.',
      points: [
        'Typed catalog and release model decide what each environment builds and lists; drafts never reach the production build.',
        'Build-time checks for leaks, performance budgets, metadata and import boundaries; a strict Content Security Policy.',
        'Browser tests with Playwright and axe, continuous integration on GitHub Actions, static deployment on Vercel.',
        'A local Control Center (React, Hono) that previews and writes release changes with optimistic concurrency.',
      ],
    },
    {
      name: 'Dev X-Ray',
      href: 'https://devxray-one.vercel.app/',
      host: 'devxray-one.vercel.app',
      kind: 'Personal project',
      summary: 'Developer tools that run in the browser: format, decode and convert JSON, GraphQL, YAML, SQL, JWTs and more, with no account and no upload.',
    },
    {
      name: 'KawaiUI',
      href: 'https://kawaiui.vercel.app/',
      host: 'kawaiui.vercel.app',
      kind: 'Personal project',
      summary: 'UI Lab, a museum of interface experiments in rooms: physics toys, motion, WebGL liquids, cursor tricks, games and a synth.',
    },
  ] satisfies Project[],
  skills: [
    { group: 'Used at work', items: ['Java', 'Spring Boot', 'JUnit', 'Mockito', 'GraphQL', 'React'] },
    { group: 'Used in personal projects', items: ['TypeScript', 'Astro', 'React', 'Node.js', 'Hono', 'Zod', 'Playwright', 'GitHub Actions', 'Vercel'] },
    { group: 'Practising', items: ['AI-assisted engineering'] },
  ],
  education: [{ institution: 'SASTRA University', field: 'Computer Science' }],
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** '2024-07' as 'Jul 2024'. */
export const month = (ym: string) => `${MONTHS[Number(ym.slice(5, 7)) - 1]} ${ym.slice(0, 4)}`;
