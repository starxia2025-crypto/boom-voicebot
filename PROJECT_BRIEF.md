# Boom Asistente - Brief de producto y arquitectura

## Objetivo general

Crear una webapp interna movil para empleados de Muebles Boom, optimizada para telefono, con una interfaz tipo conversacion de voz inspirada en ChatGPT Voice. Al abrir la aplicacion debe verse directamente un boton grande para comenzar a hablar con el bot. La conversacion debe quedar visible en un hilo, mostrando lo que dijo o transcribio el usuario y lo que respondio el bot.

## Reglas funcionales clave

- El bot no debe inventar informacion.
- El bot no debe navegar por internet.
- El bot no debe buscar informacion externa.
- El bot solo puede responder usando la informacion disponible en `muebles.csv` o, en una fase futura, una Google Sheet autorizada.
- Si no encuentra informacion suficiente en los datos cargados, debe responder exactamente: "No tengo informacion suficiente en la base de datos para responder eso."
- No mostrar una seccion de fuentes consultadas en la interfaz.
- No mostrar archivos consultados al usuario final.
- Registrar internamente los datos usados para auditoria.

## Aclaracion importante sobre conectividad

La restriccion correcta no es "sin internet en absoluto", porque eso impediria usar OpenAI API si se habilita el LLM. La regla correcta es esta:

- No permitir busquedas web, scraping, navegacion ni consulta de fuentes externas.
- El backend no debe depender de internet para obtener datos de negocio.
- La unica salida externa permitida, si se activa, es hacia el endpoint de OpenAI para el LLM.
- Si `OPENAI_API_KEY` no esta configurada, la app debe seguir funcionando con la capa de datos, UI y flujo conversacional, devolviendo una respuesta controlada o deshabilitando la parte de IA segun configuracion.

## Stack requerido

- Frontend: React + Vite + TypeScript.
- Backend: Node.js + Express + TypeScript.
- Base de datos: PostgreSQL.
- ORM/query builder: Prisma.
- Despliegue: Docker + Easypanel.
- Variables de entorno documentadas en `.env.example`.

## Inspiracion visual

Tomar como referencia la imagen adjunta y adaptarla al estilo Muebles Boom:

- rojo como color principal;
- blanco como fondo;
- negro y gris para el texto;
- pequenos acentos amarillos si aportan claridad visual;
- estetica limpia, moderna y util para empleados.

La UI debe sentirse como una webapp interna movil, no como una tienda online.

## Pantalla principal

Debe incluir:

- header con logo/avatar de Boom si esta disponible;
- titulo "Boom Asistente";
- subtitulo "Consultas internas";
- estado "Conectado";
- selector visual de sucursal, por ejemplo "Sucursal Centro";
- hilo de conversacion;
- boton grande central o inferior de voz;
- texto "Conversacion en vivo";
- texto "Toca para hablar";
- input inferior "Escribe tu consulta...";
- boton de enviar.

El boton de voz debe ser el elemento principal de la pantalla.

## Conversacion

Las burbujas deben mostrar:

- mensajes del usuario;
- respuestas del bot;
- hora de cada mensaje;
- transcripcion de lo que se hablo.

No incluir fuentes consultadas ni listados de archivos en la UI.

## Flujo de datos

El sistema no debe consultar el CSV directamente en cada pregunta.

Flujo correcto:

`muebles.csv` -> importador/validador -> PostgreSQL -> chatbot consulta PostgreSQL

Preparar una capa de proveedores:

- `CsvDataProvider` implementado;
- `GoogleSheetsDataProvider` como placeholder;
- `DatabaseProductRepository` implementado sobre PostgreSQL.

Validar columnas del CSV antes de importar y documentar el formato esperado.

## Modelo inicial de productos

Campos sugeridos:

- `id`
- `sku`
- `nombre`
- `categoria`
- `descripcion`
- `material`
- `color`
- `medidas`
- `precio_eur`
- `stock`
- `sucursal`
- `ubicacion`
- `actualizado_en`

Si el CSV trae nombres distintos, crear un mapeador claro y documentado.

## Conversaciones y auditoria

Guardar conversaciones en PostgreSQL:

- `conversation_id`
- `branch`
- `created_at`
- `updated_at`
- `messages`

Cada mensaje debe poder guardar:

- `role`: `user` / `assistant` / `system`
- `content`
- `input_type`: `text` / `voice`
- `created_at`
- `transcript_confidence` opcional

Guardar tambien logs internos de:

- consulta original;
- consulta normalizada;
- productos encontrados;
- respuesta generada;
- si hubo o no datos suficientes;
- errores.

## IA

- Usar OpenAI API para el LLM.
- La API key debe vivir solo en el backend.
- El frontend nunca debe llamar directamente a OpenAI.
- Crear un servicio `AiService`.
- El prompt del sistema debe obligar al modelo a responder solo con los datos recibidos desde PostgreSQL.
- Antes de llamar al LLM, el backend debe buscar productos o datos relevantes en PostgreSQL.
- El modelo solo debe recibir resultados filtrados y relevantes, no la base completa.
- Si la busqueda no devuelve resultados suficientes, el backend debe evitar la llamada al modelo o marcar explicitamente que no hay datos suficientes.

Reglas antialucinacion:

- no inventar precios;
- no inventar stock;
- no inventar sucursales;
- no inventar disponibilidad;
- no recomendar productos inexistentes;
- no responder preguntas fuera de los datos autorizados.

