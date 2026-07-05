// src/lib/atelierScan/render.js
// Dibuja el overlay editorial sobre un canvas: foto + esqueleto + insights + HUD.
// Todo es Canvas 2D puro. La salida es exportable como PNG (una sola imagen combinada).

import { LM, POSE_CONNECTIONS } from "./pose.js";

// Paleta editorial (alineada con tailwind.config.js): caramelo / marfil / negro.
const THEME = {
  line: "#A67B5B",              // caramel (primario)
  line2: "#7A5A40",             // caramel-dark (secundario)
  node: "#FFFFFF",
  nodeCore: "#A67B5B",
  warm: "#C8B8A2",             // arena (acento)
  symmetry: "rgba(122,90,64,0.9)",
  labelBg: "rgba(17,17,17,0.82)",
  labelBorder: "rgba(166,123,91,0.75)",
  text: "#F5F2EE",             // marfil
  accent: "#A67B5B",
};

// Layers por defecto (se sobreescriben desde la vista con los toggles).
export const DEFAULT_LAYERS = {
  skeleton: true,
  shape: true,
  ratio: true,
  symmetry: true,
  limbs: true,
  camera: true,
  pose: true,
  hud: true,
};

/**
 * Renderiza todo. Escala el canvas al tamaño de la imagen.
 * @param {CanvasRenderingContext2D} ctx
 * @param {HTMLImageElement} img
 * @param {Array} lm  landmarks normalizados
 * @param {Object} insights  salida de computeInsights
 * @param {Object} layers  toggles de capas
 */
// Lado maximo del buffer de render: acota fotos gigantes para rendimiento
// y grosor de trazo consistente, sin degradar el export.
const MAX_SIDE = 1600;

export function render(ctx, img, lm, insights, layers = DEFAULT_LAYERS) {
  const natW = img.naturalWidth || img.width;
  const natH = img.naturalHeight || img.height;
  const scale = Math.min(1, MAX_SIDE / Math.max(natW, natH));
  const W = Math.round(natW * scale);
  const H = Math.round(natH * scale);
  const c = ctx.canvas;
  c.width = W;
  c.height = H;

  // Escala de trazo relativa al tamaño (fotos grandes -> trazos gruesos).
  const S = Math.max(W, H) / 1000;

  ctx.clearRect(0, 0, W, H);
  ctx.drawImage(img, 0, 0, W, H);

  // Viñeta sutil para dar aspecto de "visor".
  drawVignette(ctx, W, H);

  if (!lm) return;

  const pt = (i) => ({ x: lm[i].x * W, y: lm[i].y * H, v: lm[i].visibility ?? 1 });

  if (layers.shape && insights) drawSilhouetteShape(ctx, insights, W, H, S);
  if (layers.skeleton) drawSkeleton(ctx, pt, S);
  if (layers.ratio && insights) drawRatioLines(ctx, lm, insights, W, H, S);
  if (layers.symmetry && insights) drawSymmetry(ctx, insights, W, H, S);
  if (layers.limbs && insights) drawLimbLabels(ctx, pt, insights, W, H, S);
  if (layers.camera && insights) drawCameraAngle(ctx, insights, W, H, S);
  if (layers.pose && insights) drawPoseHint(ctx, insights, W, H, S);
  if (layers.hud && insights) drawHud(ctx, insights, W, H, S);

  drawWatermark(ctx, W, H, S);
}

