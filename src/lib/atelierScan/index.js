// src/lib/atelierScan/index.js
// Barrel del motor ATELIER SCAN (pose + insights + render).
export { LM, POSE_CONNECTIONS, initPose, detectPose } from "./pose.js";
export { CONFIG, computeInsights } from "./insights.js";
export { DEFAULT_LAYERS, render } from "./render.js";
