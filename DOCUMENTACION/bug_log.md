# 🐛 Registro de Fallos y Soluciones — Lumark Group Mini App

> Registro cronológico de todos los errores encontrados durante el desarrollo y las soluciones aplicadas.

---

## BUG #01 — Pantalla de advertencia de Localtunnel

| | |
|---|---|
| **Fecha** | 29 Jun 2026 |
| **Severidad** | 🟡 Media |
| **Estado** | ✅ Resuelto |

**Síntoma**
Al abrir la Mini App en Telegram, se mostraba la página de Localtunnel pidiendo ingresar la IP del dispositivo antes de poder ver el formulario.

**Causa Raíz**
Localtunnel muestra una pantalla de verificación anti-abuso en cada cliente nuevo. Esta pantalla no es bypasseable en el navegador interno de Telegram.

**Solución Aplicada**
Se sustituyó Localtunnel por **Cloudflare Tunnel** (`cloudflared tunnel --url http://localhost:3000`), que no muestra ninguna pantalla de advertencia y genera una URL HTTPS válida directamente.

**Archivo Afectado**
- `bot.js` → Variable `WEB_APP_URL`

---

## BUG #02 — Mini App en blanco (pantalla vacía)

| | |
|---|---|
| **Fecha** | 29 Jun 2026 |
| **Severidad** | 🔴 Crítica |
| **Estado** | ✅ Resuelto |

**Síntoma**
Al abrir la Mini App desde Telegram, la pantalla cargaba completamente en blanco sin mostrar ningún contenido ni error visible.

**Causa Raíz**
Next.js en modo desarrollo bloquea por defecto las peticiones que provienen de dominios externos (Cross-Origin). El dominio de Cloudflare Tunnel (`*.trycloudflare.com`) no estaba en la lista blanca.

**Error en logs del servidor**
```
⚠ Blocked cross-origin request to Next.js dev resource
/_next/webpack-hmr from "writes-fabulous-connected-gmt.trycloudflare.com"
Cross-origin access to Next.js dev resources is blocked by default for safety.
```

**Solución Aplicada**
Se agregó `allowedDevOrigins` en `next.config.ts`:
```ts
allowedDevOrigins: [
  "writes-fabulous-connected-gmt.trycloudflare.com",
  "*.trycloudflare.com",
],
```

**Archivo Afectado**
- `next.config.ts`

---

## BUG #03 — Error de compilación "name `Home` is defined multiple times"

| | |
|---|---|
| **Fecha** | 29 Jun 2026 |
| **Severidad** | 🔴 Crítica |
| **Estado** | ✅ Resuelto |

**Síntoma**
Next.js arrojaba un error de compilación y la página no cargaba. El error aparecía en el overlay de errores de desarrollo dentro de Telegram.

**Error Exacto**
```
the name `Home` is defined multiple times
src/app/page.tsx:6:25
export default function Home() {
```

**Causa Raíz**
En el archivo `page.tsx` se importaba el ícono `Home` de `lucide-react`:
```ts
import { ..., Home } from "lucide-react";
```
Y al mismo tiempo la función principal exportada también se llamaba `Home`:
```ts
export default function Home() { ... }
```
Esto generó un conflicto de nombres en el mismo scope.

**Solución Aplicada**
Se renombró el import del ícono con un alias:
```ts
import { ..., Home as HomeIcon } from "lucide-react";
```

**Archivo Afectado**
- `src/app/page.tsx` → línea 4

---

## BUG #04 — Error al escribir en Google Sheets: "Unable to parse range: Hoja 1!A:T"

| | |
|---|---|
| **Fecha** | 29 Jun 2026 |
| **Severidad** | 🔴 Crítica |
| **Estado** | ✅ Resuelto |

**Síntoma**
Al presionar "Enviar a Google Sheets", el formulario regresaba un error 500 y los datos no se guardaban.

**Error en logs del servidor**
```
Error en API: Unable to parse range: Hoja 1!A:T
POST /api/submit 500 in 256ms
```

**Causa Raíz**
El código asumía que la hoja del spreadsheet se llamaba `"Hoja 1"` (nombre genérico en español). El nombre real de la hoja, visible en la URL (`gid=1909380078`), era **`catalog_other`**.

