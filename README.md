# Shoot AI — Frontend Landing

Landing page editorial para la plataforma Shoot AI (Pre-Shoot + Live-Shoot).

## Stack

- React 18 + TypeScript + Vite
- Tailwind CSS
- Framer Motion
- Lenis (scroll suave)

## Instalación

```powershell
cd E:\hack\Frontend-ShootAI
npm install
npm run dev
```

Si el proyecto está en `C:\Users\elips\Frontend-ShootAI`, ejecuta el script de despliegue:

```powershell
powershell -ExecutionPolicy Bypass -File C:\Users\elips\Frontend-ShootAI\scripts\setup.ps1
```

## Videos del hero

Coloca los videos en `public/videos/`:

- `pre-shoot.mp4` — mitad izquierda (Pre-Shoot)
- `live-shoot.mp4` — mitad derecha (Live-Shoot)
- `pre-shoot-poster.jpg` — frame estático del pre-shoot (se muestra mientras carga)
- `live-shoot-poster.jpg` — frame estático del live-shoot (idem)

### Optimizar videos (ejecutar localmente con ffmpeg)

Los videos del hero deben pesar menos de 3–4 MB cada uno para no penalizar
la carga inicial. Genera las versiones comprimidas así:

```bash
# Pre-Shoot: comprimir a H.264, 1280px ancho, sin audio, ~crf 28
ffmpeg -i pre-shoot-original.mp4 -vf "scale=1280:-2" -c:v libx264 -crf 28 -preset slow -an public/videos/pre-shoot.mp4

# Live-Shoot: ídem
ffmpeg -i live-shoot-original.mp4 -vf "scale=1280:-2" -c:v libx264 -crf 28 -preset slow -an public/videos/live-shoot.mp4
```

> Ajusta `-crf` entre 24 (más calidad, más peso) y 32 (más compresión, menos calidad).
> Para un objetivo de ~2 MB puedes usar `-crf 30 -preset veryslow`.

### Generar posters (frame estático en el segundo 1)

```bash
ffmpeg -i public/videos/pre-shoot.mp4  -ss 00:00:01 -vframes 1 -q:v 4 public/videos/pre-shoot-poster.jpg
ffmpeg -i public/videos/live-shoot.mp4 -ss 00:00:01 -vframes 1 -q:v 4 public/videos/live-shoot-poster.jpg
```

### Estrategia de carga en el Hero

- En mount: `preload="metadata"` — solo descarga duración y dimensiones.
- En primer hover/focus/tap: `preload` sube a `"auto"` y se llama `video.load()`
  para empezar a bufferizar ese video específico. El otro video permanece en
  `metadata` hasta que el usuario interactúe con él.
- El atributo `poster=` muestra el frame estático de inmediato mientras el
  video no ha cargado o si la reproducción falla.

## Convención de color caramelo

El acento `#A67B5B` solo se usa en `:hover`, `:focus` o estados activos. Excepción documentada: palabra de énfasis en la sección Filosofía.
