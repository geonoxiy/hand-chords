# Hand Chords

**Try it: https://geonoxiy.github.io/hand-chords/**

Play chords by holding up finger patterns in front of your camera. Each hand plays its own chord — left hand low, right hand high — and a chord keeps sounding for as long as you hold the pattern. Make a fist to stop.

It runs entirely in the browser: the camera image never leaves your device.

## Features

- **Two chords at once**, one per hand, read from your fingers with [MediaPipe Hand Landmarker](https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker).
- **Eight sounds**: piano, electric piano, organ, synth pad, strings, and acoustic, nylon and electric guitar.
- **Hold, Pulse or Arpeggio**: Hold keeps a chord at a steady volume for as long as your hand is up.
- **13 finger patterns** and **solfège hand signs**: switch to Solfège to play with the Curwen / Kodály signs (Do, Re, Mi, Fa, Sol, La, Ti) — as chords on each scale degree, or as single notes.
- **All 24 keys**, major and minor, with chords spelled the way the key writes them (B♯° in C♯ minor, not C°).
- **35 chord types**: triads, power chords, 6ths, 7ths (incl. 7♯5, 7♭5, half-diminished), add9, 9ths, 7♭9, 7♯9, 9sus4, 6/9, add11, 11ths, maj7♯11 and 13ths. Switch the whole chart between Triads, 7ths and 9ths, or pick any chord for any pattern.
- **Wide range**: shift each hand up or down by octaves; the keyboard covers all 88 piano keys.
- **Playable keyboard**: click, tap, drag, or type on your computer keyboard (A W S E D F T G Y H U J K O L P ;).
- **Recording**: film yourself playing — the camera with the hand tracer, the app's sound and your microphone — and save it as MP4 (WebM in Firefox, which can't make MP4).
- **Light and dark mode.**

## Finger patterns (default, key of C)

| Pattern | Fingers up | Chord |
| --- | --- | --- |
| One | index | C |
| Peace | index + middle | Dm |
| Three | index, middle, ring | Em |
| Four | four fingers, thumb tucked | F |
| Open hand | all five, thumb out | G |
| Thumbs up | thumb | Am |
| Rock on | index + pinky | G7 |
| Call me | thumb + pinky | B° |
| L | thumb + index | D (V of V) |
| Love you | thumb, index + pinky | B♭ |
| OK | thumb and index circle, other three up | Fm |
| Three + thumb | thumb, index + middle | E (V of vi) |
| Pinky | pinky | A♭ |
| Fist | none | silence |

Minor keys get their own chords — in C♯ minor: C♯m, D♯°, E, F♯m, G♯, A, G♯7, B, F♯, D, G♯m, C♯ and B♯°.

## Solfège hand signs

| Sign | Hand | Major key (C) | Minor key (C♯m) |
| --- | --- | --- | --- |
| Do | fist | C | C♯m |
| Re | flat hand, palm down, fingers slanting up | Dm | D♯° |
| Mi | flat hand, palm down, level | Em | E |
| Fa | fist, thumb pointing down | F | F♯m |
| Sol | flat hand on its side, level | G | G♯ |
| La | hand drooping, fingers down | Am | A |
| Ti | index finger pointing up | B° | B |

Lower your hand out of view to stop (a fist is Do here).

## Run it yourself

Browsers only allow the camera on `https` or `localhost`, and the scripts must be served (opening `index.html` as a file won't work):

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Credits

- Hand tracking: [MediaPipe](https://github.com/google-ai-edge/mediapipe) by Google.
- Audio: [Tone.js](https://tonejs.github.io/).
- Piano: [Salamander Grand Piano](https://archive.org/details/SalamanderGrandPianoV3) by Alexander Holm (CC BY 3.0).
- Guitars: samples from [nbrosowsky/tonejs-instruments](https://github.com/nbrosowsky/tonejs-instruments).
