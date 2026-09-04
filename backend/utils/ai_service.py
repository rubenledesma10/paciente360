"""Servicio de IA (Google Gemini).

Se usa la API REST con urllib de la biblioteca estandar a proposito: no
agrega ninguna dependencia nueva al proyecto, asi los compañeros no tienen
que instalar nada para que les levante el backend.

La clave NUNCA se escribe aca: sale de la variable de entorno GEMINI_API_KEY.
"""

import json
import socket
import time
import urllib.request
import urllib.error
from flask import current_app

GEMINI_URL = (
    "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
)

# Los modelos con "thinking" pueden tardar bastante en textos largos.
TIMEOUT_SEGUNDOS = 60

# La capa gratuita comparte cuota con mucha gente y devuelve 503 cuando el
# modelo esta saturado. Suelen ser picos de segundos, asi que reintentar
# resuelve la mayoria de los casos sin que el usuario se entere.
REINTENTOS = 3
ESPERA_ENTRE_REINTENTOS = 1.5

# Largo maximo de cada mensaje del usuario y cantidad de turnos de
# conversacion que se conservan. Acota el abuso del endpoint y el gasto.
MAX_LARGO_PREGUNTA = 400
MAX_TURNOS_HISTORIAL = 8


class AIServiceError(Exception):
    """Error controlado del servicio, con un mensaje que se le puede mostrar
    al usuario sin filtrar detalles internos."""
    pass


def _pedir_a_gemini(url, body, api_key):
    """Una sola llamada HTTP. Devuelve el JSON o levanta HTTPError/URLError."""
    request = urllib.request.Request(
        url,
        data=body,
        headers={
            'Content-Type': 'application/json',
            # La clave va en header, no en la URL: asi no queda registrada
            # en los logs de acceso de ningun proxy intermedio.
            'x-goog-api-key': api_key,
        },
        method='POST'
    )
    with urllib.request.urlopen(request, timeout=TIMEOUT_SEGUNDOS) as response:
        return json.loads(response.read().decode('utf-8'))


def _generate(payload):
    """Envia el payload a Gemini con reintentos y devuelve el texto."""
    api_key = current_app.config.get('GEMINI_API_KEY')
    if not api_key:
        raise AIServiceError(
            "El asistente no esta configurado. Falta GEMINI_API_KEY en el .env"
        )

    model = current_app.config.get('GEMINI_MODEL')
    url = GEMINI_URL.format(model=model)
    body = json.dumps(payload).encode('utf-8')

    data = None
    for intento in range(1, REINTENTOS + 1):
        try:
            data = _pedir_a_gemini(url, body, api_key)
            break
        except urllib.error.HTTPError as e:
            detalle = e.read().decode('utf-8', errors='ignore')[:1200]
            print(f"[ai_service] intento {intento}/{REINTENTOS} - HTTP {e.code}: {detalle}")

            # 429 = cuota agotada. Reintentar solo la gasta mas rapido:
            # se corta al primer intento.
            if e.code == 429:
                raise AIServiceError(
                    "Se agotó la cuota del asistente por ahora. Probá en un minuto."
                )

            # 503 = modelo saturado. Suele durar segundos: vale reintentar.
            if e.code == 503 and intento < REINTENTOS:
                time.sleep(ESPERA_ENTRE_REINTENTOS * intento)
                continue
            if e.code == 503:
                raise AIServiceError(
                    "El asistente está sobrecargado en este momento. "
                    "Probá de nuevo en unos segundos."
                )
            if e.code in (401, 403):
                raise AIServiceError("El asistente no esta disponible (clave invalida).")
            if e.code == 404:
                raise AIServiceError(
                    f"El modelo '{model}' no existe o no esta habilitado para esta clave."
                )
            raise AIServiceError("El asistente no esta disponible en este momento.")
        except (urllib.error.URLError, socket.timeout, TimeoutError) as e:
            # El timeout de lectura NO es un URLError: si no se captura aca
            # se escapa como error generico y no se reintenta.
            print(f"[ai_service] intento {intento}/{REINTENTOS} - red/timeout: {e}")
            if intento < REINTENTOS:
                time.sleep(ESPERA_ENTRE_REINTENTOS * intento)
                continue
            raise AIServiceError(
                "El asistente está tardando demasiado. Probá de nuevo en unos segundos."
            )

    try:
        return data['candidates'][0]['content']['parts'][0]['text'].strip()
    except (KeyError, IndexError, TypeError):
        print(f"[ai_service] respuesta inesperada: {json.dumps(data)[:300]}")
        raise AIServiceError("El asistente no pudo generar una respuesta.")


def _config_generacion(max_output_tokens):
    return {
        # Temperatura baja: queremos explicacion fiel, no creatividad
        "temperature": 0.3,
        # Holgado a proposito: los modelos con "thinking" gastan tokens
        # razonando antes de escribir, y con un techo bajo devuelven vacio.
        "maxOutputTokens": max_output_tokens,
    }


