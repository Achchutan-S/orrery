import type { ChapterText } from '../../house/text.ts';

const text: ChapterText = {
  status: 'draft',
  period: 'From the early 1980s; online as an aesthetic ever since',
  place: 'American and British fiction, Japanese manga and anime, Hollywood; now everywhere screens are',
  thesis: 'The city that never sleeps',
  encounter: [
    'Turn the density up. Every layer you add is something the genre imagined in the early 1980s and the present has partly built: screens on every surface, advertising that knows your name, cameras on every corner, companies larger than governments. Then turn it down and look for the people under the umbrellas. Cyberpunk was always about them.',
    'The word was coined by Bruce Bethke as the title of a short story published in 1983 {bethke-1983}. A year later William Gibson’s Neuromancer gave the genre its grammar, beginning with its first line: “The sky above the port was the color of television, tuned to a dead channel” {gibson-1984}.',
  ],
  understand: [
    {
      title: 'High tech, broken society',
      text: [
        'In his preface to the anthology Mirrorshades in 1986, Bruce Sterling described the new writers as fusing high technology with the street and the underground: computers, implants and drugs in the hands of hustlers rather than astronauts {sterling-1986}. The future was no longer clean. It was crowded, corporate and improvised.',
      ],
    },
    {
      title: 'The look',
      text: [
        'Ridley Scott’s Blade Runner, released in 1982, fixed the image: a Los Angeles of permanent night and rain, smoke, neon, and advertising projected on the sides of buildings, designed with the “visual futurist” Syd Mead {blade-runner}. In Japan, Ōtomo Katsuhiro’s Akira, serialised from 1982 and filmed in 1988, built its own ruined, electric Neo-Tokyo {akira}.',
      ],
    },
    {
      title: 'Corporations, cameras, bodies',
      text: [
        'The genre’s recurring themes are its real subject: power held by corporations rather than states; surveillance as the normal condition of the street; bodies modified, upgraded and indebted; and inequality so steep that the rich and the poor live in different vertical layers of the same city {gibson-1984} {sterling-1986}.',
      ],
    },
    {
      kind: 'interpretation',
      title: 'Whose city?',
      text: [
        'Western cyberpunk often dressed its future in Asian signage. David Morley and Kevin Robins called this techno-orientalism: in the 1980s, anxiety about Japan’s technological and economic rise produced images of Asia as hyper-modern yet dehumanised, the future as a place where the West had been overtaken {morley-robins-1995}. Later scholars traced the pattern across fiction, film and games {roh-2015}.',
        'Japanese artists made cyberpunk on their own terms, and their work is part of the genre’s core, not its backdrop {akira}. This page writes its signs in plain English on purpose, so that the city reads as corporate rather than exotic.',
      ],
    },
  ],
  study: [
    {
      title: 'Cyberpunk’s children',
      text: [
        'In 1987 K. W. Jeter joked that Victorian fantasies like his should be called “steampunk”, and the name stuck {jeter-1987}. In the 2010s, solarpunk was proposed as cyberpunk’s answer: a future after crisis in which technology serves ecology and community rather than corporations {flynn-2014}.',
      ],
    },
    {
      kind: 'editor',
      title: 'Did we get it?',
      text: [
        'Many readers now feel that we live inside a toned-down cyberpunk: the screens, the platforms, the cameras and the debt arrived, mostly without the neon and the rain. That is commentary, not history, but it is one reason the aesthetic still circulates: it is a way of looking at the present.',
      ],
    },
    {
      kind: 'editor',
      title: 'About the signs on this page',
      text: [
        'Every sign in the city above is fiction written for this page. None imitates a real company, and none uses another script as decoration.',
      ],
    },
  ],
  works: [
    { what: 'Blade Runner', who: 'Ridley Scott', when: '1982' },
    { what: '“Cyberpunk”', who: 'Bruce Bethke', when: '1983' },
    { what: 'Neuromancer', who: 'William Gibson', when: '1984' },
    { what: 'Mirrorshades: The Cyberpunk Anthology', who: 'Bruce Sterling (ed.)', when: '1986' },
    { what: 'Akira (film)', who: 'Ōtomo Katsuhiro', when: '1988' },
    { what: 'Ghost in the Shell (film)', who: 'Oshii Mamoru', when: '1995' },
    { what: 'The Matrix', who: 'The Wachowskis', when: '1999' },
  ],
  recognise: 'Night, rain and neon; signs stacked on signs; screens on every surface; bodies with hardware; corporations where governments should be; people improvising at street level.',
};

export default text;
