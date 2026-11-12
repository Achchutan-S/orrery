import type { ChapterText } from '../../house/text.ts';

const text: ChapterText = {
  status: 'draft',
  period: 'Roughly the mid-2000s to the early 2010s; named in 2017',
  place: 'Operating systems, consumer electronics, advertising and stock imagery, worldwide',
  thesis: 'The future we remember',
  encounter: [
    'Blue sky, green grass, clean water, a bubble drifting past a glass button. If you used a computer or a phone between the mid-2000s and the early 2010s, you may feel something before you think anything. Pop the bubbles. Each holds a piece of the look.',
    'Nobody called it Frutiger Aero at the time. The name was given in 2017, after the fact, by Sofi Lee of the Consumer Aesthetics Research Institute, joining the typeface Frutiger to Windows Aero {cari-frutiger-aero}. It is a memory with a label attached.',
  ],
  understand: [
    {
      title: 'Glass, water, sky',
      text: [
        'The look lived in operating systems, phone menus, product advertising, desktop wallpapers and corporate websites: translucent glass panels, water droplets, bubbles, aurora streaks, fish, lens flares and impossibly green fields {cari-frutiger-aero}. Microsoft’s Windows Vista, released in 2007, called its translucent, glossy interface Aero {wikipedia-vista}.',
      ],
    },
    {
      title: 'A humanist typeface',
      text: [
        'Adrian Frutiger designed the typeface that bears his name for the signs at Paris’s new Charles de Gaulle airport; it was released for general use in 1976 {osterer-stamm-2009}. Open, friendly and legible, it and the humanist sans-serifs that followed set the tone of the era’s interfaces. This page uses the closest face your device has: Segoe UI on Windows, Lucida Grande on a Mac.',
      ],
    },
    {
      kind: 'interpretation',
      title: 'An optimism about technology',
      text: [
        'Its imagery joined machines and nature: computers that looked like water, phones that lived in meadows. Read today, it seems to promise that technology would be clean, open and in harmony with the planet. Much of its renewed appeal is nostalgia for that promise, felt by people who were children when it was made {dazed-frutiger-aero}.',
      ],
    },
    {
      title: 'The flat turn',
      text: [
        'In the early 2010s interface design changed direction. Windows 8 replaced glass with flat tiles in 2012, and Apple’s iOS 7 dropped gloss and textures in 2013 {wikipedia-vista}. Within a few years the glossy look seemed dated; within a few more it seemed precious.',
      ],
    },
  ],
  study: [
    {
      kind: 'term',
      title: 'Not Y2K',
      text: [
        'The two are often confused. Y2K, roughly the late 1990s to the early 2000s, looked to chrome, silver, space, techno and candy-coloured translucent plastic. Frutiger Aero came after and turned outward to sky, water and grass; its glass is clear and its mood calm {cari-frutiger-aero}.',
      ],
    },
    {
      kind: 'term',
      title: 'A revival online',
      text: [
        'In the 2020s, Frutiger Aero gathered communities that collect its wallpapers, interfaces and advertisements, and spread widely on TikTok {dazed-frutiger-aero}. Like many internet aesthetics, it was assembled after the fact from things that were never meant as a style.',
      ],
    },
    {
      kind: 'editor',
      title: 'Nostalgia for advertising',
      text: [
        'It is worth noticing what is being missed. Most Frutiger Aero images were made to sell software, phones and printers. The longing is real, but it attaches to a corporate picture of the future. That does not make it false: it tells us what the future was supposed to feel like.',
      ],
    },
  ],
  works: [
    { what: 'Frutiger typeface released', who: 'Adrian Frutiger', when: '1976' },
    { what: 'Windows Vista and its Aero interface', when: '2007' },
    { what: 'Windows 8 introduces flat tiles', when: '2012' },
    { what: 'iOS 7 drops gloss', when: '2013' },
    { what: 'The name “Frutiger Aero”', who: 'Sofi Lee, Consumer Aesthetics Research Institute', when: '2017' },
  ],
  recognise: 'Sky blue and grass green; water, bubbles, fish and aurora streaks; glossy glass buttons with a white highlight across the top; humanist sans-serif type; technology pictured in harmony with nature.',
};

export default text;
