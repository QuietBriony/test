// ======================================================
// UCM Mandala Engine – Style Blend
// Ambient ⇄ Lo-Fi ⇄ Goa ⇄ HardTechno
// ======================================================

let isRunning = false;
let audioStarted = false;

// 状態
const State = {
  style: 25,    // 0–100: Ambient → Lo-Fi → Goa → Hard
  energy: 40,   // 0–100: 静→動
  creation: 50, // 0–100: 派手さ
  voidAmt: 20,  // 0–100: 余白
};

// ======================================================
// Audio Graph (Tone.js)
// ======================================================

const masterGain = new Tone.Gain(0.9).toDestination();

const drumDist = new Tone.Distortion({
  distortion: 0.0,
  oversample: "4x",
}).connect(masterGain);
drumDist.wet.value = 0.0;

const drumBus = new Tone.Gain(1).connect(drumDist);

const reverb = new Tone.Reverb({
  decay: 4,
  preDelay: 0.03,
  wet: 0.3,
}).connect(masterGain);

const delay = new Tone.FeedbackDelay("8n", 0.25).connect(masterGain);

const padSynth = new Tone.PolySynth(Tone.Synth, {
  oscillator: { type: "triangle" },
  envelope: { attack: 0.4, decay: 0.8, sustain: 0.7, release: 3.0 },
}).connect(reverb);

const bassSynth = new Tone.MonoSynth({
  oscillator: { type: "sawtooth" },
  filter: { type: "lowpass", Q: 1.2 },
  filterEnvelope: {
    attack: 0.01,
    decay: 0.3,
    sustain: 0.2,
    release: 0.4,
    baseFrequency: 60,
    octaves: 3,
  },
  envelope: { attack: 0.01, decay: 0.2, sustain: 0.4, release: 0.5 },
}).connect(masterGain);

const kickSynth = new Tone.MembraneSynth({
  pitchDecay: 0.02,
  octaves: 4,
  oscillator: { type: "sine" },
  envelope: { attack: 0.001, decay: 0.4, sustain: 0.0, release: 0.2 },
}).connect(drumBus);

const hatNoise = new Tone.NoiseSynth({
  noise: { type: "white" },
  envelope: { attack: 0.001, decay: 0.06, sustain: 0 },
}).connect(drumBus);

// 808 / 909 サンプル（存在しなくても落ちないよう safePlay）
const drumSamples = new Tone.Players(
  {
    kick808: "samples/kick_808.wav",
    snare808: "samples/snare_808.wav",
    hat808: "samples/hihat_808.wav",
    kick909: "samples/kick_909.wav",
    snare909: "samples/snare_909.wav",
    hat909: "samples/hihat_909.wav",
  },
  () => console.log("Drum sample players ready (if files exist).")
).connect(drumBus).toDestination();

// ======================================================
// Helper
// ======================================================

function mapValue(x, inMin, inMax, outMin, outMax) {
  if (inMax === inMin) return outMin;
  const t = (x - inMin) / (inMax - inMin);
  return outMin + t * (outMax - outMin);
}

