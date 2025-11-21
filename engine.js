/* =========================================================
   UCM Mandala Engine – Genre Blend Lite
   - Tone.js 自動生成
   - Canvas 幾何曼荼羅（超軽量）
   - フェーダー：Energy / Creation / Void
   - Energy でジャンル連続ブレンド：
     Deep Ambient → Ambient → Lo-Fi → Jazz → Dub → Techno → Rave
========================================================= */

/* --------------------
   UCM 状態
-------------------- */

const UCM = {
  energy:   40, // 静 ⇄ 動（ジャンル軸）
  creation: 50, // 派手さ・倍音・テンション
  void:     20, // 余白・休符
};

let initialized = false;
let isPlaying   = false;

/* =========================================================
   ヘルパー
========================================================= */

function getSliderValue(id, fallback = 50) {
  const el = document.getElementById(id);
  if (!el) return fallback;
  return parseInt(el.value, 10);
}

function mapValue(x, inMin, inMax, outMin, outMax) {
  if (inMax === inMin) return outMin;
  const t = (x - inMin) / (inMax - inMin);
  return outMin + t * (outMax - outMin);
}

function rand(prob) {
  return Math.random() < prob;
}

/* =========================================================
   Tone.js – 音源エンジン
========================================================= */

const masterLimiter = new Tone.Limiter(-1).toDestination();
const masterGain    = new Tone.Gain(0.8).connect(masterLimiter);

const reverb = new Tone.Reverb({
  decay: 5,
  wet: 0.3,
}).connect(masterGain);

const delay = new Tone.PingPongDelay({
  delayTime: "8n",
  feedback: 0.3,
  wet: 0.2,
}).connect(masterGain);

// バス
const drumBus = new Tone.Gain(0.9).connect(reverb);
const bassBus = new Tone.Gain(0.8).connect(delay);
const padBus  = new Tone.Gain(0.9).connect(reverb);

// 楽器
const kick = new Tone.MembraneSynth({
  pitchDecay: 0.03,
  octaves: 5,
  oscillator: { type: "sine" },
  envelope: { attack: 0.001, decay: 0.35, sustain: 0 }
}).connect(drumBus);

const hat = new Tone.MetalSynth({
  frequency: 300,
  envelope: { attack: 0.001, decay: 0.05, release: 0.02 },
  harmonicity: 5,
  modulationIndex: 28,
  resonance: 2500
}).connect(drumBus);

const bass = new Tone.MonoSynth({
  oscillator: { type: "square" },
  filter: { type: "lowpass", Q: 1 },
  filterEnvelope: {
    attack: 0.01, decay: 0.2, sustain: 0.1, release: 0.3,
    baseFrequency: 80, octaves: 2
  },
  envelope: { attack: 0.005, decay: 0.25, sustain: 0.3, release: 0.4 }
}).connect(bassBus);

const padFilter = new Tone.Filter(1000, "lowpass").connect(padBus);
const pad = new Tone.PolySynth(Tone.Synth, {
  oscillator: { type: "triangle" },
  envelope: { attack: 1.2, decay: 0.7, sustain: 0.7, release: 3.5 }
}).connect(padFilter);

// Jazz / Lo-Fi 用のリード
const lead = new Tone.FMSynth({
  modulationIndex: 6,
  harmonicity: 2,
  envelope: { attack: 0.02, decay: 0.3, sustain: 0.3, release: 0.8 }
}).connect(delay);

/* パラメータ */

const EngineParams = {
  bpm: 90,
  stepCount: 8,
  restProb: 0.2,
  kickProb: 0.7,
  hatProb: 0.7,
  bassProb: 0.4,
  padProb: 0.4,
  leadProb: 0.2,
  bassRoot: "C2",
  scale: ["C4","D4","E4","G4","A4"],
  mode: "Ambient",
};

let patterns = {
  kick: "x...x...",
  hat:  "x.x.x.x.",
  bass: "x...x..x",
  pad:  "x...x...",
  lead: ".x..x...",
};

let stepIndex = 0;

/* =========================================================
   Energy → モード判定
========================================================= */

function modeFromEnergy(e) {
  if (e < 15) return "Deep Ambient";
  if (e < 30) return "Ambient";
  if (e < 45) return "Lo-Fi";
  if (e < 60) return "Jazz";
  if (e < 75) return "Dub";
  if (e < 90) return "Techno";
  return "Rave";
}

/* =========================================================
   UCM → サウンドパラメータ
========================================================= */

