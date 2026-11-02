import { HAND_CONNECTIONS, FingerReader, HandSides, Stabilizer, loadHandLandmarker } from './hands.js';
import { INSTRUMENTS } from './instruments.js';
import {
  CHORD_SETS,
  GESTURES,
  KEY_MODES,
  NOTE_NAMES,
  QUALITIES,
  SIGNS,
  chordName,
  defaultChart,
  keyName,
  noteLabel,
  romanNumeral,
  signChord,
  signNote,
  spell,
  voiceChord,
  voiceNote,
} from './music.js';
import { ChordPlayer } from './player.js';
import { setUpRecordings } from './recordings.js';

const SIDES = ['left', 'right'];
const FIST = '00000';
const SWITCH_MS = 120; // a new shape must be held this long before it plays
const STOP_MS = 220; // a fist / missing hand must last this long before it stops
const KEYBOARD_LOW = 21; // A0 — a full 88-key piano
const KEYBOARD_HIGH = 108; // C8
const OCTAVE_LIMITS = { left: [-1, 2], right: [-2, 2] };
const STORAGE_KEY = 'hand-chords-settings';
const THEME_KEY = 'hand-chords-theme';
const SIGN_MODES = [
  { id: 'patterns', label: 'Patterns' },
  { id: 'solfege', label: 'Solfège' },
];
const SOLFEGE_PLAYS = [
  { id: 'chords', label: 'Chords' },
  { id: 'notes', label: 'Notes' },
];
const STYLES = [
  { id: 'hold', label: 'Hold', help: 'Hold strikes the chord once and keeps it at a steady volume while your hand is up.' },
  { id: 'pulse', label: 'Pulse', help: 'Pulse strikes the chord on every beat.' },
  { id: 'arpeggio', label: 'Arpeggio', help: 'Arpeggio plays the chord one note at a time, up and down.' },
];
// Computer keys that play the on-screen keyboard, from C4 up (like a DAW).
const KEY_CODES = ['KeyA', 'KeyW', 'KeyS', 'KeyE', 'KeyD', 'KeyF', 'KeyT', 'KeyG', 'KeyY',
  'KeyH', 'KeyU', 'KeyJ', 'KeyK', 'KeyO', 'KeyL', 'KeyP', 'Semicolon'];
const KEY_CODES_LOWEST = 60;

const $ = (selector) => document.querySelector(selector);
const els = {
  status: $('#status'),
  record: $('#record'),
  recordLabel: $('#record-label'),
  mic: $('#mic'),
  theme: $('#theme'),
  preview: $('#preview'),
  previewVideo: $('#preview-video'),
  previewTitle: $('#preview-title'),
  previewSave: $('#preview-save'),
  previewClose: $('#preview-close'),
  stage: $('#stage'),
  video: $('#video'),
  canvas: $('#overlay'),
  intro: $('#intro'),
  start: $('#start'),
  introError: $('#intro-error'),
  soundGrid: $('#sound-grid'),
  keyboard: $('#keyboard'),
  patternsTitle: $('#patterns-title'),
  patternsNote: $('#patterns-note'),
  signMode: $('#sign-mode'),
  solfegePlays: $('#solfege-plays'),
  chordSet: $('#chord-set'),
  gestureList: $('#gesture-list'),
  signList: $('#sign-list'),
  takes: $('#takes'),
  takesEmpty: $('#takes-empty'),
  key: $('#key'),
  style: $('#style'),
  styleHelp: $('#style-help'),
  tempo: $('#tempo'),
  tempoRow: $('#tempo-row'),
  tempoValue: $('#tempo-value'),
  volume: $('#volume'),
  swap: $('#swap'),
  reset: $('#reset'),
};
const ctx = els.canvas.getContext('2d');
const cssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
let handColors = { left: cssVar('--left'), right: cssVar('--right') };

const settings = loadSettings();
const player = new ChordPlayer(settings);
const handSides = new HandSides();
const hands = Object.fromEntries(
  SIDES.map((side) => [
    side,
    {
      reader: new FingerReader(),
      stabilizer: new Stabilizer(),
      pattern: null, // fingers the camera sees right now (null = no hand)
      token: null, // what that shape is: a finger pattern, or a solfège sign id
      playing: null, // the token whose sound is playing
      card: document.querySelector(`.hand-card[data-side="${side}"]`),
      rendered: '',
    },
  ]),
);
const keyEls = new Map();
let landmarker = null;
let lastVideoTime = -1;

