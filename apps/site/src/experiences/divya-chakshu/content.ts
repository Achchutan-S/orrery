// The one table of the experience: nine sequences, each a list of beats. The page renders it, and
// the scene timeline (client/timeline.ts) keys every visual change to its beat indices, so text and
// image cannot drift apart. Pure data: no Astro, DOM or WebGL imports.
//
// Integrity rules (README.md § Sources):
// - Verse numbers use the standard 700-verse numbering of the Bhagavad Gita (Mahabharata, Bhishma Parva).
// - Sanskrit is quoted only where it is given here in full for the lines shown; `part` says when only
//   part of a verse is quoted. Nothing is quoted in Sanskrit that is not in the verse.
// - Every English rendering is an adaptation written for this experience (`ADAPTATION`), not a
//   published translation. Narration is interpretation and is set apart from scripture on the page.

export type Speaker = 'Arjuna' | 'Krishna' | 'Sanjaya';

export interface Verse {
  /** Chapter.verse, or a range: "11.3–4". */
  ref: string;
  speaker: Speaker;
  /** Devanagari, one string per half-verse line. */
  sa?: readonly string[];
  /** IAST transliteration of exactly the `sa` lines. */
  iast?: readonly string[];
  /** Which part of the verse `sa` quotes, when not all of it. */
  part?: string;
  /** The English adaptation, of the whole verse or range. */
  en: string;
}

export type Beat =
  | { kind: 'title' }
  | { kind: 'narration'; text: readonly string[]; tone?: 'quiet' | 'large' }
  | { kind: 'verse'; verse: Verse; tone?: 'blaze' | 'monument' | 'intimate' }
  | { kind: 'note'; text: readonly string[] }
  | { kind: 'sight' }
  | { kind: 'end' };

export interface Sequence {
  id: string;
  /** Roman numeral shown on the sequence card; the prologue has none. */
  numeral?: string;
  title: string;
  /** Sanskrit name of the sequence, where one exists in the text. */
  sanskrit?: { sa: string; iast: string };
  /** What the picture shows, for anyone who cannot see it. */
  scene: string;
  beats: readonly Beat[];
}

export const ADAPTATION = 'English renderings are adaptations written for this experience from the Sanskrit, not a published translation.';

