// The editorial model every chapter's content.ts follows, and the one renderer for its prose.
// Prose is plain strings with two marks: *emphasis* and {source-id}, a citation. Writing lives in
// content.ts, layout in index.astro, so the owner's narration can replace the text later without
// touching a chapter's composition.
import { source, type Source } from '../data/sources.ts';

/**
 * What a passage is. History is the default and is cited. The others are set apart on the page:
 * interpretation (a reading that scholars or critics argue over), term (contemporary
 * vocabulary, often internet-born) and editor (this atlas speaking for itself).
 */
export type Kind = 'history' | 'interpretation' | 'term' | 'editor';

export const KIND_LABEL: Record<Kind, string> = {
  history: 'History',
  interpretation: 'Interpretation',
  term: 'Term',
  editor: 'Editor’s note',
};

export interface Block {
  kind?: Kind;
  title?: string;
  text: string[];
}

export interface Work {
  what: string;
  who?: string;
  when: string;
  where?: string;
}

export interface ChapterText {
  /** Draft until the owner reviews it (and, perhaps, replaces it with the original narration). */
  status: 'draft';
  period: string;
  place: string;
  /** One sentence: the chapter's subtitle. */
  thesis: string;
  /** Quick encounter: about ninety seconds of reading. */
  encounter: string[];
  /** Explore: three to five minutes. */
  understand: Block[];
  /** Study: the deeper layer, in a disclosure. */
  study: Block[];
  works: Work[];
  /** How to recognise it, in a sentence or two. */
  recognise: string;
}

const escape = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const CITE = /\s?\{([a-z0-9-]+)\}/g;

/** One per page: numbers citations in reading order and lists them at the end. */
export function citer() {
  const order: string[] = [];
  const rich = (text: string) => escape(text)
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(CITE, (_, id: string) => {
      source(id);
      if (!order.includes(id)) order.push(id);
      const n = order.indexOf(id) + 1;
      return `<sup class="see-cite"><a href="#source-${id}" aria-label="source ${n}">${n}</a></sup>`;
    });
  const blocks = (list: Block[]): Block[] => list.map((b) => ({ ...b, text: b.text.map(rich) }));
  return { rich, blocks, notes: (): Source[] => order.map(source) };
}

/** The plain text of a passage, for counting and for tests. */
export const plain = (text: string) => text.replace(CITE, '').replace(/\*/g, '');