# ---------------------------------------------------------------------------
# Noticias: explicacion en lenguaje simple
# ---------------------------------------------------------------------------

# La explicacion de una noticia es siempre la misma: se genera una vez y se
# reutiliza. La clave incluye el texto, asi si el administrativo edita la
# noticia se vuelve a generar. Vive en memoria del proceso: se pierde al
# reiniciar Flask, y con eso alcanza para no pagar la espera en cada clic.
_cache_explicaciones = {}


def explicar_simple(titulo, contenido):
    """Explica una noticia en lenguaje claro, tan largo como haga falta.

    Puede sumar contexto general de salud publica que ayude a entender
    (que es la enfermedad, por que importa la prevencion), pero no puede
    dar indicaciones personalizadas ni dosis: eso es de un profesional.
    """
    clave = (titulo, contenido)
    if clave in _cache_explicaciones:
        return _cache_explicaciones[clave]

    prompt = f"""Sos el asistente de Paciente360, el sistema de un centro de salud
publico de Mendoza, Argentina. Explicas noticias de salud a la comunidad.

Explica la siguiente noticia en palabras simples, para que la entienda
cualquier persona: adultos mayores, gente sin estudios de salud, gente que
lee poco. Lo importante es que SE ENTIENDA, aunque la explicacion sea larga.

Como escribir:
- Explica todo el contenido de la noticia, y sumale el contexto general que
  haga falta para entenderla: que es la enfermedad o el tema del que habla,
  por que importa, a quien afecta, que se recomienda a nivel general.
- Si aparece una palabra dificil, explicala ahi mismo con palabras de todos
  los dias.
- Organiza el texto en parrafos cortos. Si hay pasos o recomendaciones
  generales, podes ponerlos como lista.
- Espanol rioplatense (voseo), tono cercano, sin infantilizar.
- Podes extenderte lo que necesites, pero no repitas ideas.

Lo que no podes hacer:
- No des indicaciones personalizadas: nada de "vos tenes que", ni dosis, ni
  medicamentos. Las recomendaciones son las generales que daria el propio
  centro de salud a toda la poblacion.
- No diagnostiques ni evalues casos particulares.
- No contradigas ni corrijas la noticia: si algo no esta claro, explicalo,
  no lo cambies.

Devolve unicamente la explicacion, sin titulo ni frases de introduccion.

Titulo: {titulo}

Noticia:
{contenido}"""

    texto = _generate({
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": _config_generacion(2500),
    })
    _cache_explicaciones[clave] = texto
    return texto


# ---------------------------------------------------------------------------
# Noticias: conversacion sobre la noticia
# ---------------------------------------------------------------------------

_INSTRUCCIONES_CONVERSACION = """Sos el asistente de Paciente360, el sistema de un centro de salud
publico de Mendoza, Argentina. Conversas con pacientes y vecinos sobre las
noticias de salud que publica el centro, respondes sus dudas y los ayudas a
usar la aplicacion.

Se habla de una noticia en particular, que tenes mas abajo. Podes ir mas
alla de lo que dice: explicar el tema en profundidad, dar contexto, responder
repreguntas.

QUE SI PODES HACER
- Explicar cualquier concepto de salud con tus propios conocimientos: que es
  una enfermedad, como se contagia, para que sirve una vacuna, por que
  conviene hidratarse, que es un control de niño sano.
- Dar las indicaciones GENERALES que daria el propio centro de salud a toda
  la poblacion, como en una campaña: tomar agua seguido, evitar el sol de 12
  a 17, lavarse las manos, vacunarse segun el calendario, cuando conviene
  consultar. Podes ser concreto y practico.
- Ayudar a usar la aplicacion:
  * Sacar turno: seccion "Sacar turno", se elige especialidad, profesional,
    fecha y horario. No hace falta tener cuenta.
  * Ver, confirmar o cancelar turnos: seccion "Mis turnos", con sesion
    iniciada (usuario y contraseña: el DNI).
  * Noticias: seccion "Noticias y prevencion".

QUE NO PODES HACER NUNCA
- Evaluar el caso personal de quien escribe. Si describe sus sintomas o
  pregunta si tiene algo, explicale con amabilidad que eso lo tiene que ver
  un profesional, y sugerile sacar un turno desde la app.
- Indicar medicamentos, dosis ni cantidades para una persona. Podes explicar
  para que sirve algo en general, no decirle a alguien que tome tal cosa.
- Decidir por una persona si debe vacunarse, operarse o hacerse un estudio.
  Eso lo define su medico.
- Ante cualquier señal de urgencia (dolor de pecho, falta de aire, sangrado
  abundante, perdida de conocimiento, convulsiones, fiebre muy alta en un
  bebe), decile que vaya a la guardia o llame al 107 de inmediato, y no
  agregues nada mas.
- Si la pregunta no tiene nada que ver con salud ni con la aplicacion,
  decile amablemente que solo podes ayudar con esos temas.

COMO RESPONDER
- Espanol rioplatense (voseo), tono amable, claro y concreto.
- Extendete lo que haga falta para que se entienda, en parrafos cortos.
  Usa listas solo si hay pasos o varias recomendaciones.
- Respondele directo, sin frases del tipo "segun la noticia".
- Si el usuario ya pregunto algo antes en esta conversacion, tenelo en
  cuenta: no repitas lo que ya explicaste.

NOTICIA DE LA QUE SE HABLA
Titulo: {titulo}
Texto: {contenido}"""


