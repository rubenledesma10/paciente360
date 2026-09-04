from datetime import date
from flask import Blueprint, jsonify, request
from flask_jwt_extended import verify_jwt_in_request, get_jwt
from models.news_and_prevention import NewsAndPrevention
from models.patient import Patient
from models.medical_appointment import MedicalAppointment
from models.patient_follow_up import PatientFollowUp
from models.signs_and_symptoms import SignsAndSymptoms
from models.medical_indication import MedicalIndication
from models.specialty import Specialty
from enums import RoleEnum, AppointmentStatusEnum
from utils.role_required import role_required
from utils.ai_service import (
    explicar_simple,
    conversar_sobre_noticia,
    resumir_historia_clinica,
    asistente_app,
    sugerir_especialidad,
    AIServiceError,
)

ai_bp = Blueprint('ai', __name__, url_prefix='/api/ai')


# ---------------------------------------------------------------------------
# Noticias (publico)
# ---------------------------------------------------------------------------

@ai_bp.route('/news/<int:id_news_and_prevention>/simplify', methods=['POST'])
def simplify_news(id_news_and_prevention):
    """Explica una noticia en lenguaje simple.

    Es publico porque las noticias tambien lo son.

    El texto se toma de la base a partir del id, NUNCA del cuerpo del pedido:
    asi nadie puede mandar texto arbitrario para gastar la cuota de la API
    ni para hacerle decir cualquier cosa al modelo.
    """
    news = NewsAndPrevention.query.get(id_news_and_prevention)
    if not news:
        return jsonify({"msg": "Noticia no encontrada"}), 404

    try:
        texto = explicar_simple(news.title, news.content)
        return jsonify({
            "id_news_and_prevention": news.id_news_and_prevention,
            "simplified": texto
        }), 200
    except AIServiceError as e:
        return jsonify({"msg": str(e)}), 503
    except Exception as e:
        print(f"[ai_routes] Error inesperado en simplify: {e}")
        return jsonify({"msg": "No se pudo generar la explicacion."}), 500


@ai_bp.route('/news/<int:id_news_and_prevention>/chat', methods=['POST'])
def chat_about_news(id_news_and_prevention):
    """Conversacion sobre una noticia.

    Body: { "question": "...", "history": [ {"role": "user"|"assistant", "text": "..."}, ... ] }

    El historial lo manda el front en cada pedido: el backend no guarda
    estado de la conversacion, asi que no hace falta sesion ni base para esto.
    """
    news = NewsAndPrevention.query.get(id_news_and_prevention)
    if not news:
        return jsonify({"msg": "Noticia no encontrada"}), 404

    if not request.is_json:
        return jsonify({"msg": "Falta el JSON en la peticion"}), 400

    data = request.get_json()
    pregunta = (data.get('question') or '').strip()
    historial = data.get('history') or []

    if not pregunta:
        return jsonify({"msg": "Escribi tu pregunta."}), 400
    if not isinstance(historial, list):
        return jsonify({"msg": "El historial tiene un formato invalido."}), 400

    try:
        respuesta = conversar_sobre_noticia(news.title, news.content, pregunta, historial)
        return jsonify({
            "id_news_and_prevention": news.id_news_and_prevention,
            "answer": respuesta
        }), 200
    except AIServiceError as e:
        return jsonify({"msg": str(e)}), 503
    except Exception as e:
        print(f"[ai_routes] Error inesperado en chat: {e}")
        return jsonify({"msg": "No se pudo responder la pregunta."}), 500


# ---------------------------------------------------------------------------
# Medico: resumen de historia clinica
# ---------------------------------------------------------------------------

# Cuantos registros de cada tipo se le pasan al modelo. Los mas recientes.
# Acota el tamaño del prompt y el ruido: una consulta no necesita diez
# años de historia, necesita lo ultimo.
MAX_REGISTROS_POR_TIPO = 10


