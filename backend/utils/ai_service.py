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


# ---------------------------------------------------------------------------
# Asistente de uso de la aplicacion (chatbot flotante)
# ---------------------------------------------------------------------------

# Manual de la aplicacion. Es lo unico que el asistente "sabe": no accede a
# la base ni a datos de pacientes. Si algo cambia en la app, hay que
# actualizarlo aca, si no el asistente va a explicar una version vieja.
_MANUAL_APP = """
PACIENTE360 es el sistema de gestion de un centro de salud publico de
Mendoza (una "salita" de atencion primaria). Tiene cuatro roles: Paciente,
Enfermero, Medico y Administrativo. Ademas hay una parte publica sin cuenta.

== PARTE PUBLICA (sin iniciar sesion) ==
- Inicio: pantalla de ingreso. Abajo del formulario hay "Crear cuenta"
  (para pacientes) y "Olvidaste tu usuario o contraseña" (manda una
  contraseña nueva por mail).
- Sacar turno (menu "Sacar turno"): NO hace falta cuenta. Se completan DNI,
  fecha de nacimiento, nombre, apellido, email y telefono; despues se elige
  especialidad, profesional, fecha y horario. Los horarios tachados ya estan
  ocupados; los que aparecen en naranja son horarios en los que la persona
  ya tiene otro turno ese dia. Si el DNI ya esta registrado, la fecha de
  nacimiento tiene que coincidir con la de la ficha. Al reservar se crea la
  cuenta automaticamente: usuario y contraseña son el DNI. Llega un mail de
  confirmacion, y 24 horas antes del turno un recordatorio con botones para
  confirmar o cancelar.
- Noticias: se ven sin cuenta. Cada noticia tiene "Explicamelo simple" (la
  reescribe en lenguaje claro) y "Tengo dudas sobre este tema" (un chat
  para preguntar sobre esa noticia y sobre salud en general).

== INICIO DE SESION ==
- Pacientes: usuario y contraseña son el DNI, salvo que la hayan cambiado.
- Personal: usuario asignado por el administrador; la contraseña inicial
  suele ser el DNI.
- Todos pueden cambiar su contraseña desde "Mi perfil" (clic en el avatar
  del menu lateral o de la barra superior).

== PACIENTE ==
- Sacar turno: igual que la version publica pero sin cargar datos, ya que
  esta logueado.
- Mis turnos: lista con pestañas Proximos / Historial / Todos. Cada turno
  muestra el estado: Reservado (tiene el turno), En espera (ya llego y le
  dieron el ingreso), Atendido, Cancelado. Un chip "Sobreturno" indica que
  se agendo por urgencia.
  * Confirmar asistencia: el boton aparece desde 3 dias antes del turno
    hasta que empieza. Es opcional, se puede ir sin confirmar.
  * Cancelar turno: se puede mientras el turno este Reservado o En espera,
    hasta el momento del turno. El horario queda libre para otra persona.
- Noticias y prevencion: las mismas noticias publicas, con las funciones de
  explicacion simple y chat.
- Mi perfil: foto, telefono, direccion, email, contacto de emergencia, obra
  social y numero de afiliado. DNI, usuario y fecha de nacimiento NO se
  editan: eso lo corrige el administrativo. Tambien se cambia la contraseña.
- Campana (arriba a la derecha): avisa de turnos por confirmar y proximos.

== MEDICO ==
- Mis turnos: agenda del dia (se puede cambiar la fecha). Por cada turno:
  * Preparar consulta: arma un resumen de lo que el sistema tiene del
    paciente (alergias, diagnosticos previos, signos vitales, seguimientos,
    indicaciones) para leer antes de atender.
  * Cerrar consulta: aparece cuando el turno esta En espera. Pide tipo de
    enfermedad, diagnostico y detalles (obligatorio "especificar cual" si
    el tipo es "Otra"). Al guardar, el turno pasa a Atendido.
  * Ver / Cargar diagnostico: en turnos ya atendidos, para consultarlo o
    corregirlo.
  * Cambiar estado: para pasarlo manualmente entre estados validos.
- Indicaciones medicas: cargar y consultar indicaciones y tratamientos por
  paciente, con exportacion a PDF.
- Historia clinica: consulta de la historia del paciente.
- Campana: turnos del dia y proximos.

== ENFERMERO ==
- Signos y sintomas: registrar temperatura, presion, signos y sintomas de
  un paciente. Solo se pueden editar las observaciones despues.
- Seguimiento: controles de pacientes. Estados: Hoy (control para hoy),
  Pendiente (vencido), Programado (a futuro), Finalizado. Para crear uno
  nuevo, solo aparecen los pacientes que un medico atendio HOY. "Marcar
  finalizado" solo en seguimientos vigentes; "Reprogramar" solo en
  vencidos. Cada enfermero ve unicamente sus propios seguimientos.
- Stock: insumos y movimientos de entrada/salida.
- Pase de guardia: notas para el siguiente turno de enfermeria.
- Campana: seguimientos de hoy y vencidos.

== ADMINISTRATIVO ==
- Gestion de turnos: listado con filtros por fecha, estado y profesional,
  y un boton "Turnos de hoy".
  * Nuevo turno: se busca al paciente por DNI; si no existe, se cargan sus
    datos y se crea junto con el turno. Despues especialidad, profesional,
    fecha y horario en una grilla.
  * Sobreturno: al marcar la casilla, los horarios ocupados tambien se
    pueden elegir. Es para urgencias y queda registrado como sobreturno.
  * Cambiar estado: solo ofrece los cambios validos. El camino es
    Reservado -> En espera -> Atendido. Cancelado se puede desde Reservado
    o En espera. Atendido y Cancelado son finales, no se vuelve atras.
  * Cancelar: cualquier turno abierto, en cualquier momento.
- Noticias y novedades: crear, editar y borrar noticias, con imagen de
  portada.

== ADMINISTRADOR (gestion del sistema) ==
- Usuarios: alta, edicion y baja de pacientes y enfermeros. La baja es
  logica: la cuenta se desactiva, no se borra. Usuario y contraseña
  iniciales son el DNI.
- Turnos y Noticias: lo mismo que el Administrativo.
- Stock, Historia clinica y Pase de guardia: acceso a las mismas pantallas
  que enfermeros y medicos.

== SUPERADMINISTRADOR ==
- Todo lo del Administrador, mas:
- Administradores: alta, edicion y baja de cuentas de administrador.
- Bitacora: registro de todas las acciones hechas en el sistema (quien,
  que, cuando, sobre que tabla), con filtros por tabla y accion.

== REGLAS GENERALES DE TURNOS ==
- Horario de atencion 08:00 a 20:00, turnos de 20 minutos.
- Un paciente no puede tener dos turnos a la misma hora, aunque sean con
  profesionales distintos.
- Los turnos cancelados liberan el horario.
"""