// ---------- settings ----------

function loadSettings() {
  const defaults = {
    key: 0,
    mode: 'major',
    chordSet: 'triads',
    signs: 'patterns',
    solfegePlays: 'chords',
    octaves: { left: 0, right: 0 },
    style: 'hold',
    tempo: 90,
    volume: 0.8,
    swap: false,
    sound: 'piano',
  };
  let saved = null;
  try {
    saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
  } catch {
    // Storage unavailable or unreadable: start fresh.
  }
  const loaded = { ...defaults, ...saved, octaves: { ...defaults.octaves, ...saved?.octaves } };
  if (!KEY_MODES[loaded.mode]) loaded.mode = defaults.mode;
  if (!INSTRUMENTS.some((instrument) => instrument.id === loaded.sound)) loaded.sound = defaults.sound;
  // Patterns added since the chart was saved get this key's chords.
  const fresh = defaultChart(loaded.key, loaded.chordSet, loaded.mode);
  loaded.chart = { ...fresh, ...saved?.chart };
  for (const [pattern, chord] of Object.entries(loaded.chart)) {
    if (!QUALITIES[chord?.quality]) loaded.chart[pattern] = fresh[pattern];
  }
  return loaded;
}

function saveSettings() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Storage unavailable (private window etc.) — settings just won't persist.
  }
}

// ---------- what a hand plays ----------

const solfege = () => settings.signs === 'solfege';
const signById = (id) => SIGNS.find((sign) => sign.id === id);
const playable = (token) => Boolean(token && (solfege() ? signById(token) : settings.chart[token]));

// The sound for a recognised shape: its name, a detail line, and the notes.
function soundFor(token, side) {
  const { key, mode } = settings;
  const octave = settings.octaves[side];
  if (solfege()) {
    const sign = signById(token);
    if (settings.solfegePlays === 'notes') {
      const pitch = signNote(sign, key, mode);
      return { name: spell(pitch, key, mode), detail: sign.name, notes: voiceNote(pitch, side, octave) };
    }
    const chord = signChord(sign, key, mode, settings.chordSet);
    return {
      name: chordName(chord, key, mode),
      detail: `${sign.name} · ${romanNumeral(chord, key, mode)}`,
      notes: voiceChord(chord, side, octave),
    };
  }
  const chord = settings.chart[token];
  return {
    name: chordName(chord, key, mode),
    detail: romanNumeral(chord, key, mode),
    notes: voiceChord(chord, side, octave),
  };
}

// ---------- light / dark ----------

function savedTheme() {
  try {
    return localStorage.getItem(THEME_KEY);
  } catch {
    return null;
  }
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  els.theme.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
  handColors = { left: cssVar('--left'), right: cssVar('--right') };
}

function setUpTheme() {
  applyTheme(document.documentElement.dataset.theme);
  els.theme.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      // Not remembered, but still switches for now.
    }
    applyTheme(next);
  });
  // Until you pick one, follow the system setting.
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (event) => {
    if (!savedTheme()) applyTheme(event.matches ? 'dark' : 'light');
  });
}

// ---------- page setup ----------

function segmented(container, name, options, selected, onChange) {
  container.innerHTML = options
    .map(
      ({ id, label }) =>
        `<label><input type="radio" name="${name}" value="${id}"${id === selected ? ' checked' : ''}><span>${label}</span></label>`,
    )
    .join('');
  container.addEventListener('change', (event) => onChange(event.target.value));
}

function fingerGlyph(pattern, className = '') {
  const glyph = document.createElement('span');
  glyph.className = `glyph ${className}`;
  glyph.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < 5; i++) glyph.append(document.createElement('i'));
  setGlyph(glyph, pattern);
  return glyph;
}

// Bars rise with how sure the camera is that each finger is up.
function setGlyph(glyph, pattern, scores = null) {
  [...glyph.children].forEach((finger, i) => {
    const up = pattern?.[i] === '1';
    finger.classList.toggle('up', up);
    finger.style.setProperty('--h', scores ? scores[i].toFixed(2) : Number(up));
  });
}

