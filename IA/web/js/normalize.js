const LM = { LEFT_SHOULDER: 11, RIGHT_SHOULDER: 12, LEFT_HIP: 23, RIGHT_HIP: 24 };

function xy(lm, i) {
  return [lm[i].x, lm[i].y];
}

export function normalizeLandmarks(landmarks) {
  const ls = xy(landmarks, LM.LEFT_SHOULDER);
  const rs = xy(landmarks, LM.RIGHT_SHOULDER);
  const lh = xy(landmarks, LM.LEFT_HIP);
  const rh = xy(landmarks, LM.RIGHT_HIP);

  const width = Math.hypot(rs[0] - ls[0], rs[1] - ls[1]);
  if (width < 1e-6) return null;

  const ox = (lh[0] + rh[0]) / 2;
  const oy = (lh[1] + rh[1]) / 2;

  return landmarks.map((p) => ({
    x: (p.x - ox) / width,
    y: (p.y - oy) / width,
    z: p.z / width,
    visibility: p.visibility ?? 0,
  }));
}

export function toFeatureVector(normalized) {
  const v = [];
  for (const p of normalized) {
    v.push(p.x, p.y, p.z);
  }
  return v;
}

export function geometryFeatures(normalized) {
  const ls = xy(normalized, LM.LEFT_SHOULDER);
  const rs = xy(normalized, LM.RIGHT_SHOULDER);
  const le = xy(normalized, 13);
  const re = xy(normalized, 14);
  const lw = xy(normalized, 15);
  const rw = xy(normalized, 16);
  const lh = xy(normalized, LM.LEFT_HIP);
  const rh = xy(normalized, LM.RIGHT_HIP);
  const nose = xy(normalized, 0);
  const earL = xy(normalized, 7);
  const earR = xy(normalized, 8);

  const shoulderDx = rs[0] - ls[0];
  const shoulderDy = rs[1] - ls[1];
  const shoulderSlope = shoulderDy / (shoulderDx + 1e-6);
  const elbowLeft = Math.hypot(le[0] - lh[0], le[1] - lh[1]);
  const elbowRight = Math.hypot(re[0] - rh[0], re[1] - rh[1]);
  const elbowHipAvg = (elbowLeft + elbowRight) / 2;
  const faceWidth = Math.hypot(earR[0] - earL[0], earR[1] - earL[1]);
  const shoulderWidth = Math.hypot(rs[0] - ls[0], rs[1] - ls[1]);
  const shoulderToFaceRatio = shoulderWidth / (faceWidth + 1e-6);

  const leftHigher = ls[1] < rs[1];
  const lowerShoulder = leftHigher ? "derecho" : "izquierdo";
  const higherShoulder = leftHigher ? "izquierdo" : "derecho";

  const distLeft = Math.abs(ls[0] - nose[0]);
  const distRight = Math.abs(rs[0] - nose[0]);
  const turnToward = distLeft > distRight ? "derecha" : "izquierda";

  const tightElbow = elbowLeft < elbowRight ? "izquierdo" : "derecho";
  const looseElbow = elbowLeft >= elbowRight ? "izquierdo" : "derecho";
  const hipSide = tightElbow === "izquierdo" ? "izquierda" : "derecha";

  const headTilt = earL[1] - earR[1];
  const headTiltAbs = Math.abs(headTilt);
  const headTiltSide = headTilt > 0.03 ? "izquierda" : headTilt < -0.03 ? "derecha" : "centro";

  const shoulderMidY = (ls[1] + rs[1]) / 2;
  const chinForward = nose[1] - shoulderMidY;

  const wristToHipLeft = Math.hypot(lw[0] - lh[0], lw[1] - lh[1]);
  const wristToHipRight = Math.hypot(rw[0] - rh[0], rw[1] - rh[1]);
  const handOnHip = wristToHipLeft < 0.35 || wristToHipRight < 0.35;

  return {
    shoulderSlope,
    lowerShoulder,
    higherShoulder,
    elbowLeft,
    elbowRight,
    elbowHipAvg,
    shoulderToFaceRatio,
    turnToward,
    tightElbow,
    looseElbow,
    hipSide,
    headTilt,
    headTiltAbs,
    headTiltSide,
    chinForward,
    handOnHip,
  };
}
