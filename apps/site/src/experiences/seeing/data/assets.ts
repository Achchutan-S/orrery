// Records for every font and image file in assets/. A test fails when a file has no record, a
// record has no file, or a font has no licence text beside it. Fonts are Google Fonts' latin
// (and, where noted, latin-ext) WOFF2 subsets, downloaded once on 8 November 2026 and committed;
// the build never downloads anything. Images are the museum's open-access files, resized and
// re-encoded as WebP without metadata.

export interface FontRecord {
  file: string;
  family: string;
  designer: string;
  licence: 'SIL Open Font License 1.1';
  /** Licence text committed beside the font. */
  licenceFile: string;
  /** Where it is used, and why that face. */
  use: string;
}

const ofl = 'SIL Open Font License 1.1' as const;
const gf = (family: string) => `Google Fonts, ${family}`;

export const FONTS: readonly FontRecord[] = [
  { file: 'caslon-text-400.woff2', family: 'Libre Caslon Text', designer: 'The Libre Caslon Text Project Authors (Pablo Impallari, Rodrigo Fuenzalida, Stephen Nixon)', licence: ofl, licenceFile: 'caslon-text.OFL.txt', use: 'The house voice: opening, atlas pages. Caslon set the scientific plates and treatises of eighteenth-century Britain.' },
  { file: 'caslon-text-400-italic.woff2', family: 'Libre Caslon Text Italic', designer: 'The Libre Caslon Text Project Authors (Pablo Impallari, Rodrigo Fuenzalida, Stephen Nixon)', licence: ofl, licenceFile: 'caslon-text.OFL.txt', use: 'House italic.' },
  { file: 'caslon-text-700.woff2', family: 'Libre Caslon Text Bold', designer: 'The Libre Caslon Text Project Authors (Pablo Impallari, Rodrigo Fuenzalida, Stephen Nixon)', licence: ofl, licenceFile: 'caslon-text.OFL.txt', use: 'House emphasis.' },
  { file: 'caslon-display-400.woff2', family: 'Libre Caslon Display', designer: 'The Libre Caslon Display Authors (Pablo Impallari)', licence: ofl, licenceFile: 'caslon-display.OFL.txt', use: 'House display sizes.' },
  { file: 'unifraktur-cook-700.woff2', family: 'UnifrakturCook', designer: 'j. “mach” wust', licence: ofl, licenceFile: 'unifraktur-cook.OFL.txt', use: 'Gothic: the title only, a blackletter of the textura family the period wrote in.' },
  { file: 'alegreya-400-700.woff2', family: 'Alegreya', designer: 'Juan Pablo del Peral (Huerta Tipográfica)', licence: ofl, licenceFile: 'alegreya.OFL.txt', use: 'Gothic: reading text with a calligraphic, pen-made rhythm.' },
  { file: 'alegreya-400-700-italic.woff2', family: 'Alegreya Italic', designer: 'Juan Pablo del Peral (Huerta Tipográfica)', licence: ofl, licenceFile: 'alegreya.OFL.txt', use: 'Gothic: italic.' },
  { file: 'eb-garamond-400-600.woff2', family: 'EB Garamond', designer: 'Georg Duffner and Octavio Pardo, after Claude Garamont', licence: ofl, licenceFile: 'eb-garamond.OFL.txt', use: 'Renaissance: a revival of a sixteenth-century roman.' },
  { file: 'eb-garamond-400-600-italic.woff2', family: 'EB Garamond Italic', designer: 'Georg Duffner and Octavio Pardo', licence: ofl, licenceFile: 'eb-garamond.OFL.txt', use: 'Renaissance: italic.' },
  { file: 'amarante-400.woff2', family: 'Amarante', designer: 'Karolina Lach (Sorkin Type)', licence: ofl, licenceFile: 'amarante.OFL.txt', use: 'Art Nouveau: a contemporary display face (2012) in the Art Nouveau manner, for the title only.' },
  { file: 'spectral-300.woff2', family: 'Spectral Light', designer: 'Production Type', licence: ofl, licenceFile: 'spectral.OFL.txt', use: 'Art Nouveau: a light reading face that lets the line lead.' },
  { file: 'spectral-300-italic.woff2', family: 'Spectral Light Italic', designer: 'Production Type', licence: ofl, licenceFile: 'spectral.OFL.txt', use: 'Art Nouveau: italic.' },
  { file: 'jost-300-700.woff2', family: 'Jost', designer: 'Owen Earl (indestructible type*)', licence: ofl, licenceFile: 'jost.OFL.txt', use: 'Bauhaus: a geometric sans in the manner of Futura (Paul Renner, 1927), a contemporary of the school though not made there.' },
  { file: 'archivo-black-400.woff2', family: 'Archivo Black', designer: 'Omnibus-Type', licence: ofl, licenceFile: 'archivo-black.OFL.txt', use: 'Brutalism: titles cast as mass. The reading text is the system’s own sans, the web’s raw material.' },
  { file: 'shippori-mincho-400.woff2', family: 'Shippori Mincho', designer: 'FONTDASU', licence: ofl, licenceFile: 'shippori-mincho.OFL.txt', use: 'Wabi-sabi: the Latin of a Japanese mincho design; Japanese terms use the reader’s own system mincho.' },
  { file: 'shippori-mincho-400-latin-ext.woff2', family: 'Shippori Mincho (latin-ext)', designer: 'FONTDASU', licence: ofl, licenceFile: 'shippori-mincho.OFL.txt', use: 'Wabi-sabi: the macrons of romanised Japanese (yūgen, Rikyū).' },
  { file: 'barlow-condensed-500.woff2', family: 'Barlow Condensed Medium', designer: 'Jeremy Tribby', licence: ofl, licenceFile: 'barlow-condensed.OFL.txt', use: 'Cyberpunk: signage and headings, after highway and transit lettering.' },
  { file: 'barlow-condensed-700.woff2', family: 'Barlow Condensed Bold', designer: 'Jeremy Tribby', licence: ofl, licenceFile: 'barlow-condensed.OFL.txt', use: 'Cyberpunk: signage.' },
  { file: 'barlow-400.woff2', family: 'Barlow', designer: 'Jeremy Tribby', licence: ofl, licenceFile: 'barlow.OFL.txt', use: 'Cyberpunk: reading text.' },
];