function buildGestureList() {
  const rootOptions = NOTE_NAMES.map((name, i) => `<option value="${i}">${name}</option>`).join('');
  const groups = [...new Set(Object.values(QUALITIES).map((quality) => quality.group))];
  const qualityOptions = groups
    .map((group) => {
      const options = Object.entries(QUALITIES)
        .filter(([, quality]) => quality.group === group)
        .map(([id, quality]) => `<option value="${id}">${quality.label}</option>`)
        .join('');
      return `<optgroup label="${group}">${options}</optgroup>`;
    })
    .join('');

  for (const gesture of GESTURES) {
    const row = document.createElement('div');
    row.className = 'gesture';
    row.dataset.token = gesture.pattern;
    row.innerHTML = `
      <div class="gesture-name"><strong>${gesture.name}</strong><small>${gesture.hint}</small></div>
      <span class="roman"></span>
      <div class="gesture-chord">
        <select class="root" aria-label="${gesture.name}: chord root">${rootOptions}</select>
        <select class="quality" aria-label="${gesture.name}: chord type">${qualityOptions}</select>
      </div>`;
    row.prepend(fingerGlyph(gesture.pattern));
    row.addEventListener('change', () => {
      settings.chart[gesture.pattern] = {
        root: Number(row.querySelector('.root').value),
        quality: row.querySelector('.quality').value,
      };
      chartChanged();
    });
    els.gestureList.append(row);
  }

  const fist = document.createElement('div');
  fist.className = 'gesture fist';
  fist.dataset.token = FIST;
  fist.innerHTML = `
    <div class="gesture-name"><strong>Fist</strong><small>All fingers down</small></div>
    <p class="gesture-chord">Silence — stops that hand's chord</p>`;
  fist.prepend(fingerGlyph(FIST));
  els.gestureList.append(fist);
}

function buildSignList() {
  for (const sign of SIGNS) {
    const row = document.createElement('div');
    row.className = 'gesture';
    row.dataset.token = sign.id;
    row.innerHTML = `
      <div class="gesture-name"><strong>${sign.name}</strong><small>${sign.hint}</small></div>
      <span class="roman"></span>
      <p class="gesture-chord sign-result"></p>`;
    row.prepend(fingerGlyph(sign.glyph));
    els.signList.append(row);
  }
}

function buildKeyboard() {
  const isBlack = (midi) => [1, 3, 6, 8, 10].includes(midi % 12);
  let whiteCount = 0;
  for (let m = KEYBOARD_LOW; m <= KEYBOARD_HIGH; m++) if (!isBlack(m)) whiteCount++;
  const whiteWidth = 100 / whiteCount;

  let whitesSoFar = 0;
  for (let midi = KEYBOARD_LOW; midi <= KEYBOARD_HIGH; midi++) {
    const key = document.createElement('div');
    key.dataset.midi = midi;
    const code = KEY_CODES[midi - KEY_CODES_LOWEST];
    if (code) key.dataset.shortcut = code === 'Semicolon' ? ';' : code.slice(3);
    if (isBlack(midi)) {
      key.className = 'key black';
      key.style.left = `${(whitesSoFar - 0.3) * whiteWidth}%`;
      key.style.width = `${whiteWidth * 0.6}%`;
    } else {
      key.className = 'key white';
      key.style.left = `${whitesSoFar * whiteWidth}%`;
      key.style.width = `${whiteWidth}%`;
      if (midi % 12 === 0) key.dataset.label = noteLabel(midi);
      whitesSoFar++;
    }
    keyEls.set(midi, key);
    els.keyboard.append(key);
  }

  // On narrow screens the keyboard scrolls; start with middle C in view.
  requestAnimationFrame(() => {
    const scroller = els.keyboard.parentElement;
    scroller.scrollLeft = keyEls.get(60).offsetLeft - scroller.clientWidth / 2;
  });
}

// Sliders show their filled part in the accent colour.
function fillRange(input) {
  const fraction = (input.value - input.min) / (input.max - input.min);
  input.style.setProperty('--fill', `${fraction * 100}%`);
}

function showOctave(side) {
  const octave = settings.octaves[side];
  const stepper = hands[side].card.querySelector('.stepper');
  stepper.querySelector('output').textContent = `Oct ${octave > 0 ? '+' : ''}${octave}`;
  const [low, high] = OCTAVE_LIMITS[side];
  stepper.querySelector('[data-step="-1"]').disabled = octave <= low;
  stepper.querySelector('[data-step="1"]').disabled = octave >= high;
}

