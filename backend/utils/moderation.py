"""Filtro de lenguaje ofensivo para los endpoints de IA.

Es la misma regla que usa el front (frontend/src/utils/profanity.js y
hooks/useModeration.js), pero aplicada en el servidor. El front avisa y
bloquea primero; esto es la garantia real, porque el contador del front vive
en localStorage y cualquiera lo puede borrar o llamar a la API directo.

- Cada mensaje ofensivo se rechaza y NUNCA llega a Gemini.
- A las 3 advertencias, el cliente queda bloqueado 30 minutos.
- El estado vive en memoria, igual que el cache de ai_service: si el
  servidor se reinicia, los contadores vuelven a cero. Para una salita
  alcanza y no hace falta tabla nueva.
"""
import re
import threading
import time
import unicodedata

from flask import request

MAX_STRIKES = 3
BLOCK_MINUTES = 30

# Pasado este tiempo sin nuevas faltas, las advertencias se olvidan
STRIKES_TTL_SECONDS = 60 * 60

LEET_MAP = str.maketrans({
    '0': 'o', '1': 'i', '3': 'e', '4': 'a',
    '5': 's', '7': 't', '@': 'a', '$': 's',
})

# Insultos y malas palabras. Las palabras anatomicas groseras quedan afuera a
# proposito: en una app de salud hay gente que describe asi sus sintomas.
# Tiene que coincidir con la lista del front.
BLOCKED_PATTERNS = [re.compile(p) for p in (
    r'^p[uv]t[oa]s?$',
    r'^p[uv]tit[oa]s?$',
    r'^pelotud[oa]s?$',
    r'^bolud[oa]s?$',
    r'^forr[oa]s?$',
    r'^mierdas?$',
    r'^carajo$',
    r'^conchud[oa]s?$',
    r'^chot[oa]s?$',
    r'^pajer[oa]s?$',
    r'^soretes?$',
    r'^garcas?$',
    r'^trolas?$',
    r'^cornud[oa]s?$',
    r'^maricon(es)?$',
    r'^mogolic[oa]s?$',
    r'^tarad[oa]s?$',
    r'^idiotas?$',
    r'^imbecil(es)?$',
    r'^estupid[oa]s?$',
    r'^hdp$',
    r'^lpm$',
    r'^lptm$',
    r'^ctm$',
)]


def normalize_text(text):
    """Minusculas, sin tildes, deshace reemplazos (pvt0, 1diota) y junta
    letras estiradas (puuuuto -> puto). Igual que normalizeText del front."""
    text = unicodedata.normalize('NFD', str(text).lower())
    text = ''.join(c for c in text if not unicodedata.combining(c))
    text = text.translate(LEET_MAP)
    text = re.sub(r'[^a-z\s]', ' ', text)
    return re.sub(r'([a-z])\1{2,}', r'\1', text)


def contains_profanity(text):
    """Compara palabras completas: 'computadora' nunca coincide con 'puta'."""
    if not text:
        return False
    return any(
        pattern.match(word)
        for word in normalize_text(text).split()
        for pattern in BLOCKED_PATTERNS
    )


# ---------------------------------------------------------------------------
# Advertencias y bloqueo por cliente
# ---------------------------------------------------------------------------

_lock = threading.Lock()
_clients = {}  # clave del cliente -> {"strikes", "blocked_until", "last_strike"}


def _client_key():
    """Identifica al cliente por IP.

    En el deploy (Render) el backend esta detras de un proxy, asi que la IP
    real viene en X-Forwarded-For. Si alguien falsifica ese header solo
    esquiva el bloqueo de 30 minutos: el mensaje ofensivo se rechaza igual.
    """
    forwarded = request.headers.get('X-Forwarded-For', '')
    if forwarded:
        return forwarded.split(',')[0].strip()
    return request.remote_addr or 'desconocido'


def _blocked_response(blocked_until):
    # Minutos que faltan, no la hora: el servidor del deploy esta en UTC y
    # la hora saldria corrida. El front calcula la hora local con blocked_until.
    minutos = max(1, round((blocked_until - time.time()) / 60))
    return {
        "msg": (
            "El asistente quedó bloqueado por uso de lenguaje ofensivo. "
            f"Vas a poder usarlo de nuevo en {minutos} minutos."
        ),
        "code": "ai_blocked",
        # En milisegundos, como Date.now() del front
        "blocked_until": int(blocked_until * 1000),
    }, 429


def _user_texts(question, history):
    """Textos escritos por la persona: la pregunta y sus turnos del historial.

    El historial lo arma el front, pero se revisa igual: alguien podria
    meter insultos ahi llamando a la API directo.
    """
    texts = [question]
    if isinstance(history, list):
        for turn in history:
            if isinstance(turn, dict) and turn.get('role') == 'user':
                texts.append(turn.get('text') or '')
    return texts


def check_ai_request(question, history=None):
    """Revisa un pedido a la IA antes de mandarlo a Gemini.

    Devuelve None si se puede enviar. Si no, devuelve (body, status) listo
    para responder: 400 con la advertencia o 429 si el cliente esta bloqueado.
    """
    key = _client_key()
    now = time.time()

    with _lock:
        state = _clients.get(key)

        # Limpieza: bloqueo vencido o advertencias viejas
        if state:
            if state['blocked_until'] and state['blocked_until'] <= now:
                state = None
            elif not state['blocked_until'] and now - state['last_strike'] > STRIKES_TTL_SECONDS:
                state = None
            if state is None:
                _clients.pop(key, None)

        if state and state['blocked_until']:
            return _blocked_response(state['blocked_until'])

        if not any(contains_profanity(t) for t in _user_texts(question, history)):
            return None

        strikes = (state['strikes'] if state else 0) + 1
        if strikes >= MAX_STRIKES:
            blocked_until = now + BLOCK_MINUTES * 60
            _clients[key] = {"strikes": 0, "blocked_until": blocked_until, "last_strike": now}
            return _blocked_response(blocked_until)

        _clients[key] = {"strikes": strikes, "blocked_until": 0, "last_strike": now}
        strikes_left = MAX_STRIKES - strikes
        repeticion = (
            "Si se repite una vez más" if strikes_left == 1
            else f"Si se repite {strikes_left} veces más"
        )
        return {
            "msg": (
                "Ese mensaje tiene lenguaje ofensivo y no se envió. "
                f"{repeticion}, el asistente se va a bloquear por {BLOCK_MINUTES} minutos."
            ),
            "code": "offensive_language",
            "strikes_left": strikes_left,
        }, 400