function applyUCMToSound() {
  const e = UCM.energy;
  const c = UCM.creation;
  const v = UCM.void;

  EngineParams.mode = modeFromEnergy(e);

  // BPM 帯
  let bpm;
  switch (EngineParams.mode) {
    case "Deep Ambient": {
      const t = e / 15;
      bpm = 48 + t * 10;  // 48–58
      break;
    }
    case "Ambient": {
      const t = (e - 15) / 15;
      bpm = 60 + t * 10;  // 60–70
      break;
    }
    case "Lo-Fi": {
      const t = (e - 30) / 15;
      bpm = 70 + t * 10;  // 70–80
      break;
    }
    case "Jazz": {
      const t = (e - 45) / 15;
      bpm = 80 + t * 20;  // 80–100
      break;
    }
    case "Dub": {
      const t = (e - 60) / 15;
      bpm = 100 + t * 15; // 100–115
      break;
    }
    case "Techno": {
      const t = (e - 75) / 15;
      bpm = 118 + t * 10; // 118–128
      break;
    }
    case "Rave":
    default: {
      const t = Math.min(1, (e - 90) / 10);
      bpm = 130 + t * 15; // 130–145
      break;
    }
  }
  EngineParams.bpm = Math.round(bpm);
  Tone.Transport.bpm.rampTo(EngineParams.bpm, 0.25);

  // 休符（Void）
  EngineParams.restProb = mapValue(v, 0, 100, 0.05, 0.65);

  // ドラム密度（モードでスケーリング）
  let baseKick = mapValue(e, 0, 100, 0.2, 0.95);
  let baseHat  = mapValue(e, 0, 100, 0.2, 0.95);

  switch (EngineParams.mode) {
    case "Deep Ambient":
      baseKick *= 0.1;
      baseHat  *= 0.2;
      break;
    case "Ambient":
      baseKick *= 0.3;
      baseHat  *= 0.4;
      break;
    case "Lo-Fi":
      baseKick *= 0.6;
      baseHat  *= 0.7;
      break;
    case "Jazz":
      baseKick *= 0.4;
      baseHat  *= 0.5;
      break;
    case "Dub":
      baseKick *= 0.8;
      baseHat  *= 0.7;
      break;
    case "Techno":
      baseKick = Math.max(0.9, baseKick);
      baseHat  = Math.max(0.8, baseHat);
      break;
    case "Rave":
      baseKick = 1.0;
      baseHat  = 1.0;
      break;
  }

  EngineParams.kickProb = baseKick;
  EngineParams.hatProb  = baseHat;

  // Bass / Pad / Lead 密度
  EngineParams.bassProb = mapValue(c, 0, 100, 0.2, 0.8);
  EngineParams.padProb  = mapValue(100 - v, 0, 100, 0.2, 0.9);
  EngineParams.leadProb = mapValue(c, 0, 100, 0.1, 0.7);

  // リバーブ / ディレイ
  let baseRv = mapValue(c, 0, 100, 0.2, 0.5);
  let baseDl = mapValue(c, 0, 100, 0.05, 0.35);

  if (EngineParams.mode === "Deep Ambient" || EngineParams.mode === "Ambient") {
    baseRv += 0.15;
  }
  if (EngineParams.mode === "Dub") {
    baseDl += 0.1;
  }
  if (EngineParams.mode === "Rave") {
    baseRv *= 0.5;
    baseDl *= 1.1;
  }

  reverb.wet.rampTo(Math.min(baseRv, 0.75), 1.0);
  delay.wet.rampTo(Math.min(baseDl, 0.5), 1.0);

  // Pad カットオフ（Void多→閉じる）
  const cutoff = mapValue(v, 0, 100, 4000, 800);
  padFilter.frequency.rampTo(cutoff, 1.0);

  // スケール（Creation 高→テンション追加）
  const baseScale = ["C4","D4","E4","G4","A4"];
  const tensions  = ["B3","B4","D5","F5"];
  EngineParams.scale = (c > 60) ? baseScale.concat(tensions) : baseScale;

  // ルート音
  switch (EngineParams.mode) {
    case "Deep Ambient":
    case "Ambient":
      EngineParams.bassRoot = "F1";
      break;
    case "Lo-Fi":
      EngineParams.bassRoot = "A1";
      break;
    case "Jazz":
      EngineParams.bassRoot = "D2";
      break;
    case "Dub":
      EngineParams.bassRoot = "G1";
      break;
    case "Techno":
      EngineParams.bassRoot = "C2";
      break;
    case "Rave":
      EngineParams.bassRoot = "G2";
      break;
  }

  // パターン（8ステップ）
  switch (EngineParams.mode) {
    case "Deep Ambient":
      patterns = {
        kick: "x.......",
        hat:  "........",
        bass: "x.......",
        pad:  "x...x...",
        lead: "........",
      };
      break;
    case "Ambient":
      patterns = {
        kick: "x.......",
        hat:  "x.......",
        bass: "x.....x.",
        pad:  "x...x...",
        lead: "........",
      };
      break;
    case "Lo-Fi":
      patterns = {
        kick: "x...x..x",
        hat:  "x.x.x.x.",
        bass: "x...x...",
        pad:  "x...x...",
        lead: ".x..x...",
      };
      break;
    case "Jazz":
      patterns = {
        kick: "x.......",
        hat:  "x.x.x.x.",
        bass: "x...x...",
        pad:  "x...x...",
        lead: ".x.x.x..",
      };
      break;
    case "Dub":
      patterns = {
        kick: "x...x...",
        hat:  "x.x.x.x.",
        bass: "x..x..x.",
        pad:  "x...x...",
        lead: "..x...x.",
      };
      break;
    case "Techno":
      patterns = {
        kick: "x.x.x.x.",
        hat:  "x.x.x.x.",
        bass: "x..x..x.",
        pad:  "x...x...",
        lead: "..x.x...",
      };
      break;
    case "Rave":
    default:
      patterns = {
        kick: "x.x.x.x.",
        hat:  "xxxxxxxx",
        bass: "x.x.x.x.",
        pad:  "x.xx.x..",
        lead: ".x.x.x.x",
      };
      break;
  }

  // UI 更新
  const bpmLabel  = document.getElementById("bpm-label");
  const modeLabel = document.getElementById("mode-label");
  if (bpmLabel)  bpmLabel.textContent  = `Tempo: ${EngineParams.bpm} BPM`;
  if (modeLabel) modeLabel.textContent = `Mode: ${EngineParams.mode}`;
}

