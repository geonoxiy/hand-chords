// Recording: captures a video of your performance — the mirrored camera with
// the hand tracer on top — with everything you hear and, if switched on, your
// microphone. Saved as MP4 where the browser can make it (Chrome, Edge,
// Safari); Firefox only makes WebM. Without a camera, takes are sound only.
// Takes live in this tab until saved, so leaving with unsaved takes asks first.

const VIDEO_TYPES = ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm'];
const AUDIO_TYPES = ['audio/mp4;codecs=mp4a.40.2', 'audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'];
const MIC_KEY = 'hand-chords-mic';

const ICONS = {
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.6-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z"/></svg>',
  trash: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm-3 6h12l-.8 10.2A2 2 0 0 1 15.2 21H8.8a2 2 0 0 1-2-1.8L6 9Z"/></svg>',
};

const formatTime = (seconds) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
const firstSupported = (types) => types.find((type) => MediaRecorder.isTypeSupported(type)) ?? '';
const extension = (type) => (type.startsWith('video/mp4') ? 'mp4' : type.startsWith('audio/mp4') ? 'm4a' : 'webm');

// A small still of the last frame, for the takes list.
function thumbnail(canvas) {
  const small = document.createElement('canvas');
  small.width = 160;
  small.height = Math.round((160 * canvas.height) / canvas.width);
  small.getContext('2d').drawImage(canvas, 0, 0, small.width, small.height);
  return small.toDataURL('image/jpeg', 0.7);
}

// getVideo() starts the camera if needed and resolves to { stream, canvas }
// for the camera-with-tracer picture, or null when there's no camera.
export function setUpRecordings({ player, startSound, getVideo, stopVideo, button, label, micButton, list, empty, preview, setStatus }) {
  const takes = [];
  let session = null; // the recording in progress
  let count = 0;
  let micOn = true;
  try {
    micOn = localStorage.getItem(MIC_KEY) !== 'off';
  } catch {
    // Storage unavailable: the mic starts on.
  }

  function showMic() {
    micButton.setAttribute('aria-pressed', String(micOn));
    micButton.setAttribute('aria-label', micOn ? 'Microphone on for recordings' : 'Microphone off for recordings');
  }

  async function start() {
    if (typeof MediaRecorder === 'undefined') {
      setStatus('This browser can’t record.');
      return;
    }
    button.disabled = true;
    micButton.disabled = true;
    const soundReady = startSound(); // first, while still inside the click
    let video = null;
    let mic = null;
    let note = '';
    try {
      [video] = await Promise.all([getVideo(), soundReady]);
      if (micOn) {
        try {
          mic = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: false, autoGainControl: false },
          });
        } catch (err) {
          console.error(err);
          note = ' — without the mic (access was blocked)';
        }
      }
    } catch (err) {
      console.error(err);
      button.disabled = false;
      micButton.disabled = false;
      return;
    }

    const removeMic = mic && player.addToRecording(mic);
    const tracks = [...(video?.stream.getVideoTracks() ?? []), ...player.recordingOutput.stream.getAudioTracks()];
    const recorder = new MediaRecorder(new MediaStream(tracks), {
      mimeType: firstSupported(video ? VIDEO_TYPES : AUDIO_TYPES),
      videoBitsPerSecond: 5_000_000,
      audioBitsPerSecond: 192_000,
    });
    const chunks = [];
    recorder.addEventListener('dataavailable', (event) => {
      if (event.data.size) chunks.push(event.data);
    });
    recorder.start(1000);

    const startedAt = performance.now();
    const tick = () => (label.textContent = formatTime((performance.now() - startedAt) / 1000));
    session = { recorder, chunks, startedAt, ticker: setInterval(tick, 250), video, mic, removeMic };
    tick();
    button.disabled = false;
    button.classList.add('recording');
    button.setAttribute('aria-pressed', 'true');
    setStatus(`Recording ${video ? 'video' : 'sound only (no camera)'}${note}…`);
  }

  async function stop() {
    const { recorder, chunks, startedAt, ticker, video, mic, removeMic } = session;
    session = null;
    clearInterval(ticker);
    button.classList.remove('recording');
    button.setAttribute('aria-pressed', 'false');
    label.textContent = 'Record';
    micButton.disabled = false;

    const thumb = video ? thumbnail(video.canvas) : null;
    const stopped = new Promise((resolve) => recorder.addEventListener('stop', resolve, { once: true }));
    recorder.stop();
    await stopped;
    removeMic?.();
    mic?.getTracks().forEach((track) => track.stop());
    video?.stream.getTracks().forEach((track) => track.stop());
    stopVideo();

    const blob = new Blob(chunks, { type: recorder.mimeType });
    const duration = (performance.now() - startedAt) / 1000;
    count += 1;
    takes.unshift({ name: `Take ${count}`, blob, url: URL.createObjectURL(blob), duration, thumb, saved: false });
    render();
    setStatus(`Take ${count} recorded — ${formatTime(duration)}`);
  }

  function save(take) {
    const link = Object.assign(document.createElement('a'), {
      href: take.url,
      download: `hand-chords-${take.name.toLowerCase().replace(/\s+/g, '-')}.${extension(take.blob.type)}`,
    });
    document.body.append(link);
    link.click();
    link.remove();
    take.saved = true;
    setStatus(`${take.name} saved`);
  }

  function remove(take) {
    if (!take.saved && !confirm(`Delete ${take.name}? It hasn’t been saved.`)) return;
    URL.revokeObjectURL(take.url);
    takes.splice(takes.indexOf(take), 1);
    render();
  }

  function openPreview(take) {
    preview.title.textContent = take.name;
    preview.video.src = take.url;
    preview.save.onclick = () => save(take);
    preview.dialog.showModal();
    preview.video.play();
  }

  function render() {
    empty.hidden = takes.length > 0;
    list.replaceChildren(
      ...takes.map((take) => {
        const row = document.createElement('li');
        row.className = 'take';
        row.innerHTML = `
          <button class="take-thumb" type="button" aria-label="Play ${take.name}">
            ${take.thumb ? `<img src="${take.thumb}" alt="">` : ''}
            <span class="take-play">${ICONS.play}</span>
          </button>
          <div class="take-text">
            <span class="take-name">${take.name}</span>
            <span class="take-time">${formatTime(take.duration)} · ${take.thumb ? 'Video' : 'Sound only'}</span>
          </div>
          <button class="text-button" type="button">Save ${extension(take.blob.type).toUpperCase()}</button>
          <button class="delete-button" type="button" aria-label="Delete ${take.name}">${ICONS.trash}</button>`;
        const [play, saveButton, deleteButton] = row.querySelectorAll('button');
        play.addEventListener('click', () => openPreview(take));
        saveButton.addEventListener('click', () => save(take));
        deleteButton.addEventListener('click', () => remove(take));
        return row;
      }),
    );
  }

  button.addEventListener('click', () => (session ? stop() : start()));
  micButton.addEventListener('click', () => {
    micOn = !micOn;
    try {
      localStorage.setItem(MIC_KEY, micOn ? 'on' : 'off');
    } catch {
      // Not remembered, but still applies to the next take.
    }
    showMic();
  });
  preview.close.addEventListener('click', () => preview.dialog.close());
  preview.dialog.addEventListener('close', () => {
    preview.video.pause();
    preview.video.removeAttribute('src');
  });
  window.addEventListener('beforeunload', (event) => {
    if (session || takes.some((take) => !take.saved)) event.preventDefault();
  });
  showMic();
  render();
}
