// Keys, chords, the finger-pattern chart and the solfège hand signs.

export const NOTE_NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

// Semitones of each scale degree above the key's root.
export const KEY_MODES = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
};

// Chord types. `roman` is the suffix after a roman numeral; `minor` makes the
// numeral lowercase. Big chords leave out the 5th, as players usually do.
const Q = (suffix, label, group, roman, intervals, minor = false) => ({ suffix, label, group, roman, intervals, minor });
const TRIADS = 'Triads';
const SEVENTHS = 'Sixths & sevenths';
const NINTHS = 'Ninths';
const BEYOND = 'Elevenths & thirteenths';

export const QUALITIES = {
  maj: Q('', 'Major', TRIADS, '', [0, 4, 7]),
  min: Q('m', 'Minor', TRIADS, '', [0, 3, 7], true),
  dim: Q('°', 'Diminished', TRIADS, '°', [0, 3, 6], true),
  aug: Q('+', 'Augmented', TRIADS, '+', [0, 4, 8]),
  sus2: Q('sus2', 'Suspended 2nd', TRIADS, 'sus2', [0, 2, 7]),
  sus4: Q('sus4', 'Suspended 4th', TRIADS, 'sus4', [0, 5, 7]),
  power: Q('5', 'Power chord', TRIADS, '5', [0, 7, 12]),

  maj6: Q('6', 'Major 6th', SEVENTHS, '6', [0, 4, 7, 9]),
  min6: Q('m6', 'Minor 6th', SEVENTHS, '6', [0, 3, 7, 9], true),
  dom7: Q('7', 'Dominant 7th', SEVENTHS, '7', [0, 4, 7, 10]),
  maj7: Q('maj7', 'Major 7th', SEVENTHS, 'maj7', [0, 4, 7, 11]),
  min7: Q('m7', 'Minor 7th', SEVENTHS, '7', [0, 3, 7, 10], true),
  minMaj7: Q('m(maj7)', 'Minor-major 7th', SEVENTHS, '(maj7)', [0, 3, 7, 11], true),
  halfDim7: Q('m7♭5', 'Half-diminished 7th', SEVENTHS, 'ø7', [0, 3, 6, 10], true),
  dim7: Q('°7', 'Diminished 7th', SEVENTHS, '°7', [0, 3, 6, 9], true),
  sus7: Q('7sus4', '7th suspended 4th', SEVENTHS, '7sus4', [0, 5, 7, 10]),
  aug7: Q('7♯5', 'Augmented 7th', SEVENTHS, '+7', [0, 4, 8, 10]),
  dom7b5: Q('7♭5', '7th flat 5', SEVENTHS, '7♭5', [0, 4, 6, 10]),

  add9: Q('add9', 'Add 9', NINTHS, 'add9', [0, 4, 7, 14]),
  minAdd9: Q('m(add9)', 'Minor add 9', NINTHS, '(add9)', [0, 3, 7, 14], true),
  maj9: Q('maj9', 'Major 9th', NINTHS, 'maj9', [0, 4, 7, 11, 14]),
  min9: Q('m9', 'Minor 9th', NINTHS, '9', [0, 3, 7, 10, 14], true),
  dom9: Q('9', 'Dominant 9th', NINTHS, '9', [0, 4, 7, 10, 14]),
  sixNine: Q('6/9', '6/9', NINTHS, '6/9', [0, 4, 7, 9, 14]),
  minSixNine: Q('m6/9', 'Minor 6/9', NINTHS, '6/9', [0, 3, 7, 9, 14], true),
  sus9: Q('9sus4', '9th suspended 4th', NINTHS, '9sus4', [0, 5, 7, 10, 14]),
  dom7b9: Q('7♭9', '7th flat 9', NINTHS, '7♭9', [0, 4, 7, 10, 13]),
  dom7s9: Q('7♯9', '7th sharp 9', NINTHS, '7♯9', [0, 4, 7, 10, 15]),

  add11: Q('add11', 'Add 11', BEYOND, 'add11', [0, 4, 7, 17]),
  dom11: Q('11', 'Dominant 11th', BEYOND, '11', [0, 7, 10, 14, 17]),
  min11: Q('m11', 'Minor 11th', BEYOND, '11', [0, 3, 10, 14, 17], true),
  maj7s11: Q('maj7♯11', 'Major 7th sharp 11', BEYOND, 'maj7♯11', [0, 4, 7, 11, 18]),
  dom13: Q('13', 'Dominant 13th', BEYOND, '13', [0, 4, 10, 14, 21]),
  maj13: Q('maj13', 'Major 13th', BEYOND, 'maj13', [0, 4, 11, 14, 21]),
  min13: Q('m13', 'Minor 13th', BEYOND, '13', [0, 3, 10, 14, 21], true),
};

