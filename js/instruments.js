// The sounds you can pick. Recorded instruments (piano, guitars) are prepared
// so a held note never fades: after the strike, the recording's volume is
// evened out and a slice of it loops seamlessly for as long as it's held.
/* global Tone */

const SALAMANDER = 'https://tonejs.github.io/audio/salamander/';
const SAMPLES = 'https://nbrosowsky.github.io/tonejs-instruments/samples/';

export const INSTRUMENTS = [
  {
    id: 'piano',
    label: 'Piano',
    samples: {
      baseUrl: SALAMANDER,
      notes: ['A1', 'C2', 'D#2', 'F#2', 'A2', 'C3', 'D#3', 'F#3', 'A3', 'C4', 'D#4',
        'F#4', 'A4', 'C5', 'D#5', 'F#5', 'A5', 'C6', 'D#6', 'F#6', 'A6'],
    },
    holdFrom: 0.35,
    release: 0.6,
    gainDb: 3,
  },
  {
    id: 'epiano',
    label: 'Electric piano',
    synth: () =>
      new Tone.PolySynth(Tone.FMSynth, {
        harmonicity: 1,
        modulationIndex: 2.5,
        oscillator: { type: 'sine' },
        modulation: { type: 'sine' },
        envelope: { attack: 0.004, decay: 1.6, sustain: 0.45, release: 1 },
        modulationEnvelope: { attack: 0.002, decay: 0.5, sustain: 0.15, release: 0.6 },
      }),
    effects: () => [new Tone.Tremolo(4.5, 0.25).start()],
    gainDb: 4,
  },
  {
    id: 'organ',
    label: 'Organ',
    synth: () =>
      new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'custom', partials: [1, 0.8, 0.6, 0.5, 0, 0.3, 0, 0.25] },
        envelope: { attack: 0.015, decay: 0, sustain: 1, release: 0.08 },
      }),
    effects: () => [new Tone.Chorus(5, 2.5, 0.4).start(), new Tone.Tremolo(6.5, 0.15).start()],
    gainDb: -10,
  },
  {
    id: 'pad',
    label: 'Synth pad',
    synth: () =>
      new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'fatsawtooth', count: 3, spread: 24 },
        envelope: { attack: 0.35, decay: 0.4, sustain: 0.85, release: 1.6 },
      }),
    effects: () => [new Tone.Filter(1600, 'lowpass'), new Tone.Chorus(0.8, 3.5, 0.6).start()],
    gainDb: -10.5,
  },
  {
    id: 'strings',
    label: 'Strings',
    synth: () =>
      new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'fatsawtooth', count: 4, spread: 12 },
        envelope: { attack: 0.25, decay: 0.2, sustain: 0.9, release: 0.9 },
      }),
    effects: () => [new Tone.Filter(2800, 'lowpass', -24), new Tone.Vibrato(5, 0.06)],
    gainDb: -12.5,
  },
  {
    id: 'acoustic',
    label: 'Acoustic guitar',
    samples: {
      baseUrl: `${SAMPLES}guitar-acoustic/`,
      notes: ['D2', 'F2', 'G#2', 'B2', 'D3', 'F3', 'G#3', 'B3', 'D4', 'F4', 'G#4', 'B4', 'D5'],
    },
    holdFrom: 0.3,
    release: 0.35,
    strum: 0.03,
    gainDb: -6,
  },
  {
    id: 'nylon',
    label: 'Nylon guitar',
    samples: {
      baseUrl: `${SAMPLES}guitar-nylon/`,
      notes: ['B1', 'F#2', 'A2', 'C#3', 'F#3', 'A3', 'C#4', 'F#4', 'A4', 'C#5', 'F#5', 'A5'],
    },
    holdFrom: 0.3,
    release: 0.35,
    strum: 0.03,
    gainDb: -4,
  },
  {
    id: 'electric',
    label: 'Electric guitar',
    samples: {
      baseUrl: `${SAMPLES}guitar-electric/`,
      notes: ['C#2', 'E2', 'F#2', 'A2', 'C3', 'D#3', 'F#3', 'A3', 'C4', 'D#4',
        'F#4', 'A4', 'C5', 'D#5', 'F#5', 'A5', 'C6'],
    },
    holdFrom: 0.3,
    release: 0.35,
    strum: 0.025,
    gainDb: -3,
  },
];

// Loads an instrument and wires it to `output`. Returns a factory: each voice
// (left hand, right hand, keyboard) gets its own copy via create().
export async function loadInstrument(id, output) {
  const def = INSTRUMENTS.find((instrument) => instrument.id === id);
  if (!def) throw new Error(`Unknown sound: ${id}`);
  const samples = def.samples ? await prepareSamples(def) : null;
  const bus = new Tone.Gain(Tone.dbToGain(def.gainDb));
  bus.chain(...(def.effects?.() ?? []), output);
  return {
    id,
    strum: def.strum ?? 0,
    create: () => (samples ? new LoopSampler(samples, def.release) : def.synth()).connect(bus),
  };
}

// ---------- recorded instruments ----------

const prepared = new Map(); // instrument id -> Promise of looped samples