/* =========================================================
   ステップシーケンサ
========================================================= */

function patternAt(pattern, step) {
  const ch = pattern[step % pattern.length];
  return ch === "x" || ch === "o" || ch === "X";
}

function randomNoteFromScale() {
  const arr = EngineParams.scale;
  return arr[Math.floor(Math.random() * arr.length)];
}

let kickPulse = 0;
let padGlow   = 0;

function scheduleStep(time) {
  const step = stepIndex % EngineParams.stepCount;

  if (!rand(EngineParams.restProb)) {
    // Kick
    if (patternAt(patterns.kick, step) && rand(EngineParams.kickProb)) {
      kick.triggerAttackRelease("C2", "8n", time);
      kickPulse = 1.0;
    }

    // Hat
    if (patternAt(patterns.hat, step) && rand(EngineParams.hatProb)) {
      hat.triggerAttackRelease("32n", time);
    }

    // Bass
    if (patternAt(patterns.bass, step) && rand(EngineParams.bassProb)) {
      bass.triggerAttackRelease(EngineParams.bassRoot, "8n", time);
    }

    // Pad
    if (patternAt(patterns.pad, step) && rand(EngineParams.padProb)) {
      const note = randomNoteFromScale();
      const dur  = (UCM.energy < 30) ? "2n" : "4n";
      pad.triggerAttackRelease(note, dur, time);
      padGlow = 1.0;
    }

    // Lead（Lo-Fi / Jazz / Raveあたりで効く）
    if (patternAt(patterns.lead, step) && rand(EngineParams.leadProb)) {
      const note = randomNoteFromScale();
      lead.triggerAttackRelease(note, "8n", time);
    }
  }

  stepIndex++;
}

/* =========================================================
   Canvas 幾何曼荼羅
========================================================= */

let canvasEl = null;
let ctx = null;
let width = 0, height = 0;
let angle = 0;

function initCanvas() {
  canvasEl = document.getElementById("mandalaCanvas");
  if (!canvasEl) return;
  ctx = canvasEl.getContext("2d");
  onResize();
  window.addEventListener("resize", onResize);
  requestAnimationFrame(drawLoop);
}

function onResize() {
  if (!canvasEl) return;
  const dpr = window.devicePixelRatio || 1;
  canvasEl.width  = window.innerWidth * dpr;
  canvasEl.height = window.innerHeight * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  width = window.innerWidth;
  height = window.innerHeight;
}