export const SEQUENCES: readonly Sequence[] = [
  {
    id: 'prologue',
    title: 'Before the infinite',
    scene: 'Dusk over a wide plain of dust. Two armies stand as thin dark lines on the far horizon, left and right. Between them, small against a low, veiled sun, one chariot: four horses, a great spoked wheel, a pennant moving in the wind.',
    beats: [
      { kind: 'title' },
      { kind: 'narration', text: ['Kurukshetra. Two armies face each other across the plain, close enough to hear each other’s horses.'] },
      { kind: 'narration', text: ['Between them stands a single chariot. Arjuna, the archer, rides in it. Holding the reins is Krishna: his cousin, his charioteer, his closest friend.'] },
    ],
  },
  {
    id: 'question',
    numeral: 'I',
    title: 'The question',
    scene: 'The chariot comes closer. Two figures in it, one seated at the reins, one standing. The armies wait in the haze.',
    beats: [
      { kind: 'title' },
      { kind: 'narration', text: ['Before the first arrow flew, Arjuna lowered his bow. In the opposing ranks he saw his teachers, his grandfather, his cousins, and he could not fight them.', 'For ten chapters Krishna has answered him.'] },
      { kind: 'verse', verse: { ref: '11.1', speaker: 'Arjuna', en: 'Out of kindness to me you have spoken the highest secret, the teaching of the self. By your words my confusion is gone.' } },
      { kind: 'narration', text: ['But hearing is not seeing. Arjuna asks for something no argument can give.'], tone: 'large' },
      {
        kind: 'verse',
        verse: {
          ref: '11.3–4', speaker: 'Arjuna', part: '11.4',
          sa: ['मन्यसे यदि तच्छक्यं मया द्रष्टुमिति प्रभो ।', 'योगेश्वर ततो मे त्वं दर्शयात्मानमव्ययम् ॥'],
          iast: ['manyase yadi tac chakyaṃ mayā draṣṭum iti prabho', 'yogeśvara tato me tvaṃ darśayātmānam avyayam'],
          en: 'It is as you have said of yourself, supreme Lord. Yet I wish to see your sovereign form, highest of beings. If you think it possible for me to see it, Lord of yoga, then show me your imperishable self.',
        },
      },
    ],
  },
  {
    id: 'divya-chakshu',
    numeral: 'II',
    title: 'Divine sight',
    sanskrit: { sa: 'दिव्यं चक्षुः', iast: 'divyaṃ cakṣuḥ' },
    scene: 'An eye of light opens along the horizon. Inside it the plain curls into a disc with the chariot at its centre; the armies stand around its rim, each figure threaded by a fine line of gold to a vast geometry of rings and interlocking triangles that was always there.',
    beats: [
      { kind: 'title' },
      {
        kind: 'verse',
        verse: {
          ref: '11.8', speaker: 'Krishna',
          sa: ['न तु मां शक्यसे द्रष्टुमनेनैव स्वचक्षुषा ।', 'दिव्यं ददामि ते चक्षुः पश्य मे योगमैश्वरम् ॥'],
          iast: ['na tu māṃ śakyase draṣṭum anenaiva sva-cakṣuṣā', 'divyaṃ dadāmi te cakṣuḥ paśya me yogam aiśvaram'],
          en: 'But you cannot see me with these eyes of yours. I give you divine sight. See my sovereign power.',
        },
      },
      { kind: 'sight' },
      { kind: 'narration', text: ['The horizon stops being an edge. Every figure on the plain is threaded to something above it. Layers open inside layers.'] },
      { kind: 'note', text: ['This whole chapter reaches us through a second gift of sight. Sanjaya, far from the field, describes it to the blind king Dhritarashtra by a vision granted to him by the sage Vyasa.', '“Having spoken thus, O king, the great lord of yoga showed Arjuna his supreme, sovereign form.” (11.9, Sanjaya)'] },
    ],
  },
  {
    id: 'thousand-suns',
    numeral: 'III',
    title: 'A thousand suns',
    scene: 'Points of light rise everywhere at once, near and impossibly far, each one a sun, each cluster of suns resolving into more suns as the view pulls back. The light grows until the whole field is white.',
    beats: [
      { kind: 'title' },
      { kind: 'narration', text: ['Then it rises.'], tone: 'quiet' },
      {
        kind: 'verse', tone: 'blaze',
        verse: {
          ref: '11.12', speaker: 'Sanjaya',
          sa: ['दिवि सूर्यसहस्रस्य भवेद्युगपदुत्थिता ।', 'यदि भाः सदृशी सा स्याद्भासस्तस्य महात्मनः ॥'],
          iast: ['divi sūrya-sahasrasya bhaved yugapad utthitā', 'yadi bhāḥ sadṛśī sā syād bhāsas tasya mahātmanaḥ'],
          en: 'If the light of a thousand suns were to blaze forth in the sky at once, it might resemble the splendour of that great being.',
        },
      },
      { kind: 'narration', text: ['Sanjaya reaches for the largest comparison he has, and says it might be like that. Might. Even a thousand suns is an estimate from below.'] },
    ],
  },
  {
    id: 'universe-within',
    numeral: 'IV',
    title: 'The universe within',
    scene: 'A vast circle of flame encloses everything there is. Inside it, ring within ring, are eyes, spiral worlds and lotus forms, and every ring, seen closer, holds the whole pattern again, without end. The sun and moon are its two great eyes; a crown rises above it; a discus turns at its right and a mace stands at its left. The eyes follow you.',
    beats: [
      { kind: 'title' },
      {
        kind: 'verse',
        verse: {
          ref: '11.13', speaker: 'Sanjaya',
          sa: ['तत्रैकस्थं जगत्कृत्स्नं प्रविभक्तमनेकधा ।', 'अपश्यद्देवदेवस्य शरीरे पाण्डवस्तदा ॥'],
          iast: ['tatraika-sthaṃ jagat kṛtsnaṃ pravibhaktam anekadhā', 'apaśyad deva-devasya śarīre pāṇḍavas tadā'],
          en: 'There, in the body of the God of gods, the son of Pandu saw the entire universe gathered in one place, divided in many ways.',
        },
      },
      { kind: 'narration', text: ['Not in front of him. Within him. Every world is one cell of the form, and every cell, looked at closely, holds the form again.'] },
      { kind: 'verse', verse: { ref: '11.15', speaker: 'Arjuna', en: 'In your body, O God, I see all the gods and every kind of being: Brahma the creator seated on his lotus, all the sages, and the celestial serpents.' } },
      {
        kind: 'verse',
        verse: {
          ref: '11.16', speaker: 'Arjuna',
          sa: ['अनेकबाहूदरवक्त्रनेत्रं पश्यामि त्वां सर्वतोऽनन्तरूपम् ।', 'नान्तं न मध्यं न पुनस्तवादिं पश्यामि विश्वेश्वर विश्वरूप ॥'],
          iast: ['aneka-bāhūdara-vaktra-netraṃ paśyāmi tvāṃ sarvato ’nanta-rūpam', 'nāntaṃ na madhyaṃ na punas tavādiṃ paśyāmi viśveśvara viśva-rūpa'],
          en: 'With arms, bellies, mouths and eyes past counting, I see you everywhere, endless in form. No end, no middle, no beginning do I see in you, Lord of all, whose form is everything.',
        },
      },
      {
        kind: 'verse',
        verse: {
          ref: '11.17', speaker: 'Arjuna',
          sa: ['किरीटिनं गदिनं चक्रिणं च तेजोराशिं सर्वतो दीप्तिमन्तम् ।', 'पश्यामि त्वां दुर्निरीक्ष्यं समन्ताद्दीप्तानलार्कद्युतिमप्रमेयम् ॥'],
          iast: ['kirīṭinaṃ gadinaṃ cakriṇaṃ ca tejo-rāśiṃ sarvato dīptimantam', 'paśyāmi tvāṃ durnirīkṣyaṃ samantād dīptānalārka-dyutim aprameyam'],
          en: 'Crowned, bearing the mace and the discus, a mass of light shining everywhere: I see you, so hard to look upon, blazing all around like fire and sun, beyond all measure.',
        },
      },
      { kind: 'verse', verse: { ref: '11.19', speaker: 'Arjuna', en: 'Without beginning, middle or end, of endless strength, with countless arms, the moon and the sun your eyes, your mouth a blazing fire, I see you burning this whole universe with your radiance.' } },
    ],
  },
  {
    id: 'terror',
    numeral: 'V',
    title: 'Wonder becomes terror',
    scene: 'The same form, now burning. Its eyes become mouths lined with teeth; fire pours inward toward a central mouth that fills the sky. Then countless streams of light flow into it like rivers into the sea. Then, close and small, moths circle a single flame and fly into it, one by one.',
    beats: [
      { kind: 'title' },
      { kind: 'verse', verse: { ref: '11.20', speaker: 'Arjuna', en: 'The space between heaven and earth, and every direction, is filled by you alone. Seeing this wondrous and terrible form of yours, great one, the three worlds tremble.' } },
      {
        kind: 'verse',
        verse: {
          ref: '11.25', speaker: 'Arjuna',
          sa: ['दंष्ट्राकरालानि च ते मुखानि दृष्ट्वैव कालानलसन्निभानि ।', 'दिशो न जाने न लभे च शर्म प्रसीद देवेश जगन्निवास ॥'],
          iast: ['daṃṣṭrā-karālāni ca te mukhāni dṛṣṭvaiva kālānala-sannibhāni', 'diśo na jāne na labhe ca śarma prasīda deveśa jagan-nivāsa'],
          en: 'Seeing your mouths, terrible with teeth, like the fire at the end of time, I no longer know the directions, and I find no peace. Be gracious, Lord of gods, home of the worlds.',
        },
      },
      { kind: 'narration', text: ['Then he sees them: the sons of Dhritarashtra with their allied kings, Bhishma, Drona, Karna, and the foremost warriors of his own side too, rushing into those mouths (11.26–27). The verse does not look away; some, it says, are caught between the teeth.'] },
      {
        kind: 'verse',
        verse: {
          ref: '11.28', speaker: 'Arjuna',
          sa: ['यथा नदीनां बहवोऽम्बुवेगाः समुद्रमेवाभिमुखा द्रवन्ति ।', 'तथा तवामी नरलोकवीरा विशन्ति वक्त्राण्यभिविज्वलन्ति ॥'],
          iast: ['yathā nadīnāṃ bahavo ’mbu-vegāḥ samudram evābhimukhā dravanti', 'tathā tavāmī nara-loka-vīrā viśanti vaktrāṇy abhivijvalanti'],
          en: 'As the many currents of rivers race toward the ocean, so these heroes of the world of men pour into your blazing mouths.',
        },
      },
      {
        kind: 'verse', tone: 'intimate',
        verse: {
          ref: '11.29', speaker: 'Arjuna',
          sa: ['यथा प्रदीप्तं ज्वलनं पतङ्गा विशन्ति नाशाय समृद्धवेगाः ।', 'तथैव नाशाय विशन्ति लोकास्तवापि वक्त्राणि समृद्धवेगाः ॥'],
          iast: ['yathā pradīptaṃ jvalanaṃ pataṅgā viśanti nāśāya samṛddha-vegāḥ', 'tathaiva nāśāya viśanti lokās tavāpi vaktrāṇi samṛddha-vegāḥ'],
          en: 'As moths fly at full speed into a blazing flame, to perish, so the worlds fly at full speed into your mouths, to perish.',
        },
      },
      {
        kind: 'verse',
        verse: {
          ref: '11.31', speaker: 'Arjuna', part: 'its opening quarter',
          sa: ['आख्याहि मे को भवानुग्ररूपो'],
          iast: ['ākhyāhi me ko bhavān ugra-rūpo'],
          en: 'Tell me who you are, so fierce of form. I bow to you, best of gods; be gracious. I wish to know you, the first one, for I do not understand what you are doing.',
        },
      },
    ],
  },
  {
    id: 'time',
    numeral: 'VI',
    title: 'I am Time',
    sanskrit: { sa: 'कालोऽस्मि', iast: 'kālo ’smi' },
    scene: 'A great wheel of concentric rings, each marked like an astronomical dial and turning at its own pace. Sparks of light are born on the rings and go out. At the declaration everything stops. Then one small point of gold travels on the outer ring, carried by the wheel.',
    beats: [
      { kind: 'title' },
      {
        kind: 'verse', tone: 'monument',
        verse: {
          ref: '11.32', speaker: 'Krishna',
          sa: ['कालोऽस्मि लोकक्षयकृत्प्रवृद्धो लोकान्समाहर्तुमिह प्रवृत्तः ।', 'ऋतेऽपि त्वां न भविष्यन्ति सर्वे येऽवस्थिताः प्रत्यनीकेषु योधाः ॥'],
          iast: ['kālo ’smi loka-kṣaya-kṛt pravṛddho lokān samāhartum iha pravṛttaḥ', 'ṛte ’pi tvāṃ na bhaviṣyanti sarve ye ’vasthitāḥ pratyanīkeṣu yodhāḥ'],
          en: 'I am Time, grown vast, the destroyer of worlds, come forth to gather in the worlds. Even without you, none of the warriors arrayed in the opposing ranks will survive.',
        },
      },
      { kind: 'note', text: ['Kāla means time. It is also a name of death, and translators choose between the two.'] },
      {
        kind: 'verse',
        verse: {
          ref: '11.33', speaker: 'Krishna', part: 'its second half',
          sa: ['मयैवैते निहताः पूर्वमेव निमित्तमात्रं भव सव्यसाचिन् ॥'],
          iast: ['mayaivaite nihatāḥ pūrvam eva nimitta-mātraṃ bhava savya-sācin'],
          en: 'Therefore stand up and win glory; conquer your enemies and enjoy a prosperous kingdom. By me they have already been slain. Be only the instrument, archer who shoots with either hand.',
        },
      },
      { kind: 'verse', verse: { ref: '11.34', speaker: 'Krishna', en: 'Drona, Bhishma, Jayadratha, Karna and the other heroes are slain by me; kill them. Do not waver. Fight: you will conquer your rivals in battle.' } },
      { kind: 'narration', text: ['This is the hardest passage in the chapter, and it has never had a single reading. Commentators have heard in it divine foreknowledge, a warning against the pride of thinking oneself the doer, and a summons to duty; others, Gandhi among them, read the whole war as an allegory of the struggle within.', 'One reading, close to the Gita’s earlier teaching on action without attachment to its fruits (2.47), is that Arjuna must act without imagining himself the author of everything that follows.'] },
    ],
  },
  {
    id: 'friend',
    numeral: 'VII',
    title: 'The friend and the infinite',
    scene: 'Almost darkness. A small clay lamp burns low in the centre. Far behind it, faint and slow, the rings of the universal form are still there.',
    beats: [
      { kind: 'title' },
      { kind: 'narration', text: ['And then Arjuna remembers who this is.'], tone: 'quiet' },
      {
        kind: 'verse', tone: 'intimate',
        verse: {
          ref: '11.41', speaker: 'Arjuna',
          sa: ['सखेति मत्वा प्रसभं यदुक्तं हे कृष्ण हे यादव हे सखेति ।', 'अजानता महिमानं तवेदं मया प्रमादात्प्रणयेन वापि ॥'],
          iast: ['sakheti matvā prasabhaṃ yad uktaṃ he kṛṣṇa he yādava he sakheti', 'ajānatā mahimānaṃ tavedaṃ mayā pramādāt praṇayena vāpi'],
          en: 'Thinking of you as a friend, I called out rashly, “Hey Krishna! Hey Yadava! Hey, friend!”, not knowing this greatness of yours, out of carelessness, or out of love.',
        },
      },
      { kind: 'verse', tone: 'intimate', verse: { ref: '11.42', speaker: 'Arjuna', en: 'If I ever slighted you in jest, at play, at rest, sitting or eating, alone or in front of others, I ask you to forgive me, immeasurable one.' } },
      {
        kind: 'verse', tone: 'intimate',
        verse: {
          ref: '11.44', speaker: 'Arjuna', part: 'its second half',
          sa: ['पितेव पुत्रस्य सखेव सख्युः प्रियः प्रियायार्हसि देव सोढुम् ॥'],
          iast: ['piteva putrasya sakheva sakhyuḥ priyaḥ priyāyārhasi deva soḍhum'],
          en: 'So I bow down and prostrate my body before you, and ask your grace, Lord to be praised. As a father with his son, as a friend with his friend, as a lover with the beloved, so bear with me, O God.',
        },
      },
    ],
  },
  {
    id: 'return',
    numeral: 'VIII',
    title: 'Return to the gentle form',
    sanskrit: { sa: 'सौम्यं रूपम्', iast: 'saumyaṃ rūpam' },
    scene: 'The universal form folds inward, ring into ring, until all of it rests in one point. The point opens into the eye of a peacock feather, deep blue, turquoise and bronze. The feather becomes morning light over the plain: soft gold, the chariot near, the charioteer at the reins, the dust settling. Then darkness and silence.',
    beats: [
      { kind: 'title' },
      {
        kind: 'verse',
        verse: {
          ref: '11.45', speaker: 'Arjuna',
          sa: ['अदृष्टपूर्वं हृषितोऽस्मि दृष्ट्वा भयेन च प्रव्यथितं मनो मे ।', 'तदेव मे दर्शय देव रूपं प्रसीद देवेश जगन्निवास ॥'],
          iast: ['adṛṣṭa-pūrvaṃ hṛṣito ’smi dṛṣṭvā bhayena ca pravyathitaṃ mano me', 'tad eva me darśaya deva rūpaṃ prasīda deveśa jagan-nivāsa'],
          en: 'I have seen what was never seen before, and I rejoice; yet my mind is shaken with fear. Show me that form of yours, O God. Be gracious, Lord of gods, home of the worlds.',
        },
      },
      { kind: 'verse', verse: { ref: '11.46', speaker: 'Arjuna', en: 'I wish to see you as before, crowned, with mace and discus in hand. Take that four-armed form, thousand-armed one, whose body is the universe.' } },
      { kind: 'narration', text: ['Sanjaya tells what followed: Krishna showed his own form again, and, becoming gentle in form once more, the great one comforted the frightened Arjuna (11.50).'] },
      { kind: 'note', text: ['Traditions differ on what Arjuna saw in between. Some read the four-armed form he asked for, then the human one; others read “his own form” as the human Krishna directly.'] },
      {
        kind: 'verse', tone: 'intimate',
        verse: {
          ref: '11.51', speaker: 'Arjuna',
          sa: ['दृष्ट्वेदं मानुषं रूपं तव सौम्यं जनार्दन ।', 'इदानीमस्मि संवृत्तः सचेताः प्रकृतिं गतः ॥'],
          iast: ['dṛṣṭvedaṃ mānuṣaṃ rūpaṃ tava saumyaṃ janārdana', 'idānīm asmi saṃvṛttaḥ sa-cetāḥ prakṛtiṃ gataḥ'],
          en: 'Seeing this gentle human form of yours, Janardana, I am myself again. My mind has returned to its nature.',
        },
      },
      { kind: 'verse', verse: { ref: '11.54', speaker: 'Krishna', en: 'Only by devotion directed to nothing else, Arjuna, can I be known in this way, and seen as I truly am, and entered.' } },
      {
        kind: 'verse',
        verse: {
          ref: '11.55', speaker: 'Krishna',
          sa: ['मत्कर्मकृन्मत्परमो मद्भक्तः सङ्गवर्जितः ।', 'निर्वैरः सर्वभूतेषु यः स मामेति पाण्डव ॥'],
          iast: ['mat-karma-kṛn mat-paramo mad-bhaktaḥ saṅga-varjitaḥ', 'nirvairaḥ sarva-bhūteṣu yaḥ sa mām eti pāṇḍava'],
          en: 'Whoever does my work, holds me as the highest, is devoted to me, free of attachment and without enmity toward any being, comes to me, son of Pandu.',
        },
      },
      { kind: 'end' },
    ],
  },
];