function buildOctaveSteppers() {
  for (const side of SIDES) {
    const stepper = hands[side].card.querySelector('.stepper');
    stepper.addEventListener('click', (event) => {
      const step = Number(event.target.closest('button')?.dataset.step);
      if (!step) return;
      const [low, high] = OCTAVE_LIMITS[side];
      settings.octaves[side] = Math.min(high, Math.max(low, settings.octaves[side] + step));
      showOctave(side);
      saveSettings();
      replayHands();
    });
    showOctave(side);
  }
}

// Patterns or solfège: which list, title and controls to show.
function showSignMode() {
  const signs = solfege();
  els.patternsTitle.textContent = signs ? 'Solfège Signs' : 'Finger Patterns';
  els.gestureList.hidden = signs;
  els.signList.hidden = !signs;
  els.solfegePlays.hidden = !signs;
  els.chordSet.hidden = signs && settings.solfegePlays === 'notes';
  els.patternsNote.textContent = signs
    ? 'Curwen hand signs, as used in Kodály lessons. Lower your hand out of view to stop.'
    : 'Bars show which fingers are up, thumb first. A fist is silence.';
}

function buildSettings() {
  els.key.innerHTML = Object.keys(KEY_MODES)
    .map((mode) => {
      const options = NOTE_NAMES.map((_, key) => `<option value="${key}:${mode}">${keyName(key, mode)}</option>`).join('');
      return `<optgroup label="${mode === 'major' ? 'Major' : 'Minor'} keys">${options}</optgroup>`;
    })
    .join('');
  els.key.value = `${settings.key}:${settings.mode}`;
  els.key.addEventListener('change', () => {
    const [key, mode] = els.key.value.split(':');
    if (mode !== settings.mode) {
      // A different kind of key needs its own chords.
      settings.mode = mode;
      settings.key = Number(key);
      settings.chart = defaultChart(settings.key, settings.chordSet, mode);
    } else {
      // Same kind of key: move every chord along, keeping any custom choices.
      const shift = Number(key) - settings.key;
      settings.key = Number(key);
      for (const chord of Object.values(settings.chart)) chord.root = (chord.root + shift + 12) % 12;
    }
    chartChanged();
  });

  segmented(els.signMode, 'sign-mode', SIGN_MODES, settings.signs, (mode) => {
    settings.signs = mode;
    showSignMode();
    saveSettings();
    for (const side of SIDES) {
      hands[side].reader.reset(); // forget the last sign, so the new mode starts clean
      hands[side].stabilizer.reset();
    }
    replayHands();
  });

  segmented(els.solfegePlays, 'solfege-plays', SOLFEGE_PLAYS, settings.solfegePlays, (plays) => {
    settings.solfegePlays = plays;
    showSignMode();
    chartChanged();
  });

  segmented(els.chordSet, 'chord-set', CHORD_SETS, settings.chordSet, (set) => {
    settings.chordSet = set;
    settings.chart = defaultChart(settings.key, set, settings.mode);
    chartChanged();
  });

  // Tempo only matters for the styles that re-strike on the beat.
  const showStyle = () => {
    els.styleHelp.textContent = STYLES.find((style) => style.id === settings.style)?.help ?? '';
    els.tempo.disabled = settings.style === 'hold';
    els.tempoRow.classList.toggle('disabled', els.tempo.disabled);
  };
  segmented(els.style, 'style', STYLES, settings.style, (style) => {
    settings.style = style;
    player.setStyle(style);
    showStyle();
    saveSettings();
  });

  els.tempo.value = settings.tempo;
  els.tempoValue.textContent = settings.tempo;
  fillRange(els.tempo);
  showStyle();
  els.tempo.addEventListener('input', () => {
    settings.tempo = Number(els.tempo.value);
    els.tempoValue.textContent = settings.tempo;
    fillRange(els.tempo);
    player.setTempo(settings.tempo);
    saveSettings();
  });

  els.volume.value = Math.round(settings.volume * 100);
  fillRange(els.volume);
  els.volume.addEventListener('input', () => {
    settings.volume = Number(els.volume.value) / 100;
    fillRange(els.volume);
    player.setVolume(settings.volume);
    saveSettings();
  });

  els.swap.checked = settings.swap;
  els.swap.addEventListener('change', () => {
    settings.swap = els.swap.checked;
    saveSettings();
  });

  els.reset.addEventListener('click', () => {
    settings.chart = defaultChart(settings.key, settings.chordSet, settings.mode);
    chartChanged();
  });

  showSignMode();
}

