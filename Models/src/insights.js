// src/insights.js
// Funciones puras: reciben landmarks normalizados y el tamaño de la imagen,
// y devuelven métricas + recomendaciones editoriales. Sin dependencias de DOM.

import { LM } from "./pose.js";

// ---- Umbrales configurables (recalibrados para fotos editoriales reales) ----
export const CONFIG = {
  invertedStrong: 1.35,       // triángulo invertido marcado
  invertedSoft: 1.18,         // tendencia atlética
  triangleStrong: 0.82,       // forma A marcada
  triangleSoft: 0.92,         // tendencia a base ancha
  weightShiftThreshold: 0.025,
  longLegRatio: 1.85,         // pierna muy larga vs torso (recalibrado)
  shortLegRatio: 1.55,        // pierna proporcional
  shoulderTiltThreshold: 4,   // grados
  hipTiltThreshold: 3,
  profileZThreshold: 0.08,    // diferencia Z izq/der para detectar perfil
};

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
function mid(a, b) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}
function round(n, d = 2) {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}
function deg(rad) {
  return (rad * 180) / Math.PI;
}
function vis(lm, i) {
  return lm[i]?.visibility ?? 1;
}
function angleAt(a, b, c) {
  // ángulo en B formado por A-B-C
  const ab = { x: a.x - b.x, y: a.y - b.y };
  const cb = { x: c.x - b.x, y: c.y - b.y };
  const dot = ab.x * cb.x + ab.y * cb.y;
  const mag = Math.hypot(ab.x, ab.y) * Math.hypot(cb.x, cb.y);
  return mag > 0 ? deg(Math.acos(Math.max(-1, Math.min(1, dot / mag)))) : 0;
}
function lineTiltDeg(p1, p2) {
  return deg(Math.atan2(p2.y - p1.y, p2.x - p1.x));
}

/** Clasifica la silueta con rangos finos. */
function classifyShape(ratio) {
  if (ratio >= CONFIG.invertedStrong)
    return { shape: "inverted", label: "Triángulo invertido marcado", sub: "hombros dominantes" };
  if (ratio >= CONFIG.invertedSoft)
    return { shape: "inverted", label: "Tendencia atlética", sub: "hombros ligeramente anchos" };
  if (ratio <= CONFIG.triangleStrong)
    return { shape: "A", label: "Forma A marcada", sub: "cadera dominante" };
  if (ratio <= CONFIG.triangleSoft)
    return { shape: "A", label: "Base ancha suave", sub: "cadera ligeramente ancha" };
  return { shape: "balanced", label: "Silueta balanceada", sub: "proporción armónica" };
}

/** Detecta encuadre real según visibilidad de extremidades. */
function detectFraming(lm) {
  const ankleVis = Math.min(vis(lm, LM.LEFT_ANKLE), vis(lm, LM.RIGHT_ANKLE));
  const kneeVis = Math.min(vis(lm, LM.LEFT_KNEE), vis(lm, LM.RIGHT_KNEE));
  const hipVis = Math.min(vis(lm, LM.LEFT_HIP), vis(lm, LM.RIGHT_HIP));
  const noseVis = vis(lm, LM.NOSE);

  if (ankleVis > 0.5 && kneeVis > 0.5)
    return { type: "full", label: "Cuerpo entero", lens: "85mm (cuerpo entero)", lensShort: "85mm" };
  if (kneeVis > 0.5 && hipVis > 0.5)
    return { type: "threeQuarter", label: "3/4 (rodillas visibles)", lens: "50mm (encuadre 3/4)", lensShort: "50mm" };
  if (noseVis > 0.5)
    return { type: "portrait", label: "Retrato / medio cuerpo", lens: "35mm (retrato editorial)", lensShort: "35mm" };
  return { type: "close", label: "Plano corto", lens: "50mm (plano medio)", lensShort: "50mm" };
}

/** Detecta si el sujeto está de perfil usando Z de hombros/caderas. */
function detectProfile(lm) {
  const shoulderZDiff = Math.abs((lm[LM.LEFT_SHOULDER].z ?? 0) - (lm[LM.RIGHT_SHOULDER].z ?? 0));
  const hipZDiff = Math.abs((lm[LM.LEFT_HIP].z ?? 0) - (lm[LM.RIGHT_HIP].z ?? 0));
  const avgZ = (shoulderZDiff + hipZDiff) / 2;
  if (avgZ > CONFIG.profileZThreshold * 2) return "profile";
  if (avgZ > CONFIG.profileZThreshold) return "threeQuarter";
  return "frontal";
}