**Solución Aplicada**
Se actualizó `route.ts` para detectar automáticamente el nombre real de la hoja usando el `gid` numérico:
```ts
const targetSheet = sheetsList.find(
  (s) => s.properties?.sheetId === 1909380078
);
const sheetName = targetSheet?.properties?.title ?? "Sheet1";
```

**Archivo Afectado**
- `src/app/api/submit/route.ts`

---

## BUG #05 — Columnas desalineadas en Google Sheets

| | |
|---|---|
| **Fecha** | 29 Jun 2026 |
| **Severidad** | 🟠 Alta |
| **Estado** | ✅ Resuelto |

**Síntoma**
Los datos se guardaban en Google Sheets pero en las columnas incorrectas. Por ejemplo, el título aparecía en la columna de descripción, y los números en columnas de texto.

**Causa Raíz**
El orden de campos en `rowData` dentro de `route.ts` no coincidía con el orden real de columnas en el spreadsheet del usuario.

**Orden incorrecto (antes)**
```ts
const rowData = [id, title, description, price, sale_price, ...];
```

**Orden correcto (después)**
```ts
// Orden exacto del Sheet: id | image_link | description |
// custom_label_0-4 | custom_number_0-4 | title | price | link
const rowData = [
  generatedId, body.image_link, body.description,
  body.custom_label_0, ..., body.custom_number_0, ...,
  body.title, body.price, body.link
];
```

**Solución Aplicada**
Se reescribió `route.ts` con el orden exacto de las 16 columnas del spreadsheet del usuario.

**Archivo Afectado**
- `src/app/api/submit/route.ts`

---

## BUG #06 — Variable `formData` sombreada en el handler de Cloudinary

| | |
|---|---|
| **Fecha** | 29 Jun 2026 |
| **Severidad** | 🔴 Crítica |
| **Estado** | ✅ Resuelto |

**Síntoma**
Al intentar subir una imagen, la URL de Cloudinary nunca se guardaba en el estado del formulario. La imagen subía a Cloudinary correctamente pero `image_link` permanecía vacío.

**Causa Raíz**
Dentro del handler de subida de imagen se creaba una variable local `formData` para construir el `FormData` del fetch:
```ts
const formData = new FormData(); // ← SOMBREA el estado de React
formData.append("file", file);
```
Esta variable local **ocultaba (shadowing)** el estado `formData` de React, por lo que el `setFormData(prev => ...)` nunca actualizaba el estado correcto.

**Solución Aplicada**
Se renombró la variable local a `uploadData`:
```ts
const uploadData = new FormData();
uploadData.append("file", file);
uploadData.append("upload_preset", uploadPreset);
```

**Archivo Afectado**
- `src/app/page.tsx` → función `handleImageUpload`

---

## BUG #07 — Campos extra enviados al backend (datos sucios)

| | |
|---|---|
| **Fecha** | 29 Jun 2026 |
| **Severidad** | 🟡 Media |
| **Estado** | ✅ Resuelto |

**Síntoma**
El formulario enviaba 3 campos que no existían en el Google Sheet: `sale_price`, `sale_price_effective_date` y `video_url`. Esto generaba ruido innecesario en el payload.

**Causa Raíz**
Durante el desarrollo inicial se incluyeron campos "extra" pensando que podrían ser útiles, pero el usuario no los tiene en su Sheet y tampoco los necesita en el formulario.

**Solución Aplicada**
Se eliminaron los 3 campos de:
1. La interfaz `FormData` en `page.tsx`
2. El objeto `INITIAL_FORM` en `page.tsx`
3. Los inputs del Paso 2 del formulario
4. La interfaz `PropertyBody` en `route.ts`

**Archivos Afectados**
- `src/app/page.tsx`
- `src/app/api/submit/route.ts`

---

## BUG #08 — Error de hidratación de React + botón "Enviando..." congelado

| | |
|---|---|
| **Fecha** | 29 Jun 2026 |
| **Severidad** | 🔴 Crítica |
| **Estado** | ✅ Resuelto |