function prepareSamples(def) {
  if (!prepared.has(def.id)) {
    const loading = fetchBuffers(def.samples).then(async (buffers) => {
      return def.samples.notes.map((note) => makeSustainLoop(buffers.get(note).get(), note, def.holdFrom));
    });
    loading.catch(() => prepared.delete(def.id));
    prepared.set(def.id, loading);
  }
  return prepared.get(def.id);
}

function fetchBuffers({ baseUrl, notes }) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timed out downloading the sound')), 30000);
    const buffers = new Tone.ToneAudioBuffers({
      urls: Object.fromEntries(notes.map((note) => [note, `${note.replace('#', 's')}.mp3`])),
      baseUrl,
      onload: () => {
        clearTimeout(timer);
        resolve(buffers);
      },
      onerror: (err) => {
        clearTimeout(timer);
        reject(err);
      },
    });
  });
}

const LEVEL_HOP = 0.005; // seconds between loudness readings
const HOLD_DROP_DB = 6; // let the strike fade this much before holding the volume
const MAX_BOOST_DB = 30; // never raise a quiet tail more than this
const MAX_SPAN = 6; // seconds of recording used after the hold point
const MAX_CROSSFADE = 1; // seconds

// Turns one recorded note into a buffer that can loop forever at a steady
// volume. The strike is untouched until it has faded HOLD_DROP_DB (or until
// `holdFrom` seconds); after that the volume is held where it was, and the end
// of the loop is crossfaded into the audio just before the loop start so the
// jump back is seamless.
//
// Stereo channels are evened out one by one: in the piano recordings the two
// microphones beat against each other, so a channel can swing by 15 dB while
// their sum stays flat — and each ear hears a single channel.
function makeSustainLoop(audioBuffer, note, holdFrom) {
  const rate = audioBuffer.sampleRate;
  const pitch = Tone.Frequency(note).toFrequency();
  const channels = Array.from({ length: audioBuffer.numberOfChannels }, (_, c) =>
    Float32Array.from(audioBuffer.getChannelData(c)),
  );
  const length = channels[0].length;

  // Loudness readings span a few waveform cycles, so they can follow the
  // beating of high notes.
  const window = Math.round(Math.min(0.1, Math.max(0.03, 4 / pitch)) * rate);
  const hop = Math.round(LEVEL_HOP * rate);
  let levels = channels.map((channel) => loudness(channel, window, hop));
  const overall = (i) => Math.sqrt(levels.reduce((sum, levelAt) => sum + levelAt(i) ** 2, 0) / levels.length);

  const latestHold = Math.round(holdFrom * rate);
  let peak = 0;
  let holdStart = 0;
  while (holdStart < latestHold) {
    const level = overall(holdStart);
    peak = Math.max(peak, level);
    if (level < peak * 10 ** (-HOLD_DROP_DB / 20)) break;
    holdStart += hop;
  }
  // Each channel is held the same amount below its own strike, keeping the
  // strike's left/right balance (the tail's balance swings as the mics beat).
  const drop = overall(holdStart) / (peak || 1);
  const targets = levels.map((levelAt) => {
    let channelPeak = 0;
    for (let i = 0; i <= holdStart; i += hop) channelPeak = Math.max(channelPeak, levelAt(i));
    return channelPeak * drop;
  });

  // Use the recording until it first gets too quiet to boost back up.
  const maxBoost = 10 ** (MAX_BOOST_DB / 20);
  const limit = Math.min(length - window, holdStart + MAX_SPAN * rate);
  let end = holdStart;
  while (end + hop < limit && levels.every((levelAt, c) => levelAt(end + hop) * maxBoost >= targets[c])) {
    end += hop;
  }
  if (end - holdStart < 0.05 * rate) end = Math.min(limit, holdStart + Math.round(0.05 * rate));

  // Scale the audio to hold each channel at its target. `easeIn` ramps the
  // change in over 50 ms so there's no step where holding begins.
  const ramp = Math.round(0.05 * rate);
  const holdSteady = (from, to, easeIn = false) => {
    channels.forEach((channel, c) => {
      const levelAt = levels[c];
      for (let i = from; i < to; i++) {
        let gain = Math.min(maxBoost, targets[c] / (levelAt(i) || 1e-9));
        if (easeIn) gain = 1 + (gain - 1) * Math.min(1, (i - from) / ramp);
        channel[i] *= gain;
      }
    });
  };
  holdSteady(holdStart, end, true);

  // Loop as long a stretch as possible, nudged so the waveform lines up
  // across the seam.
  const fade = Math.round(Math.min(MAX_CROSSFADE * rate, (end - holdStart) / 3));
  const period = Math.round(rate / pitch);
  const longest = end - holdStart - fade;
  const loopLength = bestLag(channels, end, Math.max(fade, longest - 2 * period), longest, Math.min(fade, 2048));
  const loopStart = end - loopLength;

  // Crossfade the loop's end into the audio leading up to its start. The
  // curve depends on how alike the two stretches are, to limit dips.
  const a0 = end - fade;
  const b0 = loopStart - fade;
  for (const channel of channels) {
    let dot = 0;
    let energyA = 0;
    let energyB = 0;
    for (let i = 0; i < fade; i++) {
      dot += channel[a0 + i] * channel[b0 + i];
      energyA += channel[a0 + i] ** 2;
      energyB += channel[b0 + i] ** 2;
    }
    const similarity = Math.max(0, dot / (Math.sqrt(energyA * energyB) || 1));
    for (let i = 0; i < fade; i++) {
      const fadeIn = i / fade;
      const fadeOut = 1 - fadeIn;
      const norm = 1 / Math.sqrt(fadeOut ** 2 + fadeIn ** 2 + 2 * similarity * fadeOut * fadeIn);
      channel[a0 + i] = norm * (fadeOut * channel[a0 + i] + fadeIn * channel[b0 + i]);
    }
  }

  // Waveforms that partly cancel can still dip inside the crossfade, so even
  // it out again — measured on the audio as it plays, wrapping into the loop.
  levels = channels.map((channel) => {
    const looped = new Float32Array(end + window);
    looped.set(channel.subarray(0, end));
    looped.set(channel.subarray(loopStart, loopStart + window), end);
    return loudness(looped, window, hop);
  });
  holdSteady(a0, end);

  const buffer = new AudioBuffer({ numberOfChannels: channels.length, length: end, sampleRate: rate });
  channels.forEach((channel, c) => buffer.copyToChannel(channel.subarray(0, end), c));
  return {
    midi: Tone.Frequency(note).toMidi(),
    buffer: new Tone.ToneAudioBuffer(buffer),
    loopStart: loopStart / rate,
    loopEnd: end / rate,
  };
}

