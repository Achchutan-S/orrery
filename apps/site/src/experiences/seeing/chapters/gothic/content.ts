import type { ChapterText } from '../../house/text.ts';

const text: ChapterText = {
  status: 'draft',
  period: 'c. 1140 – c. 1500',
  place: 'Begun in the Île-de-France; across Latin Europe',
  thesis: 'The architecture of reaching upward',
  encounter: [
    'Begin at the top. Before you read a word, your eye has already climbed: shafts that rise from the floor and do not stop until they split into ribs, a wall thinned to stone lace, and high above, glass that is not a window onto the world but a wall made of coloured light.',
    'Gothic builders did not invent the pointed arch, the rib vault or the buttress. They combined them so that the wall could stop carrying the roof and start carrying light {met-gothic}. Stand on the floor of a great church and you are small, and the light reaches you from somewhere you cannot.',
  ],
  understand: [
    {
      title: 'A new light',
      text: [
        'Around 1140 Abbot Suger began rebuilding the east end of the abbey church of Saint-Denis, north of Paris. Its new choir, consecrated in 1144, wrapped the altar in a ring of chapels whose walls were mostly windows, so that the light ran unbroken around the sanctuary {smarthistory-suger}.',
        'Suger wrote about what he had made, which builders rarely did. He had the bronze doors inscribed: “The dull mind rises to truth through that which is material” {suger}. Light, gold and coloured glass were not decoration to him. They were a way up.',
      ],
    },
    {
      title: 'How the wall dissolved',
      text: [
        'A round arch pushes outward hard and its height is fixed by its width. A pointed arch sends more of its load downward and can reach the same height over different spans. Ribbed vaults gather the weight of the ceiling into a few lines and deliver it to the piers {britannica-gothic}.',
        'Outside, flying buttresses lean against the upper walls and carry their thrust over the aisles to the ground {britannica-gothic}. Between the piers, the wall is no longer needed to hold anything up. It can be glass.',
      ],
    },
    {
      title: 'Glass that tells',
      text: [
        'The windows are not abstract. Their medallions tell the Bible, the lives of saints, the deeds of kings and sometimes the trades of the guilds who paid for them, read from the bottom upward {met-gothic}. The glass was coloured in the melt, painted with a dark vitreous paint for faces and folds, fired, and held in lead.',
        'The panel shown here, made in France around 1245–48, shows King Louis IX carrying the Crown of Thorns {met-louis-ix}. Louis built the Sainte-Chapelle in Paris, consecrated in 1248, to house that relic: an upper chapel that is almost entirely glass {britannica-gothic}.',
      ],
    },
    {
      title: 'Reaching higher',
      text: [
        'Cathedral towns competed. The vault at Chartres stands about 37 metres above the floor; Amiens, begun in 1220, about 42; the choir of Beauvais about 48 {britannica-gothic}. In 1284 part of the Beauvais vault fell, and the choir was rebuilt with more piers {murray-1989}. Height was a statement of faith and of civic pride, and it had a limit.',
      ],
    },
    {
      title: 'A name from its critics',
      text: [
        'Nobody who built these churches called them Gothic. Italian writers of the Renaissance, measuring everything against Greek and Roman antiquity, blamed the pointed manner on the Goths who had sacked Rome; Giorgio Vasari’s Lives of 1550 made the scorn stick {vasari} {met-gothic}. The word we use is an insult that lost its sting.',
      ],
    },
  ],
  study: [
    {
      kind: 'interpretation',
      title: 'Did theology design the cathedral?',
      text: [
        'In 1951 Erwin Panofsky argued that Gothic architecture and scholastic philosophy shared a habit of mind: both divided their subject into clear parts and made the structure of the whole visible {panofsky-1951}. Earlier, he had read Suger’s light through the mystical theology of the writer known as Pseudo-Dionysius.',
        'Not everyone agrees. Peter Kidson argued in 1987 that Panofsky made Suger more of a philosopher than his writings support {kidson-1987}. Many historians now give as much weight to masons, money, relics, pilgrims and rivalry between towns as to theology. The cathedral can be a theological statement and a building site at once.',
      ],
    },
    {
      title: 'Across Europe',
      text: [
        'Gothic spread from the Île-de-France along the routes of the Church and its builders, changing as it went. Salisbury, begun in 1220, stretches long and low in the English way. Cologne, begun in 1248 on the model of French cathedrals, was finished only in 1880. Milan, begun in 1386, covered its Gothic in marble pinnacles that Italians never quite accepted as their own {britannica-gothic}.',
      ],
    },
    {
      title: 'Afterlives',
      text: [
        'Gothic returned as a deliberate revival. In eighteenth-century England it was a romantic taste for ruins and mystery; in the nineteenth, A. W. N. Pugin argued that pointed architecture was the only truly Christian one, and the rebuilt Palace of Westminster made the case in stone {britannica-gothic-revival}.',
      ],
    },
    {
      kind: 'editor',
      title: 'What is borrowed, and what is lost',
      text: [
        'Later dark aesthetics, from the gothic novel to the goth subculture and the college quads of dark academia, borrow the pointed arch, the shadow and the age of the stone. They usually leave out the one thing the builders cared most about: light. The original Gothic is not a dark style. It is a style about being filled with light from above.',
      ],
    },
    {
      kind: 'editor',
      title: 'About the hour of the day',
      text: [
        'Most great churches are built with the altar to the east, so their south windows take the sun from morning to evening. The hour control above is a simplified model of that: low, long, warm light at the ends of the day, high and strong light at noon. It is not a simulation of any particular building.',
      ],
    },
  ],
  works: [
    { what: 'Choir and ambulatory, abbey church of Saint-Denis', who: 'Abbot Suger', when: '1140–44', where: 'Saint-Denis, near Paris' },
    { what: 'Chartres Cathedral, rebuilt after the fire of 1194', when: '1194 onwards', where: 'Chartres' },
    { what: 'Amiens Cathedral', when: 'begun 1220', where: 'Amiens' },
    { what: 'Salisbury Cathedral', when: 'begun 1220', where: 'Salisbury' },
    { what: 'Sainte-Chapelle', who: 'for Louis IX', when: 'consecrated 1248', where: 'Paris' },
    { what: 'Cologne Cathedral', when: '1248–1880', where: 'Cologne' },
    { what: 'Choir of Beauvais Cathedral', when: 'vault fell in part, 1284', where: 'Beauvais' },
  ],
  recognise: 'Pointed arches; ribs and shafts that run unbroken from floor to vault; walls opened into coloured glass; height you feel before you measure it.',
};

export default text;