function drawLoop() {
  if (!ctx) return;

  const energy   = UCM.energy;
  const creation = UCM.creation;
  const voidVal  = UCM.void;

  const rotSpeed = mapValue(energy, 0, 100, 0.0005, 0.01);
  angle += rotSpeed * 16.7;

  ctx.clearRect(0, 0, width, height);
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) * 0.45;

  // 背景
  const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 1.1);
  const voidDark = mapValue(voidVal, 0, 100, 0.2, 0.75);
  grd.addColorStop(0, "rgba(20, 60, 130, 0.9)");
  grd.addColorStop(1, `rgba(4, 14, 24, ${voidDark})`);
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.translate(cx, cy);

  // 外円
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = "rgba(140, 190, 255, 0.5)";
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.95, 0, Math.PI * 2);
  ctx.stroke();

  // 中円
  ctx.strokeStyle = "rgba(180, 215, 255, 0.7)";
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.55, 0, Math.PI * 2);
  ctx.stroke();

  // Kick パルスリング
  const kp = kickPulse;
  if (kp > 0.01) {
    ctx.strokeStyle = `rgba(160, 220, 255, ${kp})`;
    ctx.beginPath();
    ctx.arc(0, 0, radius * (0.6 + kp * 0.3), 0, Math.PI * 2);
    ctx.stroke();
  }

  // 放射状ライン
  const baseLines = 16;
  const extra = Math.round(mapValue(creation, 0, 100, 0, 16));
  const lines = baseLines + extra;
  ctx.save();
  ctx.rotate(angle);

  for (let i = 0; i < lines; i++) {
    const th = (Math.PI * 2 * i) / lines;
    const inner = radius * 0.15;
    const outer = radius * 0.9;
    ctx.beginPath();
    ctx.moveTo(inner * Math.cos(th), inner * Math.sin(th));
    ctx.lineTo(outer * Math.cos(th), outer * Math.sin(th));
    ctx.strokeStyle = `rgba(120, 180, 255, 0.28)`;
    ctx.stroke();
  }

  ctx.restore();

  // 点群
  const pointCount = Math.round(mapValue(creation, 0, 100, 12, 40));
  for (let i = 0; i < pointCount; i++) {
    const r = radius * (0.2 + Math.random() * 0.7);
    const th = Math.random() * Math.PI * 2;
    const x = r * Math.cos(th);
    const y = r * Math.sin(th);
    ctx.fillStyle = "rgba(190, 230, 255, 0.85)";
    ctx.fillRect(x - 1, y - 1, 2, 2);
  }

  // 中心コア（Pad Glow）
  const glow = 0.3 + padGlow * 0.7;
  const coreR = radius * 0.12;
  const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, coreR);
  coreGrad.addColorStop(0, `rgba(240, 248, 255, ${0.5 + glow * 0.5})`);
  coreGrad.addColorStop(1, "rgba(80, 140, 220, 0.0)");
  ctx.fillStyle = coreGrad;
  ctx.beginPath();
  ctx.arc(0, 0, coreR, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  // パルス減衰
  kickPulse *= 0.85;
  padGlow   *= 0.96;

  requestAnimationFrame(drawLoop);
}

/* =========================================================
   UI & イベント
========================================================= */

function updateFromUI() {
  UCM.energy   = getSliderValue("fader_energy",   UCM.energy);
  UCM.creation = getSliderValue("fader_creation", UCM.creation);
  UCM.void     = getSliderValue("fader_void",     UCM.void);
  applyUCMToSound();
}

function attachUI() {
  const energy   = document.getElementById("fader_energy");
  const creation = document.getElementById("fader_creation");
  const voidS    = document.getElementById("fader_void");
  const status   = document.getElementById("status-text");
  const btnStart = document.getElementById("btn_start");
  const btnStop  = document.getElementById("btn_stop");

  const onInput = () => updateFromUI();

  if (energy)   energy.addEventListener("input", onInput);
  if (creation) creation.addEventListener("input", onInput);
  if (voidS)    voidS.addEventListener("input", onInput);

  if (btnStart) {
    btnStart.onclick = async () => {
      if (!initialized) {
        await Tone.start();
        initialized = true;
        Tone.Transport.scheduleRepeat((time) => {
          scheduleStep(time);
        }, "8n");
      }
      updateFromUI();
      if (!isPlaying) {
        Tone.Transport.start();
        isPlaying = true;
        if (status) status.textContent = "Playing…";
      }
    };
  }

  if (btnStop) {
    btnStop.onclick = () => {
      Tone.Transport.stop();
      isPlaying = false;
      if (status) status.textContent = "Stopped";
    };
  }
}

/* =========================================================
   INIT
========================================================= */

window.addEventListener("DOMContentLoaded", () => {
  attachUI();
  applyUCMToSound();
  initCanvas();
  console.log("UCM Mandala Engine Genre Blend Lite ready");
});