_INSTRUCCIONES_ASISTENTE = """Sos el asistente de ayuda de Paciente360. Tu trabajo es explicar como
usar la aplicacion: donde esta cada cosa, que hace cada boton, por que algo
no se puede hacer, cuales son las reglas.

CONTEXTO DE QUIEN PREGUNTA
- Rol: {rol}
- Pantalla actual: {ruta}
Usa esto para responder con lo que le corresponde a su rol y, si aplica,
a la pantalla en la que esta. Si pregunta por algo de otro rol, explicale
que eso lo hace otro rol y quien.

REGLAS
- Respondes UNICAMENTE con lo que dice el manual de mas abajo. Si algo no
  esta en el manual, decilo con honestidad y sugeri consultar al personal
  del centro. No inventes botones ni funciones.
- No respondas consultas de salud (sintomas, medicamentos, si vacunarse o
  no). Para eso derivalo a la seccion Noticias, donde hay un asistente que
  explica temas de salud, o a sacar un turno. Si suena urgente, decile que
  llame al 107 o vaya a la guardia, y nada mas.
- No accedes a datos: no sabes que turnos tiene la persona ni su historia.
  Si pregunta por sus datos, indicale en que pantalla verlos.
- Si la pregunta no tiene nada que ver con la aplicacion ni con salud,
  decile amablemente que solo podes ayudar con eso.

COMO RESPONDER
- Español rioplatense (voseo), claro y concreto.
- Si son pasos, usa una lista corta numerada. Si no, parrafos cortos.
- No te extiendas mas de lo necesario: quien pregunta esta usando la app
  en este momento.
- Si ya respondiste algo antes en esta conversacion, no lo repitas.

MANUAL DE LA APLICACION
{manual}"""

NOMBRES_ROL = {
    'Patient': 'Paciente',
    'Doctor': 'Medico',
    'Nurse': 'Enfermero',
    'Administrative': 'Administrativo',
    'Administrator': 'Administrador',
    'Superadministrador': 'Superadministrador',
}