/** Recomienda ángulo de cámara combinando varias señales. */
function recommendCamera({ legTorso, framing, profile, shape, shoulderTilt, weightShift }) {
  const hasContrapposto = Math.abs(weightShift) > CONFIG.weightShiftThreshold;

  // Piernas muy largas + cuerpo entero -> contrapicado
  if (legTorso >= CONFIG.longLegRatio && framing.type === "full") {
    return {
      position: "low", angleDeg: 35, targetIndex: LM.LEFT_KNEE,
      label: "Contrapicado 35° → rodillas",
      angleText: "Contrapicado 35° (alarga la pierna)",
    };
  }
  // Retrato / medio cuerpo -> picado suave al rostro
  if (framing.type === "portrait" || framing.type === "close") {
    return {
      position: "high", angleDeg: 15, targetIndex: LM.NOSE,
      label: "Picado 15° → rostro",
      angleText: "Picado 15° (enfatiza mirada)",
    };
  }
  // Perfil -> nivel lateral
  if (profile === "profile") {
    return {
      position: "eye", angleDeg: 0, targetIndex: LM.LEFT_SHOULDER,
      label: "Nivel lateral 0° → perfil",
      angleText: "Nivel 0° (lectura de perfil)",
    };
  }
  // Hombros inclinados -> contrapicado suave
  if (Math.abs(shoulderTilt) > CONFIG.shoulderTiltThreshold) {
    return {
      position: "low", angleDeg: 20, targetIndex: LM.LEFT_HIP,
      label: "Contrapicado 20° → cadera",
      angleText: "Contrapicado 20° (compensa inclinación)",
    };
  }
  // Forma A -> picado leve para alargar torso
  if (shape === "A") {
    return {
      position: "high", angleDeg: 10, targetIndex: LM.LEFT_SHOULDER,
      label: "Picado 10° → torso",
      angleText: "Picado 10° (alarga el torso)",
    };
  }
  // Contrapposto detectado -> nivel de cadera
  if (hasContrapposto) {
    return {
      position: "eye", angleDeg: 0, targetIndex: LM.LEFT_HIP,
      label: "Nivel 0° → cadera",
      angleText: "Nivel de cadera (marca el contrapposto)",
    };
  }
  // Default 3/4
  return {
    position: "eye", angleDeg: 0, targetIndex: LM.LEFT_SHOULDER,
    label: "Nivel 0° → torso",
    angleText: "Nivel de cadera 0° (proporción natural)",
  };
}

/** Genera sugerencias de pose variadas según múltiples señales. */
function buildPoseSuggestions({ shape, weightShift, stance, shoulderTilt, elbowAngle, profile, framing }) {
  const suggestions = [];
  const hasContrapposto = Math.abs(weightShift) > CONFIG.weightShiftThreshold;

  // Peso / contrapposto
  if (!hasContrapposto)
    suggestions.push("Carga el peso en una pierna (contrapposto) para marcar la cadera.");
  else if (Math.abs(weightShift) > 0.05)
    suggestions.push("Suaviza el contrapposto: no exageres la inclinación del torso.");
  else
    suggestions.push("Mantén el contrapposto y gira ligeramente el torso hacia cámara.");

  // Base / piernas
  if (stance < 0.55)
    suggestions.push("Abre el compás y adelanta un pie para dar base y movimiento.");
  else if (stance > 1.5)
    suggestions.push("Cierra un poco las piernas para estilizar la caída de la prenda.");
  else if (framing.type === "full")
    suggestions.push("Adelanta una rodilla para romper la línea vertical del encuadre.");

  // Forma corporal
  if (shape === "inverted")
    suggestions.push("Manos en la cintura o bolsillos para acentuar la línea de hombros.");
  else if (shape === "A")
    suggestions.push("Eleva los brazos o aléjalos del cuerpo para equilibrar la cadera.");
  else
    suggestions.push("Alarga el cuello y baja los hombros para una línea limpia.");

  // Inclinación de hombros
  if (Math.abs(shoulderTilt) > CONFIG.shoulderTiltThreshold)
    suggestions.push(`Compensa la inclinación de hombros (${round(shoulderTilt, 1)}°) inclinando la cabeza al lado opuesto.`);

  // Brazos
  if (elbowAngle < 140)
    suggestions.push("Extiende ligeramente el codo para alargar la línea del brazo.");
  else if (elbowAngle > 170)
    suggestions.push("Dobla suavemente el codo para evitar rigidez en la pose.");

  // Perfil
  if (profile === "profile")
    suggestions.push("Gira el rostro 15° hacia cámara para suavizar el perfil puro.");

  // Devuelve máximo 3 sugerencias únicas
  return [...new Set(suggestions)].slice(0, 3);
}

