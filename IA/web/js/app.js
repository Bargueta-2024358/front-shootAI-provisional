import {
  FilesetResolver,
  PoseLandmarker,
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/+esm";

import { geometryFeatures, normalizeLandmarks, toFeatureVector } from "./normalize.js";
import {
  blendNaturalidad,
  boostNaturalidad,
  lackOfRigidity,
  loadModel,
  predict,
  smoothProbs,
  snapCaptureScore,
  topClass,
  formatPct,
} from "./model.js";
import { proportionNaturalidadScore } from "./body-metrics.js";
import { assessBodyFrame, drawBodySkeleton, smoothLandmarks } from "./pose-utils.js";
import { buildTipContext, loadTips, resolveInsight } from "./tips-engine.js";
import {
  initVoice,
  setVoiceEnabled,
  speakCoachLine,
  stopSpeaking,
  isVoiceEnabled,
} from "./voice.js";

const video = document.getElementById("video");
const canvas = document.getElementById("overlay");
const ctx = canvas.getContext("2d");
const scoreRing = document.getElementById("score-ring");
const scoreLabel = document.getElementById("score-label");
const scorePct = document.getElementById("score-pct");
const insightEl = document.getElementById("insight");
const insightDetail = document.getElementById("insight-detail");
const tipsListEl = document.getElementById("tips-list");
const probsEl = document.getElementById("probs");
const startBtn = document.getElementById("start-btn");
const stopBtn = document.getElementById("stop-btn");
const voiceBtn = document.getElementById("voice-btn");
const voiceStatusEl = document.getElementById("voice-status");
const captureProgress = document.getElementById("capture-progress");
const captureBar = document.getElementById("capture-bar");
const flashEl = document.getElementById("flash");
const gallery = document.getElementById("gallery");
const frameGuide = document.getElementById("frame-guide");

const CAPTURE_THRESHOLD = 0.80;
const STABLE_FRAMES = 12;
const COOLDOWN_MS = 4000;
const EMA_ALPHA = 0.22;

const MODEL_URL = "./model/weights.json";
const TIPS_URL = "./data/tips.json";

const POSE_MODELS = [
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task",
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
];

let poseLandmarker = null;
let model = null;
let tipLibrary = null;
let running = false;
let lastVideoTime = -1;
let stableFrames = 0;
let lastCaptureTime = 0;
let photoCount = 0;
let smoothedProbs = null;
let smoothedLandmarks = null;
let lastRenderedTipIds = "";
let mediaStream = null;

const CLASS_STYLE = {
  rigido: "score--rigido",
  casual: "score--casual",
  corporativo: "score--corporativo",
};

async function createPoseLandmarker(vision) {
  let lastErr;
  for (const modelAssetPath of POSE_MODELS) {
    try {
      return await PoseLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath, delegate: "GPU" },
        runningMode: "VIDEO",
        numPoses: 1,
        minPoseDetectionConfidence: 0.5,
        minPosePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
    } catch (err) {
      lastErr = err;
      console.warn("Modelo no disponible:", modelAssetPath, err);
    }
  }
  throw lastErr ?? new Error("No se pudo cargar ningún modelo de pose");
}

let lastSpokenTipId = "";

function updateVoiceUI(state, message = "") {
  voiceBtn.classList.remove("voice-btn--on", "voice-btn--off", "voice-btn--loading");
  voiceBtn.classList.add(isVoiceEnabled() ? "voice-btn--on" : "voice-btn--off");
  if (state === "loading") voiceBtn.classList.add("voice-btn--loading");

  voiceStatusEl.className = "voice-status";
  if (state === "error") voiceStatusEl.classList.add("voice-status--error");
  if (state === "speaking") voiceStatusEl.classList.add("voice-status--speaking");

  const labels = {
    off: "Voz desactivada",
    ready: "Voz lista",
    loading: "Generando voz…",
    speaking: "Hablando…",
    idle: "",
  };
  voiceStatusEl.textContent = message || labels[state] || "";
}

async function init() {
  startBtn.disabled = true;
  insightEl.textContent = "Cargando modelos...";

  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
  );

  poseLandmarker = await createPoseLandmarker(vision);

  [model, tipLibrary] = await Promise.all([
    loadModel(MODEL_URL),
    loadTips(TIPS_URL),
  ]);

  insightEl.textContent = "Listo. Pulsa «Activar cámara».";
  insightDetail.textContent = "Encuadra pecho y cadera en el recuadro — foto al 80% de naturalidad.";
  initVoice({ enabled: false, onStatus: updateVoiceUI });
  updateVoiceUI("off");
  startBtn.disabled = false;
  stopBtn.disabled = true;
}