export type ImageLicence = 'Public domain (CC0, The Met Open Access)';

export interface ImageRecord {
  file: string;
  width: number;
  height: number;
  title: string;
  creator: string;
  date: string;
  medium: string;
  institution: string;
  accession: string;
  url: string;
  licence: ImageLicence;
  alt: string;
}

export const IMAGES: readonly ImageRecord[] = [
  {
    file: 'louis-ix-glass.webp', width: 560, height: 877,
    title: 'King Louis IX Carrying the Crown of Thorns', creator: 'Unknown glazier, France', date: 'c. 1245–48',
    medium: 'Pot-metal glass and vitreous paint', institution: 'The Metropolitan Museum of Art, The Cloisters Collection, 1937', accession: '37.173.3',
    url: 'https://www.metmuseum.org/art/collection/search/471218', licence: 'Public domain (CC0, The Met Open Access)',
    alt: 'A stained-glass panel: a crowned king in a red robe carries a green wreath of thorns in a golden vessel, followed by two figures in green and yellow, against a ground of deep blue glass held in dark lead lines.',
  },
  {
    file: 'durer-draughtsman.webp', width: 1200, height: 443,
    title: 'Draughtsman Making a Perspective Drawing of a Reclining Woman', creator: 'Albrecht Dürer', date: 'Impression c. 1600 (design published 1538)',
    medium: 'Woodcut', institution: 'The Metropolitan Museum of Art, Gift of Henry Walters, 1917', accession: '17.37.314',
    url: 'https://www.metmuseum.org/art/collection/search/366555', licence: 'Public domain (CC0, The Met Open Access)',
    alt: 'A woodcut: at a long table, an artist on the right fixes his eye to a small sighting post and looks through an upright gridded frame at a reclining woman on the left, copying what he sees square by square onto gridded paper. Windows behind open onto a distant shore.',
  },
];

export const image = (file: string): ImageRecord => {
  const found = IMAGES.find((x) => x.file === file);
  if (!found) throw new Error(`seeing: no image record for "${file}" in data/assets.ts`);
  return found;
};
