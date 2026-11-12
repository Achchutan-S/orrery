// Every source the atlas cites. Prose cites a source with {id} (house/cite.ts); a test fails when
// prose names an id that is not here, or when a source here is cited nowhere.
//
// Kinds say how much weight a source can bear. Internet aesthetics have few scholarly sources yet:
// journalism and community wikis are cited as records of how a term is used, not as authorities.
// Online sources were located on 8 November 2026; several museum and encyclopaedia sites refuse
// automated requests, so their addresses were confirmed by search rather than by fetching.

export type SourceKind = 'primary' | 'scholarship' | 'museum' | 'reference' | 'journalism' | 'community';

export interface Source {
  id: string;
  kind: SourceKind;
  /** The citation as a reader would look it up. */
  cite: string;
  url?: string;
  note?: string;
}

export const KIND_LABEL: Record<SourceKind, string> = {
  primary: 'Primary source',
  scholarship: 'Scholarship',
  museum: 'Museum or heritage body',
  reference: 'Reference work',
  journalism: 'Journalism',
  community: 'Community record',
};

export const SOURCES: readonly Source[] = [
  // Gothic
  { id: 'suger', kind: 'primary', cite: 'Abbot Suger, De administratione (written c. 1144–49). English translation in Erwin Panofsky (ed. and trans.), Abbot Suger on the Abbey Church of St.-Denis and Its Art Treasures, Princeton University Press, 1946.', url: 'https://sourcebooks.web.fordham.edu/source/sugar.asp', note: 'The link is the Internet Medieval Sourcebook excerpt.' },
  { id: 'smarthistory-suger', kind: 'museum', cite: 'Smarthistory, “Birth of the Gothic: Abbot Suger and the ambulatory at St. Denis”.', url: 'https://smarthistory.org/birth-of-the-gothic-abbot-suger-and-the-ambulatory-at-st-denis/' },
  { id: 'met-gothic', kind: 'museum', cite: 'The Metropolitan Museum of Art, Heilbrunn Timeline of Art History, “Gothic Art”.', url: 'https://www.metmuseum.org/toah/hd/mgot/hd_mgot.htm' },
  { id: 'panofsky-1951', kind: 'scholarship', cite: 'Erwin Panofsky, Gothic Architecture and Scholasticism, Archabbey Press, 1951.' },
  { id: 'kidson-1987', kind: 'scholarship', cite: 'Peter Kidson, “Panofsky, Suger and St Denis”, Journal of the Warburg and Courtauld Institutes 50 (1987), 1–17.' },
  { id: 'vasari', kind: 'primary', cite: 'Giorgio Vasari, Le vite de’ più eccellenti pittori, scultori e architettori, Florence, 1550; second edition 1568. Introduction to architecture.' },
  { id: 'murray-1989', kind: 'scholarship', cite: 'Stephen Murray, Beauvais Cathedral: Architecture of Transcendence, Princeton University Press, 1989.' },
  { id: 'britannica-gothic', kind: 'reference', cite: 'Encyclopaedia Britannica, “Gothic architecture”.', url: 'https://www.britannica.com/art/Gothic-architecture' },
  { id: 'britannica-gothic-revival', kind: 'reference', cite: 'Encyclopaedia Britannica, “Gothic Revival”.', url: 'https://www.britannica.com/art/Gothic-Revival' },
  { id: 'met-louis-ix', kind: 'museum', cite: 'The Metropolitan Museum of Art, King Louis IX Carrying the Crown of Thorns, French, c. 1245–48, pot-metal glass and vitreous paint, The Cloisters Collection, 1937 (37.173.3).', url: 'https://www.metmuseum.org/art/collection/search/471218' },

  // Renaissance
  { id: 'alberti', kind: 'primary', cite: 'Leon Battista Alberti, De pictura (1435); Italian version Della pittura (1436). English: On Painting, trans. Cecil Grayson, Penguin, 1991.' },
  { id: 'manetti', kind: 'primary', cite: 'Antonio di Tuccio Manetti, The Life of Brunelleschi (written c. 1480s), ed. Howard Saalman, trans. Catherine Enggass, Pennsylvania State University Press, 1970.' },
  { id: 'smarthistory-perspective', kind: 'museum', cite: 'Smarthistory, “Linear perspective: Brunelleschi’s experiment” and “Early applications of linear perspective”.', url: 'https://smarthistory.org/linear-perspective/' },
  { id: 'edgerton-1975', kind: 'scholarship', cite: 'Samuel Y. Edgerton Jr., The Renaissance Rediscovery of Linear Perspective, Basic Books, 1975.' },
  { id: 'kemp-1990', kind: 'scholarship', cite: 'Martin Kemp, The Science of Art: Optical Themes in Western Art from Brunelleschi to Seurat, Yale University Press, 1990.' },
  { id: 'belting-2011', kind: 'scholarship', cite: 'Hans Belting, Florence and Baghdad: Renaissance Art and Arab Science, trans. Deborah Lucas Schneider, Harvard University Press, 2011 (German edition 2008).' },
  { id: 'panofsky-1927', kind: 'scholarship', cite: 'Erwin Panofsky, “Die Perspektive als ‘symbolische Form’”, Vorträge der Bibliothek Warburg 1924–25, 1927; English: Perspective as Symbolic Form, trans. Christopher S. Wood, Zone Books, 1991.' },
  { id: 'met-durer-draughtsman', kind: 'museum', cite: 'The Metropolitan Museum of Art, Albrecht Dürer, Draughtsman Making a Perspective Drawing of a Reclining Woman, woodcut, impression dated by the museum c. 1600, Gift of Henry Walters, 1917 (17.37.314).', url: 'https://www.metmuseum.org/art/collection/search/366555' },
  { id: 'met-durer-1538', kind: 'museum', cite: 'The Metropolitan Museum of Art, Albrecht Dürer, Underweysung der Messung, Nuremberg, 1538 edition, Gift of Felix M. Warburg, 1918 (18.58.3).', url: 'https://www.metmuseum.org/art/collection/search/336657' },

  // Art Nouveau
  { id: 'greenhalgh-2000', kind: 'scholarship', cite: 'Paul Greenhalgh (ed.), Art Nouveau 1890–1914, V&A Publications, 2000 (catalogue of the Victoria and Albert Museum exhibition).' },
  { id: 'britannica-art-nouveau', kind: 'reference', cite: 'Encyclopaedia Britannica, “Art Nouveau”.', url: 'https://www.britannica.com/art/Art-Nouveau' },
  { id: 'unesco-horta', kind: 'museum', cite: 'UNESCO World Heritage Centre, “Major Town Houses of the Architect Victor Horta (Brussels)”, inscribed 2000.', url: 'https://whc.unesco.org/en/list/1005/' },
  { id: 'met-japonisme', kind: 'museum', cite: 'The Metropolitan Museum of Art, Heilbrunn Timeline of Art History, “Japonisme”.', url: 'https://www.metmuseum.org/toah/hd/jpon/hd_jpon.htm' },
  { id: 'haeckel', kind: 'primary', cite: 'Ernst Haeckel, Kunstformen der Natur, Leipzig and Vienna, 1899–1904.' },
  { id: 'loos', kind: 'primary', cite: 'Adolf Loos, “Ornament und Verbrechen”, lecture, Vienna, 1910; first published in French as “Ornement et crime”, 1913.' },

  // Bauhaus
  { id: 'gropius-1919', kind: 'primary', cite: 'Walter Gropius, Programm des Staatlichen Bauhauses in Weimar (manifesto and programme), April 1919.' },
  { id: 'droste', kind: 'scholarship', cite: 'Magdalena Droste, Bauhaus 1919–1933, Taschen, 1990 (with Bauhaus-Archiv, Berlin).' },
  { id: 'lupton-miller', kind: 'scholarship', cite: 'Ellen Lupton and J. Abbott Miller (eds.), The ABCs of ▲■●: The Bauhaus and Design Theory, Princeton Architectural Press, 1991.' },
  { id: 'harvard-questionnaire', kind: 'museum', cite: 'Harvard Art Museums (Busch-Reisinger Museum), Wassily Kandinsky, questionnaire to determine the relations between colour and form, 1923–24.', url: 'https://harvardartmuseums.org/collections/object/372864' },
  { id: 'sullivan-1896', kind: 'primary', cite: 'Louis H. Sullivan, “The Tall Office Building Artistically Considered”, Lippincott’s Monthly Magazine, March 1896.' },
  { id: 'moma-bayer', kind: 'museum', cite: 'The Museum of Modern Art, “Herbert Bayer” (artist biography, Object:Photo).', url: 'https://www.moma.org/interactives/objectphoto/artists/399.html' },
  { id: 'unesco-white-city', kind: 'museum', cite: 'UNESCO World Heritage Centre, “White City of Tel-Aviv – the Modern Movement”, inscribed 2003.', url: 'https://whc.unesco.org/en/list/1096/' },

  // Brutalism
  { id: 'banham-1955', kind: 'primary', cite: 'Reyner Banham, “The New Brutalism”, The Architectural Review 118 (December 1955), 354–361.' },
  { id: 'banham-1966', kind: 'scholarship', cite: 'Reyner Banham, The New Brutalism: Ethic or Aesthetic?, Architectural Press, 1966.' },
  { id: 'unesco-corbusier', kind: 'museum', cite: 'UNESCO World Heritage Centre, “The Architectural Work of Le Corbusier, an Outstanding Contribution to the Modern Movement”, inscribed 2016 (includes the Unité d’habitation, Marseille).', url: 'https://whc.unesco.org/en/list/1321/' },
  { id: 'sos-brutalism', kind: 'museum', cite: 'Oliver Elser, Philip Kurz and Peter Cachola Schmal (eds.), SOS Brutalism: A Global Survey, Park Books and Deutsches Architekturmuseum, 2017; and the project’s online database.', url: 'https://www.sosbrutalism.org/' },
  { id: 'vam-robin-hood', kind: 'museum', cite: 'Victoria and Albert Museum, “Robin Hood Gardens”.', url: 'https://www.vam.ac.uk/articles/robin-hood-gardens' },
  { id: 'venturi-1966', kind: 'primary', cite: 'Robert Venturi, Complexity and Contradiction in Architecture, The Museum of Modern Art, 1966.' },

  // Wabi-sabi
  { id: 'sep-japanese', kind: 'reference', cite: 'Graham Parkes and Adam Loughnane, “Japanese Aesthetics”, The Stanford Encyclopedia of Philosophy.', url: 'https://plato.stanford.edu/entries/japanese-aesthetics/' },
  { id: 'koren-1994', kind: 'scholarship', cite: 'Leonard Koren, Wabi-Sabi for Artists, Designers, Poets & Philosophers, Stone Bridge Press, 1994.' },
  { id: 'okakura-1906', kind: 'primary', cite: 'Okakura Kakuzō, The Book of Tea, Fox, Duffield & Company, 1906.' },
  { id: 'tanizaki-1933', kind: 'primary', cite: 'Tanizaki Jun’ichirō, In’ei raisan (1933); English: In Praise of Shadows, trans. Thomas J. Harper and Edward G. Seidensticker, Leete’s Island Books, 1977.' },
  { id: 'pitelka-2005', kind: 'scholarship', cite: 'Morgan Pitelka, Handmade Culture: Raku Potters, Patrons, and Tea Practitioners in Japan, University of Hawai‘i Press, 2005.' },
  { id: 'isozaki-ma', kind: 'primary', cite: 'Arata Isozaki (curator), “MA: Espace-temps du Japon”, Musée des Arts Décoratifs, Paris, Festival d’Automne, 1978.' },

  // Cyberpunk
  { id: 'bethke-1983', kind: 'primary', cite: 'Bruce Bethke, “Cyberpunk”, Amazing Science Fiction Stories 57:4, November 1983; and Bethke’s essay “The Etymology of ‘Cyberpunk’”.' },
  { id: 'gibson-1984', kind: 'primary', cite: 'William Gibson, Neuromancer, Ace Books, 1984.' },
  { id: 'sterling-1986', kind: 'primary', cite: 'Bruce Sterling (ed.), Mirrorshades: The Cyberpunk Anthology, Arbor House, 1986 (Sterling’s preface).' },
  { id: 'blade-runner', kind: 'primary', cite: 'Blade Runner, directed by Ridley Scott, Warner Bros., 1982; “visual futurist” Syd Mead.' },
  { id: 'morley-robins-1995', kind: 'scholarship', cite: 'David Morley and Kevin Robins, “Techno-Orientalism: Japan Panic”, in Spaces of Identity: Global Media, Electronic Landscapes and Cultural Boundaries, Routledge, 1995.' },
  { id: 'roh-2015', kind: 'scholarship', cite: 'David S. Roh, Betsy Huang and Greta A. Niu (eds.), Techno-Orientalism: Imagining Asia in Speculative Fiction, History, and Media, Rutgers University Press, 2015.' },
  { id: 'akira', kind: 'primary', cite: 'Ōtomo Katsuhiro, Akira, manga serialised in Young Magazine, Kodansha, 1982–90; animated film, 1988.' },

  // Frutiger Aero
  { id: 'cari-frutiger-aero', kind: 'community', cite: 'Consumer Aesthetics Research Institute (CARI), “Frutiger Aero”.', url: 'https://cari.institute/aesthetics/frutiger-aero', note: 'CARI is an independent online archive of consumer aesthetics; its page credits Sofi Lee with naming the aesthetic in 2017.' },
  { id: 'dazed-frutiger-aero', kind: 'journalism', cite: 'Dazed, “What is Frutiger Aero?” (on the aesthetic’s revival on TikTok).', url: 'https://www.dazeddigital.com/life-culture/article/58103/1/what-is-frutiger-aero-aesthetic-tiktok-msn-messenger-windows-vista-noughties' },
  { id: 'osterer-stamm-2009', kind: 'scholarship', cite: 'Heidrun Osterer and Philipp Stamm (eds.), Adrian Frutiger – Typefaces: The Complete Works, Birkhäuser, 2009.' },
  { id: 'wikipedia-vista', kind: 'reference', cite: 'Wikipedia, “Windows Vista” and “iOS 7” (release dates; tertiary).', url: 'https://en.wikipedia.org/wiki/Windows_Vista' },

  // Weirdcore
  { id: 'wikipedia-weirdcore', kind: 'reference', cite: 'Wikipedia, “Weirdcore aesthetic” (tertiary; summarises community accounts).', url: 'https://en.wikipedia.org/wiki/Weirdcore_aesthetic' },
  { id: 'screenshot-weirdcore', kind: 'journalism', cite: 'Screenshot Media, “Inside Weirdcore, an internet-born art movement triggering nostalgia of the unknown”.', url: 'https://screenshot-media.com/?p=22297' },
  { id: 'aesthetics-wiki-weirdcore', kind: 'community', cite: 'Aesthetics Wiki (Fandom), “Weirdcore” and “Dreamcore”.', url: 'https://aesthetics.fandom.com/wiki/Weirdcore', note: 'A community-edited wiki: evidence of how participants describe the aesthetic, not an authority on its history.' },
  { id: 'van-gennep-1909', kind: 'scholarship', cite: 'Arnold van Gennep, Les rites de passage, 1909; and Victor Turner, “Betwixt and Between: The Liminal Period in Rites de Passage”, 1964, in The Forest of Symbols, Cornell University Press, 1967.' },
  { id: 'wikipedia-backrooms', kind: 'reference', cite: 'Wikipedia, “The Backrooms” (tertiary).', url: 'https://en.wikipedia.org/wiki/The_Backrooms' },

  // Relationships beyond the nine chapters
  { id: 'jeter-1987', kind: 'primary', cite: 'K. W. Jeter, letter to Locus, April 1987, proposing “steampunk” as a name for Victorian fantasies, after “cyberpunk”.' },
  { id: 'flynn-2014', kind: 'primary', cite: 'Adam Flynn, “Solarpunk: Notes toward a Manifesto”, Project Hieroglyph, Arizona State University, 2014.' },
  { id: 'wikipedia-bauhaus-band', kind: 'reference', cite: 'Wikipedia, “Bauhaus (band)” (tertiary; the band formed in Northampton in 1978).', url: 'https://en.wikipedia.org/wiki/Bauhaus_(band)' },
  { id: 'camera-obscura', kind: 'reference', cite: 'Encyclopaedia Britannica, “camera obscura”; on Ibn al-Haytham’s optics, see also Belting 2011.', url: 'https://www.britannica.com/technology/camera-obscura-photography' },
  // Successions on the map (Part I chapters not yet written)
  { id: 'britannica-baroque', kind: 'reference', cite: 'Encyclopaedia Britannica, “Baroque art and architecture”.' },
  { id: 'britannica-rococo', kind: 'reference', cite: 'Encyclopaedia Britannica, “Rococo”.' },
  { id: 'britannica-neoclassicism', kind: 'reference', cite: 'Encyclopaedia Britannica, “Neoclassical art”.' },
  { id: 'britannica-romanticism', kind: 'reference', cite: 'Encyclopaedia Britannica, “Romanticism”.' },
  { id: 'britannica-art-deco', kind: 'reference', cite: 'Encyclopaedia Britannica, “Art Deco”.' },
  { id: 'britannica-renaissance-architecture', kind: 'reference', cite: 'Encyclopaedia Britannica, “Western architecture: Renaissance”.' },
  { id: 'morris-arts-crafts', kind: 'reference', cite: 'Encyclopaedia Britannica, “Arts and Crafts movement”.' },
];

export const source = (id: string): Source => {
  const found = SOURCES.find((x) => x.id === id);
  if (!found) throw new Error(`seeing: no source "${id}" in data/sources.ts`);
  return found;
};
