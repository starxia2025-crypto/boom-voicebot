# Boom Asistente

Webapp interna movil para empleados de Muebles Boom. Esta primera version incluye frontend React mobile-first, backend Express con TypeScript, PostgreSQL con Prisma 7, importacion de CSV, historial de conversaciones y una capa de voz con servicio Python dedicado para Piper, faster-whisper y wake word en primer plano.

## Lo que ya hace

- UI movil inspirada en la referencia visual.
- Chat interno con hilo persistente.
- Boton grande de voz con estados `Escuchando`, `Procesando`, `Respondiendo` y `Listo`.
- Modo manos libres: tras responder, vuelve a escuchar hasta que el usuario detenga el micro.
- STT local-servidor via `faster-whisper`.
- TTS local-servidor via `Piper`.
- Wake word opcional en primer plano con `OpenWakeWord`.
- Fallback claro a teclado cuando el movil no soporte grabacion.
- Importacion de `muebles.csv` a PostgreSQL.
- Consulta a productos desde base de datos, no desde el CSV en cada pregunta.
- Persistencia de conversaciones y logs de auditoria.
- Uso opcional de OpenAI solo desde backend.
- Sin scraping, sin buscadores y sin fuentes externas en la respuesta.
- Prompt de sistema interno para saludo, tono de companero y peticion de aclaraciones.
- Aclaracion automatica cuando hay varias coincidencias de producto.
- Dockerfile y `docker-compose.yml` listos para despliegue.

## Estructura

- `frontend/`: React + Vite + TypeScript.
- `backend/`: Express + TypeScript + Prisma.
- `voice-service/`: FastAPI + Piper + faster-whisper + OpenWakeWord.
- `data/`: CSV real y ejemplo.
- `docs/`: documentacion de formato de datos.

## Requisitos

- Node.js 22 o superior.
- PostgreSQL accesible por `DATABASE_URL`.
- Opcional: `OPENAI_API_KEY` si quieres LLM real.
- Docker para levantar Postgres local con `docker-compose.yml`.

## Variables de entorno

Parte de `.env.example`:

- `DATABASE_URL`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `OPENAI_REASONING_EFFORT`
- `APP_URL`
- `CORS_ORIGIN`
- `DEFAULT_BRANCH`
- `VOICE_STT_PROVIDER=faster_whisper`
- `VOICE_TTS_PROVIDER=piper`
- `VOICE_SERVICE_URL`
- `VOICE_WAKEWORD_ENABLED`
- `VOICE_WAKEWORD_PHRASE`
- `WHISPER_HOTWORDS`

## Desarrollo local

1. Copia `.env.example` a `.env`.
2. Asegura que PostgreSQL este disponible.
3. Genera cliente Prisma:

```bash
npm run db:generate --workspace backend
```

4. Aplica migraciones:

```bash
npm run db:migrate
```

5. Importa el CSV:

```bash
npm run import:csv --workspace backend -- "D:\\mueblesBOOM\\VoiceBot\\data\\muebles.csv"
```

6. Arranca frontend y backend:

```bash
npm run dev
```

Frontend: `http://localhost:5173`

Backend: `http://localhost:4000`

## Endpoints

- `GET /api/health`
- `POST /api/import/csv`
- `GET /api/products/search?query=sofa`
- `POST /api/chat`
- `GET /api/conversations`
- `GET /api/conversations/:id`
- `GET /api/config/public`

## Flujo de datos

`muebles.csv` -> `CsvImportService` -> PostgreSQL -> `ProductSearchService` -> `AiService` -> respuesta

Audio:

`frontend` -> `backend /api/voice/*` -> `voice-service` -> `Piper / faster-whisper / OpenWakeWord`

El modelo nunca navega ni busca fuera de la base autorizada. El prompt de sistema vive en:

`backend/src/prompts/systemPrompt.ts`

Si no hay datos suficientes, responde de forma honesta y orienta al empleado a probar con una referencia exacta o un nombre mas concreto.

Modelo recomendado para este caso:

- `OPENAI_MODEL=gpt-5.5`
- `OPENAI_REASONING_EFFORT=medium`

Fuente oficial de modelo actual: [OpenAI latest model](https://developers.openai.com/api/docs/guides/latest-model)

## Despliegue en Easypanel

1. Sube el repo a GitHub.
2. Crea el proyecto en Easypanel.
3. Conecta el repo.
4. Crea un servicio PostgreSQL gestionado.
5. Crea un servicio `voice` desde `voice-service/Dockerfile`.
6. Configura variables de entorno del `.env.example` y las del servicio de voz.
7. Despliega la app Node usando el `Dockerfile`.
8. Ejecuta migraciones Prisma.
9. Importa `data/muebles.csv`.

## Notas de voz

- El frontend ya no depende de `SpeechRecognition`; usa grabacion de microfono y transcripcion en servidor.
- `Piper` necesita un modelo ONNX y, normalmente, su archivo `.onnx.json`.
- `faster-whisper` funciona en CPU con `int8`, aunque tardara mas que en GPU.
- `OpenWakeWord` queda limitado a primer plano. No se considera fiable en otra pestana movil.
- Para usar la frase `Oye Boom` o la interrupcion con `boom`, necesitas un modelo de wake word en `voice-service/models/`.

## Estado de esta entrega

- `npm run build` funciona en frontend y backend.
- No he podido ejecutar una prueba completa con PostgreSQL o Docker en este entorno porque `docker` no esta instalado aqui.
- La estructura esta lista para GitHub y para continuar con el despliegue en Easypanel.
