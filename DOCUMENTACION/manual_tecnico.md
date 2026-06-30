# 📋 Documentación Técnica — Lumark Group Telegram Mini App

## Descripción General

Sistema de registro de propiedades accesible desde **Telegram** como Mini App. Permite a los agentes llenar un formulario en pasos, subir imágenes al cloud y guardar los datos automáticamente en una **Hoja de Cálculo de Google Sheets**. Todo sin salir de Telegram.

---

## 🧱 Stack Tecnológico

| Tecnología | Rol | Versión |
|---|---|---|
| **Next.js** | Framework principal (frontend + backend API) | 16.x |
| **TypeScript** | Tipado estático en todo el proyecto | 5.x |
| **React** | Interfaz del formulario (Multi-step form) | 19.x |
| **Tailwind CSS** | Estilos y diseño visual del formulario | 4.x |
| **Telegraf** | Librería para construir el Bot de Telegram | ^4.x |
| **Telegram Web App API** | SDK para ejecutar la app dentro de Telegram | (CDN oficial) |
| **Google APIs (googleapis)** | Cliente oficial para conectar con Google Sheets | ^144.x |
| **Cloudinary** | Almacenamiento y CDN de imágenes | API v1 |
| **Cloudflare Tunnel** | Túnel HTTPS para exponer el servidor local a internet | (cloudflared CLI) |
| **Node.js** | Entorno de ejecución del servidor | v26.x |

---

## 🔗 Ecosistema Tecnológico — Cómo se Conecta Todo

```
┌─────────────────────────────────────────────────────────┐
│                     TELEGRAM                            │
│                                                         │
│   Agente escribe /cargarpropiedad                       │
│              │                                          │
│              ▼                                          │
│   ┌──────────────────┐    Telegraf (bot.js)             │
│   │   BOT TELEGRAM   │───────────────────────┐          │
│   └──────────────────┘                       │          │
│              │ Abre WebApp Button             │          │
│              ▼                               ▼          │
│   ┌──────────────────┐          Cloudflare Tunnel       │
│   │   MINI APP       │◄────────────────────────────┐   │
│   │  (formulario)    │                             │   │
│   └──────────────────┘                             │   │
└─────────────────────────────────────────────────────┘   │
         │                                           │
         │ fetch POST /api/submit                    │
         ▼                                           │
┌─────────────────────────────────────────────────┐  │
│            NEXT.JS SERVER (localhost:3000)       │◄─┘
│                                                 │
│  ┌─────────────────────────────────────────┐    │
│  │         src/app/page.tsx                │    │
│  │     Formulario React (4 pasos)          │    │
│  └────────────────┬────────────────────────┘    │
│                   │                             │
│  ┌────────────────▼────────────────────────┐    │
│  │     src/app/api/submit/route.ts         │    │
│  │         API Route (POST)                │    │
│  └────────────────┬────────────────────────┘    │
└───────────────────┼─────────────────────────────┘
                    │
         ┌──────────┴──────────┐
         │                     │
         ▼                     ▼
┌────────────────┐   ┌──────────────────────┐
│  CLOUDINARY    │   │   GOOGLE SHEETS API  │
│                │   │                      │
│ Almacena img   │   │ Service Account Auth │
│ Devuelve URL   │   │ Append row en Sheet  │
│ (secure_url)   │   │ "catalog_other"      │
└────────────────┘   └──────────────────────┘
```

---

## 📂 Estructura de Archivos del Proyecto

```
telegram-property-app/
├── bot.js                          ← Bot de Telegram (Telegraf)
├── .env.local                      ← Variables de entorno (NUNCA subir a git)
├── next.config.ts                  ← Config de Next.js (allowedDevOrigins, devIndicators)
├── package.json                    ← Dependencias del proyecto
│
└── src/
    └── app/
        ├── layout.tsx              ← Layout raíz (carga el SDK de Telegram)
        ├── globals.css             ← Estilos globales (Tailwind)
        ├── page.tsx                ← Formulario Multi-Step (4 pasos)
        └── api/
            └── submit/
                └── route.ts        ← API Route: recibe datos y escribe en Google Sheets
```

---

## 🔄 Flujo de Datos Completo

### 1. El agente abre la Mini App
```
Agente en Telegram
  → Escribe /cargarpropiedad
  → Bot (bot.js) responde con botón WebApp
  → Telegram abre: https://[cloudflare-tunnel].trycloudflare.com
  → Se carga page.tsx (formulario de 4 pasos)
```

### 2. Subida de imagen (Cloudinary)
```
Agente selecciona foto desde su galería
  → page.tsx hace fetch a:
    POST https://api.cloudinary.com/v1_1/dbjep0b6x/image/upload
    body: { file, upload_preset: "CATALOGO LUMARK GROUP" }
  → Cloudinary devuelve { secure_url: "https://res.cloudinary.com/..." }
  → La URL se guarda en formData.image_link
```

