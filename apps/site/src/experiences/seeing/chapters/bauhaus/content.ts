import type { ChapterText } from '../../house/text.ts';

const text: ChapterText = {
  status: 'draft',
  period: '1919 – 1933',
  place: 'Weimar, then Dessau, then Berlin; afterwards, wherever its people went',
  thesis: 'The grammar of modern design',
  encounter: [
    'Three shapes, three colours, a grid and a sans serif: that is the Bauhaus most people know, and it is a simplification. The school Walter Gropius founded in Weimar in 1919 was less a style than a teaching experiment, in which students learned material, form and colour from first principles and worked towards uniting art, craft and, later, industry {gropius-1919} {droste}.',
    'It lasted fourteen years, moved twice and was closed under Nazi pressure in 1933. Its teachers and students then carried its methods across the world {droste}.',
  ],
  understand: [
    {
      title: 'A school, not a style',
      text: [
        'Gropius’s founding programme of April 1919 called on architects, sculptors and painters to return to the crafts and to build together; it named the building as the final aim of all the visual arts {gropius-1919}. Early Weimar Bauhaus work was often expressionist and hand-made. The clean industrial look came later, and was argued over inside the school.',
      ],
    },
    {
      title: 'Begin with the basics',
      text: [
        'Every student began with the preliminary course: Johannes Itten’s at first, later László Moholy-Nagy’s and Josef Albers’s. Before entering a workshop, students studied the textures of materials, the behaviour of colour and the construction of form, taking things apart to understand how they work {droste}.',
      ],
    },
    {
      title: 'Weimar, Dessau, Berlin',
      text: [
        'Under political pressure in Weimar, the school moved to Dessau in 1925, into a building Gropius designed of glass, steel and concrete. Hannes Meyer led it from 1928, Ludwig Mies van der Rohe from 1930. It moved to Berlin as a private school in 1932 and closed in 1933 {droste}.',
      ],
    },
    {
      title: 'The workshops',
      text: [
        'Marianne Brandt made lamps and tea infusers in the metal workshop; Gunta Stölzl and Anni Albers made the weaving workshop one of the school’s most successful; Marcel Breuer bent tubular steel into chairs; Herbert Bayer ran printing and advertising {droste}. From 1925 the school set its printed matter in lowercase letters only, a house style associated with Bayer’s single-alphabet experiments {moma-bayer}.',
      ],
    },
  ],
  study: [
    {
      kind: 'editor',
      title: 'Three myths',
      text: [
        '“Form follows function” is not a Bauhaus slogan. Louis Sullivan wrote “form ever follows function” in an American magazine in 1896 {sullivan-1896}.',
        'There was no single Bauhaus style. Gropius himself resisted the idea of one {droste}, and the work ranged from carved wood to photography.',
        'Primary colours were one strand among many. The weaving workshop, the wall-painting workshop and Kandinsky’s and Klee’s classes worked with a wide and subtle palette.',
      ],
    },
    {
      title: 'Who did what',
      text: [
        'The Bauhaus admitted many women, but they were often steered toward the weaving workshop rather than architecture or metal {droste}. Brandt in metal was an exception. The weaving workshop, ironically, became one of the school’s most productive and influential.',
      ],
    },
    {
      title: 'After 1933',
      text: [
        'Josef and Anni Albers went to Black Mountain College in North Carolina in 1933; Gropius and Breuer to Harvard in 1937; Moholy-Nagy founded the New Bauhaus in Chicago that year; Mies went to Chicago in 1938 {droste}. The label travelled further than the school: Tel Aviv’s White City, recognised by UNESCO in 2003, is often called “Bauhaus”, though UNESCO describes it as Modern Movement architecture by architects of several trainings {unesco-white-city}.',
      ],
    },
    {
      kind: 'interpretation',
      title: 'Is a triangle yellow?',
      text: [
        'In 1923 Wassily Kandinsky circulated a questionnaire in the wall-painting workshop asking respondents to fill a triangle, a square and a circle with yellow, red and blue and to explain their choices {harvard-questionnaire}. He believed the answer was universal: yellow triangle, red square, blue circle.',
        'Ellen Lupton and J. Abbott Miller point out that the consensus came from a community that already knew Kandinsky’s theory {lupton-miller}. The questionnaire is better read as a portrait of a school’s shared beliefs than as evidence about human perception.',
      ],
    },
  ],
  works: [
    { what: 'Programme of the Staatliches Bauhaus', who: 'Walter Gropius', when: '1919', where: 'Weimar' },
    { what: 'Questionnaire on colour and form', who: 'Wassily Kandinsky', when: '1923', where: 'Weimar' },
    { what: 'Tea infuser', who: 'Marianne Brandt', when: '1924' },
    { what: 'Universal alphabet', who: 'Herbert Bayer', when: '1925' },
    { what: 'Bauhaus building', who: 'Walter Gropius', when: '1925–26', where: 'Dessau' },
    { what: 'Tubular steel club chair', who: 'Marcel Breuer', when: '1925–26' },
    { what: 'Wall hangings and fabrics', who: 'Gunta Stölzl, Anni Albers', when: '1920s' },
  ],
  recognise: 'Elementary shapes and a few strong colours; asymmetric layouts on a grid; sans-serif type, often lowercase; steel, glass and plywood that show how they are made. Then remember that the school itself was more varied than the look.',
};

export default text;
