function interpolate(text, ctx) {
  if (!text) return "";
  return text.replace(/\{(\w+)\}/g, (_, key) => ctx[key] ?? "");
}

function matchSpec(value, spec) {
  if (spec.eq !== undefined && value !== spec.eq) return false;
  if (spec.ne !== undefined && value === spec.ne) return false;
  if (spec.lt !== undefined && !(value < spec.lt)) return false;
  if (spec.lte !== undefined && !(value <= spec.lte)) return false;
  if (spec.gt !== undefined && !(value > spec.gt)) return false;
  if (spec.gte !== undefined && !(value >= spec.gte)) return false;
  return true;
}

function matchesWhen(when, ctx) {
  if (!when || Object.keys(when).length === 0) return true;
  return Object.entries(when).every(([key, spec]) => matchSpec(ctx[key], spec));
}

function pickVariant(tip, ctx) {
  const pool = tip.variants?.length ? tip.variants : [{ main: tip.main, detail: tip.detail }];
  let h = 0;
  for (const c of tip.id + (ctx.lowerShoulder ?? "")) h = (h * 31 + c.charCodeAt(0)) | 0;
  const chosen = pool[Math.abs(h) % pool.length];
  return {
    id: tip.id,
    priority: tip.priority ?? 1,
    main: interpolate(chosen.main ?? tip.main, ctx),
    detail: interpolate(chosen.detail ?? tip.detail, ctx),
  };
}

export async function loadTips(url = "./data/tips.json") {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`No se pudo cargar consejos: ${url}`);
  return res.json();
}

export function buildTipContext(geo, predictedClass, lackRigid, frame = {}) {
  const absSlope = Math.abs(geo.shoulderSlope);
  const minElbow = Math.min(geo.elbowLeft, geo.elbowRight);
  return {
    ...geo,
    ...frame,
    absSlope,
    predictedClass,
    lackRigid,
    lackRigidPct: Math.round((lackRigid ?? 0) * 100),
    armsTight: geo.elbowHipAvg < 0.16,
    oneArmTight: minElbow < 0.18,
    armsOpen: geo.elbowHipAvg > 0.52,
    armsRelaxed: geo.elbowHipAvg >= 0.20 && geo.elbowHipAvg <= 0.48,
    awayFrom: geo.turnToward === "derecha" ? "izquierda" : "derecha",
    shouldersDynamic: absSlope >= 0.10 && absSlope <= 0.22,
    angleGood: geo.shoulderToFaceRatio >= 1.05 && geo.shoulderToFaceRatio <= 1.35,
    bodyFrameOk: frame.bodyOk === true,
    tooClose: frame.tooClose === true,
    tooFar: frame.tooFar === true,
  };
}

export const CAPTURE_NATURALITY = 0.80;

const PROGRESS_TIP_BLOCKLIST = /^aura_|^lackRigid_low|^frame_good|^fallback_aura|^fallback_default/;

function isProgressTip(tip) {
  return !PROGRESS_TIP_BLOCKLIST.test(tip.id ?? "");
}

export function evaluateTips(tipLibrary, ctx, maxVisible = 3) {
  const matched = [];
  for (const tip of tipLibrary.tips ?? []) {
    if (matchesWhen(tip.when, ctx)) matched.push(pickVariant(tip, ctx));
  }
  matched.sort((a, b) => b.priority - a.priority);

  if (matched.length === 0) {
    for (const fb of tipLibrary.fallbacks ?? []) {
      if (fb.default || matchesWhen(fb.when, ctx)) {
        const main = interpolate(fb.main, ctx);
        const detail = interpolate(fb.detail, ctx);
        return { main, detail, tips: [{ id: fb.id ?? "fallback", priority: 0, main, detail }] };
      }
    }
    return {
      main: "Vas bien — sigue posando con calma.",
      detail: "Pequeños ajustes y la foto saldrá natural.",
      tips: [],
    };
  }

  const visible = matched.slice(0, maxVisible);
  return { main: visible[0].main, detail: visible[0].detail, tips: visible };
}

/** Por debajo del 80%: +10000 y consejos prácticos; al 80%+: +10000 y foto en camino. */
export function resolveInsight(tipLibrary, ctx, maxVisible = 3) {
  const pct = ctx.lackRigidPct ?? Math.round((ctx.lackRigid ?? 0) * 100);
  const atCapture = (ctx.lackRigid ?? 0) >= CAPTURE_NATURALITY;

  const evaluated = evaluateTips(tipLibrary, ctx, atCapture ? maxVisible : 999);
  const tips = atCapture
    ? (evaluated.tips ?? []).slice(0, maxVisible)
    : (evaluated.tips ?? []).filter(isProgressTip).slice(0, maxVisible);

  return {
    main: "+10000 de aura",
    detail: atCapture
      ? `${pct}% — mantén la pose un instante, la cámara dispara sola.`
      : `${pct}% — sigue estos consejos para llegar al 80%`,
    tips,
  };
}