def _edad(fecha_nacimiento):
    if not fecha_nacimiento:
        return None
    hoy = date.today()
    return hoy.year - fecha_nacimiento.year - (
        (hoy.month, hoy.day) < (fecha_nacimiento.month, fecha_nacimiento.day)
    )


def _fecha(valor):
    """dd/mm/aaaa para date o datetime, None si no hay."""
    return valor.strftime('%d/%m/%Y') if valor else None


def _recolectar_datos_paciente(patient):
    """Junta todo lo que el sistema tiene del paciente, ya serializado.

    Se pasan solo los campos con valor clinico: nada de emails, telefonos ni
    direcciones. El modelo no los necesita y no hay motivo para mandarlos
    a un servicio externo.
    """
    turnos = (
        MedicalAppointment.query
        .filter(
            MedicalAppointment.id_patient == patient.id_user,
            MedicalAppointment.status == AppointmentStatusEnum.ATENDIDO,
        )
        .order_by(MedicalAppointment.date.desc(), MedicalAppointment.hour.desc())
        .limit(MAX_REGISTROS_POR_TIPO).all()
    )
    seguimientos = (
        PatientFollowUp.query
        .filter(PatientFollowUp.id_patient == patient.id_user)
        .order_by(PatientFollowUp.date_time.desc())
        .limit(MAX_REGISTROS_POR_TIPO).all()
    )
    signos = (
        SignsAndSymptoms.query
        .filter(SignsAndSymptoms.id_patient == patient.id_user)
        .order_by(SignsAndSymptoms.date_and_time.desc())
        .limit(MAX_REGISTROS_POR_TIPO).all()
    )
    indicaciones = (
        MedicalIndication.query
        .filter(MedicalIndication.id_patient == patient.id_user)
        .order_by(MedicalIndication.created_at.desc())
        .limit(MAX_REGISTROS_POR_TIPO).all()
    )

    return {
        "paciente": {
            "nombre": f"{patient.first_name} {patient.last_name}",
            "edad": _edad(patient.date_of_birth),
            "genero": patient.gender,
            "obra_social": patient.health_plan_name or "Particular",
            "alergias": patient.allergies or None,
        },
        "consultas_atendidas": [
            {
                "fecha": _fecha(t.date),
                "motivo": t.reason,
                "diagnostico": t.diagnosis,
                "tipo_enfermedad": t.disease_type.value if t.disease_type else None,
                "detalle": t.disease_details,
                "medico": f"{t.doctor.first_name} {t.doctor.last_name}" if t.doctor else None,
            }
            for t in turnos
        ],
        "signos_vitales": [
            {
                "fecha": _fecha(s.date_and_time),
                "temperatura": s.temperature,
                "presion": s.blood_pressure,
                "signos": s.signs,
                "sintomas": s.symptoms,
                "tipo_registro": s.record_type,
                "observaciones": s.observations,
            }
            for s in signos
        ],
        "seguimientos_enfermeria": [
            {
                "fecha": _fecha(f.date_time),
                "observaciones": f.observations,
                "proximo_control": _fecha(f.next_check_up),
                "estado": f.get_status(),
            }
            for f in seguimientos
        ],
        "indicaciones": [
            {
                "fecha": _fecha(i.created_at),
                "indicacion": i.indication,
                "tratamiento": i.treatment,
                "medico": f"{i.doctor.first_name} {i.doctor.last_name}" if i.doctor else None,
            }
            for i in indicaciones
        ],
    }