### 3. Envío del formulario a Google Sheets
```
Agente toca "Enviar a Google Sheets"
  → page.tsx hace fetch a:
    POST /api/submit
    body: { title, description, price, image_link, link,
            custom_label_0..4, custom_number_0..4 }

  → route.ts (API):
    1. Autentica con Google via Service Account
    2. Detecta la hoja "catalog_other" por gid=1909380078
    3. Genera ID único automático (ej. PE-213-504)
    4. Construye la fila en el orden exacto de columnas
    5. Hace sheets.spreadsheets.values.append()

  → Google Sheets recibe la nueva fila ✅
  → Bot muestra alerta de éxito y cierra la Mini App
```

---

## 📊 Columnas del Google Sheet (Orden Exacto)

| Columna | Campo | Descripción |
|---|---|---|
| A | `id` | ID autogenerado (ej. `PE-213-504`) |
| B | `image_link` | URL de Cloudinary de la imagen |
| C | `description` | Descripción completa de la propiedad |
| D | `custom_label_0` | Nombre del proyecto (ej. Puerto Escondido) |
| E | `custom_label_1` | Ciudad (ej. Rosarito) |
| F | `custom_label_2` | Tipo (ej. Terreno) |
| G | `custom_label_3` | Modalidad (ej. Venta) |
| H | `custom_label_4` | Condición (ej. Vista al Mar) |
| I | `custom_number_0` | Superficie en m² |
| J | `custom_number_1` | Precio total |
| K | `custom_number_2` | Mensualidad |
| L | `custom_number_3` | Meses de financiamiento |
| M | `custom_number_4` | Apartado (USD) |
| N | `title` | Título completo de la propiedad |
| O | `price` | Precio formateado (ej. `56560 USD`) |
| P | `link` | URL de la landing page |

---

## 🔐 Variables de Entorno (`.env.local`)

| Variable | Descripción |
|---|---|
| `CLOUDINARY_CLOUD_NAME` | Nombre del cloud (`dbjep0b6x`) |
| `CLOUDINARY_API_KEY` | API Key de Cloudinary |
| `CLOUDINARY_API_SECRET` | API Secret de Cloudinary |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Cloud Name expuesto al frontend |
| `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET` | Preset de carga (`CATALOGO LUMARK GROUP`) |
| `GOOGLE_CLIENT_EMAIL` | Email de la Service Account de Google |
| `GOOGLE_PRIVATE_KEY` | Llave privada de la Service Account |
| `SPREADSHEET_ID` | ID del Google Sheet (`1ZCCirL1JXtQ7UIxcxZN9i6y716xY8NgEEQC3QmJu5gI`) |

> [!CAUTION]
> El archivo `.env.local` contiene credenciales privadas. **NUNCA** lo subas a GitHub ni lo compartas. Está excluido automáticamente por `.gitignore`.

---

## 🚀 Guía de Arranque del Sistema

Para activar el sistema completo necesitas tener **3 procesos corriendo al mismo tiempo**:

### Terminal 1 — Servidor Web
```bash
cd "/Users/axelsoberanes/Desktop/BOT TELEGRAM/telegram-property-app"
npm run dev
```
*Inicia el servidor Next.js en `http://localhost:3000`*

### Terminal 2 — Túnel HTTPS (Cloudflare)
```bash
cloudflared tunnel --url http://localhost:3000
```
*Genera una URL pública tipo `https://xxxx.trycloudflare.com`*
> ⚠️ **Copia la URL** que genera Cloudflare y actualízala en `bot.js` en la variable `WEB_APP_URL`.

### Terminal 3 — Bot de Telegram
```bash
cd "/Users/axelsoberanes/Desktop/BOT TELEGRAM/telegram-property-app"
node bot.js
```
*Activa el Bot en Telegram. Escribe `/cargarpropiedad` para abrir el formulario.*

---

## 📦 Dependencias Principales

```json
{
  "next": "^16.x",
  "react": "^19.x",
  "typescript": "^5.x",
  "telegraf": "^4.x",
  "googleapis": "^144.x",
  "lucide-react": "^0.x",
  "@twa-dev/types": "^0.x"
}
```

---

## 🔑 Cuentas y Servicios Involucrados

| Servicio | Cuenta | Propósito |
|---|---|---|
| **Telegram** | @Lumarkgroup Bot | Canal de acceso para agentes |
| **Google Cloud** | `gen-lang-client-0009239497` | Proyecto que contiene la Service Account |
| **Google Sheets** | ID: `1ZCCirL1JXtQ7UIxcxZN9i6y716xY8NgEEQC3QmJu5gI` | Base de datos del catálogo |
| **Cloudinary** | Cloud: `dbjep0b6x` | Almacenamiento de imágenes |
| **Cloudflare** | (cuenta free) | Túnel HTTPS para exponer el servidor |

---

*Documentación generada el 29 de Junio de 2026 — Lumark Group Telegram Mini App v1.0*