async function startCamera() {
  if (running) return;

  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
    audio: false,
  });

  mediaStream = stream;
  video.srcObject = stream;
  await video.play();

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  running = true;
  smoothedProbs = null;
  smoothedLandmarks = null;
  stableFrames = 0;
  lastRenderedTipIds = "";
  lastVideoTime = -1;

  frameGuide.hidden = false;
  startBtn.disabled = true;
  stopBtn.disabled = false;
  captureProgress.hidden = false;
  requestAnimationFrame(tick);
}

function stopCamera() {
  running = false;

  if (mediaStream) {
    for (const track of mediaStream.getTracks()) track.stop();
    mediaStream = null;
  }

  video.srcObject = null;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  smoothedProbs = null;
  smoothedLandmarks = null;
  stableFrames = 0;
  lastRenderedTipIds = "";
  lastVideoTime = -1;

  frameGuide.hidden = true;
  frameGuide.classList.remove("frame-guide--ok");
  frameGuide.classList.add("frame-guide--warn");
  captureProgress.hidden = true;
  captureBar.style.width = "0%";

  scoreRing.className = "score score--idle";
  scoreLabel.textContent = "—";
  scorePct.textContent = "0%";
  insightEl.textContent = "Cámara desactivada.";
  insightDetail.textContent = "Pulsa «Activar cámara» cuando quieras volver a posar.";
  tipsListEl.innerHTML = "";
  probsEl.innerHTML = "";
  stopSpeaking();
  lastSpokenTipId = "";

  startBtn.disabled = false;
  stopBtn.disabled = true;
}

function scoreRingClass(className, lackRigid) {
  if (lackRigid >= 0.80) return "score--casual";
  if (className === "rigido") return "score--rigido";
  return CLASS_STYLE[className] || "score--idle";
}

function updateCaptureProgress(lackRigid) {
  const eligible = lackRigid >= CAPTURE_THRESHOLD;
  stableFrames = eligible
    ? Math.min(stableFrames + 1, STABLE_FRAMES)
    : Math.max(0, stableFrames - 1);

  const pct = eligible
    ? Math.min(100, (stableFrames / STABLE_FRAMES) * 100)
    : Math.min(60, (lackRigid / CAPTURE_THRESHOLD) * 60);

  captureBar.style.width = `${pct}%`;
  captureProgress.setAttribute("aria-valuenow", String(Math.round(lackRigid * 100)));
}

function triggerFlash() {
  flashEl.classList.add("flash--active");
  setTimeout(() => flashEl.classList.remove("flash--active"), 350);
}

function capturePhoto(className, lackRigid) {
  const w = video.videoWidth;
  const h = video.videoHeight;
  const shot = document.createElement("canvas");
  shot.width = w;
  shot.height = h;
  const sctx = shot.getContext("2d");

  sctx.translate(w, 0);
  sctx.scale(-1, 1);
  sctx.drawImage(video, 0, 0, w, h);
  sctx.drawImage(canvas, 0, 0, w, h);
  sctx.setTransform(1, 0, 0, 1, 0, 0);

  const dataUrl = shot.toDataURL("image/jpeg", 0.92);
  photoCount += 1;
  const name = `pose-${className}-${photoCount}.jpg`;

  const wrap = document.createElement("div");
  wrap.className = "gallery__item";
  wrap.innerHTML = `
    <img src="${dataUrl}" alt="Foto ${className}" />
    <span>${className} · ${Math.round(lackRigid * 100)}% natural</span>
    <a href="${dataUrl}" download="${name}">Descargar</a>`;
  gallery.prepend(wrap);

  triggerFlash();
  insightEl.textContent = "¡Foto capturada!";
  insightDetail.textContent = `+10000 de aura · ${Math.round(lackRigid * 100)}% natural.`;
  tipsListEl.innerHTML = "";
  speakCoachLine(
    "Foto capturada",
    `${Math.round(lackRigid * 100)} por ciento de naturalidad`,
    { priority: true }
  );
  lastCaptureTime = Date.now();
  stableFrames = 0;
}

function maybeCapture(className, lackRigid) {
  if (Date.now() - lastCaptureTime < COOLDOWN_MS) return;
  if (lackRigid < CAPTURE_THRESHOLD || stableFrames < STABLE_FRAMES) return;
  capturePhoto(className, lackRigid);
}

