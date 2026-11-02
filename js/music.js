// Chords, keys and the default finger-pattern → chord chart.

export const NOTE_NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

// Chord types. `roman` is the suffix after a roman numeral; `minor` makes the
// numeral lowercase. Big chords leave out the 5th, as players usually do.
export const QUALITIES = {
  maj: { suffix: '', label: 'Major', group: 'Triads', roman: '', intervals: [0, 4, 7] },
  min: { suffix: 'm', label: 'Minor', group: 'Triads', roman: '', minor: true, intervals: [0, 3, 7] },
  dim: { suffix: '°', label: 'Diminished', group: 'Triads', roman: '°', minor: true, intervals: [0, 3, 6] },
  aug: { suffix: '+', label: 'Augmented', group: 'Triads', roman: '+', intervals: [0, 4, 8] },
  sus2: { suffix: 'sus2', label: 'Suspended 2nd', group: 'Triads', roman: 'sus2', intervals: [0, 2, 7] },
  sus4: { suffix: 'sus4', label: 'Suspended 4th', group: 'Triads', roman: 'sus4', intervals: [0, 5, 7] },

  maj6: { suffix: '6', label: 'Major 6th', group: 'Sixths & sevenths', roman: '6', intervals: [0, 4, 7, 9] },
  min6: { suffix: 'm6', label: 'Minor 6th', group: 'Sixths & sevenths', roman: '6', minor: true, intervals: [0, 3, 7, 9] },
  dom7: { suffix: '7', label: 'Dominant 7th', group: 'Sixths & sevenths', roman: '7', intervals: [0, 4, 7, 10] },
  maj7: { suffix: 'maj7', label: 'Major 7th', group: 'Sixths & sevenths', roman: 'maj7', intervals: [0, 4, 7, 11] },
  min7: { suffix: 'm7', label: 'Minor 7th', group: 'Sixths & sevenths', roman: '7', minor: true, intervals: [0, 3, 7, 10] },
  minMaj7: { suffix: 'm(maj7)', label: 'Minor-major 7th', group: 'Sixths & sevenths', roman: '(maj7)', minor: true, intervals: [0, 3, 7, 11] },
  halfDim7: { suffix: 'm7♭5', label: 'Half-diminished 7th', group: 'Sixths & sevenths', roman: 'ø7', minor: true, intervals: [0, 3, 6, 10] },
  dim7: { suffix: '°7', label: 'Diminished 7th', group: 'Sixths & sevenths', roman: '°7', minor: true, intervals: [0, 3, 6, 9] },
  sus7: { suffix: '7sus4', label: '7th suspended 4th', group: 'Sixths & sevenths', roman: '7sus4', intervals: [0, 5, 7, 10] },

  add9: { suffix: 'add9', label: 'Add 9', group: 'Ninths & beyond', roman: 'add9', intervals: [0, 4, 7, 14] },
  minAdd9: { suffix: 'm(add9)', label: 'Minor add 9', group: 'Ninths & beyond', roman: '(add9)', minor: true, intervals: [0, 3, 7, 14] },
  maj9: { suffix: 'maj9', label: 'Major 9th', group: 'Ninths & beyond', roman: 'maj9', intervals: [0, 4, 7, 11, 14] },
  min9: { suffix: 'm9', label: 'Minor 9th', group: 'Ninths & beyond', roman: '9', minor: true, intervals: [0, 3, 7, 10, 14] },
  dom9: { suffix: '9', label: 'Dominant 9th', group: 'Ninths & beyond', roman: '9', intervals: [0, 4, 7, 10, 14] },
  sixNine: { suffix: '6/9', label: '6/9', group: 'Ninths & beyond', roman: '6/9', intervals: [0, 4, 7, 9, 14] },
  min11: { suffix: 'm11', label: 'Minor 11th', group: 'Ninths & beyond', roman: '11', minor: true, intervals: [0, 3, 10, 14, 17] },
  dom13: { suffix: '13', label: 'Dominant 13th', group: 'Ninths & beyond', roman: '13', intervals: [0, 4, 10, 14, 21] },
};

// Quick ways to fill the whole chart: plain triads, or richer chords.
export const CHORD_SETS = [
  { id: 'triads', label: 'Triads' },
  { id: 'sevenths', label: '7ths' },
  { id: 'ninths', label: '9ths' },
];

// Each slot: semitones above the key's root, and its chord in each set.
const SLOTS = {
  I: { offset: 0, triads: 'maj', sevenths: 'maj7', ninths: 'maj9' },
  ii: { offset: 2, triads: 'min', sevenths: 'min7', ninths: 'min9' },
  iii: { offset: 4, triads: 'min', sevenths: 'min7', ninths: 'min7' },
  IV: { offset: 5, triads: 'maj', sevenths: 'maj7', ninths: 'maj9' },
  V: { offset: 7, triads: 'maj', sevenths: 'dom7', ninths: 'dom9' },
  vi: { offset: 9, triads: 'min', sevenths: 'min7', ninths: 'min9' },
  V7: { offset: 7, triads: 'dom7', sevenths: 'sus7', ninths: 'dom13' },
  vii: { offset: 11, triads: 'dim', sevenths: 'halfDim7', ninths: 'halfDim7' },
};

// Patterns are thumb → pinky, "1" = finger up. A fist ("00000") is silence.
export const GESTURES = [
  { pattern: '01000', name: 'One', hint: 'Index', slot: 'I' },
  { pattern: '01100', name: 'Peace', hint: 'Index + middle', slot: 'ii' },
  { pattern: '01110', name: 'Three', hint: 'Index to ring', slot: 'iii' },
  { pattern: '01111', name: 'Four', hint: 'Thumb tucked', slot: 'IV' },
  { pattern: '11111', name: 'Open hand', hint: 'All five, thumb out', slot: 'V' },
  { pattern: '10000', name: 'Thumbs up', hint: 'Thumb only', slot: 'vi' },
  { pattern: '01001', name: 'Rock on', hint: 'Index + pinky', slot: 'V7' },
  { pattern: '10001', name: 'Call me', hint: 'Thumb + pinky', slot: 'vii' },
];

export function defaultChart(key, set = 'triads') {
  const chart = {};
  for (const { pattern, slot } of GESTURES) {
    chart[pattern] = { root: (key + SLOTS[slot].offset) % 12, quality: SLOTS[slot][set] };
  }
  return chart;
}

export function chordName({ root, quality }) {
  return NOTE_NAMES[root] + QUALITIES[quality].suffix;
}

const ROMAN = ['I', '♭II', 'II', '♭III', 'III', 'IV', '♯IV', 'V', '♭VI', 'VI', '♭VII', 'VII'];

// Roman numeral of a chord within a major key, e.g. Dm9 in C → "ii9".
export function romanNumeral({ root, quality }, key) {
  const numeral = ROMAN[(root - key + 12) % 12];
  const { minor, roman } = QUALITIES[quality];
  return (minor ? numeral.toLowerCase() : numeral) + roman;
}

// MIDI notes to play. The left hand plays low (root in the bass + chord around
// C3); the right hand plays the chord around C4.
export function voiceChord({ root, quality }, side) {
  const base = side === 'left' ? 48 : 60;
  const notes = QUALITIES[quality].intervals.map((i) => base + root + i);
  if (side === 'left') notes.unshift(base - 12 + root);
  return notes;
}

export function noteLabel(midi) {
  return NOTE_NAMES[midi % 12] + (Math.floor(midi / 12) - 1);
}