**Síntoma**
Al presionar "Enviar a Google Sheets", el botón cambiaba a "Enviando..." y se quedaba congelado indefinidamente sin completar la operación. En la pantalla también aparecía el overlay de errores de Next.js con "1 Issue".

**Error Exacto**
```
Console Error: A tree hydrated but some attributes of the server 
rendered HTML didn't match the client properties.

style={{--tg-theme-section-header-text-color:"#6d6d72",
        --tg-theme-header-bg-color:"#f8f8f8", ...}}
```

**Causa Raíz (2 problemas combinados)**

**Causa A — Hydration Mismatch:**
El SDK de Telegram (`telegram-web-app.js`) inyecta variables CSS de tema (`--tg-theme-*`) directamente en el elemento `<html>` del DOM **antes de que React hidrate**. Esto causaba que el HTML del servidor (sin esos atributos) no coincidiera con el HTML del cliente (con los atributos de Telegram), generando el error de hidratación.

**Causa B — Sin timeout en fetch:**
El `fetch` a `/api/submit` no tenía límite de tiempo. Si Google Sheets tardaba en responder o fallaba silenciosamente, `isSubmitting` nunca volvía a `false` y el botón quedaba atascado.

**Solución Aplicada**

Para Causa A — se agregó `suppressHydrationWarning` en `layout.tsx`:
```tsx
<html suppressHydrationWarning ...>
  <body suppressHydrationWarning ...>
```
Esto le indica a React que ignore las diferencias de atributos en estos elementos causadas por scripts externos (Telegram).

Para Causa B — se agregó un `AbortController` con timeout de 15 segundos:
```ts
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 15000);
const res = await fetch("/api/submit", { signal: controller.signal });
clearTimeout(timeout);
```

**Archivos Afectados**
- `src/app/layout.tsx`
- `src/app/page.tsx` → función `submitForm`

---

## BUG #09 — Datos de prueba duplicados en Google Sheets

| | |
|---|---|
| **Fecha** | 29 Jun 2026 |
| **Severidad** | 🟡 Media |
| **Estado** | ✅ Resuelto |

**Síntoma**
La hoja de cálculo mostraba filas duplicadas y con datos de prueba que no correspondían a propiedades reales.

**Causa Raíz**
Durante el debugging y las pruebas de la API se ejecutaron múltiples llamadas `curl` al endpoint `/api/submit` para verificar que el sistema funcionaba. Estas llamadas insertaron filas de prueba en el spreadsheet real.

**IDs de filas de prueba insertadas**
- `SR-140-001`
- `QB-253-438`
- `AE-213-504`
- `AE-215-004`

**Solución Aplicada**
Se creó un script temporal `cleanup.js` que:
1. Se conectó a Google Sheets con la Service Account
2. Leyó todas las filas y comparó los IDs contra la lista de IDs de prueba
3. Eliminó solo las filas correspondientes usando `batchUpdate` con `deleteDimension`
4. Mantuvo intactos el encabezado y la fila `PE-140-001` (dato real del usuario)

El script fue eliminado del proyecto después de ejecutarse.

**Archivos Afectados**
- `cleanup.js` (temporal, eliminado después de ejecutarse)

---

## BUG #10 — Valores numéricos no se guardan en el estado (iOS/Telegram WebView)

| | |
|---|---|
| **Fecha** | 29 Jun 2026 |
| **Severidad** | 🟠 Alta |
| **Estado** | ✅ Resuelto |

**Síntoma**
Al usar el formulario en el WebView nativo de Telegram en iOS, si se digita un número y luego se presiona el botón "Enviar" sin haber quitado el foco del campo (`onBlur`), el valor no se guarda en el estado del formulario.

**Causa Raíz**
Un problema conocido de WebKit/iOS con los inputs `type="number"`. Al mantener el teclado numérico abierto y presionar una acción externa (como el MainButton de Telegram), el navegador no dispara el evento `onChange` o `onBlur` a tiempo para que React capture el último valor ingresado.

**Solución Aplicada**
Se cambiaron todos los inputs numéricos a `type="text"` y se les agregó `inputMode="decimal"`. Esto engaña al móvil para que abra el teclado numérico, pero React lo trata como un input de texto normal, esquivando el bug de WebKit. Además, se añadió un listener `onBlur={handleChange}` de respaldo.

