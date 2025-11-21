// ======================================================
// UCM Mandala Engine – Lo-Fi / Nujabes / Goa / HardTechno
// ======================================================

let isRunning = false;

const State = {
  mode: "ambient",
  energy: 40,
  creation: 50,
  voidAmt: 20,
};

// ------------------------------------------------------
//  Tone.js Audio Graph
// ------------------------------------------------------

// マスター
const masterGain = new Tone.Gain(0.9).toDestination();

// ドラム用ディストーション（HardTechno / Goa で強め）
const drumDist = new Tone.Distortion({
  distortion: 0.0,
  oversample: "4x",
});
drumDist.wet.value = 0.0;
drumDist.connect(masterGain);

// ドラムバス
const drumBus = new Tone.Gain(1).connect(drumDist);

// アンビエンス
const reverb = new Tone.Reverb({
  decay: 4,
  preDelay: 0.03,
  wet: 0.3,
}).connect(masterGain);

const delay = new Tone.FeedbackDelay("8n", 0.25).connect(masterGain);

// シンセ群
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

const leadSynth = new Tone.FMSynth({
  modulationIndex: 6,
  harmonicity: 2,
  envelope: { attack: 0.02, decay: 0.3, sustain: 0.2, release: 0.8 },
}).connect(delay);

// 909/808 ぽいキック（シンセ）
const kickSynth = new Tone.MembraneSynth({
  pitchDecay: 0.02,
  octaves: 4,
  oscillator: { type: "sine" },
  envelope: { attack: 0.001, decay: 0.4, sustain: 0.0, release: 0.2 },
}).connect(drumBus);

// ハット用ノイズ
const hatNoise = new Tone.NoiseSynth({
  noise: { type: "white" },
  envelope: { attack: 0.001, decay: 0.06, sustain: 0 },
}).connect(drumBus);

// 外部サンプル 808 / 909（存在しなくても動作する想定）
const drumSamples = new Tone.Players(
  {
    kick808: "samples/kick_808.wav",
    snare808: "samples/snare_808.wav",
    hat808: "samples/hihat_808.wav",
    kick909: "samples/kick_909.wav",
    snare909: "samples/snare_909.wav",
    hat909: "samples/hihat_909.wav",
  },
  () => {
    console.log("Drum samples loaded (if files exist).");
  }
).connect(drumBus);

// ------------------------------------------------------
//  モードごとの設定
// ------------------------------------------------------

const MODE_CONFIG = {
  ambient: {
    baseBpm: 86,
    swing: 0,
    use808: false,
    use909: false,
    // 16 step pattern
    patterns: {
      kick: "x...............",
      snare: "................",
      hat: "...x....x....x..",
      bass: "x...............",
    },
    chords: [
      ["C4", "E4", "G4"],
      ["A3", "D4", "G4"],
    ],
  },

  lofi: {
    baseBpm: 78,
    swing: 0.25,
    use808: true,
    use909: false,
    patterns: {
      kick: "x.......x...x...",
      snare: "....x.......x...",
      hat: "x.x.x.x.x.x.x.x.",
      bass: "x.......x.......",
    },
    chords: [
      ["F3", "A3", "C4", "E4"],
      ["D3", "G3", "C4", "E4"],
    ],
  },

  nujabes: {
    baseBpm: 96,
    swing: 0.35,
    use808: true,
    use909: false,
    patterns: {
      kick: "x...x...x...x...",
      snare: "....x.......x...",
      hat: "x.x.x.x.x.x.x.x.",
      bass: "x...x...x...x...",
    },
    chords: [
      ["A3", "C4", "E4", "G4"], // Am7
      ["D3", "F3", "A3", "C4"], // Dm7
      ["G3", "B3", "D4", "F4"], // G7
      ["C3", "E3", "G3", "B3"], // Cmaj7
    ],
  },

  goa: {
    baseBpm: 148,
    swing: 0.02,
    use808: false,
    use909: true,
    patterns: {
      kick: "x.x.x.x.x.x.x.x.",
      snare: "................",
      hat: "x.x.x.x.x.x.x.x.",
      bass: "x.x.x.x.x.x.x.x.",
    },
    chords: [
      ["C4", "G4"],
      ["D4", "A4"],
    ],
  },

  hardtechno: {
    baseBpm: 160,
    swing: 0,
    use808: false,
    use909: true,
    patterns: {
      kick: "x.x.x.x.x.x.x.x.",
      snare: "....x.......x...",
      hat: "x.x.x.x.x.x.x.x.",
      bass: "x...x...x...x...",
    },
    chords: [
      ["F3", "G#3"],
      ["G3", "A#3"],
    ],
  },
};

