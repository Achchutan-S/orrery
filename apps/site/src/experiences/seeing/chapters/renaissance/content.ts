import type { ChapterText } from '../../house/text.ts';

const text: ChapterText = {
  status: 'draft',
  period: 'c. 1400 – c. 1600',
  place: 'Florence first; then Italy and, through prints and travellers, the rest of Europe',
  thesis: 'The world becomes measurable',
  encounter: [
    'Every line on this floor that runs away from you meets every other line at a single point on the horizon. Move that point and the whole loggia rebuilds itself around where you stand. This is what Florentine artists of the early fifteenth century learned to construct: not simply a picture of the world, but a picture of the world as seen from one place {smarthistory-perspective}.',
    'Leon Battista Alberti told painters to treat the picture as an open window through which the subject is seen, and gave them a geometric procedure for building the floor behind it {alberti}. The world became something you could measure, divide and rebuild with a ruler.',
  ],
  understand: [
    {
      title: 'Brunelleschi’s mirror',
      text: [
        'The architect Filippo Brunelleschi painted a small panel of the Baptistery of Florence as seen from the doorway of the cathedral opposite, probably in the 1410s or around 1420. According to his biographer Antonio Manetti, he drilled a hole through the panel at the point where the lines converged. The viewer looked through the back of the panel into a mirror held at arm’s length, saw the painting reflected, then lowered the mirror and saw the real building, matching it {manetti} {smarthistory-perspective}.',
        'The panel is lost, and Manetti wrote decades later. But the story describes the idea exactly: a picture constructed for one eye, at one fixed point.',
      ],
    },
    {
      title: 'Alberti’s window',
      text: [
        'Alberti’s treatise On Painting, written in Latin in 1435 and in Italian the next year, with a dedication to Brunelleschi, set the method down {alberti}. Divide the base of the picture into units; join each division to a single centric point no higher than the height of a person in the picture; then find where the cross-lines fall. He also recommended a veil, a thin cloth gridded with threads, held between eye and subject to help the painter transfer what he saw square by square.',
      ],
    },
    {
      title: 'The first paintings',
      text: [
        'In Masaccio’s Holy Trinity in Santa Maria Novella, of about 1427, a coffered vault recedes into the wall towards a vanishing point set near the eye level of a person standing in the church. It is among the earliest surviving paintings built this way, and visitors still describe the wall seeming to open {smarthistory-perspective}.',
      ],
    },
    {
      title: 'North of the Alps',
      text: [
        'Albrecht Dürer studied in Italy and carried the method home. His treatise on measurement, Underweysung der Messung, appeared in Nuremberg in 1525; its expanded edition of 1538 added woodcuts of drawing devices like the one below {met-durer-1538}. The draughtsman fixes his eye to a sighting post and looks through a gridded frame, Alberti’s veil made of wood and string, transferring what he sees onto gridded paper {met-durer-draughtsman}.',
      ],
    },
    {
      kind: 'interpretation',
      title: 'Not one inventor',
      text: [
        'Linear perspective was not invented in a single moment by a single person. Giotto and Ambrogio Lorenzetti had built convincing spaces in the fourteenth century, by eye and craft rather than by one rule {edgerton-1975} {kemp-1990}. Florentine artists drew on medieval optics, much of it inherited from Ibn al-Haytham’s Book of Optics in Latin translation; Hans Belting has argued that this Arab science is part of the story usually told as purely Florentine {belting-2011}. What changed around 1420 was a systematic, teachable procedure, and a culture that wanted it.',
      ],
    },
  ],
  study: [
    {
      title: 'The geometry under the floor',
      text: [
        'Lines that are parallel in the world and run straight away from the viewer meet at the vanishing point, directly opposite the eye. The diagonals of a square floor meet the horizon at another point, as far from the vanishing point as the eye is from the picture: move the distance control and watch it slide {kemp-1990}. A painter who knows that point can construct every square without a side view; later treatises used it as a shortcut.',
      ],
    },
    {
      kind: 'interpretation',
      title: 'What perspective leaves out',
      text: [
        'A perspective picture assumes one eye, open, unmoving, at one instant. Our two eyes move constantly. In 1927 Erwin Panofsky argued that linear perspective is not simply the correct way to draw but a “symbolic form”: a cultural construction that expresses a particular idea of space and of the individual viewer {panofsky-1927}. Not everyone accepts his strong version of the claim, but few now treat perspective as the only true picture of vision.',
      ],
    },
    {
      title: 'Measure and the human body',
      text: [
        'Perspective arrived with a broader return to Roman models: columns and round arches, the treatise of the Roman architect Vitruvius, and proportion based on the human body. Leonardo da Vinci’s drawing of a man inscribed in a circle and a square, made around 1490, illustrates a passage of Vitruvius {kemp-1990}.',
      ],
    },
    {
      kind: 'editor',
      title: 'Why the loggia',
      text: [
        'The arcade in the instrument is not a copy of any building. It borrows the grammar of Brunelleschi’s Florence, white plaster framed by grey pietra serena stone, round arches on slender columns, because the same culture produced the buildings and the method for drawing them.',
      ],
    },
  ],
  works: [
    { what: 'Perspective panels of the Baptistery and the Piazza della Signoria (lost)', who: 'Filippo Brunelleschi', when: 'c. 1410s–20' },
    { what: 'Loggia of the Ospedale degli Innocenti', who: 'Filippo Brunelleschi', when: 'begun 1419', where: 'Florence' },
    { what: 'Holy Trinity', who: 'Masaccio', when: 'c. 1427', where: 'Santa Maria Novella, Florence' },
    { what: 'De pictura (On Painting)', who: 'Leon Battista Alberti', when: '1435' },
    { what: 'De prospectiva pingendi (On Perspective for Painting)', who: 'Piero della Francesca', when: '1470s' },
    { what: 'Proportions of the human figure, after Vitruvius', who: 'Leonardo da Vinci', when: 'c. 1490', where: 'Gallerie dell’Accademia, Venice' },
    { what: 'Underweysung der Messung', who: 'Albrecht Dürer', when: '1525; expanded 1538', where: 'Nuremberg' },
  ],
  recognise: 'One vanishing point; a floor you could count; columns, round arches and measured proportion; figures standing in space rather than on gold.',
};

export default text;