function drawVignette(ctx, W, H) {
  const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(0,0,0,0.35)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

function drawSkeleton(ctx, pt, S) {
  // Lineas del esqueleto con glow.
  ctx.save();
  ctx.lineCap = "round";
  ctx.shadowColor = THEME.line;
  ctx.shadowBlur = 8 * S;
  ctx.strokeStyle = THEME.line;
  ctx.lineWidth = 2 * S;
  for (const [a, b] of POSE_CONNECTIONS) {
    const pa = pt(a), pb = pt(b);
    if (pa.v < 0.3 || pb.v < 0.3) continue;
    ctx.beginPath();
    ctx.moveTo(pa.x, pa.y);
    ctx.lineTo(pb.x, pb.y);
    ctx.stroke();
  }
  ctx.restore();

  // Nodos en articulaciones clave.
  const joints = [
    LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER, LM.LEFT_ELBOW, LM.RIGHT_ELBOW,
    LM.LEFT_WRIST, LM.RIGHT_WRIST, LM.LEFT_HIP, LM.RIGHT_HIP,
    LM.LEFT_KNEE, LM.RIGHT_KNEE, LM.LEFT_ANKLE, LM.RIGHT_ANKLE,
  ];
  for (const j of joints) {
    const p = pt(j);
    if (p.v < 0.3) continue;
    drawNode(ctx, p.x, p.y, S);
  }
}

function drawNode(ctx, x, y, S) {
  ctx.save();
  // anillo exterior
  ctx.strokeStyle = THEME.node;
  ctx.lineWidth = 1.5 * S;
  ctx.shadowColor = THEME.nodeCore;
  ctx.shadowBlur = 10 * S;
  ctx.beginPath();
  ctx.arc(x, y, 5 * S, 0, Math.PI * 2);
  ctx.stroke();
  // núcleo
  ctx.fillStyle = THEME.nodeCore;
  ctx.shadowBlur = 6 * S;
  ctx.beginPath();
  ctx.arc(x, y, 2.2 * S, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// Dibuja la forma corporal (triángulo invertido / forma A / reloj de arena).
function drawSilhouetteShape(ctx, insights, W, H, S) {
  const a = insights.anchors;
  const shape = insights.shape;
  const P = (n) => ({ x: n.x * W, y: n.y * H });
  const ls = P(a.leftShoulder), rs = P(a.rightShoulder);
  const lh = P(a.leftHip), rh = P(a.rightHip);
  const shMid = P(a.shoulderMid), hipMid = P(a.hipMid);

  let poly, color;
  if (shape === "inverted") {
    poly = [ls, rs, hipMid];
    color = THEME.warm;
  } else if (shape === "A") {
    poly = [lh, rh, shMid];
    color = THEME.line2;
  } else {
    poly = [ls, rs, rh, lh];
    color = THEME.line;
  }
  const label = insights.shapeLabel || "Silueta";

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(poly[0].x, poly[0].y);
  for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i].x, poly[i].y);
  ctx.closePath();
  ctx.fillStyle = hexToRgba(color, 0.14);
  ctx.fill();
  ctx.lineWidth = 2 * S;
  ctx.strokeStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 10 * S;
  ctx.setLineDash([10 * S, 6 * S]);
  ctx.stroke();
  ctx.restore();

  // Vértices marcados.
  ctx.save();
  ctx.fillStyle = color;
  for (const p of poly) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3.5 * S, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Etiqueta de la forma cerca del centro del torso.
  const cx = (shMid.x + hipMid.x) / 2;
  const cy = (shMid.y + hipMid.y) / 2;
  drawFloatingLabel(ctx, cx, cy - 40 * S, label, "forma corporal", S, { anchor: "center", accent: color });
}

// Indicador de ángulo de cámara: glifo + flecha hacia la parte objetivo + ángulo.
function drawCameraAngle(ctx, insights, W, H, S) {
  const cam = insights.camera;
  if (!cam) return;
  const ox = cam.originN.x * W, oy = cam.originN.y * H;
  const tx = cam.targetN.x * W, ty = cam.targetN.y * H;

  // Flecha origen -> objetivo.
  ctx.save();
  ctx.strokeStyle = THEME.accent;
  ctx.fillStyle = THEME.accent;
  ctx.lineWidth = 2 * S;
  ctx.shadowColor = THEME.accent;
  ctx.shadowBlur = 8 * S;
  ctx.setLineDash([9 * S, 6 * S]);
  ctx.beginPath();
  ctx.moveTo(ox, oy);
  ctx.lineTo(tx, ty);
  ctx.stroke();
  ctx.setLineDash([]);
  drawArrowHead(ctx, ox, oy, tx, ty, S);
  ctx.restore();

  // Glifo de cámara en el origen.
  drawCameraGlyph(ctx, ox, oy, S);

  // Punto objetivo (mira).
  ctx.save();
  ctx.strokeStyle = THEME.accent;
  ctx.lineWidth = 1.5 * S;
  ctx.beginPath();
  ctx.arc(tx, ty, 8 * S, 0, Math.PI * 2);
  ctx.moveTo(tx - 12 * S, ty); ctx.lineTo(tx + 12 * S, ty);
  ctx.moveTo(tx, ty - 12 * S); ctx.lineTo(tx, ty + 12 * S);
  ctx.stroke();
  ctx.restore();

  // Etiqueta del ángulo junto a la cámara.
  drawFloatingLabel(ctx, ox + 22 * S, oy, cam.label, `${insights.diagnosis.lens}`, S, { anchor: "left", accent: THEME.accent });
}

function drawCameraGlyph(ctx, x, y, S) {
  const w = 26 * S, h = 18 * S;
  ctx.save();
  ctx.translate(x - w / 2, y - h / 2);
  ctx.fillStyle = "rgba(17,17,17,0.9)";
  ctx.strokeStyle = THEME.accent;
  ctx.lineWidth = 1.6 * S;
  ctx.shadowColor = THEME.accent;
  ctx.shadowBlur = 8 * S;
  roundRect(ctx, 0, 0, w, h, 3 * S);
  ctx.fill();
  ctx.stroke();
  // lente
  ctx.beginPath();
  ctx.arc(w * 0.5, h * 0.5, h * 0.32, 0, Math.PI * 2);
  ctx.stroke();
  // visor
  ctx.beginPath();
  ctx.moveTo(w * 0.62, 0);
  ctx.lineTo(w * 0.82, -4 * S);
  ctx.lineTo(w * 0.82, 4 * S);
  ctx.closePath();
  ctx.fillStyle = THEME.accent;
  ctx.fill();
  ctx.restore();
}

function drawArrowHead(ctx, x1, y1, x2, y2, S) {
  const ang = Math.atan2(y2 - y1, x2 - x1);
  const len = 14 * S;
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - len * Math.cos(ang - Math.PI / 7), y2 - len * Math.sin(ang - Math.PI / 7));
  ctx.lineTo(x2 - len * Math.cos(ang + Math.PI / 7), y2 - len * Math.sin(ang + Math.PI / 7));
  ctx.closePath();
  ctx.fill();
}

