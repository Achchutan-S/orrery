// The resume's single source of truth. The page renders it; the PDF and the link-preview image
// are produced from that page by `pnpm --filter @pu/site resume:assets` (docs/resume.md).
// Facts come from the owner's resume (V3, September 2026) and the owner's brief; docs/resume.md
// maps each one to its source. Internal Verizon names are generalised; prototypes are labelled.

export type Point = { lead: string; text: string };

export type Role = {
  organisation: string;
  title: string;
  place: string;
  /** ISO year-month; `end: null` means current. */
  start: string;
  end: string | null;
  points: Point[];
  /** Proofs of concept, kept apart from production work. */
  prototypes?: string[];
};

export type Link = { label: string; href: string; text: string };
export type Project = { name: string; kind: string; stack: string[]; links: Link[]; summary: string; points?: string[] };

export const resume = {
  name: 'Achchutan S',
  role: 'Software Engineer',
  focus: ['Java and Spring Boot microservices', 'Python and GenAI systems'],
  location: 'Chennai, India',
  email: 'achchutansrinivasan26@gmail.com',
  summary:
    'Software engineer with more than two years at Verizon, building Java 17 and Spring Boot services and REST and GraphQL APIs, and moving legacy monoliths onto reactive microservices. I work across the stack in React and TypeScript, and build the team’s Python and FastAPI tooling for applied GenAI: most recently a code knowledge graph and MCP server that cut dependency-analysis lookups from about 60 seconds to under 5. I rely on SOLID design, secure coding and automated tests.',
  links: [
    { label: 'GitHub', href: 'https://github.com/Achchutan-S', text: 'github.com/Achchutan-S' },
    { label: 'LinkedIn', href: 'https://linkedin.com/in/achchutan-s-5390251b5', text: 'linkedin.com/in/achchutan-s-5390251b5' },
    { label: 'LeetCode', href: 'https://leetcode.com/u/achchutan26', text: 'leetcode.com/u/achchutan26' },
    { label: 'Website', href: 'https://orrery-teal.vercel.app/', text: 'orrery-teal.vercel.app' },
  ] satisfies Link[],
  experience: [
    {
      organisation: 'Verizon',
      title: 'Engineer I, Software Development',
      place: 'Chennai',
      start: '2024-07',
      end: null,
      points: [
        { lead: 'Approval-API framework.', text: 'Designed a reusable approval-API framework for line suspend and resume, cost-centre changes and related request types, used by another product team, and built the React front-end flows on top. Four flows shipped to production in August 2026.' },
        { lead: 'Legacy migration.', text: 'Migrated five legacy APIs out of distributed monoliths into cloud-ready reactive microservices (Spring Boot, Spring Reactive, GraphQL) and delivered more than five Spring Boot REST APIs, using SOLID and dependency injection to keep them extensible.' },
        { lead: 'GraphQL schema.', text: 'Extended the GraphQL schema layer with types and queries across the migrated services, agreeing field and table needs with the data platform team.' },
        { lead: 'Service monitoring.', text: 'Built the front end of an internal service-status monitoring tool, organising dense status data into dropdowns, nested tables and utility actions with hand-written CSS.' },
        { lead: 'Code knowledge graph and MCP server.', text: 'Built a code knowledge graph and a local stdio MCP server over a Spring Boot codebase of more than 700 files, indexing class declarations, annotations and package structure for symbol-usage and downstream dependency-impact queries. Lookups that took about 60 seconds of manual search now take under 5.' },
        { lead: 'Production fixes.', text: 'Troubleshot and resolved Java 17 production blockers and routing defects in customer and sales-agent journeys, tracing root causes through dependent systems.' },
        { lead: 'Release notes, automated.', text: 'Automated release documentation with a generator that reads GitLab commits and Jira, removing a manual write-up from every release; adopted by principal architects.' },
        { lead: 'Team practice.', text: 'Use GitHub Copilot, Gemini and Cursor in daily engineering work; mentored the 2025 intern batch.' },
      ],
      prototypes: [
        'An OCR pipeline to digitise manual gas-sheet entry.',
        'A context-aware outbound voice bot on Twilio and Gemini.',
        'JSONL-driven modules that generate user interfaces dynamically, as part of MCP proof-of-concept work.',
        'A lead-scoring proof of concept: a Restricted Boltzmann Machine over unlabelled lead data, ranking which leads to approach next.',
      ],
    },
    {
      organisation: 'Verizon',
      title: 'Student Intern',
      place: 'Chennai',
      start: '2024-02',
      end: '2024-07',
      points: [
        { lead: 'Homepage redesign.', text: 'Rebuilt the global navigation and search components in React for Verizon’s homepage redesign.' },
        { lead: 'Presentation.', text: 'Presented the working prototype and its architecture to senior onshore and offshore leadership; the presentation secured project funding and approval for QA deployment.' },
      ],
    },
  ] satisfies Role[],
  projects: [
    {
      name: 'syllabus-agent',
      kind: 'Personal project',
      stack: ['Python', 'FastAPI', 'asyncio', 'MongoDB'],
      links: [{ label: 'GitHub', href: 'https://github.com/Achchutan-S/searchtosyllabi', text: 'github.com/Achchutan-S/searchtosyllabi' }],
      summary: 'A six-stage asynchronous pipeline that turns a subject into one canonical syllabus.',
      points: [
        'Classifies the subject, searches the web and extracts syllabi from HTML, PDF and scanned sources (BeautifulSoup, PyMuPDF, Tesseract OCR); keeps what an LLM judges relevant and merges the most trusted sources.',
        'LLM, search and cache clients behind provider-agnostic interfaces; MongoDB caching; SSRF-guarded fetching; per-call JSONL tracing with secrets redacted; 101 tests.',
      ],
    },
    {
      name: 'Dev X-Ray',
      kind: 'Personal project',
      stack: ['React 18', 'TypeScript', 'Vite', 'Zustand', 'Monaco'],
      links: [
        { label: 'Live', href: 'https://devxray-one.vercel.app/', text: 'devxray-one.vercel.app' },
        { label: 'GitHub', href: 'https://github.com/Achchutan-S/devxray', text: 'github.com/Achchutan-S/devxray' },
      ],
      summary: 'A privacy-first toolkit of 24 developer tools that runs in the browser with no backend or telemetry, and installs as an offline PWA.',
      points: [
        'JSON parsing and regex execution run in Web Workers; JWTs are verified with Web Crypto using a caller-chosen algorithm, which prevents algorithm confusion.',
        'The GraphQL engine is a standalone workspace package; routes are prerendered for search engines.',
      ],
    },
    {
      name: 'Exam Helper',
      kind: 'Personal project',
      stack: ['Python', 'FastAPI', 'React', 'MongoDB', 'Gemini'],
      links: [{ label: 'GitHub', href: 'https://github.com/Achchutan-S/let-me-study', text: 'github.com/Achchutan-S/let-me-study' }],
      summary: 'Turns exam screenshots into a searchable question bank.',
      points: [
        'OCR with pytesseract, and red-ink answer-key detection with OpenCV; explanations and automatic tags generated with Gemini.',
        'Embeddings for semantic search over the questions; filtered PDF export.',
      ],
    },
    {
      name: 'Orrery',
      kind: 'Personal project',
      stack: ['Astro', 'TypeScript', 'React', 'Hono', 'Playwright'],
      links: [
        { label: 'Live', href: 'https://orrery-teal.vercel.app/', text: 'orrery-teal.vercel.app' },
        { label: 'GitHub', href: 'https://github.com/Achchutan-S/orrery', text: 'github.com/Achchutan-S/orrery' },
      ],
      summary: 'This site: a platform for independent experiences, each with its own design, on one static Astro site.',
      points: [
        'A typed release model decides what each environment builds; build-time checks for leaks, budgets and import boundaries; a strict Content Security Policy; browser tests with Playwright and axe; a local Control Center for releases.',
      ],
    },
  ] satisfies Project[],
  earlierWork:
    'Earlier machine-learning work: a hybrid CNN and RNN/LSTM brain-tumour classifier, an academic deep-learning project (6th semester) that improved reported classification accuracy from 82% to 89% during experimentation; not clinically validated. Also unsupervised SOM and ANN credit-card fraud detection.',
  skills: [
    { group: 'Backend and systems', items: ['Java 17', 'Spring Boot', 'Spring Reactive', 'Python', 'FastAPI', 'Node.js', 'REST API design', 'GraphQL', 'Microservices', 'Reactive systems', 'asyncio'] },
    { group: 'Front end', items: ['React', 'TypeScript', 'JavaScript', 'Vite', 'Zustand', 'PWA', 'Web Workers', 'HTML', 'CSS'] },
    { group: 'AI and GenAI', items: ['LLM API integration and provider abstraction', 'MCP server development', 'Prompt engineering', 'Embeddings and semantic search', 'OCR pipelines', 'Deep learning fundamentals (CNN, RNN/LSTM, SOM, ANN)'] },
    { group: 'Databases', items: ['MySQL', 'MongoDB', 'Cassandra', 'JDBC'] },
    { group: 'Design and quality', items: ['OOP', 'SOLID', 'DRY', 'Dependency injection', 'Design patterns', 'JUnit', 'Mockito', 'pytest', 'Vitest', 'SonarQube', 'Secure coding'] },
    { group: 'DevOps and tooling', items: ['Git', 'GitLab CI/CD', 'Jenkins', 'Maven', 'Jira', 'Agile and Scrum', 'Swagger and OpenAPI'] },
    { group: 'Exposure only', items: ['Docker', 'Kubernetes', 'Google Cloud Platform'] },
  ],
  education: [
    { degree: 'B.Tech, Computer Science & Engineering', institution: 'SASTRA Deemed University', place: 'Thanjavur', end: '2024-06', grade: 'CGPA 8.47' },
  ],
  recognition: [
    'GATE (Computer Science): qualified in 2024 and 2026.',
    '2025 Q1 Spotlight Award, Verizon.',
    'Cheers for Peers recognition, Verizon.',
  ],
  /** Proctored certifications, kept apart from course certificates and learning paths. */
  certifications: [
    'Google Cloud Certified – Generative AI Leader (exam passed October 2026).',
  ],
  learning: [
    'Google AI Essentials.',
    'Google AI Professional Certificate.',
    'Google Cloud Career Practitioners: Cloud Engineer learning path.',
  ],
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** '2024-07' as 'Jul 2024'. */
export const month = (ym: string) => `${MONTHS[Number(ym.slice(5, 7)) - 1]} ${ym.slice(0, 4)}`;