## Voz, transcripcion y TTS

La primera version debe priorizar opciones gratuitas o sin coste por token para voz, sin obligar al uso de STT/TTS de OpenAI.

### Modo por defecto

- STT: Web Speech API `SpeechRecognition` del navegador si esta disponible.
- TTS: Web Speech API `speechSynthesis` del navegador.
- LLM: OpenAI API.

### Restricciones y compatibilidad

- `SpeechRecognition` no esta soportado igual en todos los moviles.
- Debe funcionar especialmente bien en Chrome sobre Android.
- Si no hay soporte de voz en el navegador, la app debe ofrecer fallback a teclado sin romper el flujo.
- Mostrar un mensaje claro cuando la transcripcion no este disponible: "La transcripcion de voz no esta disponible en este dispositivo. Usa el teclado o configura un proveedor alternativo."

### Arquitectura de proveedores

Implementar interfaces intercambiables para:

- `BrowserSpeechRecognitionService`
- `BrowserTextToSpeechService`
- `OpenAITranscriptionProvider`
- `OpenAITextToSpeechProvider`
- `OpenAIRealtimeProvider`
- `LocalWhisperProvider`

Los proveedores OpenAI de voz deben quedar solo como opcion futura u opcional por variables de entorno. No deben ser una dependencia obligatoria de la primera version.

### Experiencia de conversacion

No implementar OpenAI Realtime API como requisito base. Simular una conversacion fluida turn-by-turn con:

- boton grande "Toca para hablar";
- inicio de reconocimiento de voz;
- transcripcion visible en el hilo;
- envio automatico al backend al terminar de hablar;
- respuesta del bot;
- lectura automatica opcional de la respuesta con `speechSynthesis`.

Estados visuales:

- "Escuchando..."
- "Procesando..."
- "Respondiendo..."
- "Listo"

## Seguridad y restricciones

- No hacer web scraping.
- No usar APIs externas no solicitadas.
- No llamar a buscadores.
- No instalar dependencias que hagan llamadas externas en runtime sin necesidad.
- Limitar la salida externa del backend al endpoint de OpenAI solo cuando `OPENAI_API_KEY` este configurada.
- Sanitizar entradas del usuario.
- Limitar longitud de pregunta.
- Limitar tamano del CSV.
- Manejar errores sin exponer stack traces.
- No guardar claves en el frontend.
- Preparar CORS para dominio configurado.
- Preparar rate limiting basico.
- Mantener logs limpios.

## Usuarios

No implementar login todavia, pero dejar preparada la estructura futura:

- tabla `users`;
- tabla `roles`;
- tabla `branches`;
- relacion usuario-sucursal;
- middleware placeholder de autenticacion;
- campo `user_id` opcional en conversaciones.

Por ahora, permitir modo interno anonimo con `branch` configurable por variable de entorno o selector en frontend.

## Endpoints minimos

- `GET /api/health`
- `POST /api/import/csv`
- `GET /api/products/search`
- `POST /api/chat`
- `GET /api/conversations`
- `GET /api/conversations/:id`
- `GET /api/config/public`

## Requisitos frontend

- mobile-first;
- responsive para movil;
- PWA si no complica;
- estado de conexion;
- hilo de conversacion persistente durante la sesion;
- carga de historial desde PostgreSQL;
- boton grande de voz;
- input de texto;
- boton enviar;
- boton para activar o desactivar respuesta hablada;
- sin fuentes consultadas visibles.

## Docker y Easypanel

Preparar:

- `Dockerfile` de produccion;
- `docker-compose.yml` para desarrollo local con `app` y `postgres`.

Variables previstas:

- `DATABASE_URL`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `APP_URL`
- `CORS_ORIGIN`
- `DEFAULT_BRANCH`
- `VOICE_STT_PROVIDER=browser`
- `VOICE_TTS_PROVIDER=browser`

Pasos de despliegue documentados:

1. Crear proyecto.
2. Conectar repo GitHub.
3. Crear servicio PostgreSQL.
4. Configurar variables.
5. Desplegar app.
6. Importar `muebles.csv`.

## Calidad y estructura

- Separar frontend y backend en carpetas claras.
- Comentar solo decisiones importantes.
- Crear servicios:
  - `CsvImportService`
  - `ProductSearchService`
  - `AiService`
  - `ConversationService`
  - `VoiceService` o proveedores de voz
- Crear `README` completo.
- Crear `.env.example`.
- Crear datos de ejemplo `muebles.example.csv`.
- Crear migraciones de base de datos.
- Anadir scripts:
  - `dev`
  - `build`
  - `start`
  - `db:migrate`
  - `import:csv`

## Criterio de exito

- La webapp abre desde movil.
- La interfaz refleja la referencia visual.
- El usuario puede hablar tocando el boton principal.
- La pregunta queda transcrita en el hilo cuando el dispositivo lo permite.
- Si no hay soporte de voz, el usuario puede continuar por teclado.
- El backend busca en PostgreSQL datos importados desde `muebles.csv`.
- El bot responde solo si encuentra datos suficientes.
- La respuesta queda guardada en PostgreSQL.
- La respuesta puede leerse en voz alta con TTS del navegador.
- Todas las conversaciones quedan guardadas.
- No existe navegacion ni busqueda externa.
- El proyecto queda listo para subir a GitHub y desplegar en Easypanel con Docker.