// Quick ways to fill the whole chart: plain triads, or richer chords.
export const CHORD_SETS = [
  { id: 'triads', label: 'Triads' },
  { id: 'sevenths', label: '7ths' },
  { id: 'ninths', label: '9ths' },
];
const SET_COLUMN = { triads: 1, sevenths: 2, ninths: 3 };

// Chord slots in each mode: [semitones above the key's root, triad, 7th, 9th].
const SLOTS = {
  major: {
    I: [0, 'maj', 'maj7', 'maj9'],
    ii: [2, 'min', 'min7', 'min9'],
    iii: [4, 'min', 'min7', 'min7'],
    IV: [5, 'maj', 'maj7', 'maj9'],
    V: [7, 'maj', 'dom7', 'dom9'],
    vi: [9, 'min', 'min7', 'min9'],
    V7: [7, 'dom7', 'sus7', 'dom13'],
    vii: [11, 'dim', 'halfDim7', 'halfDim7'],
    II: [2, 'maj', 'dom7', 'dom9'], // V of V
    bVII: [10, 'maj', 'dom7', 'dom9'],
    iv: [5, 'min', 'min7', 'min9'], // borrowed from the minor key
    III: [4, 'maj', 'dom7', 'dom7b9'], // V of vi
    bVI: [8, 'maj', 'maj7', 'maj9'],
  },
  minor: {
    i: [0, 'min', 'min7', 'min9'],
    ii: [2, 'dim', 'halfDim7', 'halfDim7'],
    III: [3, 'maj', 'maj7', 'maj9'],
    iv: [5, 'min', 'min7', 'min9'],
    V: [7, 'maj', 'dom7', 'dom9'], // from harmonic minor
    VI: [8, 'maj', 'maj7', 'maj9'],
    V7: [7, 'dom7', 'sus7', 'dom7b9'],
    VII: [10, 'maj', 'dom7', 'dom9'],
    IV: [5, 'maj', 'dom7', 'dom9'], // Dorian
    bII: [1, 'maj', 'maj7', 'maj7'], // Neapolitan
    v: [7, 'min', 'min7', 'min9'],
    I: [0, 'maj', 'maj7', 'maj9'], // Picardy third
    vii: [11, 'dim', 'dim7', 'dim7'],
  },
};

function slotChord(slots, key, mode, set) {
  const slot = SLOTS[mode][slots[mode]];
  return { root: (key + slot[0]) % 12, quality: slot[SET_COLUMN[set]] };
}

// Finger patterns, thumb → pinky, "1" = finger up. A fist ("00000") is silence.
export const GESTURES = [
  { pattern: '01000', name: 'One', hint: 'Index', slots: { major: 'I', minor: 'i' } },
  { pattern: '01100', name: 'Peace', hint: 'Index + middle', slots: { major: 'ii', minor: 'ii' } },
  { pattern: '01110', name: 'Three', hint: 'Index to ring', slots: { major: 'iii', minor: 'III' } },
  { pattern: '01111', name: 'Four', hint: 'Thumb tucked', slots: { major: 'IV', minor: 'iv' } },
  { pattern: '11111', name: 'Open hand', hint: 'All five, thumb out', slots: { major: 'V', minor: 'V' } },
  { pattern: '10000', name: 'Thumbs up', hint: 'Thumb only', slots: { major: 'vi', minor: 'VI' } },
  { pattern: '01001', name: 'Rock on', hint: 'Index + pinky', slots: { major: 'V7', minor: 'V7' } },
  { pattern: '10001', name: 'Call me', hint: 'Thumb + pinky', slots: { major: 'vii', minor: 'VII' } },
  { pattern: '11000', name: 'L', hint: 'Thumb + index', slots: { major: 'II', minor: 'IV' } },
  { pattern: '11001', name: 'Love you', hint: 'Thumb, index + pinky', slots: { major: 'bVII', minor: 'bII' } },
  { pattern: '00111', name: 'OK', hint: 'Thumb and index make a circle', slots: { major: 'iv', minor: 'v' } },
  { pattern: '11100', name: 'Three + thumb', hint: 'Thumb, index + middle', slots: { major: 'III', minor: 'I' } },
  { pattern: '00001', name: 'Pinky', hint: 'Pinky only', slots: { major: 'bVI', minor: 'vii' } },
];

