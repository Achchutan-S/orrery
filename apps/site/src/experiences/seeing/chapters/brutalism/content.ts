import type { ChapterText } from '../../house/text.ts';

const text: ChapterText = {
  status: 'draft',
  period: 'c. 1950 – c. 1980',
  place: 'Britain and France first; then Japan, Brazil, India, the Americas, Eastern Europe and the Soviet Union',
  thesis: 'The beauty of weight',
  encounter: [
    'Nothing on this page moves. Concrete does not either. Brutalism asks you to feel weight: mass held up on thick legs, windows set so deep they hold shadow at noon, surfaces that keep the grain of the timber boards they were poured against.',
    'The name sounds like an accusation, but it began as a description. Reyner Banham traced it partly to *béton brut*, French for raw concrete, the finish Le Corbusier left on his Unité d’habitation in Marseille, and partly to a Swedish joke of 1950, “nybrutalism” {banham-1966}.',
  ],
  understand: [
    {
      title: 'Raw concrete',
      text: [
        'Le Corbusier’s Unité d’habitation in Marseille, built from 1947 to 1952, raised a whole neighbourhood of flats on massive legs, with a shopping street halfway up and a roof terrace for the residents. Its concrete was left as it came out of the formwork, rough and marked by the boards {unesco-corbusier}. Post-war shortages of steel made concrete cheap; Le Corbusier made its roughness a virtue.',
      ],
    },
    {
      title: 'An ethic of honesty',
      text: [
        'In London, Alison and Peter Smithson’s school at Hunstanton (1949–54) was built of steel, glass and brick, with its pipes and wiring in plain view. When Banham defined the “New Brutalism” in 1955, he called it the first completed Brutalist building and named three qualities: memorability as an image, clear exhibition of structure, and the valuing of materials “as found” {banham-1955}. Concrete was common, not compulsory.',
      ],
    },
    {
      title: 'Building for everyone',
      text: [
        'Brutalism became one of the languages of post-war reconstruction: social housing, universities, libraries, town halls, theatres. It spread far beyond Europe: Kenzo Tange in Japan, Lina Bo Bardi and Paulo Mendes da Rocha in Brazil, Le Corbusier at Chandigarh and Balkrishna Doshi in India, civic buildings across the Americas, Yugoslavia and the Soviet Union {sos-brutalism}.',
      ],
    },
    {
      title: 'Streets in the sky',
      text: [
        'The Smithsons argued that the access decks of a housing block should be wide enough to work as streets, where neighbours would meet. At Robin Hood Gardens in east London, completed in 1972, they built them. The estate was demolished from 2017, and the Victoria and Albert Museum preserved a three-storey section of its façade {vam-robin-hood}.',
      ],
    },
  ],
  study: [
    {
      kind: 'interpretation',
      title: 'Ethic or aesthetic?',
      text: [
        'Banham’s own book of 1966 asked the question in its subtitle: was Brutalism an ethic, a moral and social programme of honesty, or only an aesthetic, a taste for roughness and mass {banham-1966}? He concluded that the look had largely won. Many of the buildings that now define the word were designed long after the arguments that named it.',
      ],
    },
    {
      kind: 'interpretation',
      title: 'Blame',
      text: [
        'By the 1970s and 1980s, Brutalist housing estates were widely blamed for crime, isolation and decay. Defenders argue that the failures came mostly from cuts in maintenance, poor management and the concentration of poverty, not from concrete. The argument is still open, building by building {sos-brutalism}.',
      ],
    },
    {
      title: 'Second look',
      text: [
        'In the 2010s, photographs of Brutalist buildings spread widely online, and a campaign to save them grew with them. The SOS Brutalism project of the Deutsches Architekturmuseum built an online database of endangered buildings worldwide and opened an exhibition in Frankfurt in 2017 {sos-brutalism}.',
      ],
    },
    {
      kind: 'editor',
      title: 'Not the web’s brutalism',
      text: [
        'In the 2010s some web designers adopted the word for deliberately raw, unstyled pages. The kinship is one of attitude, showing the material instead of dressing it, not of history. This page borrows from both: its reading text is set in your device’s own system font, the web’s raw material.',
      ],
    },
  ],
  works: [
    { what: 'Unité d’habitation', who: 'Le Corbusier', when: '1947–52', where: 'Marseille' },
    { what: 'Hunstanton School', who: 'Alison and Peter Smithson', when: '1949–54', where: 'Norfolk' },
    { what: 'Yamanashi Press and Broadcasting Centre', who: 'Kenzo Tange', when: '1966', where: 'Kōfu' },
    { what: 'Boston City Hall', who: 'Kallmann McKinnell & Knowles', when: '1968', where: 'Boston' },
    { what: 'Robin Hood Gardens', who: 'Alison and Peter Smithson', when: '1972; demolished from 2017', where: 'London' },
    { what: 'Barbican Estate', who: 'Chamberlin, Powell and Bon', when: 'built 1965–76', where: 'London' },
    { what: 'SESC Pompéia', who: 'Lina Bo Bardi', when: '1977–86', where: 'São Paulo' },
  ],
  recognise: 'Mass and repetition; openings sunk deep into shadow; structure shown rather than hidden; concrete, brick or steel left with the marks of their making.',
};

export default text;
