import { defineExperience } from '@pu/platform-schema';

// The owner's resume (task 15). Content: apps/site/src/experiences/resume/content.ts, the one
// source for the page, the PDF and the link-preview image. The PDF and image are routes, so
// they are built only where the resume is released (docs/resume.md).
export default defineExperience({
  kind: 'internal',
  id: 'resume',
  title: 'Resume',
  summary: 'Software engineer at Verizon: experience, projects, skills and education, with a PDF to download.',
  capabilities: ['content', 'downloads'],
  tags: ['career'],
  section: 'profile',
  headline: 'plain',
  routes: [
    { pattern: '/resume', entrypoint: 'resume/routes/index.astro' },
    { pattern: '/resume/resume.pdf', entrypoint: 'resume/routes/pdf.ts' },
    { pattern: '/resume/og.png', entrypoint: 'resume/routes/og.ts' },
  ],
  performanceClass: 'content',
});