function rand(prob) {
  return Math.random() < prob;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function safePlay(name, time) {
  try {
    const p = drumSamples.player(name);
    if (p) p.start(time);
  } catch (e) {
    // ローカルにサンプルが無い場合も落ちないようにする
  }
}

// ======================================================
// Style Archetype（4点）
// ======================================================
// 各要素は 0〜1 の確率で 16ステップ分定義

const ARCH = [
  {
    name: "Ambient",
    bpm: 86,
    swing: 0.0,
    dist: 0.0,
    kick808: 0.1,
    kick909: 0.0,
    pKick:  [1,0,0,0,  0,0,0,0,  1,0,0,0,  0,0,0,0],
    pSnare:[0,0,0,0,  0,0,0,0,  0,0,0,0,  0,0,0,0],
    pHat:  [0,0.2,0,0.1,  0,0.2,0,0.1,  0,0.2,0,0.1,  0,0.2,0,0.1],
    pBass: [0.6,0,0,0,  0,0,0,0,  0.5,0,0,0,  0,0,0,0],
  },
  {
    name: "Lo-Fi",
    bpm: 80,
    swing: 0.3,
    dist: 0.05,
    kick808: 0.9,
    kick909: 0.1,
    pKick:  [1,0,0,0,  0,0,1,0,  0,0,1,0,  0,1,0,0],
    pSnare:[0,0,0,0.8, 0,0,0,0,  0,0,0,0.8, 0,0,0,0],
    pHat:  [0.9,0,0.5,0, 0.8,0,0.5,0, 0.9,0,0.5,0, 0.8,0,0.5,0],
    pBass: [0.8,0,0,0,  0,0,0.6,0,  0.7,0,0,0,  0,0.6,0,0],
  },
  {
    name: "Goa",
    bpm: 148,
    swing: 0.02,
    dist: 0.4,
    kick808: 0.2,
    kick909: 0.8,
    pKick:  [1,0,1,0,  1,0,1,0,  1,0,1,0,  1,0,1,0], // 16分4つ打ち寄り
    pSnare:[0,0,0,0,  0,0,0,0,  0,0,0,0,  0,0,0,0],
    pHat:  [1,0,1,0,  1,0,1,0,  1,0,1,0,  1,0,1,0],
    pBass: [0.8,0,0.6,0,  0.8,0,0.6,0,  0.8,0,0.6,0,  0.8,0,0.6,0],
  },
  {
    name: "HardTechno",
    bpm: 165,
    swing: 0.0,
    dist: 0.85,
    kick808: 0.0,
    kick909: 1.0,
    pKick:  [1,0,1,0,  1,0,1,0,  1,0,1,0,  1,0,1,0],
    pSnare:[0,0,0,0.7, 0,0,0,0,  0,0,0,0.7, 0,0,0,0],
    pHat:  [1,0.8,1,0.8,  1,0.8,1,0.8,  1,0.8,1,0.8,  1,0.8,1,0.8],
    pBass: [0.9,0,0.8,0,  0.9,0,0.8,0,  0.9,0,0.8,0,  0.9,0,0.8,0],
  },
];

// Blended params
const EngineParams = {
  bpm: 86,
  swing: 0,
  restProb: 0.2,
  kick808Mix: 0,
  kick909Mix: 0,
  pKick:  new Array(16).fill(0),
  pSnare: new Array(16).fill(0),
  pHat:   new Array(16).fill(0),
  pBass:  new Array(16).fill(0),
};

// ======================================================
// Style blending
// ======================================================

function computeStyleBlend() {
  const s = State.style / 100; // 0–1
  const seg = 1 / 3;

  let iA, iB, t;
  if (s <= seg) {
    iA = 0; iB = 1;
    t = s / seg;
  } else if (s <= 2 * seg) {
    iA = 1; iB = 2;
    t = (s - seg) / seg;
  } else {
    iA = 2; iB = 3;
    t = (s - 2 * seg) / seg;
  }

  const A = ARCH[iA];
  const B = ARCH[iB];

  EngineParams.bpm = lerp(A.bpm, B.bpm, t);
  EngineParams.swing = lerp(A.swing, B.swing, t);

  const voidRest = mapValue(State.voidAmt, 0, 100, 0.05, 0.55);
  EngineParams.restProb = voidRest;

  EngineParams.kick808Mix = lerp(A.kick808, B.kick808, t);
  EngineParams.kick909Mix = lerp(A.kick909, B.kick909, t);

  for (let i = 0; i < 16; i++) {
    EngineParams.pKick[i]  = lerp(A.pKick[i],  B.pKick[i],  t);
    EngineParams.pSnare[i] = lerp(A.pSnare[i], B.pSnare[i], t);
    EngineParams.pHat[i]   = lerp(A.pHat[i],   B.pHat[i],   t);
    EngineParams.pBass[i]  = lerp(A.pBass[i],  B.pBass[i],  t);
  }

  // Distortion / Reverb など
  const baseDist = lerp(A.dist, B.dist, t);
  const energyBoost = mapValue(State.energy, 0, 100, 0, 0.2);
  const distVal = Math.min(1, baseDist + energyBoost);
  drumDist.distortion = distVal;
  drumDist.wet.rampTo(distVal > 0.05 ? 0.9 : 0.1, 0.4);

  // Creation → reverb wet
  const padWet = mapValue(State.creation, 0, 100, 0.2, 0.75);
  reverb.wet.rampTo(padWet, 0.5);

  // Swing
  Tone.Transport.swing = EngineParams.swing;
  Tone.Transport.swingSubdivision = "8n";

  // BPM に Energy を微調整反映
  let bpmFinal = EngineParams.bpm + mapValue(State.energy, 0, 100, -5, +8);
  bpmFinal = Math.max(50, Math.min(185, bpmFinal));
  Tone.Transport.bpm.rampTo(bpmFinal, 0.3);
  EngineParams.bpm = bpmFinal;

  // UI表示
  const styleLabel = document.getElementById("style-label");
  const bpmLabel   = document.getElementById("bpm-label");
  if (styleLabel) styleLabel.textContent = "Style: " + styleNameFromS(s);
  if (bpmLabel)   bpmLabel.textContent   = `Tempo: ${Math.round(bpmFinal)} BPM`;
}

function styleNameFromS(s) {
  if (s < 0.2) return "Ambient";
  if (s < 0.5) return "Lo-Fi";
  if (s < 0.8) return "Goa-ish";
  return "HardTechno-ish";
}

// ======================================================
// Sequencer
// ======================================================

let stepIndex = 0;

const beatLoop = new Tone.Loop((time) => {
  const step = stepIndex % 16;

  if (!rand(EngineParams.restProb)) {
    // Kick
    if (rand(EngineParams.pKick[step])) {
      triggerKick(time);
    }
    // Snare
    if (rand(EngineParams.pSnare[step])) {
      triggerSnare(time);
    }
    // Hat
    if (rand(EngineParams.pHat[step])) {
      triggerHat(time);
    }
    // Bass
    if (rand(EngineParams.pBass[step])) {
      triggerBass(time);
    }
  }

  stepIndex++;
}, "16n");

// 2小節ごとにコード（シンプルにAmbient/Lo-Fi寄りだけ）
const chordsAmbient = [
  ["C4","E4","G4"],
  ["A3","D4","G4"],
];
const chordsLofi = [
  ["F3","A3","C4","E4"],
  ["D3","G3","C4","E4"],
];

const chordLoop = new Tone.Loop((time) => {
  if (rand(EngineParams.restProb + 0.1)) return;

  // Style 0〜0.5 → Ambient/Lo-Fi、0.5〜 → 簡易的な2和音
  const s = State.style / 100;
  let chord;
  if (s < 0.5) {
    const pool = chordsAmbient.concat(chordsLofi);
    chord = pool[Math.floor(Math.random() * pool.length)];
  } else {
    chord = s < 0.8 ? ["C4","G4"] : ["G3","D4"];
  }

  const dur = s < 0.5 ? "2m" : "1m";
  padSynth.triggerAttackRelease(chord, dur, time);
}, "2m");

// ------------------------------------------------------
// Trigger functions
// ------------------------------------------------------

function triggerKick(time) {
  const s = State.style / 100;
  const pitch = s > 0.66 ? "C1" : "C2";
  kickSynth.triggerAttackRelease(pitch, "8n", time);

  const total = EngineParams.kick808Mix + EngineParams.kick909Mix + 1e-6;
  const p808 = EngineParams.kick808Mix / total;
  const p909 = EngineParams.kick909Mix / total;

  if (rand(p808)) safePlay("kick808", time);
  if (rand(p909)) safePlay("kick909", time);
}

function triggerSnare(time) {
  const total = EngineParams.kick808Mix + EngineParams.kick909Mix + 1e-6;
  const p808 = EngineParams.kick808Mix / total;
  const p909 = EngineParams.kick909Mix / total;

  if (rand(p808)) safePlay("snare808", time);
  if (rand(p909)) safePlay("snare909", time);
  else hatNoise.triggerAttackRelease("16n", time + 0.01);
}

function triggerHat(time) {
  const total = EngineParams.kick808Mix + EngineParams.kick909Mix + 1e-6;
  const p808 = EngineParams.kick808Mix / total;
  const p909 = EngineParams.kick909Mix / total;

  if (rand(p808)) safePlay("hat808", time);
  if (rand(p909)) safePlay("hat909", time);
  else hatNoise.triggerAttackRelease("16n", time);
}

function triggerBass(time) {
  const s = State.style / 100;
  let root = "C2";
  if (s < 0.25) root = "F1";
  else if (s < 0.5) root = "A1";
  else if (s < 0.75) root = "C2";
  else root = "G1";

  bassSynth.triggerAttackRelease(root, "8n", time);
}

// ======================================================
// UI 連携
// ======================================================

function updateFromUI() {
  const style = document.getElementById("fader_style");
  const energy = document.getElementById("fader_energy");
  const creation = document.getElementById("fader_creation");
  const voidS = document.getElementById("fader_void");

  if (style)   State.style    = parseInt(style.value, 10);
  if (energy)  State.energy   = parseInt(energy.value, 10);
  if (creation)State.creation = parseInt(creation.value, 10);
  if (voidS)   State.voidAmt  = parseInt(voidS.value, 10);

  computeStyleBlend();
}

function attachUI() {
  const style = document.getElementById("fader_style");
  const energy = document.getElementById("fader_energy");
  const creation = document.getElementById("fader_creation");
  const voidS = document.getElementById("fader_void");
  const btnStart = document.getElementById("btn_start");
  const btnStop = document.getElementById("btn_stop");
  const status = document.getElementById("status-text");

  const onChange = () => updateFromUI();

  if (style)   style.addEventListener("input", onChange);
  if (energy)  energy.addEventListener("input", onChange);
  if (creation)creation.addEventListener("input", onChange);
  if (voidS)   voidS.addEventListener("input", onChange);

  if (btnStart) {
    btnStart.onclick = async () => {
      if (!audioStarted) {
        await Tone.start();
        audioStarted = true;
      }
      if (!isRunning) {
        updateFromUI();
        beatLoop.start(0);
        chordLoop.start("1m");
        Tone.Transport.start();
        isRunning = true;
        if (status) status.textContent = "Playing…";
      }
    };
  }

  if (btnStop) {
    btnStop.onclick = () => {
      if (!isRunning) return;
      Tone.Transport.stop();
      isRunning = false;
      if (status) status.textContent = "Stopped";
    };
  }
}

// ======================================================
// INIT
// ======================================================

window.addEventListener("DOMContentLoaded", () => {
  attachUI();
  updateFromUI();
  console.log("UCM Mandala Engine – Style Blend Ready");
});