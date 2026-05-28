# Plan — App "Suno + Moises + Tabs"

App web para generar música con IA, procesar audio (separar voz, cambiar tempo/tono, metrónomo) y practicar canciones de YouTube con tablaturas sincronizadas y reproducibles estilo Songsterr, exportables a PDF. Sin APIs de pago adicionales.

## Stack y servicios

- **Frontend/Backend**: TanStack Start, Tailwind + shadcn.
- **Lovable Cloud**: auth, DB, storage.
- **Suno API** — generar música, letras, extender, separar voz/instrumental (requiere tu key Suno; es el único servicio externo que cobra y ya lo pediste explícitamente).
- **Songsterr API pública** (gratis, sin key) — buscar y descargar tabs en formato Guitar Pro (`.gp`, `.gp5`, `.gpx`).
- **alphaTab** (open-source, MIT) — renderizar tablaturas Guitar Pro en el navegador **y reproducirlas con su sintetizador SoundFont integrado**, con cursor sincronizado nota por nota, loop A-B, cambio de tempo y tono, y mute/solo por pista. Es el equivalente libre del visor de Songsterr.
- **YouTube IFrame API + `react-youtube`** (gratis) — búsqueda con scraping ligero o YouTube Data API solo si tienes key gratuita; reproducción embebida.
- **Backend propio del usuario** para extraer audio de YouTube (lo provees tú; sin coste para la app).
- **basic-pitch** de Spotify (open-source, Apache-2.0, corre en navegador con TensorFlow.js) — transcripción audio→MIDI **gratis y local**, sin API de pago. El MIDI resultante se convierte a tablatura con alphaTab.
- **Tone.js + Web Audio API** — tempo/tono independiente, metrónomo, mixer de stems, loops.
- **pdf-lib** — exportar tablaturas a PDF.

## Sincronización tab + música original (estilo Songsterr, gratis)

El núcleo del módulo de práctica:

1. **Tab oficial existe en Songsterr**: descargar el `.gp` → renderizar con alphaTab → cargar el audio (de YouTube procesado o archivo subido) como pista de fondo en Web Audio → alinear con un offset manual editable (slider de ±2 s) y BPM del tab. alphaTab controla el cursor visual; Web Audio reproduce el audio real; ambos sincronizados por un mismo reloj.
2. **No hay tab**: el botón "Extraer tablatura del video" pasa el audio por basic-pitch en el cliente → MIDI → alphaTab lo renderiza como tab → mismo flujo de sincronización.
3. **Controles compartidos**: play/pause, velocidad (Tone.js time-stretch sobre el audio + cambio de tempo en alphaTab al mismo factor), tono (pitch-shift en audio + transposición en tab), loop A-B sobre ambos, metrónomo.
4. **Solo de tab (sin audio)**: opción de silenciar el audio y oír solo el sintetizador de alphaTab — útil para aislar la guitarra.

## Estructura de rutas

```
/                       Landing + login
/studio                 Generar música con Suno
/studio/$trackId        Detalle de track Suno
/library                Biblioteca del usuario
/practice               Buscar canción o pegar URL de YouTube
/practice/$sessionId    Reproductor sincronizado tab + audio
/tabs/$songId           Vista de tab + exportar PDF
api/public/suno-callback   Webhook de Suno
```

## Módulos

### 1. Generación con Suno (`/studio`)
Prompt, estilo, instrumental, letras, modelo. Server fns: `generateMusic`, `extendMusic`, `generateLyrics`, `getTaskDetails`, `separateVocals`, `convertToWav`. Reproductor con waveform y descargas.

### 2. Procesamiento estilo Moises (cliente, gratis)
Subir archivo o usar pista de Suno. Separación voz/instrumental (Suno). Mixer de stems, tempo, tono, metrónomo, loops — todo en Web Audio.

### 3. YouTube + práctica
- Buscar y reproducir video embebido.
- Botón **Procesar audio**: backend propio → audio en Web Audio.
- Botón **Buscar tablatura**: Songsterr API → renderiza con alphaTab.
- Botón **Extraer tablatura del video**: basic-pitch local → MIDI → alphaTab.
- Botón **Reproducir tab con música**: arranca la reproducción sincronizada estilo Songsterr (cursor sobre la tab + audio original).
- Toggles: muted audio / muted tab synth, ajuste de offset, BPM, transposición.

### 4. Tabs en PDF
Render de alphaTab a PDF (alphaTab puede exportar a SVG; se compone con pdf-lib en una server function).

### 5. Persistencia (Lovable Cloud)
- `tracks` (Suno).
- `practice_sessions` (yt_video_id, tempo, pitch, loop_a, loop_b, offset_ms, notas).
- `saved_tabs` (song_id, source: `songsterr | ai_local | manual`, gp_blob, midi_blob).
- `user_roles` (separada).
Todo con RLS por `user_id`.

## Secrets
- `SUNO_API_KEY` (único de pago, ya asumido).
- `YOUTUBE_API_KEY` (opcional, gratuito hasta cuota diaria).
- `YT_AUDIO_BACKEND_URL` (tu backend propio, sin coste para la app).

## Limitaciones honestas
- **Suno sí cobra**: es la única dependencia de pago y la pediste tú. Todo lo demás (tabs, transcripción, render, sincronización) es 100% gratis y open-source.
- **basic-pitch en el navegador**: la transcripción tarda ~30-60 s por canción y la calidad es mejor con guitarra/bajo limpios; en mezclas densas conviene primero separar voz/instrumental (Suno) y transcribir solo la pista instrumental.
- **Sincronización tab + audio**: depende del BPM declarado en el tab; casi siempre requiere ajustar un offset manual la primera vez (se guarda en la sesión).
- **YouTube**: la extracción de audio depende de tu backend propio; sin él, sólo reproducción embebida sin sincronización con la tab.
- **Stems por instrumento separados** (batería/bajo/guitarra) siguen fuera del MVP — solo voz vs instrumental.

## Entregables MVP
1. Landing + auth.
2. `/studio` con Suno (generar, reproducir, separar voz, descargar).
3. Reproductor Moises con stems, tempo, tono, loops, metrónomo.
4. `/practice` con YouTube + procesamiento de audio.
5. Tabs: búsqueda en Songsterr, extracción local con basic-pitch, visor alphaTab, **reproducción sincronizada estilo Songsterr con el audio original**, export a PDF.
6. Biblioteca persistente.

## Confirmaciones antes de construir
- ¿OK habilitar Lovable Cloud?
- ¿Tienes ya el backend propio para audio de YouTube, o arrancamos con fallback "sube tu archivo"?
- ¿Estilo visual: oscuro tipo estudio, claro minimal u otro?
