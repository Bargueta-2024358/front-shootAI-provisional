/** Landmarks de cabeza MediaPipe: nariz, ojos, orejas, boca (0–10). */
export const HEAD_LM = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
export const HEAD_LM_SET = new Set(HEAD_LM);
export const CORE_LM = [11, 12, 13, 14, 15, 16, 23, 24];
export const BODY_LM = [...HEAD_LM, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28];

/** Puntos sintéticos: pómulos y pecho (derivados de landmarks reales). */
export const AUX = {
  CHEEK_L: "cheek_l",
  CHEEK_R: "cheek_r",
  CHEST_UPPER: "chest_upper",
  CHEST_CENTER: "chest_center",
  CHEST_L: "chest_l",
  CHEST_R: "chest_r",
};

export const CHEEK_AUX = [AUX.CHEEK_L, AUX.CHEEK_R];
export const CHEST_AUX = [AUX.CHEST_UPPER, AUX.CHEST_CENTER, AUX.CHEST_L, AUX.CHEST_R];
export const CHEEK_AUX_SET = new Set(CHEEK_AUX);
export const CHEST_AUX_SET = new Set(CHEST_AUX);

export const POSE_CONNECTIONS_HEAD = [
  [0, 1], [1, 2], [2, 3], [3, 7],
  [0, 4], [4, 5], [5, 6], [6, 8],
  [9, 10],
];

/** Conexiones con puntos auxiliares: [índice | clave AUX, índice | clave AUX] */
export const POSE_CONNECTIONS_AUX = [
  [AUX.CHEEK_L, 0], [AUX.CHEEK_L, 3], [AUX.CHEEK_L, 7],
  [AUX.CHEEK_R, 0], [AUX.CHEEK_R, 6], [AUX.CHEEK_R, 8],
  [AUX.CHEEK_L, AUX.CHEEK_R],
  [AUX.CHEST_UPPER, 11], [AUX.CHEST_UPPER, 12],
  [AUX.CHEST_UPPER, AUX.CHEST_CENTER],
  [AUX.CHEST_CENTER, AUX.CHEST_L], [AUX.CHEST_CENTER, AUX.CHEST_R],
  [AUX.CHEST_L, 11], [AUX.CHEST_R, 12],
  [AUX.CHEST_L, 23], [AUX.CHEST_R, 24],
];

export const POSE_CONNECTIONS_BODY = [
  ...POSE_CONNECTIONS_HEAD,
  ...POSE_CONNECTIONS_AUX,
  [0, 11], [0, 12],
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
  [11, 23], [12, 24], [23, 24],
  [23, 25], [25, 27], [24, 26], [26, 28],
];

const LANDMARK_EMA = 0.38;
const VIS_MIN = 0.3;

/** Umbrales de encuadre (relajados para webcam típica). */
export const FRAME_THRESHOLDS = {
  CLOSE_Y: 0.05,
  FAR_SHOULDER_Y: 0.82,
  FAR_HIP_Y: 0.98,
  MIN_TORSO_SPAN: 0.04,
  OK_SHOULDER_Y_MIN: 0.06,
  OK_SHOULDER_Y_MAX: 0.75,
  MIN_TORSO_FOR_OK: 0.06,
};

export function smoothLandmarks(prev, next) {
  if (!prev) return next.map((p) => ({ ...p }));
  return next.map((p, i) => ({
    x: LANDMARK_EMA * p.x + (1 - LANDMARK_EMA) * prev[i].x,
    y: LANDMARK_EMA * p.y + (1 - LANDMARK_EMA) * prev[i].y,
    z: LANDMARK_EMA * p.z + (1 - LANDMARK_EMA) * prev[i].z,
    visibility: p.visibility ?? prev[i].visibility ?? 1,
  }));
}