// Loudness (RMS) around any sample position, from readings every `hop` samples.
function loudness(data, window, hop) {
  const squares = new Float64Array(data.length + 1);
  for (let i = 0; i < data.length; i++) squares[i + 1] = squares[i] + data[i] * data[i];
  const readings = [];
  for (let start = 0; start + window <= data.length; start += hop) {
    readings.push(Math.sqrt((squares[start + window] - squares[start]) / window));
  }
  return (sample) => {
    const k = Math.min(readings.length - 1, Math.max(0, (sample - window / 2) / hop));
    const k0 = Math.floor(k);
    const k1 = Math.min(k0 + 1, readings.length - 1);
    return readings[k0] + (readings[k1] - readings[k0]) * (k - k0);
  };
}

// The lag between minLag and maxLag at which the audio just before `at`
// best matches the audio one lag earlier (across all channels).
function bestLag(channels, at, minLag, maxLag, window) {
  let best = maxLag;
  let bestScore = -Infinity;
  for (let lag = maxLag; lag >= minLag; lag--) {
    let dot = 0;
    let energy = 0;
    for (const data of channels) {
      for (let i = at - window; i < at; i++) {
        const earlier = data[i - lag];
        dot += data[i] * earlier;
        energy += earlier * earlier;
      }
    }
    const score = dot / Math.sqrt(energy || 1e-12);
    if (score > bestScore) {
      bestScore = score;
      best = lag;
    }
  }
  return best;
}

// Plays the looped recordings, pitch-shifting from the nearest recorded note.
// Same calls as Tone's synths, so the player can treat every sound alike.
class LoopSampler {
  constructor(samples, release) {
    this.samples = samples;
    this.release = release;
    this.output = new Tone.Gain();
    this.active = new Map(); // midi -> sources currently sounding
  }

  connect(node) {
    this.output.connect(node);
    return this;
  }

  triggerAttack(notes, time, velocity = 1) {
    for (const note of [notes].flat()) {
      const midi = Tone.Frequency(note).toMidi();
      const sample = this.samples.reduce((a, b) => (Math.abs(b.midi - midi) < Math.abs(a.midi - midi) ? b : a));
      const source = new Tone.ToneBufferSource({
        url: sample.buffer,
        loop: true,
        loopStart: sample.loopStart,
        loopEnd: sample.loopEnd,
        playbackRate: Tone.intervalToFrequencyRatio(midi - sample.midi),
        fadeOut: this.release,
        curve: 'exponential',
      }).connect(this.output);
      source.onended = () => {
        const sources = this.active.get(midi);
        if (sources) this.active.set(midi, sources.filter((s) => s !== source));
        source.dispose();
      };
      source.start(time, 0, undefined, velocity);
      this.active.set(midi, [...(this.active.get(midi) ?? []), source]);
    }
    return this;
  }

  triggerRelease(notes, time) {
    for (const note of [notes].flat()) {
      const midi = Tone.Frequency(note).toMidi();
      for (const source of this.active.get(midi) ?? []) source.stop(time);
      this.active.set(midi, []);
    }
    return this;
  }

  triggerAttackRelease(notes, duration, time, velocity) {
    this.triggerAttack(notes, time, velocity);
    this.triggerRelease(notes, time + Tone.Time(duration).toSeconds());
    return this;
  }

  releaseAll(time) {
    for (const sources of this.active.values()) for (const source of sources) source.stop(time);
    this.active.clear();
    return this;
  }

  dispose() {
    this.releaseAll(Tone.immediate());
    this.output.dispose();
  }
}
