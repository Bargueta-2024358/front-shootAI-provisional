const TTS_URL = "/api/tts";
const MAX_TEXT_LEN = 280;

let enabled = false;
let lastHash = "";
let currentAudio = null;
let currentObjectUrl = null;
let onStatus = null;
let useBrowserFallback = false;
let isPlaying = false;
/** @type {{ text: string }[]} */
const queue = [];

function canUseBrowserTts() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

function pickSpanishVoice() {
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((v) => v.lang.startsWith("es")) ??
    voices.find((v) => v.lang.includes("es")) ??
    null
  );
}

function setStatus(state, message = "") {
  onStatus?.(state, message);
}

function buildText(main, detail) {
  const parts = [main, detail].filter(Boolean);
  let text = parts.join(". ").replace(/\s+/g, " ").trim();
  if (text.length > MAX_TEXT_LEN) {
    text = `${text.slice(0, MAX_TEXT_LEN - 1)}…`;
  }
  return text;
}

function hashLine(main, detail) {
  return `${main ?? ""}|${detail ?? ""}`;
}

function revokeObjectUrl() {
  if (currentObjectUrl) {
    URL.revokeObjectURL(currentObjectUrl);
    currentObjectUrl = null;
  }
}

function speakWithBrowser(text) {
  if (!canUseBrowserTts()) {
    setStatus("error", "Sin voz disponible");
    return Promise.resolve(false);
  }

  return new Promise((resolve) => {
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "es-ES";
    utter.rate = 1;
    utter.pitch = 1;
    const voice = pickSpanishVoice();
    if (voice) utter.voice = voice;

    utter.onstart = () => {
      if (enabled) setStatus("speaking", "Voz del navegador");
    };
    utter.onend = () => {
      if (enabled) {
        setStatus("ready", useBrowserFallback ? "Voz del navegador (sin ElevenLabs)" : "Voz lista");
      }
      resolve(true);
    };
    utter.onerror = () => {
      setStatus("error", "No se pudo hablar");
      resolve(false);
    };

    window.speechSynthesis.speak(utter);
  });
}

function playAudioBlob(blob) {
  return new Promise((resolve) => {
    revokeObjectUrl();
    currentObjectUrl = URL.createObjectURL(blob);
    currentAudio = new Audio(currentObjectUrl);

    const finish = () => {
      revokeObjectUrl();
      currentAudio = null;
      resolve();
    };

    currentAudio.onended = finish;
    currentAudio.onerror = finish;
    currentAudio.play().catch(finish);
  });
}

async function playText(text) {
  if (!useBrowserFallback) {
    try {
      const res = await fetch(TTS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (res.ok) {
        const blob = await res.blob();
        if (enabled) setStatus("speaking", "Voz ElevenLabs");
        await playAudioBlob(blob);
        if (enabled) setStatus("ready", "Voz ElevenLabs");
        return;
      }

      if (res.status === 401 || res.status === 502 || canUseBrowserTts()) {
        useBrowserFallback = true;
      } else {
        setStatus("error", "Sin voz — configura ElevenLabs");
        return;
      }
    } catch (err) {
      console.warn("TTS ElevenLabs no disponible, usando navegador:", err);
      useBrowserFallback = true;
    }
  }

  if (canUseBrowserTts()) {
    await speakWithBrowser(text);
  } else {
    setStatus("error", "Sin voz disponible");
  }
}

async function drainQueue() {
  if (isPlaying || !enabled || queue.length === 0) return;

  isPlaying = true;
  const { text } = queue.shift();
  setStatus("loading");

  try {
    await playText(text);
  } catch (err) {
    console.warn("Error al reproducir voz:", err);
  } finally {
    isPlaying = false;
    if (enabled && queue.length > 0) {
      drainQueue();
    } else if (enabled) {
      setStatus("ready", useBrowserFallback ? "Voz del navegador (sin ElevenLabs)" : "Voz lista");
    }
  }
}

function enqueue(text, { priority = false } = {}) {
  if (priority) {
    queue.unshift({ text });
  } else {
    queue.push({ text });
  }
  drainQueue();
}

export function initVoice(options = {}) {
  enabled = options.enabled ?? false;
  onStatus = options.onStatus ?? null;
  setStatus("idle");
}

export function isVoiceEnabled() {
  return enabled;
}

export function setVoiceEnabled(value) {
  enabled = Boolean(value);
  if (!enabled) {
    stopSpeaking();
    setStatus("off");
  } else {
    useBrowserFallback = false;
    setStatus("ready", canUseBrowserTts() ? "Voz lista (ElevenLabs o navegador)" : "Voz lista");
    if (canUseBrowserTts() && window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.addEventListener("voiceschanged", () => pickSpanishVoice(), { once: true });
    }
  }
}

export function stopSpeaking() {
  queue.length = 0;
  isPlaying = false;
  if (canUseBrowserTts()) {
    window.speechSynthesis.cancel();
  }
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.src = "";
    currentAudio = null;
  }
  revokeObjectUrl();
}

/**
 * @param {string} main
 * @param {string} detail
 * @param {{ priority?: boolean }} [opts]
 */
export function speakCoachLine(main, detail, opts = {}) {
  if (!enabled) return;

  const text = buildText(main, detail);
  if (!text) return;

  const h = hashLine(main, detail);
  if (!opts.priority && h === lastHash) return;
  lastHash = h;

  enqueue(text, { priority: Boolean(opts.priority) });
}
