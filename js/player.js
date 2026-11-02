// Plays the chords. There are three voices — left hand, right hand and the
// on-screen keyboard — each with its own copy of the current sound, so they
// never cut each other off.
/* global Tone */

import { loadInstrument } from './instruments.js';

const SIDES = ['left', 'right'];
const VOICES = [...SIDES, 'keys'];
const FALLBACK_SOUND = 'epiano'; // a synth: needs no download

// Hold strikes a chord once and keeps it ringing at a steady volume.
// Pulse and arpeggio strike it again on the beat (every N eighth notes).
const STRIKE_EVERY = { pulse: 2, arpeggio: 1 };
const VELOCITY = { hold: 0.7, pulse: 0.55, arpeggio: 0.6 };
const KEYS_VELOCITY = 0.7;

const toNoteName = (midi) => Tone.Frequency(midi, 'midi').toNote();

// Up then back down, without repeating the top and bottom notes.
function arpeggioOrder(notes) {
  const up = [...notes].sort((a, b) => a - b);
  return up.concat(up.slice(1, -1).reverse());
}

// Slider position (0–1) → decibels; 0 is muted.
const volumeToDb = (volume) => (volume > 0 ? (volume - 1) * 24 + 7 : -Infinity);

export class ChordPlayer {
  #loading = new Map(); // sound id -> Promise of loaded instrument

  constructor({ style = 'hold', tempo = 90, volume = 0.8, sound = 'piano' } = {}) {
    this.style = style;
    this.tempo = tempo;
    this.volume = volume;
    this.sound = sound; // the sound asked for
    this.current = null; // the sound actually playing
    this.strum = 0;
    this.voices = Object.fromEntries(
      VOICES.map((voice) => [voice, { instrument: null, notes: [], lastStrike: -Infinity, step: 0 }]),
    );
    this.onStrike = () => {};
  }

  // Call from a click or key press: browsers only allow sound after the user
  // interacts with the page. Safe to call more than once.
  start() {
    this.ready ??= this.#setUp();
    return this.ready;
  }

  async #setUp() {
    await Tone.start();
    Tone.getContext().lookAhead = 0.03; // respond to gestures quickly

    this.output = new Tone.Volume(volumeToDb(this.volume));
    const reverb = new Tone.Reverb({ decay: 2.8, wet: 0.2 });
    const limiter = new Tone.Limiter(-1);
    this.output.chain(reverb, limiter, Tone.getDestination());
    // Everything you hear can also be recorded (see recordings.js).
    if (Tone.Recorder.supported) {
      this.recorder = new Tone.Recorder();
      limiter.connect(this.recorder);
      // Chrome stops feeding the recorder while nothing is playing, which
      // would cut the pauses out of a take. A silent source keeps time flowing.
      const silence = Tone.getContext().createConstantSource();
      silence.offset.value = 0;
      silence.start();
      Tone.connect(silence, this.recorder);
    }
    await reverb.generate();

    const transport = Tone.getTransport();
    transport.bpm.value = this.tempo;
    let tick = 0;
    new Tone.Loop((time) => this.#onTick(time, tick++), '8n').start(0);
    transport.start();

    try {
      await this.setSound(this.sound);
    } catch (err) {
      console.error(err);
      await this.setSound(FALLBACK_SOUND);
    }
  }

  // Switch every voice to another sound, carrying over anything being held.
  // Rejects (keeping the old sound) if it can't be downloaded.
  async setSound(id) {
    this.sound = id;
    if (!this.output) return; // start() will load it

    if (!this.#loading.has(id)) {
      const loading = loadInstrument(id, this.output);
      loading.catch(() => this.#loading.delete(id));
      this.#loading.set(id, loading);
    }
    let instrument;
    try {
      instrument = await this.#loading.get(id);
    } catch (err) {
      if (this.sound === id) this.sound = this.current;
      throw err;
    }
    if (this.sound !== id) return; // another sound was picked meanwhile

    this.current = id;
    this.strum = instrument.strum;
    const now = Tone.immediate();
    for (const [name, voice] of Object.entries(this.voices)) {
      const old = voice.instrument;
      voice.instrument = instrument.create();
      if (old) {
        old.releaseAll(now);
        setTimeout(() => old.dispose(), 4000); // after its release has faded
      }
      if (!voice.notes.length) continue;
      if (name === 'keys') voice.instrument.triggerAttack(voice.notes.map(toNoteName), now, KEYS_VELOCITY);
      else this.#strike(name, now);
    }
  }

  setStyle(style) {
    this.style = style;
  }

  setTempo(bpm) {
    this.tempo = bpm;
    if (this.output) Tone.getTransport().bpm.value = bpm;
  }

  setVolume(volume) {
    this.volume = volume;
    if (this.output) this.output.volume.value = volumeToDb(volume);
  }

  // Hold a chord (MIDI note numbers) for one hand, or pass null to let it go.
  setChord(side, notes) {
    const voice = this.voices[side];
    if (voice.notes.length) voice.instrument?.triggerRelease(voice.notes.map(toNoteName), Tone.immediate());
    voice.notes = notes ?? [];
    voice.step = 0;
    if (voice.notes.length) this.#strike(side, Tone.immediate());
  }

  stopAll() {
    for (const side of SIDES) this.setChord(side, null);
  }

  // On-screen keyboard: a note sounds from noteOn until noteOff.
  noteOn(midi) {
    const voice = this.voices.keys;
    if (voice.notes.includes(midi)) return;
    voice.notes.push(midi);
    voice.instrument?.triggerAttack(toNoteName(midi), Tone.immediate(), KEYS_VELOCITY);
  }

  noteOff(midi) {
    const voice = this.voices.keys;
    voice.notes = voice.notes.filter((note) => note !== midi);
    voice.instrument?.triggerRelease(toNoteName(midi), Tone.immediate());
  }

  #strike(side, time) {
    const voice = this.voices[side];
    const { instrument } = voice;
    if (!instrument) return; // still loading; it strikes once the sound arrives
    const velocity = VELOCITY[this.style];
    if (this.style === 'arpeggio') {
      const order = arpeggioOrder(voice.notes);
      const note = order[voice.step++ % order.length];
      instrument.triggerAttackRelease(toNoteName(note), '4n', time, velocity);
    } else {
      const names = voice.notes.map(toNoteName);
      instrument.triggerRelease(names, time);
      // Guitars strum: each string a moment after the one below.
      names.forEach((name, i) => instrument.triggerAttack(name, time + i * this.strum, velocity));
    }
    voice.lastStrike = time;
    Tone.getDraw().schedule(() => this.onStrike(side), time);
  }

  #onTick(time, tick) {
    const every = STRIKE_EVERY[this.style];
    if (!every || tick % every !== 0) return;
    const interval = Tone.Time('8n').toSeconds() * every;
    for (const side of SIDES) {
      const voice = this.voices[side];
      // Skip a hand that only just struck (its gesture changed a moment ago).
      if (voice.notes.length && time - voice.lastStrike > interval / 2) this.#strike(side, time);
    }
  }
}