def asistente_app(pregunta, historial=None, rol=None, ruta=None):
    """Chat de ayuda sobre el uso de la aplicacion.

    rol viene del JWT (o None si no hay sesion): nunca del cuerpo del
    pedido, para que nadie se haga pasar por administrativo y pida
    instrucciones que no le corresponden.
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
        rol_msg = 'model' if mensaje.get('role') == 'assistant' else 'user'
        contents.append({"role": rol_msg, "parts": [{"text": texto}]})
    contents.append({"role": "user", "parts": [{"text": pregunta}]})

    rol_legible = NOMBRES_ROL.get(rol, 'Visitante sin cuenta')
    ruta_legible = ruta or 'desconocida'

    return _generate({
        "systemInstruction": {
            "parts": [{"text": _INSTRUCCIONES_ASISTENTE.format(
                rol=rol_legible, ruta=ruta_legible, manual=_MANUAL_APP
            )}]
        },
        "contents": contents,
        "generationConfig": _config_generacion(1200),
    })


# ---------------------------------------------------------------------------
# Reserva de turnos: sugerencia de especialidad
# ---------------------------------------------------------------------------

MAX_LARGO_DESCRIPCION = 500


def sugerir_especialidad(descripcion, especialidades):
    """Orienta a que especialidad conviene ir, a partir de lo que cuenta la
    persona y de la lista REAL de especialidades del centro.

    Esto esta a un paso del triage, que es un acto medico. Por eso:
    - Nunca dice que tiene la persona: dice a quien conviene consultar.
    - Ante cualquier señal de urgencia, no sugiere nada: deriva al 107.
    - En la duda, clinica medica, que es la puerta de entrada de la
      atencion primaria y deriva si hace falta.

    especialidades: lista de {"id": int, "name": str}.
    Devuelve dict: {"urgente": bool, "mensaje": str, "sugerencias": [ {id, nombre, motivo} ]}
    """
    descripcion = (descripcion or '').strip()
    if not descripcion:
        raise AIServiceError("Contanos brevemente que te pasa.")
    if len(descripcion) > MAX_LARGO_DESCRIPCION:
        raise AIServiceError(
            f"El texto es muy largo (maximo {MAX_LARGO_DESCRIPCION} caracteres)."
        )

    listado = "\n".join(f'- id {e["id"]}: {e["name"]}' for e in especialidades)

    prompt = f"""Sos el asistente de turnos de un centro de salud publico de atencion
primaria en Mendoza, Argentina. Una persona describe brevemente que le pasa
y vos la orientas sobre QUE ESPECIALIDAD del centro le conviene pedir.

REGLAS ESTRICTAS
1. NO diagnostiques. Nunca digas que enfermedad o condicion tiene la persona.
   Solo orientas hacia una especialidad.
2. Si la descripcion sugiere una urgencia (dolor de pecho, dificultad para
   respirar, sangrado abundante, perdida de conocimiento, convulsiones,
   fiebre muy alta en bebes, golpes fuertes en la cabeza, ideas de hacerse
   daño), devolve urgente=true, sin sugerencias, con un mensaje breve que
   diga que llame al 107 o vaya a la guardia ya mismo.
3. Elegi UNICAMENTE de la lista de especialidades de abajo, usando su id.
   No inventes especialidades.
4. Sugeri 1 o 2 especialidades, no mas. La primera es la mas recomendada.
5. En caso de duda, o si el problema es general o poco claro, la primera
   sugerencia tiene que ser "clinica medica" (si esta en la lista), que
   evalua y deriva. Para menores de edad, considera "pediatria".
6. El motivo de cada sugerencia es UNA oracion, en español rioplatense
   (voseo), sin tecnicismos y sin nombrar enfermedades.

ESPECIALIDADES DISPONIBLES
{listado}

DESCRIPCION DE LA PERSONA
{descripcion}

Responde SOLO con JSON valido con esta forma exacta, sin texto alrededor:
{{"urgente": false, "mensaje": "una oracion de orientacion general",
  "sugerencias": [{{"id": 1, "motivo": "por que esta especialidad"}}]}}"""

    config = _config_generacion(600)
    # Se pide JSON estricto para poder parsearlo sin adivinar
    config["responseMimeType"] = "application/json"

    crudo = _generate({
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": config,
    })

    try:
        data = json.loads(crudo)
    except json.JSONDecodeError:
        print(f"[ai_service] JSON invalido en sugerencia: {crudo[:300]}")
        raise AIServiceError("No se pudo interpretar la sugerencia. Probá de nuevo.")

    # Se valida contra la lista real: si el modelo devolvio un id que no
    # existe, se descarta. Nunca se confia ciegamente en la respuesta.
    por_id = {e["id"]: e["name"] for e in especialidades}
    sugerencias = []
    for item in data.get("sugerencias", []) or []:
        try:
            sid = int(item.get("id"))
        except (TypeError, ValueError):
            continue
        if sid in por_id:
            sugerencias.append({
                "id": sid,
                "nombre": por_id[sid],
                "motivo": str(item.get("motivo", "")).strip(),
            })
    sugerencias = sugerencias[:2]

    urgente = bool(data.get("urgente"))
    mensaje = str(data.get("mensaje", "")).strip()

    if urgente:
        # El mensaje de urgencia no se deja librado al modelo
        mensaje = (
            "Por lo que contás, esto puede ser una urgencia. No saques turno: "
            "llamá al 107 o andá a la guardia más cercana ahora."
        )
        sugerencias = []
    elif not sugerencias:
        raise AIServiceError(
            "No pude orientarte con esa descripción. Probá contarlo con otras "
            "palabras, o elegí Clínica médica, que evalúa y deriva."
        )

    return {"urgente": urgente, "mensaje": mensaje, "sugerencias": sugerencias}