// ---------- rendering ----------

function refreshChart() {
  const { key, mode } = settings;
  for (const row of els.gestureList.querySelectorAll('.gesture:not(.fist)')) {
    const chord = settings.chart[row.dataset.token];
    const root = row.querySelector('.root');
    for (const option of root.options) option.textContent = spell(Number(option.value), key, mode);
    root.value = chord.root;
    row.querySelector('.quality').value = chord.quality;
    row.querySelector('.roman').textContent = romanNumeral(chord, key, mode);
  }
  for (const row of els.signList.querySelectorAll('.gesture')) {
    const sign = signById(row.dataset.token);
    if (settings.solfegePlays === 'notes') {
      row.querySelector('.sign-result').textContent = spell(signNote(sign, key, mode), key, mode);
      row.querySelector('.roman').textContent = '';
    } else {
      const chord = signChord(sign, key, mode, settings.chordSet);
      row.querySelector('.sign-result').textContent = chordName(chord, key, mode);
      row.querySelector('.roman').textContent = romanNumeral(chord, key, mode);
    }
  }
}

function refreshHighlights() {
  for (const row of document.querySelectorAll('.gesture-list .gesture')) {
    const { token } = row.dataset;
    for (const side of SIDES) {
      const hand = hands[side];
      const active = token === FIST ? hand.pattern === FIST && !hand.playing && !solfege() : hand.playing === token;
      row.classList.toggle(`on-${side}`, active);
    }
  }

  for (const key of keyEls.values()) key.classList.remove('left', 'right');
  for (const side of SIDES) {
    const { playing } = hands[side];
    if (!playing) continue;
    for (const midi of soundFor(playing, side).notes) keyEls.get(midi)?.classList.add(side);
  }
}

function renderCard(side) {
  const hand = hands[side];
  const sound = hand.playing && soundFor(hand.playing, side);
  const signature = JSON.stringify([hand.pattern, hand.token, hand.playing, sound]);
  if (signature === hand.rendered) return;
  hand.rendered = signature;

  const { card } = hand;
  card.classList.toggle('playing', Boolean(sound));
  card.querySelector('.chord').textContent = sound ? sound.name : '—';
  card.querySelector('.hand-roman').textContent = sound ? sound.detail : '';

  let note;
  if (sound) note = sound.notes.map((midi) => noteLabel(midi, settings.key, settings.mode)).join(' ');
  else if (hand.pattern === null) note = `Show your ${side} hand`;
  else if (playable(hand.token)) note = 'Hold it…';
  else if (solfege()) note = 'Not a solfège sign';
  else if (hand.pattern === FIST) note = 'Fist — silent';
  else note = 'Not in the chart';
  card.querySelector('.hand-notes').textContent = note;
}

function drawOverlay(found) {
  const { width, height } = els.canvas;
  const dpr = window.devicePixelRatio || 1;
  ctx.clearRect(0, 0, width, height);

  for (const { side, landmarks } of found) {
    // The video is shown mirrored, so flip x to match.
    const points = landmarks.map((p) => ({ x: (1 - p.x) * width, y: p.y * height }));
    const color = handColors[side];

    ctx.lineWidth = 3 * dpr;
    ctx.lineCap = 'round';
    ctx.strokeStyle = color;
    ctx.beginPath();
    for (const { start, end } of HAND_CONNECTIONS) {
      ctx.moveTo(points[start].x, points[start].y);
      ctx.lineTo(points[end].x, points[end].y);
    }
    ctx.stroke();

    ctx.fillStyle = '#fff';
    for (const p of points) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3 * dpr, 0, Math.PI * 2);
      ctx.fill();
    }

    // Name tag above the hand.
    const hand = hands[side];
    const sound = hand.playing && soundFor(hand.playing, side);
    const sign = solfege() && hand.playing ? `${signById(hand.playing).name} · ` : '';
    const label = sound ? sign + sound.name : hand.pattern === FIST && !solfege() ? 'Silent' : '…';
    const top = Math.min(...points.map((p) => p.y));
    const centerX = points.reduce((sum, p) => sum + p.x, 0) / points.length;
    ctx.font = `600 ${17 * dpr}px -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif`;
    const tagHeight = 30 * dpr;
    const tagWidth = ctx.measureText(label).width + 26 * dpr;
    const tagX = Math.min(Math.max(centerX - tagWidth / 2, 4), width - tagWidth - 4);
    const tagY = Math.max(top - tagHeight - 12 * dpr, 4);
    ctx.fillStyle = sound ? color : 'rgba(0, 0, 0, 0.55)';
    ctx.beginPath();
    ctx.roundRect(tagX, tagY, tagWidth, tagHeight, tagHeight / 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, tagX + tagWidth / 2, tagY + tagHeight / 2 + dpr);
  }
}