/**
 * Calcula todas las métricas e insights a partir de los landmarks.
 */
export function computeInsights(lm, size) {
  if (!lm || lm.length < 33) return null;
  const ar = size.height / size.width;

  const P = lm.map((p) => ({ ...p, px: p.x, py: p.y * ar }));
  const d = (i, j) => Math.hypot(P[i].px - P[j].px, P[i].py - P[j].py);

  // --- Anchos ---
  const shoulderW = d(LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER);
  const hipW = d(LM.LEFT_HIP, LM.RIGHT_HIP);
  const shoulderHip = hipW > 0 ? shoulderW / hipW : 0;

  // --- Ejes y simetría ---
  const shoulderMid = mid(lm[LM.LEFT_SHOULDER], lm[LM.RIGHT_SHOULDER]);
  const hipMid = mid(lm[LM.LEFT_HIP], lm[LM.RIGHT_HIP]);
  const weightShift = shoulderMid.x - hipMid.x;

  // --- Inclinaciones (grados) ---
  const shoulderTilt = lineTiltDeg(lm[LM.LEFT_SHOULDER], lm[LM.RIGHT_SHOULDER]);
  const hipTilt = lineTiltDeg(lm[LM.LEFT_HIP], lm[LM.RIGHT_HIP]);
  const torsoLean = shoulderMid.x - hipMid.x; // reutiliza weightShift en X

  // --- Largos de extremidades ---
  const armL = d(LM.LEFT_SHOULDER, LM.LEFT_ELBOW) + d(LM.LEFT_ELBOW, LM.LEFT_WRIST);
  const armR = d(LM.RIGHT_SHOULDER, LM.RIGHT_ELBOW) + d(LM.RIGHT_ELBOW, LM.RIGHT_WRIST);
  const legL = d(LM.LEFT_HIP, LM.LEFT_KNEE) + d(LM.LEFT_KNEE, LM.LEFT_ANKLE);
  const legR = d(LM.RIGHT_HIP, LM.RIGHT_KNEE) + d(LM.RIGHT_KNEE, LM.RIGHT_ANKLE);
  const arm = (armL + armR) / 2;
  const leg = (legL + legR) / 2;
  const torso = Math.hypot(shoulderMid.x - hipMid.x, (shoulderMid.y - hipMid.y) * ar);
  const legTorso = torso > 0 ? leg / torso : 0;

  // --- Ángulo de codo (promedio) ---
  const elbowL = angleAt(lm[LM.LEFT_SHOULDER], lm[LM.LEFT_ELBOW], lm[LM.LEFT_WRIST]);
  const elbowR = angleAt(lm[LM.RIGHT_SHOULDER], lm[LM.RIGHT_ELBOW], lm[LM.RIGHT_WRIST]);
  const elbowAngle = (elbowL + elbowR) / 2;

  // --- Dinámica de pose ---
  const ankleSpread = d(LM.LEFT_ANKLE, LM.RIGHT_ANKLE);
  const stance = hipW > 0 ? ankleSpread / hipW : 0;

  // --- Detecciones compuestas ---
  const shapeInfo = classifyShape(shoulderHip);
  const framing = detectFraming(lm);
  const profile = detectProfile(lm);

  // --- Etiquetas de simetría y postura ---
  let weightLabel;
  if (weightShift > CONFIG.weightShiftThreshold) weightLabel = "Peso cargado a la derecha";
  else if (weightShift < -CONFIG.weightShiftThreshold) weightLabel = "Peso cargado a la izquierda";
  else weightLabel = "Peso centrado / eje neutro";

  let stanceLabel;
  if (stance > 1.4) stanceLabel = "Apertura de compás (base amplia)";
  else if (stance < 0.55) stanceLabel = "Pies juntos (línea vertical)";
  else stanceLabel = "Postura neutra";

  let legTorsoNote;
  if (legTorso >= CONFIG.longLegRatio) legTorsoNote = "piernas muy largas";
  else if (legTorso >= CONFIG.shortLegRatio) legTorsoNote = "proporción estándar";
  else legTorsoNote = "torso dominante";

  let profileLabel = profile === "profile" ? "Perfil" : profile === "threeQuarter" ? "3/4" : "Frontal";

  // --- Cámara y diagnóstico ---
  const camera = recommendCamera({
    legTorso, framing, profile, shape: shapeInfo.shape,
    shoulderTilt, weightShift,
  });

  const hipMidN = mid(lm[LM.LEFT_HIP], lm[LM.RIGHT_HIP]);
  const camY = camera.position === "low" ? Math.min(0.97, hipMidN.y + 0.28)
             : camera.position === "high" ? Math.max(0.05, shoulderMid.y - 0.28)
             : shoulderMid.y;
  camera.originN = { x: 0.14, y: camY };
  camera.targetN = { x: lm[camera.targetIndex].x, y: lm[camera.targetIndex].y };

  const poseDynamic = stance > 1.4
    ? "Apertura de compás para estilizar la caída de la prenda"
    : (Math.abs(weightShift) > CONFIG.weightShiftThreshold
        ? "Contrapposto: peso en una pierna, cadera marcada"
        : "Pose simétrica frontal, lectura limpia de silueta");

  const poseSuggestions = buildPoseSuggestions({
    shape: shapeInfo.shape, weightShift, stance,
    shoulderTilt, elbowAngle, profile, framing,
  });

  return {
    metrics: {
      shoulderHip: round(shoulderHip),
      weightShift: round(weightShift, 3),
      legTorso: round(legTorso),
      stance: round(stance),
      shoulderTilt: round(shoulderTilt, 1),
      hipTilt: round(hipTilt, 1),
      elbowAngle: round(elbowAngle, 0),
      armLen: round(arm, 3),
      legLen: round(leg, 3),
      torsoLen: round(torso, 3),
      profile: profileLabel,
      framing: framing.label,
    },
    insights: [
      { key: "Relación Hombros/Cadera", value: `${round(shoulderHip)}`, note: shapeInfo.label },
      { key: "Simetría / eje", value: weightLabel, note: `offset ${round(weightShift, 3)} · ${profileLabel}` },
      { key: "Proporción Pierna/Torso", value: `${round(legTorso)}`, note: legTorsoNote },
      { key: "Inclinación hombros", value: `${round(shoulderTilt, 1)}°`, note: Math.abs(shoulderTilt) > CONFIG.shoulderTiltThreshold ? "hombros inclinados" : "línea horizontal" },
      { key: "Encuadre detectado", value: framing.label, note: framing.lensShort },
      { key: "Dinámica de pose", value: stanceLabel, note: `apertura ${round(stance)} · codo ${round(elbowAngle, 0)}°` },
    ],
    diagnosis: {
      angle: camera.angleText,
      lens: framing.lens,
      poseDynamic,
    },
    shape: shapeInfo.shape,
    shapeLabel: shapeInfo.label,
    camera,
    poseSuggestions,
    anchors: {
      shoulderMid,
      hipMid,
      leftShoulder: { x: lm[LM.LEFT_SHOULDER].x, y: lm[LM.LEFT_SHOULDER].y },
      rightShoulder: { x: lm[LM.RIGHT_SHOULDER].x, y: lm[LM.RIGHT_SHOULDER].y },
      leftHip: { x: lm[LM.LEFT_HIP].x, y: lm[LM.LEFT_HIP].y },
      rightHip: { x: lm[LM.RIGHT_HIP].x, y: lm[LM.RIGHT_HIP].y },
    },
  };
}