// ------------------------------------------------------
//  Helper
// ------------------------------------------------------

function mapValue(x, inMin, inMax, outMin, outMax) {
  if (inMax === inMin) return outMin;
  const t = (x - inMin) / (inMax - inMin);
  return outMin + t * (outMax - outMin);
}

function rand(prob) {
  return Math.random() < prob;
}

function hitAt(pattern, step) {
  const ch = pattern[step % pattern.length];
  return ch === "x" || ch === "o" || ch === "X";
}

// ------------------------------------------------------
//  UCM → サウンドパラメータ
// ------------------------------------------------------

function applyStateToEngine() {
  const cfg = MODE_CONFIG[State.mode];
  if (!cfg) return;

  // BPM：ベース＋Energy微調整
  let bpm = cfg.baseBpm + mapValue(State.energy, 0, 100, -6, +8);
  bpm = Math.max(50, Math.min(180, bpm));
  Tone.Transport.bpm.rampTo(bpm, 0.3);

  // Swing（Lo-Fi/Nujabes）
  Tone.Transport.swing = cfg.swing;
  Tone.Transport.swingSubdivision = "8n";

  // Void（余白）→ 休符率
  const restProb = mapValue(State.voidAmt, 0, 100, 0.05, 0.55);

  EngineParams.restProb = restProb;

  // Creation → Pad/Lead量
  const padWet = mapValue(State.creation, 0, 100, 0.2, 0.7);
  reverb.wet.rampTo(padWet, 0.5);

  // Distortion：Goa/HardTechno で強め
  let baseDist = 0;
  if (State.mode === "goa") baseDist = 0.3;
  if (State.mode === "hardtechno") baseDist = 0.6;

  const extra = mapValue(State.energy, 0, 100, 0, 0.25);
  drumDist.distortion = baseDist + extra;
  drumDist.wet.rampTo(baseDist > 0 ? 0.85 : 0.1, 0.4);

  // UI
  const bpmLabel = document.getElementById("bpm-label");
  const modeLabel = document.getElementById("mode-label");
  if (bpmLabel) bpmLabel.textContent = `Tempo: ${Math.round(bpm)} BPM`;
  if (modeLabel) modeLabel.textContent = `Mode: ${State.mode}`;
}

// 内部共有パラメータ
const EngineParams = {
  restProb: 0.2,
};

// ------------------------------------------------------
//  シーケンサ
// ------------------------------------------------------

let stepIndex = 0;

// 16分ステップ：ドラム＋ベース
const beatLoop = new Tone.Loop((time) => {
  const cfg = MODE_CONFIG[State.mode];
  if (!cfg) return;

  const step = stepIndex % 16;

  if (!rand(EngineParams.restProb)) {
    // Kick
    if (hitAt(cfg.patterns.kick, step)) {
      triggerKick(time, cfg);
    }

    // Snare
    if (cfg.patterns.snare && hitAt(cfg.patterns.snare, step)) {
      triggerSnare(time, cfg);
    }

    // Hat
    if (cfg.patterns.hat && hitAt(cfg.patterns.hat, step)) {
      triggerHat(time, cfg);
    }

    // Bass
    if (cfg.patterns.bass && hitAt(cfg.patterns.bass, step)) {
      triggerBass(time, cfg);
    }
  }

  stepIndex++;
}, "16n");

