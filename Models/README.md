# ATELIER SCAN · Motor de Pose + Overlay de Insights

Motor de IA que, a partir de la **foto limpia de un modelo**, detecta las articulaciones,
calcula proporciones/insights de composición y los **dibuja como overlay futurista** sobre
la propia imagen. Entrega una **imagen combinada** (foto + vectores + insights) lista para
pintarse en la interfaz.

Corre **100% en el navegador**, gratis, sin servidor de IA, sin GPU obligatoria y sin Colab/HuggingFace.
La detección usa el modelo pre-entrenado **MediaPipe Pose Landmarker** (33 puntos) vía WebAssembly.

## Cómo correr (local)

Los ES modules necesitan HTTP (no funciona abriendo el archivo con `file://`). Opciones:

```bash
# Opción A: Node (ya instalado)
npx http-server -p 8080 -c-1 .

# Opción B: VS Code -> extensión "Live Server" -> clic derecho en index.html -> "Open with Live Server"
```

Luego abre `http://127.0.0.1:8080`, sube una foto (o usa los ejemplos) y verás el análisis.
Pulsa **Exportar PNG** para descargar la imagen combinada final.

> Requiere conexión a internet la primera vez para descargar el modelo y el runtime desde el CDN.
> (Se pueden hospedar localmente si necesitas modo offline total.)

## Qué calcula

- **Relación Hombros/Cadera** -> clasifica la silueta (balanceada / triángulo invertido / base ancha).
- **Forma corporal** -> dibuja el polígono de la forma sobre el torso (triángulo invertido / forma A / reloj de arena).
- **Simetría / carga de peso** -> línea vertical central + eje hombros vs cadera.
- **Proporción Pierna/Torso** -> figura estilizada vs estándar.
- **Dinámica de pose** -> apertura de tobillos (compás / neutra / pies juntos).
- **Ángulo de cámara** -> indicador visual desde dónde disparar y hacia qué parte apunta (con el ángulo).
- **Sugerencias de pose** -> 2-3 recomendaciones accionables (panel + etiqueta sobre la foto).
- **Diagnóstico de composición (HUD)** -> ángulo, lente, dinámica y pose principal.

Todas las capas se pueden encender/apagar con los toggles del panel izquierdo. La imagen se
reescala automáticamente para llenar el visor manteniendo proporción.

Los umbrales viven en `CONFIG` al inicio de [`src/insights.js`](src/insights.js) para ajustarlos en vivo.

## Estructura

| Archivo | Rol |
|---|---|
| [`index.html`](index.html) | Mockup: upload, viewport (canvas), toggles de capas, export. |
| [`styles.css`](styles.css) | Estilo oscuro editorial tipo "visor de cámara". |
| [`src/pose.js`](src/pose.js) | Carga MediaPipe y expone `initPose()` y `detectPose(imgEl)` (33 landmarks). |
| [`src/insights.js`](src/insights.js) | Funciones puras: `computeInsights(landmarks, size)` -> métricas + recomendaciones. |
| [`src/render.js`](src/render.js) | `render(ctx, img, landmarks, insights, layers)` dibuja overlay + HUD. |
| [`src/app.js`](src/app.js) | Orquesta el mockup y expone `window.AtelierScan`. |

## Integración en la "pantalla 3"

Los módulos son framework-agnósticos (JS puro). Desde React/Vue/vanilla:

```js
import { initPose, detectPose } from "./src/pose.js";
import { computeInsights } from "./src/insights.js";
import { render } from "./src/render.js";

await initPose();
const { landmarks } = await detectPose(imgElement);          // imgElement: HTMLImageElement ya cargado
const insights = computeInsights(landmarks, {
  width: imgElement.naturalWidth,
  height: imgElement.naturalHeight,
});
render(canvasCtx, imgElement, landmarks, insights);          // dibuja sobre tu canvas
const finalPng = canvasCtx.canvas.toDataURL("image/png");    // imagen combinada final
```

O usando el helper global del mockup: `window.AtelierScan.getResult()` devuelve
`{ landmarks, insights, dataUrl }`.

## Notas técnicas

- Si la imagen viene por URL remota y quieres exportar el canvas, el host debe permitir CORS
  (por eso se usa `img.crossOrigin = "anonymous"`).
- El delegate intenta **GPU** y cae a **CPU** automáticamente si WebGL no está disponible.
- Si no se detecta un cuerpo completo, la imagen se muestra sin overlay y se avisa en el estado.
