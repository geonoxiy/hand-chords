// Hand tracking: turns MediaPipe hand landmarks into finger patterns.
// A pattern is a 5-character string, thumb → pinky, "1" = finger up.
// e.g. "01100" = index + middle up (peace sign).

import {
  FilesetResolver,
  HandLandmarker,
} from 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs';

const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm';
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

export const HAND_CONNECTIONS = HandLandmarker.HAND_CONNECTIONS;

export async function loadHandLandmarker() {
  const fileset = await FilesetResolver.forVisionTasks(WASM_URL);
  const options = (delegate) => ({
    baseOptions: { modelAssetPath: MODEL_URL, delegate },
    runningMode: 'VIDEO',
    numHands: 2,
    minHandDetectionConfidence: 0.6,
    minHandPresenceConfidence: 0.5,
    minTrackingConfidence: 0.6,
  });
  try {
    return await HandLandmarker.createFromOptions(fileset, options('GPU'));
  } catch {
    return HandLandmarker.createFromOptions(fileset, options('CPU'));
  }
}

// Landmark indices for the four non-thumb fingers: [MCP, PIP, DIP, TIP].
const FINGER_JOINTS = [
  [5, 6, 7, 8],
  [9, 10, 11, 12],
  [13, 14, 15, 16],
  [17, 18, 19, 20],
];

// A finger's score runs 0 (curled) to 1 (up). It flips to up above UP_ABOVE
// and back down below DOWN_BELOW; the gap stops it flickering in between.
const UP_ABOVE = 0.6;
const DOWN_BELOW = 0.4;
const SMOOTHING = 0.5; // how far each frame moves a score towards its new reading

const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
const length = (v) => Math.hypot(v.x, v.y, v.z);
const distance = (a, b) => length(sub(a, b));

// 0 at `zeroAt`, 1 at `oneAt`, straight line in between.
const ramp = (value, zeroAt, oneAt) => Math.min(1, Math.max(0, (value - zeroAt) / (oneAt - zeroAt)));

function angleBetween(a, b) {
  const cos = dot(a, b) / (length(a) * length(b) || 1);
  return (Math.acos(Math.min(1, Math.max(-1, cos))) * 180) / Math.PI;
}

// Two cues that fail in different ways: how bent the finger's joints are
// (straight fingers measure ~20–60°, curled ones 100°+), and how far its tip
// reaches from the wrist compared with its knuckle (~1.9× up, under 1.2× curled).
function fingerScore(points, [mcp, pip, dip, tip]) {
  const proximal = sub(points[pip], points[mcp]);
  const middle = sub(points[dip], points[pip]);
  const distal = sub(points[tip], points[dip]);
  const bend = angleBetween(proximal, middle) + angleBetween(middle, distal);
  const reach = distance(points[0], points[tip]) / (distance(points[0], points[mcp]) || 1);
  return 0.6 * ramp(bend, 110, 40) + 0.4 * ramp(reach, 1.2, 1.7);
}

// The thumb mostly moves sideways, so the main cue is how far across the palm
// its tip sits: 0 at the pinky knuckle, 1 at the index knuckle. Folded thumbs
// sit around 0.3–1.0; a thumb sticking out reaches 1.3+. A straight thumb
// joint adds a little evidence.
function thumbScore(points) {
  const across = sub(points[5], points[17]);
  const spread = dot(sub(points[4], points[17]), across) / (dot(across, across) || 1);
  const bend = angleBetween(sub(points[3], points[2]), sub(points[4], points[3]));
  return 0.75 * ramp(spread, 1.05, 1.45) + 0.25 * ramp(bend, 60, 20);
}

// Reads one hand's fingers frame by frame. `scores` (0–1 per finger) are
// smoothed over frames; `up` follows them with hysteresis.
export class FingerReader {
  constructor() {
    this.reset();
  }

  reset() {
    this.scores = null;
    this.up = [false, false, false, false, false];
  }

  // `world` is MediaPipe's worldLandmarks for the hand (metric 3D, so the
  // cues don't depend on distance from the camera or which way the hand faces).
  read(world) {
    const fresh = [thumbScore(world), ...FINGER_JOINTS.map((joints) => fingerScore(world, joints))];
    this.scores = this.scores ? this.scores.map((score, i) => score + SMOOTHING * (fresh[i] - score)) : fresh;
    this.up = this.up.map((wasUp, i) => (wasUp ? this.scores[i] > DOWN_BELOW : this.scores[i] > UP_ABOVE));
    return this.up.map(Number).join('');
  }
}

// Only lets a value through once it has stayed the same for `holdMs` and for
// at least MIN_FRAMES camera frames, so passing through other shapes while
// changing gestures doesn't trigger chords.
const MIN_FRAMES = 3;

export class Stabilizer {
  constructor() {
    this.reset();
  }

  reset() {
    this.value = null;
    this.candidate = null;
    this.since = 0;
    this.frames = 0;
  }

  push(value, now, holdMs) {
    if (value !== this.candidate) {
      this.candidate = value;
      this.since = now;
      this.frames = 0;
    }
    this.frames++;
    if (this.candidate !== this.value && now - this.since >= holdMs && this.frames >= MIN_FRAMES) {
      this.value = this.candidate;
    }
    return this.value;
  }
}

const STICKY_DISTANCE = 0.15; // of the frame width: how far a hand can move between frames
const FORGET_AFTER_MS = 1000;

// Decides which detected hand is the player's left and which the right.
// Given raw (unmirrored) camera frames, MediaPipe's label is the person's
// actual hand — but it can flicker, so a hand keeps its side while it stays
// near where that side was last seen.
export class HandSides {
  constructor() {
    this.last = { left: null, right: null }; // wrist positions
    this.lastSeen = 0;
  }

  assign(result, now, swap) {
    if (now - this.lastSeen > FORGET_AFTER_MS) this.last = { left: null, right: null };

    const hands = result.landmarks.map((landmarks, i) => ({
      landmarks,
      world: result.worldLandmarks[i],
      side: result.handedness[i][0].categoryName === 'Left' ? 'left' : 'right',
    }));
    const away = (hand, side) =>
      this.last[side] ? Math.hypot(hand.landmarks[0].x - this.last[side].x, hand.landmarks[0].y - this.last[side].y) : Infinity;

    if (hands.length === 2) {
      const [a, b] = hands;
      const known = ['left', 'right'].filter((side) => this.last[side]);
      if (known.length) {
        // Pair them up the way that moves the hands the least since last frame.
        const asIs = known.reduce((sum, side) => sum + away(side === 'left' ? a : b, side), 0);
        const swapped = known.reduce((sum, side) => sum + away(side === 'left' ? b : a, side), 0);
        [a.side, b.side] = asIs <= swapped ? ['left', 'right'] : ['right', 'left'];
      } else if (a.side === b.side) {
        // Same label on both: in the raw frame the player's left hand is further right.
        [a.side, b.side] = a.landmarks[0].x > b.landmarks[0].x ? ['left', 'right'] : ['right', 'left'];
      }
    } else if (hands.length === 1) {
      const [hand] = hands;
      const other = hand.side === 'left' ? 'right' : 'left';
      if (away(hand, hand.side) > STICKY_DISTANCE && away(hand, other) < STICKY_DISTANCE) hand.side = other;
    }

    if (hands.length) {
      this.last = { left: null, right: null };
      for (const hand of hands) this.last[hand.side] = hand.landmarks[0];
      this.lastSeen = now;
    }
    if (swap) {
      for (const hand of hands) hand.side = hand.side === 'left' ? 'right' : 'left';
    }
    return hands;
  }
}
