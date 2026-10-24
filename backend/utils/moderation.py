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

# ---------------------------------------------------------------------------
# Listas de palabras y frases
# ---------------------------------------------------------------------------
# Tienen que coincidir con frontend/src/utils/profanity.js.
#
# Criterio: aca van los insultos que son ofensivos SIEMPRE, sin importar el
# contexto. Los que dependen del contexto (bobo, tonto, inutil, "me siento
# para el orto") no estan en la lista: los evalua la IA, que entiende si es un
# insulto hacia alguien o una persona describiendo como se siente.
#
# Las palabras anatomicas sueltas (concha, pija, culo, huevos, orto) tampoco:
# en una app de salud hay gente que describe asi sus sintomas. Solo se bloquean
# dentro de frases que son insultos ("la concha de tu madre", "chupame un huevo").

# Prefijos de intensidad: reboludo, recontra pelotudo, requeteforro
_RE = r'(?:re|recontra|requete)?'

# Palabras completas (se comparan de a una, ya normalizadas)
BLOCKED_WORDS = [re.compile(r'^' + _RE + r'(?:' + p + r')$') for p in (
    r'bolud(?:o|a|os|as|azo|aza|azos|azas|ito|ita|on|ona|ones|ez|eces)',
    r'bolu',
    r'pelotud(?:o|a|os|as|azo|aza|azos|azas|ito|ita|on|ona|ones|ez|eces)',
    r'forr(?:o|a|os|as|ito|ita)',
    r'gil(?:a|es|as|azo|aza|azos)?',
    r'p[uv]t(?:o|a|os|as|ito|ita|itos|itas|azo|ona|ones)',
    r'trol(?:o|a|os|as|azo)',
    r'maric(?:on|ones|a|as)',
    r'tortiller(?:a|as)',
    r'conchud(?:o|a|os|as)',
    r'conch(?:a|e|i)(?:tu|su|de|e)?(?:tu|su)?madre',
    r'mierd(?:a|as|ita)',
    r'carajo',
    r'chot(?:o|a|os|as)',
    r'garc(?:a|as|ha|has|har|hate|hame)',
    r'pajer(?:o|a|os|as)',
    r'soret(?:e|es|ito)',
    r'cag(?:on|ona|ones|onas)',
    r'culia(?:do|da|dos|das|o|os)',
    r'pet(?:e|es|ero|era|eros|eras)',
    r'pedorr(?:o|a|os|as)',
    r'tarad(?:o|a|os|as)',
    r'idiot(?:a|as)',
    r'imbecil(?:es)?',
    r'estupid(?:o|a|os|as)',
    r'mog(?:o|ui)?lic(?:o|a|os|as)',
    r'mongolic(?:o|a|os|as)',
    r'cornud(?:o|a|os|as)',
    r'ortiv(?:a|as)',
    r'chant(?:a|as)',
    r'mamert(?:o|a|os|as)',
    r'viller(?:o|a|os|as)',
    r'sudac(?:a|as)',
    r'hijueput(?:a|as)',
    r'jodete',
    r'chupa(?:la|mela|melo|los|las)',
    r'mama(?:la|mela)',
    r'cogete',
    # Abreviaturas
    r'hdp|hdpm|lpm|lptm|lpmqtp|lpqtp|lpqtrp|lpqlp|ctm|ptm|lcdtm|lcdll|lcdtmadre|qlo|qliao',
)]