**Archivo Afectado**
- `src/app/page.tsx`

---

## BUG #11 — Botón nativo de Telegram envía estado "rancio" (Stale Closure)

| | |
|---|---|
| **Fecha** | 29 Jun 2026 |
| **Severidad** | 🔴 Crítica |
| **Estado** | ✅ Resuelto |

**Síntoma**
Al llenar el Paso 4 y presionar el "MainButton" de Telegram para enviar los datos, los datos numéricos llegaban completamente vacíos al Google Sheet (el resto de los pasos llegaban bien). Si se usaba el botón normal HTML de la web, sí funcionaba.

**Causa Raíz**
Un problema clásico de React: **Stale Closure** (Cierre de estado rancio).
El botón nativo de Telegram se configuraba usando `useEffect` cuando el usuario llegaba al Paso 4. En ese momento exacto, se le asignaba la función `submitForm`, la cual capturaba una copia en memoria de `formData` que estaba vacía. Los eventos de teclado subsecuentes actualizaban el estado de React, pero el botón de Telegram seguía disparando la función atada a la versión "vieja" y vacía de los datos.

**Solución Aplicada**
Se implementó un `useRef` (`formDataRef`) para mantener una referencia en tiempo real de los datos del formulario:
```tsx
const formDataRef = useRef<FormData>(INITIAL_FORM);
// Se actualiza la referencia en cada pulsación de tecla
```
Luego, la función `submitForm` se modificó para leer los datos siempre desde `formDataRef.current` en lugar del estado directo `formData`, asegurando que siempre se envía la información más reciente sin importar cuándo se ató el evento al botón.

**Archivo Afectado**
- `src/app/page.tsx`

---

## BUG #12 — Error de Typescript en compilación (Window.Telegram)

| | |
|---|---|
| **Fecha** | 29 Jun 2026 |
| **Severidad** | 🔴 Crítica |
| **Estado** | ✅ Resuelto |

**Síntoma**
Al intentar compilar el proyecto para producción en Hostinger (`npm run build`), el proceso fallaba con el código de error: `Type error: Property 'Telegram' does not exist on type 'Window & typeof globalThis'`.

**Causa Raíz**
En TypeScript, el objeto global `window` tiene un tipado estricto. El SDK de Telegram Web App inyecta la propiedad `window.Telegram` en tiempo de ejecución, pero TypeScript no sabe que esa propiedad existe durante el tiempo de compilación, lo que causa un fallo de tipado (Type Error).

**Solución Aplicada**
Se agregó una declaración global (`declare global`) en la parte superior de `page.tsx` para extender la interfaz `Window` nativa y avisarle a TypeScript que la propiedad `Telegram` existe (de tipo `any`), permitiendo que el build pase correctamente sin errores de tipado.

**Archivo Afectado**
- `src/app/page.tsx`

---

## 📊 Resumen de Bugs

| # | Descripción | Severidad | Estado |
|---|---|---|---|
| 01 | Pantalla advertencia Localtunnel | 🟡 Media | ✅ |
| 02 | Mini App en blanco (Cross-Origin) | 🔴 Crítica | ✅ |
| 03 | Conflicto de nombre `Home` | 🔴 Crítica | ✅ |
| 04 | Nombre hoja "Hoja 1" incorrecto | 🔴 Crítica | ✅ |
| 05 | Columnas desalineadas | 🟠 Alta | ✅ |
| 06 | Variable `formData` sombreada | 🔴 Crítica | ✅ |
| 07 | Campos extra enviados al backend | 🟡 Media | ✅ |
| 08 | Hidratación + botón congelado | 🔴 Crítica | ✅ |
| 09 | Datos de prueba duplicados | 🟡 Media | ✅ |
| 10 | iOS/Telegram no guarda números | 🟠 Alta | ✅ |
| 11 | Botón Telegram envía datos viejos | 🔴 Crítica | ✅ |
| 12 | Typescript Error Window.Telegram | 🔴 Crítica | ✅ |

**Total: 12 bugs encontrados y resueltos ✅**

---

*Documento actualizado: 29 de Junio de 2026 — Lumark Group Telegram Mini App v1.0*