// Curwen / Kodály solfège hand signs, one per scale degree. `glyph` is the
// finger pattern shown for it.
export const SIGNS = [
  { id: 'do', name: 'Do', hint: 'Fist', glyph: '00000', degree: 0, slots: { major: 'I', minor: 'i' } },
  { id: 're', name: 'Re', hint: 'Flat hand, palm down, fingers slanting up ↗', glyph: '01111', degree: 1, slots: { major: 'ii', minor: 'ii' } },
  { id: 'mi', name: 'Mi', hint: 'Flat hand, palm down, level →', glyph: '01111', degree: 2, slots: { major: 'iii', minor: 'III' } },
  { id: 'fa', name: 'Fa', hint: 'Fist, thumb pointing down ↓', glyph: '10000', degree: 3, slots: { major: 'IV', minor: 'iv' } },
  { id: 'sol', name: 'Sol', hint: 'Flat hand on its side, level', glyph: '01111', degree: 4, slots: { major: 'V', minor: 'V' } },
  { id: 'la', name: 'La', hint: 'Hand drooping, fingers down ↘', glyph: '01111', degree: 5, slots: { major: 'vi', minor: 'VI' } },
  { id: 'ti', name: 'Ti', hint: 'Index finger pointing up ↑', glyph: '01000', degree: 6, slots: { major: 'vii', minor: 'VII' } },
];

export function defaultChart(key, set = 'triads', mode = 'major') {
  return Object.fromEntries(GESTURES.map(({ pattern, slots }) => [pattern, slotChord(slots, key, mode, set)]));
}

export function signChord(sign, key, mode, set) {
  return slotChord(sign.slots, key, mode, set);
}

// The sign's scale note, as a pitch class (0 = C).
export function signNote(sign, key, mode) {
  return (key + KEY_MODES[mode][sign.degree]) % 12;
}

// How each key's tonic is written (Db major and G# minor read better than
// C# major and Ab minor).
const KEY_SPELLING = {
  major: ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'],
  minor: ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'],
};
const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const LETTER_PITCH = [0, 2, 4, 5, 7, 9, 11];
// Notes outside the scale that are written as raised degrees (the leading
// tone and raised 6th in minor, the raised 4th in major); others are lowered.
const RAISED = { major: [6], minor: [9, 11] };

// Spells a pitch class the way it's written in the key, e.g. 0 in C# minor
// is "B#" (its leading tone), and 8 is "G#" in E major but "Ab" in Eb major.
export function spell(pitchClass, key, mode) {
  const scale = KEY_MODES[mode];
  const interval = (pitchClass - key + 12) % 12;
  let degree = scale.indexOf(interval);
  if (degree < 0) degree = scale.indexOf(RAISED[mode].includes(interval) ? interval - 1 : interval + 1);
  const letter = (LETTERS.indexOf(KEY_SPELLING[mode][key][0]) + degree) % 7;
  const accidental = ['', '#', '##', '', '', '', '', '', '', '', 'bb', 'b'][(pitchClass - LETTER_PITCH[letter] + 12) % 12];
  return LETTERS[letter] + accidental;
}

export function chordName({ root, quality }, key, mode) {
  return spell(root, key, mode) + QUALITIES[quality].suffix;
}

export function keyName(key, mode) {
  return `${KEY_SPELLING[mode][key]} ${mode}`;
}

// Numerals by semitones above the key's root. In a minor key III, VI and VII
// are the natural ones (and the raised 7th, as in vii°, stays VII).
const ROMAN = {
  major: ['I', '♭II', 'II', '♭III', 'III', 'IV', '♯IV', 'V', '♭VI', 'VI', '♭VII', 'VII'],
  minor: ['I', '♭II', 'II', 'III', '♯III', 'IV', '♯IV', 'V', 'VI', '♯VI', 'VII', 'VII'],
};

// Roman numeral of a chord within a key, e.g. Dm9 in C major → "ii9".
export function romanNumeral({ root, quality }, key, mode = 'major') {
  const numeral = ROMAN[mode][(root - key + 12) % 12];
  const { minor, roman } = QUALITIES[quality];
  return (minor ? numeral.toLowerCase() : numeral) + roman;
}

// Where each hand plays: the left hand low (root in the bass + chord around
// C3), the right hand around C4 — each shifted by its octave setting.
const handBase = (side, octave) => (side === 'left' ? 48 : 60) + 12 * octave;

export function voiceChord({ root, quality }, side, octave = 0) {
  const base = handBase(side, octave);
  const notes = QUALITIES[quality].intervals.map((i) => base + root + i);
  if (side === 'left') notes.unshift(base - 12 + root);
  return notes;
}

export function voiceNote(pitchClass, side, octave = 0) {
  return [handBase(side, octave) + pitchClass];
}

// e.g. 61 → "C#4"; with a key, spelled for it (60 in C# minor → "B#3").
export function noteLabel(midi, key, mode) {
  const name = key === undefined ? NOTE_NAMES[midi % 12] : spell(midi % 12, key, mode);
  const shift = (name.match(/#/g)?.length ?? 0) - (name.match(/b/g)?.length ?? 0);
  return name + (Math.floor((midi - shift) / 12) - 1);
}
