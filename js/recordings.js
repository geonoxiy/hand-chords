// Recording: captures everything you hear (both hands and the keyboard) as
// takes you can play back, save as WAV, or delete. Takes live in this tab
// until saved, so leaving with unsaved takes asks first.
/* global Tone */

const ICONS = {
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.6-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z"/></svg>',
  pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6.5" y="5" width="4" height="14" rx="1.2"/><rect x="13.5" y="5" width="4" height="14" rx="1.2"/></svg>',
  trash: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm-3 6h12l-.8 10.2A2 2 0 0 1 15.2 21H8.8a2 2 0 0 1-2-1.8L6 9Z"/></svg>',
};

const formatTime = (seconds) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

export function setUpRecordings({ player, startSound, button, label, list, empty, setStatus }) {
  const takes = [];
  const audio = new Audio();
  let playing = null; // the take being played back
  let startedAt = 0;
  let ticker = null;
  let count = 0;

  const recording = () => player.recorder?.state === 'started';

  async function start() {
    button.disabled = true;
    try {
      await startSound(); // first, while still inside the click
    } catch {
      button.disabled = false;
      return;
    }
    button.disabled = false;
    if (!player.recorder) {
      setStatus('This browser can’t record audio.');
      return;
    }
    player.recorder.start();
    startedAt = performance.now();
    button.classList.add('recording');
    button.setAttribute('aria-pressed', 'true');
    const tick = () => (label.textContent = formatTime((performance.now() - startedAt) / 1000));
    tick();
    ticker = setInterval(tick, 250);
    setStatus('Recording…');
  }

  async function stop() {
    clearInterval(ticker);
    const duration = (performance.now() - startedAt) / 1000;
    button.classList.remove('recording');
    button.setAttribute('aria-pressed', 'false');
    label.textContent = 'Record';
    const blob = await player.recorder.stop();
    count += 1;
    takes.unshift({ name: `Take ${count}`, blob, url: URL.createObjectURL(blob), duration, saved: false });
    render();
    setStatus(`Take ${count} recorded — ${formatTime(duration)}`);
  }

  function togglePlayback(take) {
    if (playing === take && !audio.paused) {
      audio.pause();
    } else {
      if (playing !== take) audio.src = take.url;
      playing = take;
      audio.play();
    }
    render();
  }

  async function save(take) {
    setStatus(`Saving ${take.name}…`);
    try {
      const decoded = await Tone.getContext().decodeAudioData(await take.blob.arrayBuffer());
      download(encodeWav(decoded), `hand-chords-${take.name.toLowerCase().replace(/\s+/g, '-')}.wav`);
      take.saved = true;
      setStatus(`${take.name} saved as WAV`);
    } catch (err) {
      console.error(err);
      setStatus(`Couldn’t save ${take.name}.`);
    }
  }

  function remove(take) {
    if (!take.saved && !confirm(`Delete ${take.name}? It hasn’t been saved.`)) return;
    if (playing === take) {
      audio.pause();
      playing = null;
    }
    URL.revokeObjectURL(take.url);
    takes.splice(takes.indexOf(take), 1);
    render();
  }

  function render() {
    empty.hidden = takes.length > 0;
    list.replaceChildren(
      ...takes.map((take) => {
        const isPlaying = playing === take && !audio.paused;
        const row = document.createElement('li');
        row.className = 'take';
        row.innerHTML = `
          <button class="play-button" type="button" aria-label="${isPlaying ? 'Pause' : 'Play'} ${take.name}">
            ${isPlaying ? ICONS.pause : ICONS.play}
          </button>
          <div class="take-text">
            <span class="take-name">${take.name}</span>
            <span class="take-time">${formatTime(take.duration)}</span>
          </div>
          <button class="text-button" type="button">Save WAV</button>
          <button class="delete-button" type="button" aria-label="Delete ${take.name}">${ICONS.trash}</button>`;
        const [play, saveButton, deleteButton] = row.querySelectorAll('button');
        play.addEventListener('click', () => togglePlayback(take));
        saveButton.addEventListener('click', () => save(take));
        deleteButton.addEventListener('click', () => remove(take));
        return row;
      }),
    );
  }

  button.addEventListener('click', () => (recording() ? stop() : start()));
  audio.addEventListener('pause', render);
  audio.addEventListener('ended', render);
  window.addEventListener('beforeunload', (event) => {
    if (takes.some((take) => !take.saved) || recording()) event.preventDefault();
  });
  render();
}

function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

// 16-bit PCM WAV, which every audio app opens.
function encodeWav(audioBuffer) {
  const channels = audioBuffer.numberOfChannels;
  const rate = audioBuffer.sampleRate;
  const frames = audioBuffer.length;
  const dataBytes = frames * channels * 2;
  const view = new DataView(new ArrayBuffer(44 + dataBytes));
  const text = (offset, value) => [...value].forEach((char, i) => view.setUint8(offset + i, char.charCodeAt(0)));

  text(0, 'RIFF');
  view.setUint32(4, 36 + dataBytes, true);
  text(8, 'WAVE');
  text(12, 'fmt ');
  view.setUint32(16, 16, true); // format chunk size
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, channels, true);
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * channels * 2, true); // bytes per second
  view.setUint16(32, channels * 2, true); // bytes per frame
  view.setUint16(34, 16, true); // bits per sample
  text(36, 'data');
  view.setUint32(40, dataBytes, true);

  const data = Array.from({ length: channels }, (_, c) => audioBuffer.getChannelData(c));
  let offset = 44;
  for (let i = 0; i < frames; i++) {
    for (let c = 0; c < channels; c++) {
      const sample = Math.max(-1, Math.min(1, data[c][i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }
  return new Blob([view], { type: 'audio/wav' });
}