function renderTipsList(tips) {
  const ids = tips.map((t) => t.id).join("|");
  if (ids === lastRenderedTipIds) return;
  lastRenderedTipIds = ids;
  tipsListEl.innerHTML = tips
    .map(
      (t, i) => `<li class="tips-list__item${i === 0 ? " tips-list__item--primary" : ""}">
        <span class="tips-list__main">${t.main}</span>
        <span class="tips-list__detail">${t.detail}</span>
      </li>`
    )
    .join("");
}

function updateFrameGuide(frame) {
  frameGuide.classList.toggle("frame-guide--ok", frame.bodyOk);
  frameGuide.classList.toggle("frame-guide--warn", !frame.bodyOk);
}

function speakFromInsight(insight) {
  const primary = insight.tips?.[0];
  if (primary && primary.id !== lastSpokenTipId) {
    lastSpokenTipId = primary.id;
    speakCoachLine(primary.main, primary.detail);
    return;
  }
  if (!primary && insight.detail) {
    const key = `detail:${insight.detail}`;
    if (key !== lastSpokenTipId) {
      lastSpokenTipId = key;
      speakCoachLine("", insight.detail);
    }
  }
}

function updateUI(className, lackRigid, probs, insight) {
  scoreRing.className = `score ${scoreRingClass(className, lackRigid)}`;
  scoreLabel.textContent = className;
  scorePct.textContent = formatPct(lackRigid);
  insightEl.textContent = insight.main;
  insightDetail.textContent = insight.detail;
  renderTipsList(insight.tips ?? []);
  probsEl.innerHTML = model.class_names
    .map((name, i) => {
      const label = name === "rigido" ? `${name} (rigidez)` : name;
      return `<li><span>${label}</span><span>${formatPct(probs[i])}</span></li>`;
    })
    .join("");
  updateCaptureProgress(lackRigid);
  maybeCapture(className, lackRigid);
  speakFromInsight(insight);
}

function tick() {
  if (!running) return;

  if (video.videoWidth && video.currentTime !== lastVideoTime) {
    lastVideoTime = video.currentTime;
    const result = poseLandmarker.detectForVideo(video, performance.now());

    if (result.landmarks?.length) {
      smoothedLandmarks = smoothLandmarks(smoothedLandmarks, result.landmarks[0]);
      const landmarks = smoothedLandmarks;
      drawBodySkeleton(ctx, landmarks, canvas.width, canvas.height);

      const frame = assessBodyFrame(landmarks);
      updateFrameGuide(frame);

      const normalized = normalizeLandmarks(landmarks);
      if (normalized) {
        const rawProbs = predict(model, toFeatureVector(normalized));
        smoothedProbs = smoothProbs(smoothedProbs, rawProbs, EMA_ALPHA);
        const { name } = topClass(smoothedProbs, model.class_names);
        const rawLack = lackOfRigidity(smoothedProbs, model.class_names);
        const proportion = proportionNaturalidadScore(normalized);
        const lackRigid = snapCaptureScore(
          boostNaturalidad(blendNaturalidad(rawLack, proportion))
        );
        const tipCtx = buildTipContext(geometryFeatures(normalized), name, lackRigid, frame);
        updateUI(name, lackRigid, smoothedProbs, resolveInsight(tipLibrary, tipCtx, tipLibrary.maxVisible ?? 3));
      }
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      smoothedProbs = null;
      smoothedLandmarks = null;
      stableFrames = 0;
      captureBar.style.width = "0%";
      lastRenderedTipIds = "";
      frameGuide.classList.remove("frame-guide--ok");
      frameGuide.classList.add("frame-guide--warn");
      insightEl.textContent = "No detecto el cuerpo.";
      insightDetail.textContent = "Encuadra de pecho a cadera dentro del recuadro.";
      tipsListEl.innerHTML = "";
    }
  }

  requestAnimationFrame(tick);
}

startBtn.addEventListener("click", () => {
  startCamera().catch((err) => {
    insightEl.textContent = `Error de cámara: ${err.message}`;
    startBtn.disabled = false;
    stopBtn.disabled = true;
  });
});

stopBtn.addEventListener("click", () => stopCamera());

voiceBtn.addEventListener("click", () => {
  setVoiceEnabled(!isVoiceEnabled());
  voiceBtn.textContent = isVoiceEnabled() ? "Voz ON" : "Voz OFF";
  updateVoiceUI(isVoiceEnabled() ? "ready" : "off");
});

init().catch((err) => {
  insightEl.textContent = `Error al cargar: ${err.message}`;
  console.error(err);
});
