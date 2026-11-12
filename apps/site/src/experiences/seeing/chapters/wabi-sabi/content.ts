import type { ChapterText } from '../../house/text.ts';

const text: ChapterText = {
  status: 'draft',
  period: 'Tea aesthetics of the 15th–16th centuries; the paired term popular in the West from the 1990s',
  place: 'Japan; and, as a design idea, everywhere since',
  thesis: 'The unfinished world',
  encounter: [
    'Stay a while. This page is not finished and it will not be. As you read, the glaze on the bowl slowly crazes and the wall darkens, as a tea room does over decades. You can stop time if you wish. You cannot reverse it.',
    'Wabi-sabi is often sold as beige linen and empty rooms. The words come from somewhere older and stranger: from the tea rooms of sixteenth-century Japan, and from poets who found beauty in what is lonely, worn and passing {sep-japanese}.',
  ],
  understand: [
    {
      kind: 'term',
      title: 'Two words, not one',
      text: [
        '*Wabi* first meant the misery of living alone, far from society; over time it came to name a chosen simplicity, rustic and austere. *Sabi*, related to words for withering and rust, names the beauty of age and solitude, and is associated above all with the haiku of Matsuo Bashō’s school {sep-japanese}.',
        'The two were long separate ideas. Joined as one phrase, “wabi-sabi” became a design philosophy in English largely through Leonard Koren’s short book of 1994 {koren-1994}.',
      ],
    },
    {
      title: 'The tea room',
      text: [
        'In the fifteenth and sixteenth centuries, tea masters from Murata Jukō to Sen no Rikyū turned away from precious Chinese ceramics towards rough local wares and tiny rustic rooms: the Tai-an, attributed to Rikyū, is two tatami mats in size {sep-japanese}. The potter Chōjirō made Rikyū hand-shaped, dark raku bowls with no wheel-thrown symmetry {pitelka-2005}.',
      ],
    },
    {
      title: 'Praise of shadows',
      text: [
        'In 1933 the novelist Tanizaki Jun’ichirō wrote an essay against the electric glare of modern Japan, praising lacquer seen by candlelight, the dark recesses of old rooms, and the patina left by hands {tanizaki-1933}. It is not about wabi-sabi as such, but it describes the light in which those things were meant to be seen.',
      ],
    },
    {
      title: 'How it travelled',
      text: [
        'Okakura Kakuzō’s The Book of Tea, written in English in 1906, introduced the ideals of the tea ceremony to Western readers {okakura-1906}. Koren’s book, almost ninety years later, packaged wabi-sabi as a set of principles for designers, and the word entered the vocabulary of interiors {koren-1994}.',
      ],
    },
  ],
  study: [
    {
      kind: 'editor',
      title: 'Not one “Japanese aesthetic”',
      text: [
        'Japan has many aesthetic ideas from different centuries and different worlds: *mono no aware*, the pathos of things, central to court literature; *yūgen*, profound and mysterious grace, refined in Noh theatre; *iki*, the urban chic of Edo’s pleasure quarters, analysed by Kuki Shūzō in 1930; and *kawaii* in our own time. Wabi and sabi are two among them {sep-japanese}.',
      ],
    },
    {
      kind: 'term',
      title: 'Ma',
      text: [
        '*Ma* is the interval: a pause in music, the gap between objects, the time between actions, felt as something rather than as nothing. The architect Arata Isozaki brought it to Western audiences with an exhibition in Paris in 1978 {isozaki-ma}.',
      ],
    },
    {
      kind: 'interpretation',
      title: 'Whose poverty?',
      text: [
        'The rustic tea room was practised by warlords and rich merchants; Rikyū served the ruler Toyotomi Hideyoshi. A rough bowl could be worth a fortune. Chosen simplicity was, among other things, a display of taste by people who could afford anything {pitelka-2005}.',
      ],
    },
    {
      kind: 'editor',
      title: 'What it is not',
      text: [
        'It is not beige minimalism, which hides wear rather than honouring it. It is not Japandi, a contemporary blend of Japanese and Scandinavian interiors. Kintsugi, mending broken ceramics with lacquer and gold, is often mentioned in the same breath, but it is a repair technique, not a synonym. And it is not one ancient doctrine: the words have histories, and the version sold today is a modern synthesis.',
      ],
    },
  ],
  works: [
    { what: 'Tai-an tea room, attributed to Sen no Rikyū', when: 'c. 1582', where: 'Myōki-an, Kyoto' },
    { what: 'Black raku tea bowls', who: 'Chōjirō', when: 'late 16th century' },
    { what: 'Oku no Hosomichi (The Narrow Road to the Deep North)', who: 'Matsuo Bashō', when: 'journey 1689; published 1702' },
    { what: 'The Book of Tea', who: 'Okakura Kakuzō', when: '1906' },
    { what: 'In Praise of Shadows', who: 'Tanizaki Jun’ichirō', when: '1933' },
    { what: 'Wabi-Sabi for Artists, Designers, Poets & Philosophers', who: 'Leonard Koren', when: '1994' },
  ],
  recognise: 'Irregular, hand-made things; natural materials allowed to age; dim, uneven light; asymmetry, and empty space that feels full. Nothing new, nothing perfect, nothing permanent.',
};

export default text;
