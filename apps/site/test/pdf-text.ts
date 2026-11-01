// Just enough PDF reading to prove a text layer exists: the text Chromium writes, decoded
// through each font's ToUnicode map. Not a general PDF parser (no object streams, no encryption).
import { inflateSync } from 'node:zlib';

export function pdfText(pdf: Buffer): { pages: number; text: string } {
  const raw = pdf.toString('latin1');
  const objects = new Map<number, string>();
  for (const m of raw.matchAll(/(\d+) 0 obj([^]*?)endobj/g)) objects.set(Number(m[1]), m[2]!);
  const stream = (body: string): string | undefined => {
    const m = body.match(/stream\r?\n([^]*?)\r?\nendstream/);
    if (!m) return undefined;
    const bytes = Buffer.from(m[1]!, 'latin1');
    return (/FlateDecode/.test(body) ? inflateSync(bytes) : bytes).toString('latin1');
  };
  const cmap = (n: number) => {
    const s = stream(objects.get(n) ?? '') ?? '';
    const map = new Map<string, string>();
    for (const block of s.matchAll(/beginbfchar([^]*?)endbfchar/g)) {
      for (const [, a, b] of block[1]!.matchAll(/<([0-9a-f]+)>\s*<([0-9a-f]+)>/gi)) map.set(a!.toLowerCase(), Buffer.from(b!, 'hex').swap16().toString('utf16le'));
    }
    for (const block of s.matchAll(/beginbfrange([^]*?)endbfrange/g)) {
      for (const [, a, b, c] of block[1]!.matchAll(/<([0-9a-f]+)>\s*<([0-9a-f]+)>\s*<([0-9a-f]+)>/gi)) {
        for (let code = parseInt(a!, 16), u = parseInt(c!, 16); code <= parseInt(b!, 16); code++, u++) map.set(code.toString(16).padStart(a!.length, '0'), String.fromCodePoint(u));
      }
    }
    return map;
  };
  const pages = [...objects.values()].filter((b) => /\/Type\s*\/Page(?![a-z])/.test(b));
  const text: string[] = [];
  for (const page of pages) {
    const resources = page.match(/\/Resources\s+(\d+) 0 R/);
    const res = resources ? objects.get(Number(resources[1])) ?? '' : page;
    const fonts = new Map<string, Map<string, string>>();
    for (const [, name, ref] of (res.match(/\/Font\s*<<([^]*?)>>/)?.[1] ?? '').matchAll(/\/(\w+)\s+(\d+) 0 R/g)) {
      const unicode = objects.get(Number(ref))?.match(/\/ToUnicode (\d+) 0 R/);
      if (unicode) fonts.set(name!, cmap(Number(unicode[1])));
    }
    for (const [, ref] of page.matchAll(/\/Contents\s+(\d+) 0 R/g)) {
      const content = stream(objects.get(Number(ref)) ?? '') ?? '';
      let font: Map<string, string> | undefined;
      for (const t of content.matchAll(/\/(\w+)\s+[\d.]+\s+Tf|<([0-9a-fA-F]*)>|(ET)/g)) {
        if (t[1]) font = fonts.get(t[1]);
        else if (t[2] !== undefined && font) {
          const width = [...font.keys()][0]?.length ?? 2;
          for (let i = 0; i < t[2].length; i += width) text.push(font.get(t[2].slice(i, i + width).toLowerCase()) ?? '');
        } else if (t[3]) text.push(' ');
      }
    }
  }
  return { pages: pages.length, text: text.join('').replace(/\s+/g, ' ') };
}