export function assessBodyFrame(landmarks) {
  const vis = (i) => landmarks[i]?.visibility ?? 1;
  const torsoVisible = CORE_LM.filter((i) => vis(i) > 0.35).length;

  const ls = landmarks[11];
  const rs = landmarks[12];
  const lh = landmarks[23];
  const rh = landmarks[24];

  if (!ls || !rs) {
    return { bodyOk: false, tooClose: false, tooFar: true, torsoVisible: 0 };
  }

  const shoulderY = (ls.y + rs.y) / 2;
  const hipY = lh && rh ? (lh.y + rh.y) / 2 : shoulderY + 0.25;
  const torsoSpan = hipY - shoulderY;
  const hasHips = lh && rh && vis(23) > 0.25 && vis(24) > 0.25;

  const { CLOSE_Y, FAR_SHOULDER_Y, FAR_HIP_Y, MIN_TORSO_SPAN, OK_SHOULDER_Y_MIN, OK_SHOULDER_Y_MAX, MIN_TORSO_FOR_OK } =
    FRAME_THRESHOLDS;

  const tooClose = shoulderY < CLOSE_Y;
  const tooFar =
    shoulderY > FAR_SHOULDER_Y ||
    (hasHips && hipY > FAR_HIP_Y) ||
    (hasHips && torsoSpan < MIN_TORSO_SPAN);

  const bodyOk =
    torsoVisible >= 4 &&
    !tooClose &&
    !tooFar &&
    shoulderY >= OK_SHOULDER_Y_MIN &&
    shoulderY <= OK_SHOULDER_Y_MAX &&
    (!hasHips || hipY >= shoulderY + MIN_TORSO_FOR_OK);

  return { bodyOk, tooClose, tooFar, shoulderY, hipY, torsoVisible, torsoSpan };
}

function visible(p, minVis = VIS_MIN) {
  return p && (p.visibility ?? 1) >= minVis;
}

function visibleHead(p) {
  return visible(p, 0.2);
}

function lerpPoint(a, b, t) {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    z: (a.z ?? 0) + ((b.z ?? 0) - (a.z ?? 0)) * t,
    visibility: Math.min(a.visibility ?? 1, b.visibility ?? 1),
  };
}

function midPoint(a, b) {
  return lerpPoint(a, b, 0.5);
}

/** Pómulos (ojo externo ↔ oreja) y pecho (hombros ↔ caderas). */
export function buildAuxLandmarks(landmarks) {
  const aux = {};

  const eyeLO = landmarks[3];
  const eyeRO = landmarks[6];
  const earL = landmarks[7];
  const earR = landmarks[8];
  const nose = landmarks[0];
  const ls = landmarks[11];
  const rs = landmarks[12];
  const lh = landmarks[23];
  const rh = landmarks[24];

  if (eyeLO && earL) {
    const base = lerpPoint(eyeLO, earL, 0.4);
    aux[AUX.CHEEK_L] = nose ? lerpPoint(base, nose, 0.12) : base;
  }
  if (eyeRO && earR) {
    const base = lerpPoint(eyeRO, earR, 0.4);
    aux[AUX.CHEEK_R] = nose ? lerpPoint(base, nose, 0.12) : base;
  }

  if (ls && rs) {
    const shoulderMid = midPoint(ls, rs);
    const hipMid =
      lh && rh
        ? midPoint(lh, rh)
        : { ...shoulderMid, y: shoulderMid.y + 0.22, visibility: Math.min(ls.visibility ?? 1, rs.visibility ?? 1) };

    aux[AUX.CHEST_UPPER] = lerpPoint(shoulderMid, hipMid, 0.08);
    aux[AUX.CHEST_CENTER] = lerpPoint(shoulderMid, hipMid, 0.32);
    aux[AUX.CHEST_L] = lerpPoint(ls, aux[AUX.CHEST_CENTER], 0.58);
    aux[AUX.CHEST_R] = lerpPoint(rs, aux[AUX.CHEST_CENTER], 0.58);
  }

  return aux;
}

