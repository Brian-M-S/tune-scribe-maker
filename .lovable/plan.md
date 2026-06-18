
## 1) Escalas — Catálogo completo de afinaciones

Ampliar `TUNINGS` en `src/routes/_authenticated.scales.tsx` para incluir todas las afinaciones comunes de guitarra (6, 7 y 12 cuerdas) más bajo. Agrupadas por categoría en un `<optgroup>` dentro del `<select>` para que no sea una lista plana enorme.

**Estándar y variantes de semitono**
- Estándar (E A D G B E)
- Eb / Half-step down (Eb Ab Db Gb Bb Eb)
- D estándar / Whole-step down (D G C F A D)
- C# estándar
- C estándar (C F Bb Eb G C)
- B estándar (7º traste abajo)

**Drop tunings**
- Drop D (D A D G B E)
- Drop C# (C# G# C# F# A# D#)
- Drop C (C G C F A D)
- Drop B (B F# B E G# C#)
- Drop A (A E A D F# B)

**Open tunings (slide / blues / folk)**
- Open D (D A D F# A D)
- Open D minor (D A D F A D)
- Open E (E B E G# B E)
- Open G (D G D G B D)
- Open G minor (D G D G Bb D)
- Open A (E A E A C# E)
- Open C (C G C G C E)
- DADGAD (D A D G A D)
- Double Drop D (D A D G B D)

**Otras / extendidas**
- 7 cuerdas estándar (B E A D G B E)
- 7 cuerdas Drop A
- 8 cuerdas estándar (F# B E A D G B E)
- Nashville / High-strung
- All-fourths (E A D G C F)

**Bajo**
- Bajo 4 cuerdas estándar (E A D G)
- Bajo 4 Drop D
- Bajo 5 cuerdas (B E A D G)
- Bajo 6 cuerdas (B E A D G C)

El fretboard ya soporta cualquier número de cuerdas (renderiza `tuning.length` filas), así que no hay cambios en el visualizador.

## 2) Búsqueda de tabs — Diagnóstico y arreglo

Síntoma: en `/practice` no se muestran resultados.

Causa probable: `searchSongsterr` llama directamente a `songsterr.com/a/ra/songs.json` desde el servidor edge. La respuesta puede:
- Devolver HTML/redirect en lugar de JSON (User-Agent bloqueado).
- Cambiar de hostname (a `www.songsterr.com` o requerir `?size=...&pattern=...` con otra forma).
- Devolver 403 sin headers de navegador.

Pasos:
1. Añadir logs temporales en el handler (`console.log` del status y primeros 200 chars del body) para confirmar la causa exacta vía dev-server logs.
2. Cambiar el User-Agent a uno tipo navegador real (`Mozilla/5.0 …`) y añadir `Accept-Language`. Songsterr suele responder con esos headers.
3. Si la respuesta no es JSON, hacer `res.text()` primero y parsear con try/catch — y devolver `error` legible al cliente en vez de array vacío silencioso.
4. En el front (`_authenticated.practice.tsx`):
   - Mostrar el `m.data.error` cuando exista, ahora se traga silenciosamente.
   - Mostrar estado "Searching…" más claro y mensaje cuando aún no se ha buscado.
5. Verificar con Playwright contra `localhost:8080/practice`: introducir una query ("Metallica"), pulsar buscar, capturar screenshot y revisar consola/red. Iterar hasta ver resultados reales.

## Archivos a tocar

- `src/routes/_authenticated.scales.tsx` — ampliar `TUNINGS` y agrupar el `<select>` con `<optgroup>`.
- `src/lib/songsterr.functions.ts` — headers de navegador, parseo defensivo, propagar errores.
- `src/routes/_authenticated.practice.tsx` — mostrar errores de la búsqueda.

## Fuera de alcance

- No tocar el visor AlphaTab, perfil, auth ni librería.
- No cambiar la fuente de datos (sigue siendo Songsterr público + link a Ultimate Guitar).