// ---------- hand → sound ----------

function updateHand(side, pattern, token, now) {
  const hand = hands[side];
  hand.pattern = pattern;
  hand.token = token;
  const wanted = playable(token) ? token : null;
  const playing = hand.stabilizer.push(wanted, now, wanted ? SWITCH_MS : STOP_MS);
  if (playing !== hand.playing) {
    hand.playing = playing;
    player.setChord(side, playing && soundFor(playing, side).notes);
  }
  renderCard(side);
}

// Something changed what the hands' shapes play: replay with the new notes.
function replayHands() {
  for (const side of SIDES) {
    const hand = hands[side];
    if (hand.playing && !playable(hand.playing)) hand.playing = null;
    player.setChord(side, hand.playing && soundFor(hand.playing, side).notes);
    renderCard(side);
  }
  refreshHighlights();
}

function chartChanged() {
  saveSettings();
  refreshChart();
  replayHands();
}

function stopEverything() {
  for (const side of SIDES) {
    hands[side].stabilizer.reset();
    hands[side].reader.reset();
    hands[side].playing = null;
    hands[side].pattern = null;
    hands[side].token = null;
    renderCard(side);
    setGlyph(hands[side].glyph, null);
  }
  player.stopAll();
  releaseAllKeys();
  refreshHighlights();
}

function onFrame() {
  const { video } = els;
  if (video.readyState >= 2 && video.currentTime !== lastVideoTime) {
    lastVideoTime = video.currentTime;
    const now = performance.now();
    const found = handSides.assign(landmarker.detectForVideo(video, now), now, settings.swap);

    const before = SIDES.map((side) => `${hands[side].pattern}|${hands[side].playing}`).join();
    for (const side of SIDES) {
      const hand = hands[side];
      const seen = found.find((h) => h.side === side);
      if (seen) {
        const pattern = hand.reader.read(seen.world);
        const token = solfege() ? hand.reader.sign(seen.world, seen.label) : pattern;
        updateHand(side, pattern, token, now);
      } else {
        hand.reader.reset();
        updateHand(side, null, null, now);
      }
      setGlyph(hand.glyph, hand.pattern, hand.reader.scores);
    }
    const after = SIDES.map((side) => `${hands[side].pattern}|${hands[side].playing}`).join();
    if (before !== after) refreshHighlights();
    drawOverlay(found);
    if (recordingVideo) drawRecordingFrame();
  }
  requestAnimationFrame(onFrame);
}

// ---------- video for recordings ----------

// What a video recording shows: the mirrored camera with the hand tracer on top.
const frameCanvas = document.createElement('canvas');
const frameCtx = frameCanvas.getContext('2d');
let recordingVideo = false;

function drawRecordingFrame() {
  const { width, height } = frameCanvas;
  frameCtx.save();
  frameCtx.translate(width, 0);
  frameCtx.scale(-1, 1);
  frameCtx.drawImage(els.video, 0, 0, width, height);
  frameCtx.restore();
  frameCtx.drawImage(els.canvas, 0, 0, width, height);
}

// Starts the camera if needed. Resolves to the picture to record, or null
// when there's no camera.
async function videoForRecording() {
  if (!(await startTrackingOnce())) return null;
  const scale = Math.min(1, 1280 / els.video.videoWidth);
  frameCanvas.width = Math.round(els.video.videoWidth * scale);
  frameCanvas.height = Math.round(els.video.videoHeight * scale);
  drawRecordingFrame();
  recordingVideo = true;
  return { stream: frameCanvas.captureStream(30), canvas: frameCanvas };
}