// 2分ごとのコードチェンジ
const chordLoop = new Tone.Loop((time) => {
  const cfg = MODE_CONFIG[State.mode];
  if (!cfg || !cfg.chords) return;
  if (rand(EngineParams.restProb + 0.1)) return;

  const idx = Math.floor(Math.random() * cfg.chords.length);
  const chord = cfg.chords[idx];
  const dur = (State.mode === "goa" || State.mode === "hardtechno") ? "1m" : "2m";

  padSynth.triggerAttackRelease(chord, dur, time);
}, "2m");

// リード（たまに鳴る）
const leadLoop = new Tone.Loop((time) => {
  if (State.mode === "ambient") return;
  if (!rand(mapValue(State.creation, 0, 100, 0.05, 0.35))) return;

  const scale = ["A3", "C4", "D4", "E4", "G4", "A4"];
  const note = scale[Math.floor(Math.random() * scale.length)];
  leadSynth.triggerAttackRelease(note, "8n", time);
}, "8n");

// ------------------------------------------------------
//  トリガー関数
// ------------------------------------------------------

function triggerKick(time, cfg) {
  // シンセキック
  const pitch = (State.mode === "goa" || State.mode === "hardtechno") ? "C1" : "C2";
  kickSynth.triggerAttackRelease(pitch, "8n", time);

  // サンプルレイヤー
  if (cfg.use808) {
    safePlay("kick808", time);
  } else if (cfg.use909) {
    safePlay("kick909", time);
  }
}

function triggerSnare(time, cfg) {
  if (cfg.use808) safePlay("snare808", time);
  else if (cfg.use909) safePlay("snare909", time);
  else {
    // ambient 用の軽いスネア代替
    hatNoise.triggerAttackRelease("16n", time);
  }
}

function triggerHat(time, cfg) {
  if (cfg.use808) safePlay("hat808", time);
  else if (cfg.use909) safePlay("hat909", time);
  else {
    hatNoise.triggerAttackRelease("16n", time);
  }
}

function triggerBass(time, cfg) {
  let root = "C2";
  if (State.mode === "nujabes") root = "A1";
  if (State.mode === "lofi") root = "F1";
  if (State.mode === "goa") root = "C2";
  if (State.mode === "hardtechno") root = "G1";

  bassSynth.triggerAttackRelease(root, "8n", time);
}

function safePlay(name, time) {
  try {
    const p = drumSamples.player(name);
    if (p) p.start(time);
  } catch (e) {
    // サンプル無くても落ちないようにする
  }
}

// ------------------------------------------------------
//  UI 連携
// ------------------------------------------------------

function updateFromUI() {
  const modeSel = document.getElementById("mode-select");
  const energy = document.getElementById("fader_energy");
  const creation = document.getElementById("fader_creation");
  const voidS = document.getElementById("fader_void");

  if (modeSel) State.mode = modeSel.value;
  if (energy) State.energy = parseInt(energy.value, 10);
  if (creation) State.creation = parseInt(creation.value, 10);
  if (voidS) State.voidAmt = parseInt(voidS.value, 10);

  applyStateToEngine();
}

function attachUI() {
  const modeSel = document.getElementById("mode-select");
  const energy = document.getElementById("fader_energy");
  const creation = document.getElementById("fader_creation");
  const voidS = document.getElementById("fader_void");
  const btnStart = document.getElementById("btn_start");
  const btnStop = document.getElementById("btn_stop");
  const status = document.getElementById("status-text");

  const onChange = () => updateFromUI();

  if (modeSel) modeSel.addEventListener("change", onChange);
  if (energy) energy.addEventListener("input", onChange);
  if (creation) creation.addEventListener("input", onChange);
  if (voidS) voidS.addEventListener("input", onChange);

  if (btnStart) {
    btnStart.onclick = async () => {
      if (isRunning) return;
      await Tone.start();

      updateFromUI();

      beatLoop.start(0);
      chordLoop.start("1m");
      leadLoop.start("2n");

      Tone.Transport.start();

      isRunning = true;
      if (status) status.textContent = "Playing…";
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

// ------------------------------------------------------
//  INIT
// ------------------------------------------------------

window.addEventListener("DOMContentLoaded", () => {
  attachUI();
  updateFromUI();
  console.log("UCM Mandala Engine – Rave/Lo-Fi Edition Ready");
});