@ai_bp.route('/patients/<int:patient_id>/summary', methods=['GET'])
@role_required(RoleEnum.DOCTOR)
def patient_clinical_summary(patient_id):
    """Resumen clinico del paciente para preparar la consulta.

    Solo medicos: el resumen esta escrito para un profesional y contiene
    datos clinicos que el paciente u otros roles no tienen por que ver aca.
    """
    patient = Patient.query.get(patient_id)
    if not patient:
        return jsonify({"msg": "Paciente no encontrado"}), 404

    try:
        datos = _recolectar_datos_paciente(patient)
        resumen = resumir_historia_clinica(datos)
        return jsonify({
            "id_patient": patient.id_user,
            "summary": resumen,
            "registros": {
                "consultas": len(datos["consultas_atendidas"]),
                "signos": len(datos["signos_vitales"]),
                "seguimientos": len(datos["seguimientos_enfermeria"]),
                "indicaciones": len(datos["indicaciones"]),
            }
        }), 200
    except AIServiceError as e:
        return jsonify({"msg": str(e)}), 503
    except Exception as e:
        print(f"[ai_routes] Error inesperado en summary: {e}")
        return jsonify({"msg": "No se pudo generar el resumen."}), 500


# ---------------------------------------------------------------------------
# Asistente de uso de la aplicacion (chatbot flotante)
# ---------------------------------------------------------------------------

@ai_bp.route('/assistant', methods=['POST'])
def app_assistant():
    """Chat de ayuda sobre como usar la aplicacion.

    Es publico: tambien lo usa alguien sin cuenta que esta sacando turno.
    Si hay sesion, el rol se toma del JWT (no del body) para adaptar la
    respuesta; si no la hay, se trata como visitante.

    Body: { "question": "...", "history": [...], "path": "/mis-turnos" }
    """
    if not request.is_json:
        return jsonify({"msg": "Falta el JSON en la peticion"}), 400

    data = request.get_json()
    pregunta = (data.get('question') or '').strip()
    historial = data.get('history') or []
    ruta = (data.get('path') or '')[:100]

    if not pregunta:
        return jsonify({"msg": "Escribi tu pregunta."}), 400
    if not isinstance(historial, list):
        return jsonify({"msg": "El historial tiene un formato invalido."}), 400

    # JWT opcional: si viene y es valido, sacamos el rol; si no, visitante.
    rol = None
    try:
        verify_jwt_in_request(optional=True)
        claims = get_jwt()
        rol = claims.get('rol') if claims else None
    except Exception:
        rol = None

    try:
        respuesta = asistente_app(pregunta, historial, rol=rol, ruta=ruta)
        return jsonify({"answer": respuesta}), 200
    except AIServiceError as e:
        return jsonify({"msg": str(e)}), 503
    except Exception as e:
        print(f"[ai_routes] Error inesperado en assistant: {e}")
        return jsonify({"msg": "No se pudo responder la pregunta."}), 500


# ---------------------------------------------------------------------------
# Reserva de turnos: sugerencia de especialidad
# ---------------------------------------------------------------------------

@ai_bp.route('/specialty-suggest', methods=['POST'])
def specialty_suggest():
    """Orienta sobre que especialidad pedir a partir de lo que cuenta la
    persona. Publico: lo usa la reserva sin cuenta y la del paciente.

    Las especialidades salen de la base: el modelo elige entre las que
    realmente existen, y el resultado se valida contra esa lista.
    """
    if not request.is_json:
        return jsonify({"msg": "Falta el JSON en la peticion"}), 400

    descripcion = (request.get_json().get('description') or '').strip()
    if not descripcion:
        return jsonify({"msg": "Contanos brevemente qué te pasa."}), 400

    especialidades = [
        {"id": e.id_speciality, "name": e.name}
        for e in Specialty.query.order_by(Specialty.name.asc()).all()
    ]
    if not especialidades:
        return jsonify({"msg": "No hay especialidades cargadas."}), 503

    try:
        resultado = sugerir_especialidad(descripcion, especialidades)
        return jsonify(resultado), 200
    except AIServiceError as e:
        return jsonify({"msg": str(e)}), 503
    except Exception as e:
        print(f"[ai_routes] Error inesperado en specialty-suggest: {e}")
        return jsonify({"msg": "No se pudo generar la sugerencia."}), 500