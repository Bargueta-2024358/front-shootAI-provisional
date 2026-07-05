function relu(x) {
  return Math.max(0, x);
}

function sigmoid(x) {
  return 1 / (1 + Math.exp(-x));
}

function softmax(arr) {
  const max = Math.max(...arr);
  const exps = arr.map((v) => Math.exp(v - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((v) => (sum > 0 ? v / sum : 0));
}

function dense(input, kernel, bias, activation) {
  const outLen = kernel[0].length;
  const out = new Array(outLen).fill(0);
  for (let j = 0; j < outLen; j++) {
    let s = bias[j];
    for (let i = 0; i < input.length; i++) {
      s += input[i] * kernel[i][j];
    }
    out[j] = s;
  }
  if (activation === "relu") return out.map(relu);
  return out;
}

function sanitizeProbs(probs) {
  return probs.map((p) => (Number.isFinite(p) ? Math.max(0, Math.min(1, p)) : 0));
}

/** Convierte logits/salida del MLP a vector 3 clases [rigido, casual, corporativo]. */
function toThreeClassProbs(logits, nOutputs, classNames) {
  if (nOutputs >= 3) {
    return softmax(logits.slice(0, 3));
  }
  if (nOutputs === 2) {
    const [p0, p1] = softmax(logits);
    const names = classNames ?? ["rigido", "casual", "corporativo"];
    const out = [0, 0, 0];
    out[names.indexOf("rigido")] = p0;
    if (names.indexOf("casual") >= 0) out[names.indexOf("casual")] = p1;
    else out[1] = p1;
    return out;
  }
  // Binario legacy: clases sklearn [1,2] → casual/corporativo
  const pCorp = sigmoid(logits[0]);
  return [0, 1 - pCorp, pCorp];
}

export async function loadModel(url = "./model/weights.json") {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`No se pudo cargar ${url}`);
  const model = await res.json();
  const last = model.layers[model.layers.length - 1];
  model.n_outputs = model.n_outputs ?? last.kernel[0].length;
  return model;
}

export function predict(model, features) {
  let x = features.map((v, i) => {
    const scale = model.scaler_scale[i];
    return (v - model.scaler_mean[i]) / (scale || 1);
  });

  for (let i = 0; i < model.layers.length; i++) {
    const { kernel, bias } = model.layers[i];
    const isLast = i === model.layers.length - 1;
    x = dense(x, kernel, bias, isLast ? null : "relu");
    if (isLast) {
      return sanitizeProbs(toThreeClassProbs(x, model.n_outputs, model.class_names));
    }
  }
  return [0, 1, 0];
}

export function smoothProbs(prev, next, alpha = 0.22) {
  const clean = sanitizeProbs(next);
  if (!prev) return clean;
  return clean.map((p, i) => alpha * p + (1 - alpha) * (prev[i] ?? 0));
}

export function topClass(probs, classNames) {
  let best = 0;
  for (let i = 1; i < probs.length; i++) {
    if (probs[i] > probs[best]) best = i;
  }
  return { index: best, name: classNames[best], confidence: probs[best] };
}

export function lackOfRigidity(probs, classNames) {
  const idx = classNames.indexOf("rigido");
  const pRigid = idx >= 0 ? probs[idx] : 0;
  return Number.isFinite(pRigid) ? 1 - pRigid : 0;
}

/** Ajuste de naturalidad: negativo baja el score (0.3 = −30% hacia abajo). */
export const NATURALITY_ADJUST = 0.32;
export const PROPORTION_BLEND = 0.28;

export function boostNaturalidad(lackRigid, adjust = NATURALITY_ADJUST) {
  const n = Number.isFinite(lackRigid) ? Math.max(0, Math.min(1, lackRigid)) : 0;
  if (adjust > 0) return Math.min(1, n + (1 - n) * adjust);
  if (adjust < 0) return Math.max(0, n + n * adjust);
  return n;
}

export function blendNaturalidad(modelLack, proportionScore, weight = PROPORTION_BLEND) {
  const m = Number.isFinite(modelLack) ? modelLack : 0;
  const p = Number.isFinite(proportionScore) ? proportionScore : 0.75;
  return (1 - weight) * m + weight * p;
}

/** Sin redondeo artificial — el 80% debe alcanzarse de verdad. */
export function snapCaptureScore(score) {
  const n = Number.isFinite(score) ? Math.max(0, Math.min(1, score)) : 0;
  return n;
}

export function formatPct(value) {
  const n = Number.isFinite(value) ? value : 0;
  return `${Math.round(n * 100)}%`;
}
