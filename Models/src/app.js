// src/app.js
// Orquesta el mockup: upload -> detectPose -> computeInsights -> render -> export.
// Reutiliza los módulos pose.js / insights.js / render.js (framework-agnósticos).

import { initPose, detectPose } from "./pose.js";
import { computeInsights } from "./insights.js";
import { render } from "./render.js";

// --- Referencias DOM ---
const $ = (id) => document.getElementById(id);
const canvas = $("canvas");
const ctx = canvas.getContext("2d");
const statusEl = $("status");
const statusText = $("statusText");
const stageEmpty = $("stageEmpty");
const stageLoader = $("stageLoader");
const loaderText = $("loaderText");
const insightsList = $("insightsList");
const exportBtn = $("exportBtn");
const reanalyzeBtn = $("reanalyzeBtn");

const toggles = {
  skeleton: $("tglSkeleton"),
  shape: $("tglShape"),
  ratio: $("tglRatio"),
  symmetry: $("tglSymmetry"),
  limbs: $("tglLimbs"),
  camera: $("tglCamera"),
  pose: $("tglPose"),
  hud: $("tglHud"),
};

// --- Estado actual ---
let currentImage = null;
let currentLandmarks = null;
let currentInsights = null;

function setStatus(state, text) {
  statusEl.dataset.state = state;
  statusText.textContent = text;
}
function showLoader(show, text = "Analizando cuerpo…") {
  stageLoader.hidden = !show;
  loaderText.textContent = text;
}

// --- Carga del modelo al inicio ---
(async function boot() {
  setStatus("loading", "Cargando modelo…");
  try {
    await initPose((msg) => setStatus("loading", msg));
    setStatus("ready", "Modelo listo · sube una foto");
  } catch (err) {
    console.error(err);
    setStatus("error", "Error cargando el modelo (revisa tu conexión)");
  }
})();

function currentLayers() {
  return {
    skeleton: toggles.skeleton.checked,
    shape: toggles.shape.checked,
    ratio: toggles.ratio.checked,
    symmetry: toggles.symmetry.checked,
    limbs: toggles.limbs.checked,
    camera: toggles.camera.checked,
    pose: toggles.pose.checked,
    hud: toggles.hud.checked,
  };
}

function redraw() {
  if (!currentImage) return;
  render(ctx, currentImage, currentLandmarks, currentInsights, currentLayers());
}

const delay = (ms) => new Promise((r) => setTimeout(r, ms));
const SCAN_MS = 1600; // duración mínima visible del escaneo

// --- Pipeline principal ---
async function analyzeImage(img) {
  currentImage = img;
  stageEmpty.style.display = "none";

  // Pinta la foto base de inmediato para que el escáner se vea pasando sobre el cuerpo.
  render(ctx, img, null, null, {});
  showLoader(true, "Analizando cuerpo…");
  setStatus("loading", "Analizando…");

  try {
    // La detección es rápida; forzamos una duración mínima para que el escaneo sea visible.
    const [{ landmarks }] = await Promise.all([detectPose(img), delay(SCAN_MS)]);
    currentLandmarks = landmarks;

    if (!landmarks) {
      currentInsights = null;
      redraw();
      renderInsightsPanel(null);
      setStatus("error", "No se detectó un cuerpo completo. Prueba otra foto.");
      showLoader(false);
      exportBtn.disabled = false; // aún se puede exportar la foto con aviso
      reanalyzeBtn.disabled = false;
      return;
    }

    currentInsights = computeInsights(landmarks, {
      width: img.naturalWidth,
      height: img.naturalHeight,
    });

    redraw();
    renderInsightsPanel(currentInsights);
    setStatus("ready", "Análisis completo");
    exportBtn.disabled = false;
    reanalyzeBtn.disabled = false;
  } catch (err) {
    console.error(err);
    setStatus("error", "Error durante el análisis");
  } finally {
    showLoader(false);
  }
}