// ---------- start-up ----------

function setStatus(text) {
  els.status.textContent = text;
}

async function startCamera() {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
    audio: false,
  });
  els.video.srcObject = stream;
  await els.video.play();
  els.stage.style.aspectRatio = `${els.video.videoWidth} / ${els.video.videoHeight}`;
}

function describeError(err) {
  if (err?.name === 'NotAllowedError') {
    return 'Camera access was blocked. Allow the camera for this page (look for the camera icon in the address bar), then try again.';
  }
  if (err?.name === 'NotFoundError') return 'No camera was found. Plug one in and try again.';
  if (err?.name === 'NotReadableError') return 'The camera is busy in another app. Close it there and try again.';
  if (!navigator.mediaDevices) return 'This page needs to be opened from https or localhost to use the camera.';
  return `Something went wrong: ${err?.message ?? err}`;
}

let landmarkerLoading = null;
let tracking = null; // resolves to true once the camera and hand tracking run

// The Start button and Record can both start the camera; only do it once.
function startTrackingOnce() {
  tracking ??= startTracking().then((ok) => {
    if (!ok) tracking = null;
    return ok;
  });
  return tracking;
}

async function startTracking() {
  els.start.disabled = true;
  els.introError.textContent = '';
  const soundReady = startSound(); // first, while still inside the click
  try {
    setStatus('Starting camera, hand tracking and sound…');
    landmarkerLoading ??= loadHandLandmarker().catch((err) => {
      landmarkerLoading = null; // retry the download next time
      throw err;
    });
    const [loaded] = await Promise.all([landmarkerLoading, startCamera(), soundReady]);
    landmarker = loaded;
  } catch (err) {
    console.error(err);
    els.introError.textContent = describeError(err);
    els.start.textContent = 'Try Again';
    els.start.disabled = false;
    setStatus('Not started');
    return false;
  }

  els.intro.hidden = true;
  els.stage.classList.add('live');
  setStatus(soundTrouble ?? `Ready — show a ${solfege() ? 'solfège sign' : 'finger pattern'}`);
  requestAnimationFrame(onFrame);
  return true;
}

// ---------- sound ----------

const soundLabel = (id) => INSTRUMENTS.find((instrument) => instrument.id === id)?.label ?? id;
let soundTrouble = null; // message if the chosen sound couldn't load
let soundRequest = 0;

function buildSoundPicker() {
  for (const { id, label } of INSTRUMENTS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.id = id;
    button.textContent = label;
    button.addEventListener('click', () => chooseSound(id));
    els.soundGrid.append(button);
  }
  renderSoundPicker();
}

function renderSoundPicker(loadingId = null) {
  for (const button of els.soundGrid.children) {
    button.setAttribute('aria-pressed', String(button.dataset.id === settings.sound));
    button.classList.toggle('loading', button.dataset.id === loadingId);
  }
}

// Turns sound on — browsers only allow it after a click or key press.
// Safe to call often; returns a promise that settles once sound is ready.
function startSound() {
  if (!player.ready) {
    const wanted = settings.sound;
    setStatus(`Loading ${soundLabel(wanted)}…`);
    player.start().then(
      () => reportSound(wanted),
      (err) => {
        console.error(err);
        setStatus('Couldn’t start the sound.');
      },
    );
  }
  return player.ready;
}

function reportSound(wanted) {
  soundTrouble = player.current === wanted ? null : `Couldn’t load ${soundLabel(wanted)} — check your internet connection.`;
  settings.sound = player.current ?? wanted;
  saveSettings();
  renderSoundPicker();
  setStatus(soundTrouble ?? `${soundLabel(wanted)} ready`);
}

async function chooseSound(id) {
  const request = ++soundRequest;
  settings.sound = id;
  renderSoundPicker(id);
  setStatus(`Loading ${soundLabel(id)}…`);
  const switching = player.setSound(id).catch((err) => console.error(err));
  try {
    await startSound();
    await switching;
  } catch {
    // startSound already reported it
  }
  if (request === soundRequest) reportSound(id);
}

// ---------- playing the on-screen keyboard ----------

