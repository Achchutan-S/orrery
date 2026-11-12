import type { ChapterText } from '../../house/text.ts';

const text: ChapterText = {
  status: 'draft',
  period: 'Late 2010s onward',
  place: 'Image boards, Tumblr, Instagram, TikTok and YouTube',
  thesis: 'Something is not quite right',
  encounter: [
    'This looks like a web page from before anyone designed web pages. It is not broken. The corridor below is empty, the lights are on, and the words do not quite belong to the picture. Weirdcore works with exactly these materials: familiar, low-quality images of ordinary places, and text set where it should not be.',
    'It is an internet-born aesthetic of the late 2010s, made in edited images, videos and posts rather than in galleries, and defined by the people who make it {wikipedia-weirdcore} {aesthetics-wiki-weirdcore}.',
  ],
  understand: [
    {
      kind: 'term',
      title: 'What it is made of',
      text: [
        'Low-resolution photographs of ordinary places, often empty: school corridors, playgrounds, bedrooms, swimming pools, supermarkets at night. Crude captions in default fonts. Colours slightly off, horizons slightly tilted, symbols floating where they do not belong. The intended effect is nostalgia and disorientation at once {aesthetics-wiki-weirdcore} {screenshot-weirdcore}.',
      ],
    },
    {
      kind: 'term',
      title: 'Liminal spaces',
      text: [
        'The anthropologists Arnold van Gennep and Victor Turner used “liminal” for the in-between stage of a rite of passage, when a person has left one state and not yet entered the next {van-gennep-1909}. Online, “liminal spaces” came to mean photographs of transitional places emptied of people: corridors, waiting rooms, car parks. The Backrooms, an image posted to an image board in 2019 with a story about endless yellow office rooms, became its best-known myth {wikipedia-backrooms}.',
      ],
    },
    {
      kind: 'term',
      title: 'Weirdcore and dreamcore',
      text: [
        'Dreamcore is usually softer: pastel skies, clouds indoors, dream logic. Weirdcore is harsher and lower in resolution, closer to an old computer’s idea of a memory, and it uses text to unsettle. Participants argue about the boundary, and many treat them as sister aesthetics {wikipedia-weirdcore} {aesthetics-wiki-weirdcore}.',
      ],
    },
    {
      kind: 'interpretation',
      title: 'Why default fonts',
      text: [
        'Times, Arial, Comic Sans, a paint program’s spray can: these are the materials of the early personal internet, the one many of weirdcore’s makers knew as children. Using them is a way of making an image feel remembered rather than designed. The strangeness comes from familiar things placed slightly wrong.',
      ],
    },
  ],
  study: [
    {
      kind: 'editor',
      title: 'Community, not canon',
      text: [
        'Weirdcore has no founders, manifestos or museum collections. What it is depends on what people make and how they tag it, so every description, including this one, is provisional. The sources here are records of use, not authorities.',
      ],
    },
    {
      kind: 'editor',
      title: 'What this page leaves out',
      text: [
        'Some weirdcore imagery is meant to frighten, with eyes, distorted faces and flashing. This page keeps to the corridor and the caption, which is where the aesthetic’s idea lives, and nothing on it flashes.',
      ],
    },
  ],
  works: [
    { what: 'Arnold van Gennep, Les rites de passage', when: '1909' },
    { what: 'Victor Turner, “Betwixt and Between”', when: '1964' },
    { what: 'The Backrooms image and story, posted to an image board', when: '2019' },
  ],
  recognise: 'Ordinary places at low resolution; default fonts and crude captions; text that does not match the image; emptiness and artificial light; the feeling of a memory you cannot place.',
};

export default text;
