# Hand Chords

**Try it: https://geonoxiy.github.io/hand-chords/**

Play chords by holding up finger patterns in front of your camera. Each hand plays its own chord — left hand low, right hand high — and a chord keeps sounding for as long as you hold the pattern. Make a fist to stop.

It runs entirely in the browser: the camera image never leaves your device.

## Features

- **Two chords at once**, one per hand, read from your fingers with [MediaPipe Hand Landmarker](https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker).
- **Eight sounds**: piano, electric piano, organ, synth pad, strings, and acoustic, nylon and electric guitar.
- **Hold, Pulse or Arpeggio**: Hold keeps a chord at a steady volume for as long as your hand is up.
- **Rich chords**: triads, 6ths, 7ths, add9, major/minor/dominant 9ths, 6/9, minor 11ths and 13ths. Switch the whole chart between Triads, 7ths and 9ths, or pick any chord for any pattern, in any key.
- **Playable keyboard**: click, tap, drag, or type on your computer keyboard (A W S E D F T G Y H U J K O L P ;).
- **Recording**: record everything you play, play takes back, and save them as WAV.
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
| Fist | none | silence |

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