def conversar_sobre_noticia(titulo, contenido, pregunta, historial=None):
    """Responde en una conversacion sobre una noticia.

    historial: lista de {"role": "user"|"assistant", "text": "..."} con los
    mensajes anteriores. Se recorta a los ultimos MAX_TURNOS_HISTORIAL para
    acotar el costo y evitar que alguien mande un historial gigante.
    """
    pregunta = (pregunta or '').strip()
    if not pregunta:
        raise AIServiceError("Escribi tu pregunta.")
    if len(pregunta) > MAX_LARGO_PREGUNTA:
        raise AIServiceError(
            f"La pregunta es muy larga (maximo {MAX_LARGO_PREGUNTA} caracteres)."
        )

    contents = []
    for mensaje in (historial or [])[-MAX_TURNOS_HISTORIAL:]:
        texto = str(mensaje.get('text', ''))[:MAX_LARGO_PREGUNTA * 4].strip()
        if not texto:
            continue
        # Gemini usa "model" para las respuestas del asistente
        rol = 'model' if mensaje.get('role') == 'assistant' else 'user'
        contents.append({"role": rol, "parts": [{"text": texto}]})

    contents.append({"role": "user", "parts": [{"text": pregunta}]})

    return _generate({
        "systemInstruction": {
            "parts": [{"text": _INSTRUCCIONES_CONVERSACION.format(
                titulo=titulo, contenido=contenido
            )}]
        },
        "contents": contents,
        "generationConfig": _config_generacion(2000),
    })


# ---------------------------------------------------------------------------
# Medico: resumen de historia clinica antes de la consulta
# ---------------------------------------------------------------------------

# Se cachea por huella de los datos: si al paciente le cargan algo nuevo, la
# huella cambia y el resumen se regenera. Si no, se reutiliza.
_cache_resumenes = {}


def resumir_historia_clinica(datos):
    """Arma un resumen clinico de lectura rapida para el medico.

    A diferencia de lo que ve el paciente, aca el destinatario es un
    profesional: el modelo puede señalar patrones, valores fuera de rango y
    cosas a verificar. Lo que NO puede hacer es inventar: trabaja solo con
    los registros que le pasamos, y si algo no esta, lo dice.

    datos: dict con paciente, turnos, seguimientos, signos e indicaciones,
    ya serializados (ver ai_routes).
    """
    huella = json.dumps(datos, sort_keys=True, ensure_ascii=False)
    if huella in _cache_resumenes:
        return _cache_resumenes[huella]

    prompt = f"""Sos un asistente clinico para medicos de un centro de atencion primaria
publico de Mendoza, Argentina. Vas a preparar al medico para una consulta
resumiendo lo que el sistema tiene registrado del paciente.

DESTINATARIO: un medico. Usa lenguaje clinico normal, sin explicar terminos
basicos ni infantilizar.

REGLAS
- Trabaja UNICAMENTE con los datos de abajo. No inventes antecedentes,
  valores ni tratamientos. Si una seccion viene vacia, decilo en una linea.
- No diagnostiques ni indiques tratamiento: eso lo hace el medico. Podes
  señalar patrones ("tres registros con presion elevada en dos semanas"),
  valores fuera de rango y datos que convendria verificar o actualizar.
- Si hay alergias registradas, van primero y destacadas.
- Si hay una indicacion o seguimiento vigente que no se cerro, señalalo.
- Ordena cronologicamente lo reciente primero. Fechas en formato dd/mm/aaaa.
- Español rioplatense. Conciso: el medico tiene pocos minutos entre
  pacientes. Maximo unas 250 palabras.

FORMATO (usa exactamente estos titulos, en este orden; omiti los que no
tengan datos salvo "Puntos a tener en cuenta", que va siempre)
Paciente
Antecedentes en el sistema
Ultimos signos vitales
Seguimiento de enfermeria
Indicaciones registradas
Puntos a tener en cuenta

DATOS DEL PACIENTE (JSON)
{huella}"""

    texto = _generate({
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": _config_generacion(1500),
    })
    _cache_resumenes[huella] = texto
    return texto