function hexToRgba(hex, alpha) {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function drawRatioLines(ctx, lm, insights, W, H, S) {
  const ls = lm[LM.LEFT_SHOULDER], rs = lm[LM.RIGHT_SHOULDER];
  const lh = lm[LM.LEFT_HIP], rh = lm[LM.RIGHT_HIP];

  ctx.save();
  ctx.setLineDash([8 * S, 6 * S]);
  ctx.lineWidth = 1.6 * S;

  // Línea de hombros
  ctx.strokeStyle = THEME.warm;
  ctx.beginPath();
  ctx.moveTo(ls.x * W, ls.y * H);
  ctx.lineTo(rs.x * W, rs.y * H);
  ctx.stroke();

  // Línea de cadera
  ctx.strokeStyle = THEME.line2;
  ctx.beginPath();
  ctx.moveTo(lh.x * W, lh.y * H);
  ctx.lineTo(rh.x * W, rh.y * H);
  ctx.stroke();
  ctx.restore();

  // Etiqueta central del ratio (entre hombros y cadera).
  const cx = ((ls.x + rs.x + lh.x + rh.x) / 4) * W;
  const cy = ((ls.y + rs.y) / 2 * 0.5 + (lh.y + rh.y) / 2 * 0.5) * H;
  const ratio = insights.metrics.shoulderHip;
  const siluetaNote = insights.insights[0].note;
  drawFloatingLabel(ctx, cx, cy, `Hombros/Cadera: ${ratio}`, siluetaNote, S, { anchor: "center", accent: THEME.warm });
}

function drawSymmetry(ctx, insights, W, H, S) {
  const { shoulderMid, hipMid } = insights.anchors;
  const x = ((shoulderMid.x + hipMid.x) / 2) * W;
  ctx.save();
  ctx.setLineDash([4 * S, 8 * S]);
  ctx.strokeStyle = THEME.symmetry;
  ctx.lineWidth = 1.4 * S;
  ctx.shadowColor = THEME.line2;
  ctx.shadowBlur = 6 * S;
  ctx.beginPath();
  ctx.moveTo(x, 0);
  ctx.lineTo(x, H);
  ctx.stroke();
  ctx.restore();

  // Marca el eje de cadera vs hombros para visualizar la carga de peso.
  ctx.save();
  ctx.fillStyle = THEME.symmetry;
  ctx.beginPath();
  ctx.arc(shoulderMid.x * W, shoulderMid.y * H, 3 * S, 0, Math.PI * 2);
  ctx.arc(hipMid.x * W, hipMid.y * H, 3 * S, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawLimbLabels(ctx, pt, insights, W, H, S) {
  // Etiqueta al lado del brazo (codo izquierdo) con proporción pierna/torso.
  const elbow = pt(LM.LEFT_ELBOW);
  const knee = pt(LM.LEFT_KNEE);

  if (elbow.v > 0.3) {
    const lx = elbow.x + 60 * S;
    drawLeader(ctx, elbow.x, elbow.y, lx, elbow.y, S);
    drawFloatingLabel(ctx, lx, elbow.y, `Brazo`, `ref. proporción`, S, { anchor: "left", accent: THEME.line });
  }
  if (knee.v > 0.3) {
    const lx = knee.x + 60 * S;
    drawLeader(ctx, knee.x, knee.y, lx, knee.y, S);
    drawFloatingLabel(ctx, lx, knee.y, `Pierna/Torso: ${insights.metrics.legTorso}`, insights.insights[2].note, S, { anchor: "left", accent: THEME.line2 });
  }
}

function drawLeader(ctx, x1, y1, x2, y2, S) {
  ctx.save();
  ctx.strokeStyle = "rgba(245,242,238,0.55)";
  ctx.lineWidth = 1 * S;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.fillStyle = "rgba(245,242,238,0.55)";
  ctx.beginPath();
  ctx.arc(x1, y1, 2 * S, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// Etiqueta flotante tipo "tag" con título + subtítulo (opcionalmente con wrap).
function drawFloatingLabel(ctx, x, y, title, sub, S, opts = {}) {
  const { anchor = "left", accent = THEME.accent, maxWidth = 0 } = opts;
  const padX = 10 * S, padY = 7 * S;
  const titleSize = 15 * S, subSize = 11 * S;
  const lineH = subSize + 4 * S;

  ctx.save();
  ctx.font = `600 ${titleSize}px Inter, system-ui, sans-serif`;
  const tW = ctx.measureText(title).width;

  // Prepara líneas del subtítulo (con wrap si se pide maxWidth).
  ctx.font = `400 ${subSize}px Inter, system-ui, sans-serif`;
  let subLines = [];
  if (sub) {
    subLines = maxWidth > 0 ? wrapText(ctx, sub, maxWidth - padX * 2) : [sub];
  }
  const subW = subLines.reduce((m, l) => Math.max(m, ctx.measureText(l).width), 0);

  const boxW = Math.max(tW, subW) + padX * 2;
  const boxH = padY * 2 + titleSize + (subLines.length ? subLines.length * lineH + 2 * S : 0);

  let bx = x;
  if (anchor === "center") bx = x - boxW / 2;
  if (anchor === "right") bx = x - boxW;
  let by = y - boxH / 2;

  // caja
  roundRect(ctx, bx, by, boxW, boxH, 8 * S);
  ctx.fillStyle = THEME.labelBg;
  ctx.fill();
  ctx.lineWidth = 1.2 * S;
  ctx.strokeStyle = accent;
  ctx.stroke();

  // barra de acento
  ctx.fillStyle = accent;
  roundRect(ctx, bx, by, 3 * S, boxH, 2 * S);
  ctx.fill();

  // textos
  ctx.textBaseline = "top";
  ctx.fillStyle = THEME.text;
  ctx.font = `600 ${titleSize}px Inter, system-ui, sans-serif`;
  ctx.fillText(title, bx + padX, by + padY);
  if (subLines.length) {
    ctx.fillStyle = accent;
    ctx.font = `400 ${subSize}px Inter, system-ui, sans-serif`;
    let ly = by + padY + titleSize + 4 * S;
    for (const line of subLines) {
      ctx.fillText(line, bx + padX, ly);
      ly += lineH;
    }
  }
  ctx.restore();
}

// Parte un texto en líneas que quepan en maxW (fuente ya seteada en ctx).
function wrapText(ctx, text, maxW) {
  const words = text.split(" ");
  const lines = [];
  let cur = "";
  for (const w of words) {
    const test = cur ? cur + " " + w : w;
    if (ctx.measureText(test).width > maxW && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = test;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

// Sugerencia principal de pose, como etiqueta flotante sobre la imagen (arriba a la izquierda).
function drawPoseHint(ctx, insights, W, H, S) {
  const sug = insights.poseSuggestions && insights.poseSuggestions[0];
  if (!sug) return;
  drawFloatingLabel(ctx, 20 * S, H * 0.16, "SUGERENCIA DE POSE", sug, S, { anchor: "left", accent: THEME.warm, maxWidth: 260 * S });
}

// Recuadro de diagnóstico de composición (esquina, estilo HUD de cámara).
function drawHud(ctx, insights, W, H, S) {
  const { angle, lens, poseDynamic } = insights.diagnosis;
  const mainPose = (insights.poseSuggestions && insights.poseSuggestions[0]) || poseDynamic;
  const rows = [
    ["ÁNGULO", angle],
    ["LENTE", lens],
    ["DINÁMICA", poseDynamic],
    ["POSE", mainPose],
  ];
  const padX = 16 * S, padY = 14 * S;
  const titleSize = 12 * S, keySize = 10 * S, valSize = 13 * S;
  const lineGap = 7 * S;

  ctx.save();
  ctx.font = `600 ${valSize}px Inter, system-ui, sans-serif`;
  let maxW = 0;
  for (const [, v] of rows) maxW = Math.max(maxW, ctx.measureText(v).width);
  const boxW = Math.min(maxW + padX * 2, W * 0.6);
  const rowH = keySize + valSize + lineGap + 6 * S;
  const boxH = padY * 2 + titleSize + 10 * S + rows.length * rowH;

  const bx = W - boxW - 20 * S;
  const by = H - boxH - 20 * S;

  roundRect(ctx, bx, by, boxW, boxH, 12 * S);
  ctx.fillStyle = "rgba(17,17,17,0.9)";
  ctx.fill();
  ctx.lineWidth = 1.2 * S;
  ctx.strokeStyle = THEME.labelBorder;
  ctx.stroke();

  // esquinas tipo mira
  drawCorner(ctx, bx, by, 14 * S, S, THEME.accent);
  drawCorner(ctx, bx + boxW, by, -14 * S, S, THEME.accent);

  // título
  ctx.textBaseline = "top";
  ctx.fillStyle = THEME.accent;
  ctx.font = `700 ${titleSize}px Inter, system-ui, sans-serif`;
  ctx.fillText("◉ DIAGNÓSTICO DE COMPOSICIÓN", bx + padX, by + padY);

  let yy = by + padY + titleSize + 12 * S;
  for (const [k, v] of rows) {
    ctx.fillStyle = THEME.line2;
    ctx.font = `600 ${keySize}px Inter, system-ui, sans-serif`;
    ctx.fillText(k, bx + padX, yy);
    ctx.fillStyle = THEME.text;
    ctx.font = `600 ${valSize}px Inter, system-ui, sans-serif`;
    const v2 = fitText(ctx, v, boxW - padX * 2);
    ctx.fillText(v2, bx + padX, yy + keySize + 4 * S);
    yy += rowH;
  }
  ctx.restore();
}

function drawCorner(ctx, x, y, len, S, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2 * S;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + len, y);
  ctx.moveTo(x, y);
  ctx.lineTo(x, y + Math.abs(len));
  ctx.stroke();
  ctx.restore();
}

function drawWatermark(ctx, W, H, S) {
  ctx.save();
  ctx.font = `600 ${11 * S}px Inter, system-ui, sans-serif`;
  ctx.fillStyle = "rgba(166,123,91,0.85)";
  ctx.textBaseline = "top";
  ctx.fillText("SHOOT AI — POSE", 18 * S, 16 * S);
  ctx.fillStyle = "rgba(245,242,238,0.45)";
  ctx.font = `400 ${9 * S}px Inter, system-ui, sans-serif`;
  ctx.fillText("pose · geometry · composition", 18 * S, 16 * S + 14 * S);
  ctx.restore();
}

// ---- helpers ----
function roundRect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function fitText(ctx, text, maxW) {
  if (ctx.measureText(text).width <= maxW) return text;
  let t = text;
  while (t.length > 4 && ctx.measureText(t + "…").width > maxW) t = t.slice(0, -1);
  return t + "…";
}
