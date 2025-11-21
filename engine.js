/* =========================================================
   UCM Mandala Engine – Lite
   Tone.js 自動生成 + Canvas 幾何曼荼羅（超軽量）
   フェーダー：Energy / Creation / Void
========================================================= */

/* --------------------
   UCM 状態
-------------------- */

const UCM = {
  energy:   40, // 静 ⇄ 動
  creation: 50, // 生成の派手さ
  void:     20, // 余白量
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
   Tone.js – 軽量音源エンジン
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

// 楽器：Kick / Hat / Bass / Pad
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

/* 音楽パラメータ */

const EngineParams = {
  bpm: 80,
  stepCount: 8,
  restProb: 0.2,
  kickProb: 0.7,
  hatProb: 0.7,
  bassProb: 0.4,
  padProb: 0.4,
  bassRoot: "C2",
  scale: ["C4","D4","E4","G4","A4"],
};

const patterns = {
  kick: "x...x...",
  hat:  "x.x.x.x.",
  bass: "x...x..x",
  pad:  "x...x...",
};

let stepIndex = 0;

function applyUCMToSound() {
  // BPM（Energy）
  EngineParams.bpm = Math.round(mapValue(UCM.energy, 0, 100, 55, 130));
  Tone.Transport.bpm.rampTo(EngineParams.bpm, 0.25);

  // 休符（Void）
  EngineParams.restProb = mapValue(UCM.void, 0, 100, 0.05, 0.6);

  // 密度（Energy）
  EngineParams.kickProb = mapValue(UCM.energy, 0, 100, 0.3, 0.95);
  EngineParams.hatProb  = mapValue(UCM.energy, 0, 100, 0.2, 0.9);

  // Bass / Pad（Creation と Void の兼ね合い）
  EngineParams.bassProb = mapValue(UCM.creation, 0, 100, 0.2, 0.7);
  EngineParams.padProb  = mapValue(100 - UCM.void, 0, 100, 0.2, 0.85);

  // Reverb/Delay量（Creation）
  const rv = mapValue(UCM.creation, 0, 100, 0.2, 0.5);
  const dl = mapValue(UCM.creation, 0, 100, 0.05, 0.35);
  reverb.wet.rampTo(rv, 1.0);
  delay.wet.rampTo(dl, 1.0);

  // Padカットオフ（Void少ない→開く）
  const cutoff = mapValue(UCM.void, 0, 100, 4000, 800);
  padFilter.frequency.rampTo(cutoff, 1.0);

  // スケール（Creation高いとテンション入り）
  const base = ["C4","D4","E4","G4","A4"];
  const tens = ["B3","B4","D5","F5"];
  EngineParams.scale = (UCM.creation > 60) ? base.concat(tens) : base;

  // ルート音（Energyざっくりで変化）
  if (UCM.energy < 33)      EngineParams.bassRoot = "F1";
  else if (UCM.energy < 66) EngineParams.bassRoot = "C2";
  else                      EngineParams.bassRoot = "D2";

  // UI BPM表示
  const bpmLabel = document.getElementById("bpm-label");
  if (bpmLabel) bpmLabel.textContent = `Tempo: ${EngineParams.bpm} BPM`;
}

/* ステップ処理 */

function patternAt(pattern, step) {
  const ch = pattern[step % pattern.length];
  return ch === "x" || ch === "o" || ch === "X";
}

function randomNoteFromScale() {
  const arr = EngineParams.scale;
  return arr[Math.floor(Math.random() * arr.length)];
}

function scheduleStep(time) {
  const step = stepIndex % EngineParams.stepCount;

  // 休符
  if (!rand(EngineParams.restProb)) {
    // Kick
    if (patternAt(patterns.kick, step) && rand(EngineParams.kickProb)) {
      kick.triggerAttackRelease("C2", "8n", time);
      kickPulse = 1.0;  // Canvas用
    }

    // Hat
    if (patternAt(patterns.hat, step) && rand(EngineParams.hatProb)) {
      hat.triggerAttackRelease("32n", time);
    }

    // Bass
    if (patternAt(patterns.bass, step) && rand(EngineParams.bassProb)) {
      bass.triggerAttackRelease(EngineParams.bassRoot, "8n", time);
    }

    // Pad（ゆっくり）
    if (patternAt(patterns.pad, step) && rand(EngineParams.padProb)) {
      const note = randomNoteFromScale();
      const dur  = (UCM.energy < 30) ? "2n" : "4n";
      pad.triggerAttackRelease(note, dur, time);
      padGlow = 1.0;    // Canvas用
    }
  }

  stepIndex++;
}

/* =========================================================
   Canvas 幾何曼荼羅 – 超軽量 Aタイプ
========================================================= */

let canvas, ctx;
let width = 0, height = 0;
let angle = 0;

// 音との同期用パラメータ
let kickPulse = 0;
let padGlow   = 0;

function initCanvas() {
  canvas = document.getElementById("mandalaCanvas");
  if (!canvas) return;
  ctx = canvas.getContext("2d");
  onResize();
  window.addEventListener("resize", onResize);
  requestAnimationFrame(drawLoop);
}

function onResize() {
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  canvas.width  = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  width = window.innerWidth;
  height = window.innerHeight;
}

function drawLoop() {
  if (!ctx) return;

  const energy   = UCM.energy;
  const creation = UCM.creation;
  const voidVal  = UCM.void;

  // 回転速度（Energy）
  const rotSpeed = mapValue(energy, 0, 100, 0.0005, 0.01);
  angle += rotSpeed * 16.7; // おおよそ1フレーム分

  // 背景塗りつぶし
  ctx.clearRect(0, 0, width, height);
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) * 0.45;

  const grd = ctx.createRadialGradient(
    cx, cy, 0,
    cx, cy, radius * 1.1
  );
  const voidDark = mapValue(voidVal, 0, 100, 0.2, 0.75);
  grd.addColorStop(0, "rgba(20, 60, 130, 0.9)");
  grd.addColorStop(1, `rgba(4, 14, 24, ${voidDark})`);

  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.translate(cx, cy);

  // 外円（幾何）
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

  // Kickパルスリング
  const kp = kickPulse;
  if (kp > 0.01) {
    ctx.strokeStyle = `rgba(160, 220, 255, ${kp})`;
    ctx.beginPath();
    ctx.arc(0, 0, radius * (0.6 + kp * 0.3), 0, Math.PI * 2);
    ctx.stroke();
  }

  // 放射状ライン（幾何）
  const baseLines = 24;
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

  // 小さな点群（Creationが高いほど増える）
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
  console.log("UCM Mandala Engine Lite ready");
});