function resolvePoint(landmarks, aux, key) {
  if (typeof key === "number") return landmarks[key];
  return aux[key] ?? null;
}

function isHeadConnection(a, b) {
  if (typeof a === "string" || typeof b === "string") {
    if (CHEEK_AUX_SET.has(a) || CHEEK_AUX_SET.has(b)) return true;
    if (CHEST_AUX_SET.has(a) || CHEST_AUX_SET.has(b)) return false;
  }
  return HEAD_LM_SET.has(a) && HEAD_LM_SET.has(b);
}

function isChestConnection(a, b) {
  return CHEST_AUX_SET.has(a) || CHEST_AUX_SET.has(b);
}

function isCheekConnection(a, b) {
  return CHEEK_AUX_SET.has(a) || CHEEK_AUX_SET.has(b);
}

function pointVisible(p, headLink, chestLink, cheekLink) {
  if (!p) return false;
  if (cheekLink || headLink) return visibleHead(p);
  if (chestLink) return visible(p, 0.25);
  return visible(p);
}

export function drawBodySkeleton(ctx, landmarks, w, h) {
  ctx.clearRect(0, 0, w, h);
  const aux = buildAuxLandmarks(landmarks);

  for (const [a, b] of POSE_CONNECTIONS_BODY) {
    const cheekLink = isCheekConnection(a, b);
    const chestLink = isChestConnection(a, b);
    const headLink = isHeadConnection(a, b);
    const p1 = resolvePoint(landmarks, aux, a);
    const p2 = resolvePoint(landmarks, aux, b);
    if (!pointVisible(p1, headLink, chestLink, cheekLink)) continue;
    if (!pointVisible(p2, headLink, chestLink, cheekLink)) continue;

    ctx.lineWidth = cheekLink ? 2 : chestLink ? 2.5 : headLink ? 2 : 3;
    ctx.strokeStyle = cheekLink
      ? "rgba(255, 171, 145, 0.8)"
      : chestLink
        ? "rgba(77, 182, 172, 0.85)"
        : headLink
          ? "rgba(255, 213, 79, 0.75)"
          : "rgba(92, 107, 192, 0.88)";
    ctx.beginPath();
    ctx.moveTo(p1.x * w, p1.y * h);
    ctx.lineTo(p2.x * w, p2.y * h);
    ctx.stroke();
  }

  for (const i of BODY_LM) {
    const p = landmarks[i];
    const head = HEAD_LM_SET.has(i);
    if (!(head ? visibleHead(p) : visible(p))) continue;

    const isNose = i === 0;
    const isShoulder = i === 11 || i === 12;
    const r = isNose ? 7 : head ? 4 : isShoulder ? 6 : 5;

    ctx.beginPath();
    ctx.arc(p.x * w, p.y * h, r, 0, Math.PI * 2);
    ctx.fillStyle = head
      ? isNose
        ? "rgba(255, 213, 79, 0.95)"
        : "rgba(255, 193, 7, 0.88)"
      : "rgba(129, 199, 132, 0.95)";
    ctx.fill();

    if (isNose) {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  for (const key of CHEEK_AUX) {
    const p = aux[key];
    if (!visibleHead(p)) continue;
    ctx.beginPath();
    ctx.arc(p.x * w, p.y * h, 5, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255, 138, 101, 0.92)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  for (const key of CHEST_AUX) {
    const p = aux[key];
    if (!visible(p, 0.25)) continue;
    const isCenter = key === AUX.CHEST_CENTER;
    const r = key === AUX.CHEST_UPPER ? 5 : isCenter ? 6 : 5;
    ctx.beginPath();
    ctx.arc(p.x * w, p.y * h, r, 0, Math.PI * 2);
    ctx.fillStyle = isCenter
      ? "rgba(38, 166, 154, 0.95)"
      : "rgba(77, 182, 172, 0.9)";
    ctx.fill();
  }
}

/** @deprecated alias */
export const drawTorsoSkeleton = drawBodySkeleton;