const heldKeys = new Map(); // midi -> how many pointers / computer keys hold it
const pointerKeys = new Map(); // pointer id -> midi under it (null between keys)
const typedKeys = new Set(); // computer key codes held down

function pressKey(midi) {
  heldKeys.set(midi, (heldKeys.get(midi) ?? 0) + 1);
  if (heldKeys.get(midi) > 1) return;
  startSound();
  player.noteOn(midi);
  keyEls.get(midi)?.classList.add('manual');
}

function releaseKey(midi) {
  const count = (heldKeys.get(midi) ?? 0) - 1;
  if (count > 0) {
    heldKeys.set(midi, count);
    return;
  }
  heldKeys.delete(midi);
  player.noteOff(midi);
  keyEls.get(midi)?.classList.remove('manual');
}

function releaseAllKeys() {
  for (const midi of heldKeys.keys()) {
    player.noteOff(midi);
    keyEls.get(midi)?.classList.remove('manual');
  }
  heldKeys.clear();
  pointerKeys.clear();
  typedKeys.clear();
}

function keyUnder(x, y) {
  const midi = document.elementFromPoint(x, y)?.dataset.midi;
  return midi === undefined ? null : Number(midi);
}

// Dragging across the keys plays each one in turn (a glissando).
function movePointer(id, midi) {
  const previous = pointerKeys.get(id) ?? null;
  if (midi !== previous) {
    if (previous !== null) releaseKey(previous);
    if (midi !== null) pressKey(midi);
  }
  pointerKeys.set(id, midi);
}

function liftPointer(id) {
  if (!pointerKeys.has(id)) return;
  const midi = pointerKeys.get(id);
  if (midi !== null) releaseKey(midi);
  pointerKeys.delete(id);
}

function listenToKeyboard() {
  els.keyboard.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    els.keyboard.setPointerCapture(event.pointerId);
    movePointer(event.pointerId, keyUnder(event.clientX, event.clientY));
  });
  els.keyboard.addEventListener('pointermove', (event) => {
    if (pointerKeys.has(event.pointerId)) movePointer(event.pointerId, keyUnder(event.clientX, event.clientY));
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    els.keyboard.addEventListener(type, (event) => liftPointer(event.pointerId));
  }

  window.addEventListener('keydown', (event) => {
    const index = KEY_CODES.indexOf(event.code);
    if (index < 0 || event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;
    if (event.target.closest?.('select, textarea')) return;
    event.preventDefault();
    if (typedKeys.has(event.code)) return;
    typedKeys.add(event.code);
    pressKey(KEY_CODES_LOWEST + index);
  });
  window.addEventListener('keyup', (event) => {
    if (typedKeys.delete(event.code)) releaseKey(KEY_CODES_LOWEST + KEY_CODES.indexOf(event.code));
  });
  window.addEventListener('blur', () => {
    for (const code of typedKeys) releaseKey(KEY_CODES_LOWEST + KEY_CODES.indexOf(code));
    typedKeys.clear();
  });
}

function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  els.canvas.width = Math.round(els.stage.clientWidth * dpr);
  els.canvas.height = Math.round(els.stage.clientHeight * dpr);
}

player.onStrike = (side) => {
  hands[side].card
    .querySelector('.chord')
    .animate([{ transform: 'scale(1.06)' }, { transform: 'scale(1)' }], { duration: 180, easing: 'ease-out' });
};

setUpTheme();
buildGestureList();
buildSignList();
buildKeyboard();
buildSoundPicker();
buildSettings();
buildOctaveSteppers();
refreshChart();
listenToKeyboard();
setUpRecordings({
  player,
  startSound,
  getVideo: videoForRecording,
  stopVideo: () => (recordingVideo = false),
  button: els.record,
  label: els.recordLabel,
  micButton: els.mic,
  list: els.takes,
  empty: els.takesEmpty,
  preview: {
    dialog: els.preview,
    video: els.previewVideo,
    title: els.previewTitle,
    save: els.previewSave,
    close: els.previewClose,
  },
  setStatus,
});
for (const side of SIDES) {
  hands[side].glyph = fingerGlyph(null, 'big');
  hands[side].card.querySelector('.hand-body').append(hands[side].glyph);
  renderCard(side);
}

els.start.addEventListener('click', startTrackingOnce);
new ResizeObserver(resizeCanvas).observe(els.stage);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) stopEverything();
});
