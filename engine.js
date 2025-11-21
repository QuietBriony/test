/* ======================================================
   UCM Mandala Engine Lite — FULL WORKING VERSION
   ====================================================== */

let isPlaying = false;
let currentMode = "Ambient";

/* ───────────────────────────────────────────
   🎵 音源設定：Tone.js
──────────────────────────────────────────── */

const synthA = new Tone.PolySynth(Tone.Synth).toDestination();
const synthB = new Tone.MembraneSynth().toDestination();
const noise = new Tone.NoiseSynth({ type: "pink", volume: -18 }).toDestination();

/* Ambient 用ループ */
const ambientLoop = new Tone.Loop((time) => {
  synthA.triggerAttackRelease("C4", "2n", time);
  synthA.triggerAttackRelease("G4", "4n", time + 0.4);
}, "2n");

/* Techno 用ループ */
const technoKick = new Tone.Loop((time) => {
  synthB.triggerAttackRelease("C1", "8n", time);
}, "4n");

const technoHat = new Tone.Loop((time) => {
  noise.triggerAttackRelease("16n", time + 0.2);
}, "2n");

/* ───────────────────────────────────────────
   🎨 Canvas Mandala
──────────────────────────────────────────── */

const canvas = document.getElementById("mandalaCanvas");
const ctx = canvas.getContext("2d");

let t = 0;

function drawMandala() {
  const w = canvas.width;
  const h = canvas.height;

  ctx.clearRect(0, 0, w, h);

  // 背景グラデーション
  const g = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, Math.max(w,h));
  g.addColorStop(0, "#0b2440");
  g.addColorStop(1, "#040e18");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // 回転曼荼羅
  ctx.save();
  ctx.translate(w/2, h/2);
  ctx.rotate(t / 60);

  ctx.strokeStyle = "#8acbff55";
  for (let i = 0; i < 32; i++) {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, h * 0.35);
    ctx.rotate(Math.PI * 2 / 32);
    ctx.stroke();
  }

  ctx.restore();
  t++;

  requestAnimationFrame(drawMandala);
}

drawMandala();

/* ───────────────────────────────────────────
   🔧 Controls
──────────────────────────────────────────── */

document.getElementById("btn_start").onclick = async () => {
  if (isPlaying) return;

  await Tone.start();
  isPlaying = true;

  if (currentMode === "Ambient") {
    Tone.Transport.bpm.value = 90;
    ambientLoop.start();
    technoKick.stop();
    technoHat.stop();
  } else {
    Tone.Transport.bpm.value = 130;
    ambientLoop.stop();
    technoKick.start();
    technoHat.start();
  }

  Tone.Transport.start();
  document.getElementById("status-text").innerText = "Playing";
};

document.getElementById("btn_stop").onclick = () => {
  isPlaying = false;
  Tone.Transport.stop();
  ambientLoop.stop();
  technoKick.stop();
  technoHat.stop();

  document.getElementById("status-text").innerText = "Stopped";
};

/* モード切替：Energy フェーダーで自動 */
document.getElementById("fader_energy").addEventListener("input", (e) => {
  const v = Number(e.target.value);

  if (v < 50) {
    currentMode = "Ambient";
    document.getElementById("mode-label").innerText = "Mode: Ambient";
    document.getElementById("bpm-label").innerText = "Tempo: 90 BPM";
  } else {
    currentMode = "Techno";
    document.getElementById("mode-label").innerText = "Mode: Techno";
    document.getElementById("bpm-label").innerText = "Tempo: 130 BPM";
  }
});