// --- Panel lateral de insights ---
function renderInsightsPanel(insights) {
  if (!insights) {
    insightsList.innerHTML = `<p class="muted">No se detectó pose. La imagen se muestra sin overlay.</p>`;
    return;
  }
  const rows = insights.insights.map(
    (i) => `
    <div class="insight-row">
      <span class="k">${i.key}</span>
      <span class="v">${i.value} <small>${i.note}</small></span>
    </div>`
  ).join("");
  const d = insights.diagnosis;
  const cam = insights.camera;
  const m = insights.metrics;
  const metricsBlock = `
    <div class="insight-row metrics-row">
      <span class="k">Métricas crudas</span>
      <span class="v metrics-grid">
        <small>H/C ${m.shoulderHip}</small>
        <small>P/T ${m.legTorso}</small>
        <small>offset ${m.weightShift}</small>
        <small>apertura ${m.stance}</small>
        <small>hombros ${m.shoulderTilt}°</small>
        <small>codo ${m.elbowAngle}°</small>
        <small>${m.profile}</small>
        <small>${m.framing}</small>
      </span>
    </div>`;
  const diag = `
    <div class="insight-row">
      <span class="k">Ángulo de cámara</span>
      <span class="v">${cam ? cam.label : d.angle}<br><small>${d.lens}</small></span>
    </div>`;
  const poses = (insights.poseSuggestions || []).map(
    (p) => `<li>${p}</li>`
  ).join("");
  const poseBlock = poses
    ? `<div class="insight-row">
         <span class="k">Sugerencias de pose</span>
         <ul class="pose-list">${poses}</ul>
       </div>`
    : "";
  insightsList.innerHTML = rows + metricsBlock + diag + poseBlock;
}

// --- Carga de imagen desde File o URL ---
function loadImageFromSrc(src, revoke = false) {
  const img = new Image();
  img.crossOrigin = "anonymous"; // permite exportar el canvas con imágenes remotas (CORS)
  img.onload = () => {
    if (revoke) URL.revokeObjectURL(src);
    analyzeImage(img);
  };
  img.onerror = () => {
    setStatus("error", "No se pudo cargar la imagen (¿CORS o URL inválida?)");
    showLoader(false);
  };
  img.src = src;
}

function handleFile(file) {
  if (!file || !file.type.startsWith("image/")) return;
  const url = URL.createObjectURL(file);
  loadImageFromSrc(url, true);
}

// --- Export PNG ---
function exportPng() {
  if (!currentImage) return;
  // Redibuja a resolución nativa antes de exportar (imagen combinada final).
  redraw();
  const url = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = url;
  a.download = `atelier-scan-${Date.now()}.png`;
  a.click();
}

// --- Wiring de eventos ---
const fileInput = $("fileInput");
const dropzone = $("dropzone");

fileInput.addEventListener("change", (e) => handleFile(e.target.files[0]));

["dragenter", "dragover"].forEach((ev) =>
  dropzone.addEventListener(ev, (e) => { e.preventDefault(); dropzone.classList.add("drag"); })
);
["dragleave", "drop"].forEach((ev) =>
  dropzone.addEventListener(ev, (e) => { e.preventDefault(); dropzone.classList.remove("drag"); })
);
dropzone.addEventListener("drop", (e) => {
  const file = e.dataTransfer?.files?.[0];
  handleFile(file);
});

document.querySelectorAll(".chip[data-sample]").forEach((btn) => {
  btn.addEventListener("click", () => loadImageFromSrc(btn.dataset.sample));
});

Object.values(toggles).forEach((t) => t.addEventListener("change", redraw));

exportBtn.addEventListener("click", exportPng);
reanalyzeBtn.addEventListener("click", () => currentImage && analyzeImage(currentImage));

// Exponer API para que la "pantalla 3" pueda invocar el motor programáticamente.
window.AtelierScan = {
  analyzeImageElement: (img) => analyzeImage(img),
  getResult: () => ({
    landmarks: currentLandmarks,
    insights: currentInsights,
    dataUrl: currentImage ? canvas.toDataURL("image/png") : null,
  }),
};