# Frases (se buscan en todo el texto normalizado)
_ANATOMIA = r'(?:pija|verga|poronga|pito|choto|chota|garcha|huevo|huevos|bolas|ojete|orto|concha|culo)'
BLOCKED_PHRASES = [re.compile(p) for p in (
    # "la concha de tu madre", "concha e tu vieja", "la reconcha de la lora"
    r'\b(?:re)?conch(?:a|e) (?:de |e )?(?:tu|tus|su|sus|la|toda|mil) ',
    # "hijo de puta", "hija e puta"
    r'\bhij(?:o|a|os|as) (?:de |e )?(?:re ?)?p[uv]t',
    # "andate a cagar / a la concha / a freir churros"
    r'\b(?:andate|anda|vayase|vayanse|vete|andat|anda te) a (?:la )?(?:re ?)?(?:cagar|concha|freir|lavar)',
    # Insultos con partes del cuerpo: "chupame un huevo", "me chupa la pija"
    r'\bchup(?:a|as|an|ame|ala|amela|en|enla|enme|ar|ate)? (?:la |el |un |los |las |una |me |mela )?' + _ANATOMIA + r'\b',
    r'\b(?:come|comeme|comete|comela|mama|mamame|mamamela|mamala) (?:la |el |una |un |los |las )?' + _ANATOMIA + r'\b',
    r'\bmet(?:e|ete|etelo|etela|etelos|etelas|eselo|esela|anselo|ansela) (?:eso |esto )?(?:en |por )?(?:el |tu |su )?(?:culo|orto|ojete)\b',
    # "me rompe las bolas", "no me rompas los huevos"
    r'\b(?:romp|rompe|rompes|rompas|rompen|romper|rompiendo) (?:las |los )?(?:bolas|pelotas|huevos|quinotos|ovarios)\b',
    # Amenazas: "te voy a matar", "te rompo la cara", "te cago a trompadas"
    r'\bte (?:voy a |vamos a |van a )?(?:matar|mato|rompo|romper|reviento|reventar|fajo|fajar|cago|cagar|bajo los dientes|parto|partir) ',
    r'\bte (?:voy a |vamos a )?(?:matar|mato|reviento|fajo|cago)\b',
    r'\bte (?:voy a |vamos a )?(?:coger|cojo|garchar|garcho)\b',
    # Insultos directos: "sos un inutil", "sos una basura"
    r'\bsos (?:un |una |re |muy )*(?:inutil|inutiles|bob[oa]|tont[oa]|basura|porqueria|asco|nab[oa]|salame|bestia|burr[oa]|pelele|payas[oa]|mamarracho|chupamedias|lent[oa]|ignorante|desastre)\b',
    # Insultos al asistente: "bot inutil", "app basura"
    r'\b(?:bot|robot|maquina|asistente|app|aplicacion|programa|ia|chatbot|sistema) (?:re |muy )?(?:inutil|basura|pedorr[oa]|chot[oa]|truch[oa]|idiota|estupid[oa]|tont[oa]|bob[oa]|de cuarta|de porqueria)\b',
)]


def normalize_text(text):
    """Minusculas, sin tildes, deshace reemplazos (pvt0, 1diota) y junta
    letras estiradas (puuuuto -> puto). Igual que normalizeText del front."""
    text = unicodedata.normalize('NFD', str(text).lower())
    text = ''.join(c for c in text if not unicodedata.combining(c))
    text = text.translate(LEET_MAP)
    text = re.sub(r'[^a-z\s]', ' ', text)
    text = re.sub(r'([a-z])\1{2,}', r'\1', text)
    return re.sub(r'\s+', ' ', text).strip()


def contains_profanity(text):
    """True si el texto tiene una palabra o una frase de las listas.

    Las palabras se comparan completas: 'computadora' nunca coincide con 'puta'.
    """
    if not text:
        return False
    normal = normalize_text(text)
    if any(p.match(w) for w in normal.split() for p in BLOCKED_WORDS):
        return True
    # Espacio al final para que las frases que terminan en ' ' coincidan
    return any(p.search(normal + ' ') for p in BLOCKED_PHRASES)


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


def _current_state(key, now):
    """Estado vigente del cliente, descartando bloqueos vencidos y
    advertencias viejas. Se llama con _lock tomado."""
    state = _clients.get(key)
    if state:
        if state['blocked_until'] and state['blocked_until'] <= now:
            state = None
        elif not state['blocked_until'] and now - state['last_strike'] > STRIKES_TTL_SECONDS:
            state = None
        if state is None:
            _clients.pop(key, None)
    return state


def _add_strike(key, state, now, motivo):
    """Suma una advertencia y devuelve la respuesta (400 o 429 si bloquea).
    Se llama con _lock tomado."""
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
        "msg": f"{motivo} {repeticion}, el asistente se va a bloquear por {BLOCK_MINUTES} minutos.",
        "code": "offensive_language",
        "strikes_left": strikes_left,
    }, 400


def check_ai_request(question, history=None):
    """Primer filtro, antes de mandar el pedido a Gemini: listas de palabras.

    Devuelve None si se puede enviar. Si no, devuelve (body, status) listo
    para responder: 400 con la advertencia o 429 si el cliente esta bloqueado.
    """
    key = _client_key()
    now = time.time()

    with _lock:
        state = _current_state(key, now)

        if state and state['blocked_until']:
            return _blocked_response(state['blocked_until'])

        if not any(contains_profanity(t) for t in _user_texts(question, history)):
            return None

        return _add_strike(
            key, state, now,
            "Ese mensaje tiene lenguaje ofensivo y no se envió.",
        )


def register_ai_offense():
    """Segundo filtro: la IA leyo el mensaje y lo marco como ofensivo
    (insultos que no estan en las listas, burlas, amenazas, acoso,
    discriminacion). Cuenta como una advertencia mas, igual que las palabras.

    Devuelve (body, status) listo para responder.
    """
    key = _client_key()
    now = time.time()
    with _lock:
        state = _current_state(key, now)
        if state and state['blocked_until']:
            return _blocked_response(state['blocked_until'])
        return _add_strike(
            key, state, now,
            "Ese mensaje es ofensivo y no se va a responder. El asistente está "
            "para ayudarte, y pedimos el mismo respeto que damos.",
        )