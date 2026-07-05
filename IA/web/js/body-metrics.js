/** Métricas corporales aproximadas desde landmarks normalizados (MediaPipe Pose). */

function xy(lm, i) {
  return [lm[i].x, lm[i].y];
}

function dist(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

function mid(a, b) {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
}

function vis(lm, i, min = 0.25) {
  return (lm[i]?.visibility ?? 1) >= min;
}

/** 1.0 dentro del rango ideal; decae suave hasta ~0.5 fuera con margin extra. */
export function softScore(value, idealMin, idealMax, margin = 0.35) {
  if (!Number.isFinite(value)) return 0.75;
  if (value >= idealMin && value <= idealMax) return 1;
  if (value < idealMin) {
    const d = idealMin - value;
    return Math.max(0.5, 1 - d / (margin + 1e-6) * 0.5);
  }
  const d = value - idealMax;
  return Math.max(0.5, 1 - d / (margin + 1e-6) * 0.5);
}

/** Simetría L/R: 1.0 = iguales, decae con diferencia relativa. */
function symmetryRatio(left, right) {
  if (!Number.isFinite(left) || !Number.isFinite(right)) return 0.75;
  const avg = (Math.abs(left) + Math.abs(right)) / 2;
  if (avg < 1e-6) return 1;
  const diff = Math.abs(left - right) / avg;
  return Math.max(0.5, 1 - diff * 0.6);
}

export function computeBodyMetrics(normalized) {
  const ls = xy(normalized, 11);
  const rs = xy(normalized, 12);
  const lh = xy(normalized, 23);
  const rh = xy(normalized, 24);
  const nose = xy(normalized, 0);
  const lk = xy(normalized, 25);
  const rk = xy(normalized, 26);
  const la = xy(normalized, 27);
  const ra = xy(normalized, 28);
  const le = xy(normalized, 13);
  const re = xy(normalized, 14);
  const lw = xy(normalized, 15);
  const rw = xy(normalized, 16);

  const shoulderWidth = dist(ls, rs);
  const hipWidth = dist(lh, rh);
  const waistWidth = shoulderWidth * 0.55 + hipWidth * 0.45;
  const chestWidth = shoulderWidth * 0.95;

  const shoulderMid = mid(ls, rs);
  const hipMid = mid(lh, rh);
  const kneeMid = mid(lk, rk);
  const ankleMid = mid(la, ra);

  const hasLegs =
    vis(normalized, 25) && vis(normalized, 26) && vis(normalized, 27) && vis(normalized, 28);

  const legLen = hasLegs ? (dist(lh, la) + dist(rh, ra)) / 2 : null;
  const stature = hasLegs ? Math.abs(nose[1] - ankleMid[1]) : null;
  const legToStature = legLen && stature > 0.1 ? legLen / stature : null;

  const armLeft = dist(ls, le) + dist(le, lw);
  const armRight = dist(rs, re) + dist(re, rw);

  const postureXs = [nose[0], shoulderMid[0], hipMid[0]];
  if (hasLegs) postureXs.push(kneeMid[0]);
  const postureSpread =
    postureXs.length >= 2 ? Math.max(...postureXs) - Math.min(...postureXs) : 0;

  const swr = shoulderWidth / (waistWidth + 1e-6);
  const whr = waistWidth / (hipWidth + 1e-6);
  const chestWaist = chestWidth / (waistWidth + 1e-6);
  const hipWaist = hipWidth / (waistWidth + 1e-6);
  const shoulderHip = shoulderWidth / (hipWidth + 1e-6);

  // Proxy muy aproximado de composición (solo visual, banda amplia).
  const bodyFatProxy = whr * 0.55 + (1 / (swr + 0.5)) * 0.45;

  return {
    swr,
    whr,
    chestWaist,
    hipWaist,
    shoulderHip,
    legToStature,
    bodyFatProxy,
    postureSpread,
    symmetry: {
      arms: symmetryRatio(armLeft, armRight),
      shoulders: symmetryRatio(ls[1], rs[1]),
      hips: symmetryRatio(lh[1], rh[1]),
      knees: hasLegs ? symmetryRatio(lk[1], rk[1]) : 0.75,
    },
    hasLegs,
  };
}

export function proportionNaturalidadScore(normalized) {
  const m = computeBodyMetrics(normalized);
  const scores = [
    softScore(m.swr, 1.05, 1.65, 0.5),
    softScore(m.whr, 0.65, 1.05, 0.4),
    softScore(m.chestWaist, 1.0, 1.45, 0.45),
    softScore(m.hipWaist, 1.05, 1.55, 0.45),
    softScore(m.shoulderHip, 1.0, 1.5, 0.45),
    m.symmetry.arms,
    m.symmetry.shoulders,
    m.symmetry.hips,
    m.symmetry.knees,
    softScore(m.bodyFatProxy, 0.55, 1.15, 0.5),
    softScore(m.postureSpread, 0, 0.22, 0.35),
  ];

  if (m.hasLegs && m.legToStature != null) {
    scores.push(softScore(m.legToStature, 0.42, 0.62, 0.2));
  }

  const sum = scores.reduce((a, b) => a + b, 0);
  return sum / scores.length;
}
