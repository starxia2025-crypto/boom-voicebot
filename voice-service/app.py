import os
import subprocess
import tempfile
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse, Response
from faster_whisper import WhisperModel
from openwakeword.model import Model as WakeWordModel
from pydantic import BaseModel


class TtsRequest(BaseModel):
    text: str


class Settings:
    port = int(os.getenv("VOICE_SERVICE_PORT", "8000"))
    piper_model_path = os.getenv("PIPER_MODEL_PATH", "/models/es_ES-sharvard-medium.onnx")
    piper_config_path = os.getenv("PIPER_CONFIG_PATH", "")
    piper_speaker_id = os.getenv("PIPER_SPEAKER_ID", "")
    piper_binary = os.getenv("PIPER_BINARY", "piper")
    whisper_model_size = os.getenv("WHISPER_MODEL_SIZE", "small")
    whisper_device = os.getenv("WHISPER_DEVICE", "cpu")
    whisper_compute_type = os.getenv("WHISPER_COMPUTE_TYPE", "int8")
    whisper_language = os.getenv("WHISPER_LANGUAGE", "es")
    wakeword_enabled = os.getenv("WAKEWORD_ENABLED", "false").lower() == "true"
    wakeword_phrase = os.getenv("WAKEWORD_PHRASE", "Oye Boom")
    wakeword_model_path = os.getenv("WAKEWORD_MODEL_PATH", "")


settings = Settings()
app = FastAPI(title="Boom Voice Service")
whisper_model: WhisperModel | None = None
wakeword_model: WakeWordModel | None = None


def get_whisper_model() -> WhisperModel:
    global whisper_model

    if whisper_model is None:
      whisper_model = WhisperModel(
          settings.whisper_model_size,
          device=settings.whisper_device,
          compute_type=settings.whisper_compute_type,
      )

    return whisper_model


def get_wakeword_model() -> WakeWordModel | None:
    global wakeword_model

    if not settings.wakeword_enabled or not settings.wakeword_model_path:
        return None

    if wakeword_model is None:
        model_path = Path(settings.wakeword_model_path)
        if not model_path.exists():
            raise HTTPException(
                status_code=503,
                detail="No se ha encontrado el modelo configurado para la palabra de activacion.",
            )

        wakeword_model = WakeWordModel(wakeword_models=[str(model_path)])

    return wakeword_model


def ensure_piper_model():
    model_path = Path(settings.piper_model_path)
    if not model_path.exists():
        raise HTTPException(
            status_code=503,
            detail="No se ha encontrado el modelo de Piper configurado en el servicio de voz.",
        )


@app.get("/health")
def health():
    return {
        "status": "ok",
        "wakewordEnabled": settings.wakeword_enabled,
        "wakewordPhrase": settings.wakeword_phrase,
    }


@app.post("/tts")
def tts(payload: TtsRequest):
    ensure_piper_model()

    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temporary_file:
        output_path = temporary_file.name

    command = [
        settings.piper_binary,
        "--model",
        settings.piper_model_path,
        "--output_file",
        output_path,
    ]

    config_path = Path(settings.piper_config_path) if settings.piper_config_path else None
    if config_path and config_path.exists():
        command.extend(["--config", str(config_path)])

    if settings.piper_speaker_id:
        command.extend(["--speaker", settings.piper_speaker_id])

    try:
        process = subprocess.run(
            command,
            input=payload.text.encode("utf-8"),
            capture_output=True,
            timeout=60,
            check=False,
        )
    except FileNotFoundError as error:
        raise HTTPException(status_code=503, detail="No se encuentra el binario de Piper en el servicio.") from error
    except subprocess.TimeoutExpired as error:
        raise HTTPException(status_code=504, detail="Piper ha tardado demasiado en generar el audio.") from error

    if process.returncode != 0:
        raise HTTPException(
            status_code=500,
            detail=process.stderr.decode("utf-8", errors="ignore") or "Piper no ha podido sintetizar el audio.",
        )

    try:
        audio = Path(output_path).read_bytes()
    finally:
        Path(output_path).unlink(missing_ok=True)

    return Response(audio, media_type="audio/wav")


@app.post("/stt")
async def stt(request: Request):
    audio_bytes = await request.body()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="No se ha recibido audio para transcribir.")

    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temporary_file:
        temporary_file.write(audio_bytes)
        audio_path = temporary_file.name

    try:
        model = get_whisper_model()
        segments, info = model.transcribe(
            audio_path,
            language=settings.whisper_language,
            vad_filter=True,
            beam_size=5,
        )
        text = " ".join(segment.text.strip() for segment in segments if segment.text.strip()).strip()
        return {
            "text": text,
            "language": getattr(info, "language", None),
            "durationSeconds": getattr(info, "duration", None),
        }
    finally:
        Path(audio_path).unlink(missing_ok=True)


@app.post("/wakeword/detect")
async def wakeword_detect(request: Request):
    audio_bytes = await request.body()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="No se ha recibido audio para detectar la palabra de activacion.")

    model = get_wakeword_model()
    if model is None:
        return {
            "enabled": False,
            "detected": False,
            "phrase": settings.wakeword_phrase,
        }

    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temporary_file:
        temporary_file.write(audio_bytes)
        audio_path = temporary_file.name

    try:
        predictions = model.predict_clip(audio_path)
    finally:
        Path(audio_path).unlink(missing_ok=True)

    detection_score = 0.0
    detected = False

    for values in predictions.values():
        if not values:
            continue

        best_score = max(values)
        detection_score = max(detection_score, float(best_score))
        if best_score >= 0.5:
            detected = True

    return {
        "enabled": True,
        "detected": detected,
        "score": detection_score,
        "phrase": settings.wakeword_phrase,
    }


@app.exception_handler(HTTPException)
async def http_exception_handler(_request: Request, exc: HTTPException):
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})
