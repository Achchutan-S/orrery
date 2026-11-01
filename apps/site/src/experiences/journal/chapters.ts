// Loads the chapters in chapters/*.mdx. Order comes from the file name's number.
import type { AstroComponentFactory } from 'astro/runtime/server/index.js';

export type Chapter = {
  slug: string;
  number: number;
  title: string;
  summary: string;
  sources: string[];
  Content: AstroComponentFactory;
};

type Module = { frontmatter: { title: string; summary: string; sources?: string[] }; default: AstroComponentFactory };
const modules = import.meta.glob<Module>('./chapters/*.mdx', { eager: true });

export const chapters: Chapter[] = Object.entries(modules)
  .map(([file, m]) => {
    const [, num, slug] = file.match(/\/(\d+)-([a-z0-9-]+)\.mdx$/)!;
    return {
      slug: slug!,
      number: Number(num),
      title: m.frontmatter.title,
      summary: m.frontmatter.summary,
      sources: m.frontmatter.sources ?? [],
      Content: m.default,
    };
  })
  .sort((a, b) => a.number - b.number);
