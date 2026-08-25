from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity, get_jwt
from datetime import date, datetime, time
from models.db import db
from models.medical_appointment import MedicalAppointment, VALID_STATUS_TRANSITIONS
from models.patient import Patient
from models.user import User
from models.doctor import Doctor
from models.specialty import Specialty
from enums import AppointmentStatusEnum, RoleEnum
from utils.role_required import role_required
from utils.email_service import send_welcome_email, send_appointment_reminder_email
from utils.email_tokens import leer_token_accion_turno

appointments_bp = Blueprint('appointments', __name__, url_prefix='/api/appointments')


# CONFIGURACIÓN DEL NEGOCIO

APPOINTMENT_DURATION_MINUTES = 20
OPENING_TIME = time(8, 0)    # 08:00 hs
CLOSING_TIME = time(20, 0)   # 20:00 hs


def minutes_between(time1, time2):
    """Devuelve la diferencia absoluta en minutos entre dos horas."""
    total_minutes_1 = time1.hour * 60 + time1.minute
    total_minutes_2 = time2.hour * 60 + time2.minute
    return abs(total_minutes_1 - total_minutes_2)


def has_overlap(query_appointments, appointment_time, exclude_id=None):
    """Verifica si la hora solicitada pisa algún turno existente considerando la duración (20 mins)."""
    for existing in query_appointments:
        if exclude_id is not None and existing.id_medical_appointment == exclude_id:
            continue
        try:
            existing_time = datetime.strptime(existing.hour, "%H:%M").time()
        except (ValueError, TypeError):
            # Un turno con la hora mal cargada no debería bloquear la agenda entera
            continue
        if minutes_between(appointment_time, existing_time) < APPOINTMENT_DURATION_MINUTES:
            return True
    return False


def is_within_business_hours(appointment_time):
    """Verifica que el turno esté dentro del horario de la clínica."""
    start_minutes = appointment_time.hour * 60 + appointment_time.minute
    end_minutes = start_minutes + APPOINTMENT_DURATION_MINUTES
    opening_minutes = OPENING_TIME.hour * 60 + OPENING_TIME.minute
    closing_minutes = CLOSING_TIME.hour * 60 + CLOSING_TIME.minute
    return opening_minutes <= start_minutes and end_minutes <= closing_minutes


def get_doctor_agenda(doctor_id, target_date):
    """Turnos que ocupan la agenda de un médico ese día.

    Los cancelados quedan afuera: un turno cancelado libera el horario,
    si no la grilla se iría vaciando para siempre.
    """
    return MedicalAppointment.query.filter(
        MedicalAppointment.id_doctor == doctor_id,
        MedicalAppointment.date == target_date,
        MedicalAppointment.status != AppointmentStatusEnum.CANCELADO
    ).all()


def get_patient_agenda(patient_id, target_date):
    """Turnos vigentes de un paciente ese día (los cancelados no cuentan)."""
    return MedicalAppointment.query.filter(
        MedicalAppointment.id_patient == patient_id,
        MedicalAppointment.date == target_date,
        MedicalAppointment.status != AppointmentStatusEnum.CANCELADO
    ).all()


def buscar_o_crear_paciente(data, allow_patient_update=False, verify_identity=False):
    """Busca al paciente por DNI. Si no existe, lo crea.

    verify_identity: lo usa la reserva publica. Si el DNI ya esta registrado,
    exige que la fecha de nacimiento coincida. Sin eso, cualquiera que supiera
    un DNI podria sacarle turnos a otra persona.

    allow_patient_update: solo el administrativo, que es un usuario autenticado.
    Desde la reserva publica NUNCA se actualiza una ficha existente.
    """
    dni = data.get('dni')
    if not dni:
        return None, ("El DNI es obligatorio", 400), False

    paciente = Patient.query.filter_by(dni=dni).first()

    # 1. Si ya existe
    if paciente:
        if verify_identity:
            birth_str = data.get('date_of_birth')
            if not birth_str:
                return None, ("La fecha de nacimiento es obligatoria", 400), False
            try:
                birth_date = date.fromisoformat(birth_str)
            except ValueError:
                return None, ("date_of_birth invalida. Formato esperado YYYY-MM-DD", 400), False
            if paciente.date_of_birth != birth_date:
                return None, (
                    "Los datos no coinciden con los registrados. "
                    "Si ya tenes cuenta, inicia sesion para sacar tu turno.",
                    403
                ), False

        if allow_patient_update:
            if 'health_plan_status' in data:
                paciente.health_plan_status = data.get('health_plan_status')
            if 'health_plan_name' in data:
                paciente.health_plan_name = data.get('health_plan_name')
            if 'member_number' in data:
                paciente.member_number = data.get('member_number')
            db.session.commit()
        return paciente, None, False  # ya existia

    # 2. Si no existe, validamos campos minimos y lo creamos
    campos_requeridos = ['first_name', 'last_name', 'email', 'date_of_birth']
    faltantes = [c for c in campos_requeridos if not data.get(c)]
    if faltantes:
        return None, (f"Paciente nuevo, faltan campos obligatorios: {', '.join(faltantes)}", 400), False

    try:
        fecha_nacimiento = date.fromisoformat(data.get('date_of_birth'))
    except ValueError:
        return None, ("date_of_birth invalida. Formato esperado YYYY-MM-DD", 400), False

    # El email tambien es unico: si ya esta tomado por otra cuenta, avisamos
    if User.query.filter_by(email=data.get('email')).first():
        return None, ("Ya hay una cuenta registrada con ese email", 409), False

    nuevo_paciente = Patient(
        first_name=data.get('first_name'),
        last_name=data.get('last_name'),
        username=dni,
        dni=dni,
        email=data.get('email'),
        date_of_birth=fecha_nacimiento,
        phone_number=data.get('phone_number'),
        address=data.get('address'),
        rol=RoleEnum.PATIENT,
        health_plan_status=data.get('health_plan_status', False),
        health_plan_name=data.get('health_plan_name'),
        member_number=data.get('member_number')
    )
    nuevo_paciente.set_password(dni)
    db.session.add(nuevo_paciente)
    db.session.flush()

    return nuevo_paciente, None, True  # recien creado


def _crear_turno_validado(data, status_default, is_overbooking=False,
                          allow_patient_update=False, verify_identity=False):
    """Lógica central validada para crear turnos."""
    if not Doctor.query.get(data.get('id_doctor')):
        return {"msg": "Doctor no encontrado"}, 404

    if not data.get('date'):
        return {"msg": "La fecha es obligatoria"}, 400
    try:
        appointment_date = date.fromisoformat(data.get('date'))
    except ValueError:
        return {"msg": "Fecha inválida. Formato esperado YYYY-MM-DD"}, 400

    if appointment_date < date.today():
        return {"msg": "No se puede reservar un turno en una fecha anterior a hoy"}, 400

    if not data.get('hour'):
        return {"msg": "La hora es obligatoria"}, 400
    try:
        appointment_time = datetime.strptime(data.get('hour'), "%H:%M").time()
    except ValueError:
        return {"msg": "Hora inválida. Formato esperado HH:MM"}, 400

    if not is_within_business_hours(appointment_time):
        return {"msg": f"El turno debe iniciar entre las {OPENING_TIME.strftime('%H:%M')} y terminar antes de las {CLOSING_TIME.strftime('%H:%M')}"}, 400

    paciente, error, es_paciente_nuevo = buscar_o_crear_paciente(
        data,
        allow_patient_update=allow_patient_update,
        verify_identity=verify_identity
    )
    if error:
        return {"msg": error[0]}, error[1]

    # VALIDACIÓN PACIENTE: no puede tener dos turnos pisados, ni siquiera en un sobreturno.
    # El sobreturno satura al médico, no clona al paciente.
    patient_appointments = get_patient_agenda(paciente.id_user, appointment_date)
    if has_overlap(patient_appointments, appointment_time):
        return {"msg": "El paciente ya tiene un turno reservado en ese horario."}, 409

    # VALIDACIÓN MÉDICO: choque de turnos (se saltea solo si es sobreturno)
    if not is_overbooking:
        doctor_appointments = get_doctor_agenda(data.get('id_doctor'), appointment_date)
        if has_overlap(doctor_appointments, appointment_time):
            return {"msg": "El médico ya tiene un turno asignado en ese horario. Por favor, asigne un Sobre Turno si es necesario."}, 409

    new_appointment = MedicalAppointment(
        id_patient=paciente.id_user,
        id_doctor=data.get('id_doctor'),
        date=appointment_date,
        hour=data.get('hour'),
        status=status_default,
        reason=data.get('reason'),
        # Se guarda la marca: si no, el sobreturno queda indistinguible de un turno normal
        is_overbooking=is_overbooking
    )
    db.session.add(new_appointment)
    db.session.commit()

    try:
        from utils.email_service import send_appointment_booking_email
        send_appointment_booking_email(paciente.email, paciente.first_name, new_appointment)
    except Exception as mail_error:
        print(f"No se pudo enviar el mail de reserva: {mail_error}")

    # Si el paciente se creo con este turno, se le manda el mail de bienvenida.
    # Va en try/except aparte: que falle el mail no puede tirar abajo un turno
    # que ya quedo guardado.
    if es_paciente_nuevo:
        try:
            send_welcome_email(paciente.email, paciente.first_name)
        except Exception as mail_error:
            print(f"No se pudo enviar el mail de bienvenida: {mail_error}")

    return {
        "msg": "Turno creado exitosamente" if not is_overbooking else "Sobre turno creado exitosamente",
        "appointment_id": new_appointment.id_medical_appointment,
        "patient_id": paciente.id_user,
        "appointment": new_appointment.to_dict(),
    }, 201


# ENDPOINTS DE CREACIÓN DE TURNOS

@appointments_bp.route('/public', methods=['POST'])
def create_appointment_public():
    """Reserva pública por parte del paciente. Bloqueamos la posibilidad de Sobre Turnos."""
    try:
        if not request.is_json:
            return jsonify({"msg": "Missing JSON in request"}), 400
        data = request.get_json()

        # Overbooking en False y sin tocar fichas existentes: es un endpoint sin login
        body, status_code = _crear_turno_validado(
            data,
            AppointmentStatusEnum.RESERVADO,
            is_overbooking=False,
            allow_patient_update=False,
            verify_identity=True
        )
        return jsonify(body), status_code
    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "Error al crear turno", "error": str(e)}), 500


@appointments_bp.route('/', methods=['POST'])
@role_required(RoleEnum.ADMINISTRATIVE)
def create_appointment():
    """Asignación de turno por Administrativo. Permite enviar 'is_overbooking': true."""
    try:
        if not request.is_json:
            return jsonify({"msg": "Missing JSON in request"}), 400
        data = request.get_json()

        is_overbooking = bool(data.get('is_overbooking', False))

        body, status_code = _crear_turno_validado(
            data,
            AppointmentStatusEnum.RESERVADO,
            is_overbooking=is_overbooking,
            allow_patient_update=True
        )
        return jsonify(body), status_code
    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "Error al crear turno", "error": str(e)}), 500


@appointments_bp.route('/me', methods=['POST'])
@role_required(RoleEnum.PATIENT)
def create_my_appointment():
    """Reserva hecha por el propio paciente logueado.

    A diferencia de /public, el paciente sale del JWT y NUNCA del body:
    así nadie puede reservar a nombre de otro ni pisarle los datos.
    """
    try:
        if not request.is_json:
            return jsonify({"msg": "Falta el JSON en la petición"}), 400
        data = request.get_json()

        patient_id = int(get_jwt_identity())
        if not Patient.query.get(patient_id):
            return jsonify({"msg": "Paciente no encontrado"}), 404

        doctor = Doctor.query.get(data.get('id_doctor'))
        if not doctor:
            return jsonify({"msg": "Doctor no encontrado"}), 404

        if not data.get('date'):
            return jsonify({"msg": "La fecha es obligatoria"}), 400
        try:
            appointment_date = date.fromisoformat(data.get('date'))
        except ValueError:
            return jsonify({"msg": "Fecha inválida. Formato esperado YYYY-MM-DD"}), 400

        if appointment_date < date.today():
            return jsonify({"msg": "No se puede reservar un turno en una fecha anterior a hoy"}), 400

        if not data.get('hour'):
            return jsonify({"msg": "La hora es obligatoria"}), 400
        try:
            appointment_time = datetime.strptime(data.get('hour'), "%H:%M").time()
        except ValueError:
            return jsonify({"msg": "Hora inválida. Formato esperado HH:MM"}), 400

        if not is_within_business_hours(appointment_time):
            return jsonify({
                "msg": f"El turno debe iniciar entre las {OPENING_TIME.strftime('%H:%M')} "
                       f"y terminar antes de las {CLOSING_TIME.strftime('%H:%M')}"
            }), 400

        if has_overlap(get_patient_agenda(patient_id, appointment_date), appointment_time):
            return jsonify({"msg": "Ya tenés un turno reservado en ese horario."}), 409

        # El paciente nunca puede generar sobreturnos en la agenda del médico
        if has_overlap(get_doctor_agenda(doctor.id_user, appointment_date), appointment_time):
            return jsonify({"msg": "Ese horario ya no está disponible. Elegí otro."}), 409

        new_appointment = MedicalAppointment(
            id_patient=patient_id,
            id_doctor=doctor.id_user,
            date=appointment_date,
            hour=data.get('hour'),
            status=AppointmentStatusEnum.RESERVADO,
            reason=data.get('reason'),
            is_overbooking=False
        )
        db.session.add(new_appointment)
        db.session.commit()

        return jsonify(new_appointment.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "Error al crear el turno", "error": str(e)}), 500


# ENDPOINTS DE CONSULTA Y EDICIÓN

@appointments_bp.route('/', methods=['GET'])
@role_required(RoleEnum.NURSE, RoleEnum.DOCTOR, RoleEnum.ADMINISTRATIVE)
def get_appointments():
    """Listado de turnos. Acepta filtros opcionales para la pantalla del administrativo:
    ?date=YYYY-MM-DD, ?id_doctor=<id>, ?status=<estado>
    """
    try:
        query = MedicalAppointment.query

        date_str = request.args.get('date')
        if date_str:
            try:
                query = query.filter(MedicalAppointment.date == date.fromisoformat(date_str))
            except ValueError:
                return jsonify({"msg": "Fecha inválida. Formato esperado YYYY-MM-DD"}), 400

        id_doctor = request.args.get('id_doctor', type=int)
        if id_doctor:
            query = query.filter(MedicalAppointment.id_doctor == id_doctor)

        status_str = request.args.get('status')
        if status_str:
            try:
                query = query.filter(MedicalAppointment.status == AppointmentStatusEnum(status_str))
            except ValueError:
                valid_statuses = [s.value for s in AppointmentStatusEnum]
                return jsonify({"msg": f"Estado inválido. Opciones: {valid_statuses}"}), 400

        appointments = query.order_by(
            MedicalAppointment.date.desc(),
            MedicalAppointment.hour.asc()
        ).all()
        return jsonify([a.to_dict() for a in appointments]), 200
    except Exception as e:
        return jsonify({"msg": "Error fetching appointments", "error": str(e)}), 500


@appointments_bp.route('/<int:appointment_id>', methods=['GET'])
@role_required(RoleEnum.NURSE, RoleEnum.DOCTOR, RoleEnum.ADMINISTRATIVE, RoleEnum.PATIENT)
def get_appointment(appointment_id):
    try:
        appointment = MedicalAppointment.query.get(appointment_id)
        if not appointment:
            return jsonify({"msg": "Appointment not found"}), 404

        claims = get_jwt()
        if claims.get('rol') == RoleEnum.PATIENT.value:
            if int(get_jwt_identity()) != appointment.id_patient:
                return jsonify({"msg": "No podés ver el turno de otro paciente"}), 403

        return jsonify(appointment.to_dict()), 200
    except Exception as e:
        return jsonify({"msg": "Error fetching appointment"}), 500


@appointments_bp.route('/patient/<int:patient_id>', methods=['GET'])
@role_required(RoleEnum.NURSE, RoleEnum.DOCTOR, RoleEnum.ADMINISTRATIVE, RoleEnum.PATIENT)
def get_appointments_by_patient(patient_id):
    try:
        claims = get_jwt()
        if claims.get('rol') == RoleEnum.PATIENT.value:
            if int(get_jwt_identity()) != patient_id:
                return jsonify({"msg": "No podés ver los turnos de otro paciente"}), 403

        appointments = MedicalAppointment.query.filter_by(id_patient=patient_id).order_by(MedicalAppointment.date.desc()).all()
        return jsonify([a.to_dict() for a in appointments]), 200
    except Exception as e:
        return jsonify({"msg": "Error fetching patient appointments"}), 500


@appointments_bp.route('/<int:appointment_id>', methods=['PUT'])
@role_required(RoleEnum.ADMINISTRATIVE)
def update_appointment(appointment_id):
    try:
        appointment = MedicalAppointment.query.get(appointment_id)
        if not appointment:
            return jsonify({"msg": "Appointment not found"}), 404

        if not request.is_json:
            return jsonify({"msg": "Missing JSON in request"}), 400
        data = request.get_json()

        new_date = appointment.date
        if 'date' in data:
            if not data.get('date'):
                return jsonify({"msg": "Date cannot be empty"}), 400
            try:
                new_date = date.fromisoformat(data.get('date'))
            except ValueError:
                return jsonify({"msg": "Invalid date. Expected format YYYY-MM-DD"}), 400
            if new_date < date.today():
                return jsonify({"msg": "No se puede reprogramar un turno a una fecha anterior a hoy"}), 400

        new_hour_str = appointment.hour
        if 'hour' in data:
            try:
                datetime.strptime(data.get('hour'), "%H:%M")
            except (ValueError, TypeError):
                return jsonify({"msg": "Invalid hour. Expected format HH:MM"}), 400
            new_hour_str = data.get('hour')

        new_doctor_id = appointment.id_doctor
        if 'id_doctor' in data:
            if not Doctor.query.get(data.get('id_doctor')):
                return jsonify({"msg": "Doctor not found"}), 404
            new_doctor_id = data.get('id_doctor')

        new_time = datetime.strptime(new_hour_str, "%H:%M").time()
        if not is_within_business_hours(new_time):
            return jsonify({"msg": f"El turno debe iniciar entre las {OPENING_TIME.strftime('%H:%M')} y terminar antes de las {CLOSING_TIME.strftime('%H:%M')}"}), 400

        # Un sobreturno ya nació pisando la agenda: si se lo edita, se respeta esa condición
        if not appointment.is_overbooking:
            doctor_appointments = get_doctor_agenda(new_doctor_id, new_date)
            if has_overlap(doctor_appointments, new_time, exclude_id=appointment.id_medical_appointment):
                return jsonify({"msg": "El médico ya tiene un turno en ese horario."}), 409

        patient_appointments = get_patient_agenda(appointment.id_patient, new_date)
        if has_overlap(patient_appointments, new_time, exclude_id=appointment.id_medical_appointment):
            return jsonify({"msg": "El paciente ya tiene otro turno a esa hora."}), 409

        appointment.date = new_date
        appointment.hour = new_hour_str
        appointment.id_doctor = new_doctor_id
        if 'reason' in data:
            appointment.reason = data.get('reason')
        if 'status' in data:
            try:
                new_status = AppointmentStatusEnum(data.get('status'))
            except ValueError:
                valid_statuses = [s.value for s in AppointmentStatusEnum]
                return jsonify({"msg": f"Invalid status. Valid options: {valid_statuses}"}), 400
            if new_status != appointment.status and not appointment.can_transition_to(new_status):
                allowed = [s.value for s in VALID_STATUS_TRANSITIONS.get(appointment.status, set())]
                return jsonify({
                    "msg": f"No se puede pasar de '{appointment.status.value}' a '{new_status.value}'.",
                    "allowed": allowed
                }), 409
            appointment.status = new_status

        db.session.commit()
        return jsonify(appointment.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "Error updating appointment", "error": str(e)}), 500


@appointments_bp.route('/<int:appointment_id>', methods=['DELETE'])
@role_required(RoleEnum.ADMINISTRATIVE)
def delete_appointment(appointment_id):
    try:
        appointment = MedicalAppointment.query.get(appointment_id)
        if not appointment:
            return jsonify({"msg": "Appointment not found"}), 404

        db.session.delete(appointment)
        db.session.commit()
        return jsonify({"msg": "Appointment deleted successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "Error deleting appointment", "error": str(e)}), 500


@appointments_bp.route('/<int:appointment_id>/status', methods=['PATCH'])
@role_required(RoleEnum.ADMINISTRATIVE, RoleEnum.DOCTOR, RoleEnum.NURSE)
def update_appointment_status(appointment_id):
    """Cambia el estado del turno respetando el camino válido:
    Reservado -> En espera -> Atendido, y Cancelado desde cualquiera de los dos primeros.
    Atendido y Cancelado son finales.
    """
    try:
        appointment = MedicalAppointment.query.get(appointment_id)
        if not appointment:
            return jsonify({"msg": "Appointment not found"}), 404
        if not request.is_json:
            return jsonify({"msg": "Missing JSON in request"}), 400

        new_status_str = request.get_json().get('status')
        if not new_status_str:
            return jsonify({"msg": "Status is required"}), 400

        try:
            new_status = AppointmentStatusEnum(new_status_str)
        except ValueError:
            valid_statuses = [s.value for s in AppointmentStatusEnum]
            return jsonify({"msg": f"Invalid status. Valid options: {valid_statuses}"}), 400

        if new_status == appointment.status:
            return jsonify({"msg": f"El turno ya está en estado '{new_status.value}'"}), 400

        if not appointment.can_transition_to(new_status):
            allowed = [s.value for s in VALID_STATUS_TRANSITIONS.get(appointment.status, set())]
            return jsonify({
                "msg": f"No se puede pasar de '{appointment.status.value}' a '{new_status.value}'.",
                "allowed": allowed
            }), 409

        appointment.status = new_status
        db.session.commit()
        return jsonify(appointment.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "Error updating appointment status", "error": str(e)}), 500


@appointments_bp.route('/<int:appointment_id>/transitions', methods=['GET'])
@role_required(RoleEnum.ADMINISTRATIVE, RoleEnum.DOCTOR, RoleEnum.NURSE)
def get_allowed_transitions(appointment_id):
    """Estados a los que puede pasar este turno.

    Lo usa el front para mostrar solo las opciones válidas en el desplegable
    en vez de ofrecer todo y que el backend rechace después.
    """
    appointment = MedicalAppointment.query.get(appointment_id)
    if not appointment:
        return jsonify({"msg": "Appointment not found"}), 404

    allowed = [s.value for s in VALID_STATUS_TRANSITIONS.get(appointment.status, set())]
    return jsonify({
        "id_medical_appointment": appointment.id_medical_appointment,
        "current": appointment.status.value,
        "allowed": sorted(allowed)
    }), 200


# ENDPOINTS DE CANCELACIÓN

@appointments_bp.route('/<int:appointment_id>/cancel', methods=['PATCH'])
@role_required(RoleEnum.PATIENT, RoleEnum.ADMINISTRATIVE)
def cancel_appointment(appointment_id):
    """Cancela un turno.

    Tanto el paciente como el administrativo pueden cancelar mientras el turno
    siga abierto, incluso minutos antes: el horario queda libre y la clinica
    puede reasignarlo a una urgencia.
    """
    try:
        appointment = MedicalAppointment.query.get(appointment_id)
        if not appointment:
            return jsonify({"msg": "Turno no encontrado"}), 404

        rol = get_jwt().get('rol')

        if rol == RoleEnum.PATIENT.value:
            if appointment.id_patient != int(get_jwt_identity()):
                return jsonify({"msg": "No podés cancelar el turno de otra persona"}), 403

            if not appointment.is_open():
                return jsonify({"msg": f"El turno está '{appointment.status.value}' y no se puede cancelar"}), 400

            if not appointment.patient_can_cancel():
                return jsonify({
                    "msg": "Ya no se puede cancelar online: faltan menos de 8 horas para el turno. "
                           "Comunicate con la clínica."
                }), 400
        else:
            # Administrativo: puede cancelar siempre que el turno siga abierto
            if not appointment.is_open():
                return jsonify({"msg": f"El turno está '{appointment.status.value}' y no se puede cancelar"}), 400

        appointment.status = AppointmentStatusEnum.CANCELADO
        db.session.commit()

        return jsonify(appointment.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "Error al cancelar el turno", "error": str(e)}), 500


@appointments_bp.route('/<int:appointment_id>/confirm', methods=['PATCH'])
@role_required(RoleEnum.PATIENT)
def confirm_appointment(appointment_id):
    """El paciente confirma su asistencia dentro de los 3 días previos al turno."""
    try:
        appointment = MedicalAppointment.query.get(appointment_id)
        if not appointment:
            return jsonify({"msg": "Turno no encontrado"}), 404

        if appointment.id_patient != int(get_jwt_identity()):
            return jsonify({"msg": "No autorizado"}), 403

        if appointment.confirmed:
            return jsonify({"msg": "El turno ya estaba confirmado"}), 400

        if not appointment.is_open():
            return jsonify({"msg": f"El turno está '{appointment.status.value}' y no se puede confirmar"}), 400

        if not appointment.patient_can_confirm():
            remaining = appointment.hours_until()
            if remaining is not None and remaining <= 0:
                return jsonify({"msg": "El turno ya pasó"}), 400
            return jsonify({
                "msg": "Todavía no se puede confirmar: la confirmación se habilita 3 días antes del turno."
            }), 400

        appointment.confirmed = True
        db.session.commit()
        return jsonify(appointment.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "Error al confirmar el turno", "error": str(e)}), 500


@appointments_bp.route('/<int:appointment_id>/reschedule', methods=['PUT'])
@role_required(RoleEnum.PATIENT)
def reschedule_my_appointment(appointment_id):
    """El paciente reprograma su propio turno a otra fecha y hora."""
    try:
        appointment = MedicalAppointment.query.get(appointment_id)
        if not appointment:
            return jsonify({"msg": "Turno no encontrado"}), 404

        if appointment.id_patient != int(get_jwt_identity()):
            return jsonify({"msg": "No podés reprogramar el turno de otra persona"}), 403

        if not appointment.is_open():
            return jsonify({"msg": f"El turno está '{appointment.status.value}' y no se puede reprogramar"}), 400

        if not request.is_json:
            return jsonify({"msg": "Falta el JSON en la petición"}), 400

        data = request.get_json()

        if not data.get('date') or not data.get('hour'):
            return jsonify({"msg": "Se requiere la nueva fecha y hora"}), 400

        try:
            new_date = date.fromisoformat(data.get('date'))
        except ValueError:
            return jsonify({"msg": "Fecha inválida. Formato esperado YYYY-MM-DD"}), 400

        if new_date < date.today():
            return jsonify({"msg": "No podés reprogramar el turno a una fecha del pasado"}), 400

        new_hour_str = data.get('hour')
        try:
            new_time = datetime.strptime(new_hour_str, "%H:%M").time()
        except ValueError:
            return jsonify({"msg": "Hora inválida. Formato esperado HH:MM"}), 400

        if not is_within_business_hours(new_time):
            return jsonify({"msg": f"El turno debe iniciar entre las {OPENING_TIME.strftime('%H:%M')} y terminar antes de las {CLOSING_TIME.strftime('%H:%M')}"}), 400

        doctor_appointments = get_doctor_agenda(appointment.id_doctor, new_date)
        if has_overlap(doctor_appointments, new_time, exclude_id=appointment.id_medical_appointment):
            return jsonify({"msg": "El médico ya tiene un turno en ese horario."}), 409

        patient_appointments = get_patient_agenda(appointment.id_patient, new_date)
        if has_overlap(patient_appointments, new_time, exclude_id=appointment.id_medical_appointment):
            return jsonify({"msg": "Ya tenés otro turno reservado a esa hora."}), 409

        appointment.date = new_date
        appointment.hour = new_hour_str
        appointment.status = AppointmentStatusEnum.RESERVADO
        # Cambió la fecha: la confirmación anterior ya no vale
        appointment.confirmed = False

        db.session.commit()
        return jsonify(appointment.to_dict()), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "Error al reprogramar el turno", "error": str(e)}), 500


# ESPECIALIDADES Y DISPONIBILIDAD

@appointments_bp.route('/specialties', methods=['GET'])
def get_specialties():
    try:
        specialties = Specialty.query.order_by(Specialty.name.asc()).all()
        return jsonify([s.to_dict() for s in specialties]), 200
    except Exception as e:
        return jsonify({"msg": "Error fetching specialties"}), 500


@appointments_bp.route('/specialties/<int:specialty_id>/doctors', methods=['GET'])
def get_doctors_by_specialty(specialty_id):
    try:
        if not Specialty.query.get(specialty_id):
            return jsonify({"msg": "Specialty not found"}), 404

        doctors = Doctor.query.filter_by(id_especialidad=specialty_id, is_active=True).all()
        return jsonify([d.to_dict() for d in doctors]), 200
    except Exception as e:
        return jsonify({"msg": "Error fetching doctors by specialty"}), 500


@appointments_bp.route('/available-slots', methods=['GET'])
def get_available_slots():
    """Grilla de horarios de un medico para una fecha.

    Devuelve los libres y tambien los ocupados: mostrar el horario tomado
    (en gris) le explica al paciente por que no puede elegirlo, en vez de
    hacerlo desaparecer sin aviso.

    Los turnos cancelados NO ocupan: liberan el horario.
    """
    try:
        id_doctor = request.args.get('id_doctor', type=int)
        date_str = request.args.get('date')

        if not id_doctor or not date_str:
            return jsonify({"msg": "Se requieren id_doctor y date"}), 400

        if not Doctor.query.get(id_doctor):
            return jsonify({"msg": "Doctor no encontrado"}), 404

        try:
            target_date = date.fromisoformat(date_str)
        except ValueError:
            return jsonify({"msg": "Fecha invalida. Formato esperado YYYY-MM-DD"}), 400

        if target_date < date.today():
            return jsonify({"msg": "No se pueden consultar horarios de una fecha pasada"}), 400

        taken_appointments = get_doctor_agenda(id_doctor, target_date)

        now = datetime.now()
        slots = []          # libres (se mantiene por compatibilidad)
        taken = []          # ocupados por otro turno
        grid = []           # la grilla completa, con el motivo de cada estado

        current_minutes = OPENING_TIME.hour * 60 + OPENING_TIME.minute
        closing_minutes = CLOSING_TIME.hour * 60 + CLOSING_TIME.minute

        while current_minutes + APPOINTMENT_DURATION_MINUTES <= closing_minutes:
            slot_time = time(current_minutes // 60, current_minutes % 60)
            label = slot_time.strftime("%H:%M")

            is_past = target_date == now.date() and slot_time <= now.time()
            is_taken = has_overlap(taken_appointments, slot_time)

            if is_past:
                status = 'past'
            elif is_taken:
                status = 'taken'
                taken.append(label)
            else:
                status = 'available'
                slots.append(label)

            grid.append({"hour": label, "status": status})
            current_minutes += APPOINTMENT_DURATION_MINUTES

        return jsonify({
            "id_doctor": id_doctor,
            "date": target_date.isoformat(),
            "slots": slots,
            "taken": taken,
            "grid": grid
        }), 200
    except Exception as e:
        return jsonify({"msg": "Error al obtener horarios disponibles", "error": str(e)}), 500


@appointments_bp.route('/attended-patients', methods=['GET'])
@role_required(RoleEnum.NURSE, RoleEnum.DOCTOR, RoleEnum.ADMINISTRATIVE)
def get_attended_patients():
    """Pacientes efectivamente atendidos por un medico en una fecha.

    Lo usa el enfermero al cargar un seguimiento: solo tiene sentido seguir
    a alguien que realmente paso por la consulta, no a cualquier paciente
    del sistema.

    Parametros opcionales:
      ?date=YYYY-MM-DD  (por defecto, hoy)
      ?id_doctor=<id>   (para ver solo los de un medico)
    """
    try:
        date_str = request.args.get('date')
        if date_str:
            try:
                target_date = date.fromisoformat(date_str)
            except ValueError:
                return jsonify({"msg": "Fecha invalida. Formato esperado YYYY-MM-DD"}), 400
        else:
            target_date = date.today()

        query = MedicalAppointment.query.filter(
            MedicalAppointment.date == target_date,
            MedicalAppointment.status == AppointmentStatusEnum.ATENDIDO
        )

        id_doctor = request.args.get('id_doctor', type=int)
        if id_doctor:
            query = query.filter(MedicalAppointment.id_doctor == id_doctor)

        appointments = query.order_by(MedicalAppointment.hour.asc()).all()

        # Un paciente puede tener mas de un turno atendido el mismo dia
        # (por ejemplo una consulta y un sobreturno). Se devuelve una sola
        # vez, con el dato del primer turno de la jornada.
        result = []
        seen = set()
        for appointment in appointments:
            if appointment.id_patient in seen or not appointment.patient:
                continue
            seen.add(appointment.id_patient)

            patient_data = appointment.patient.to_dict()
            patient_data['attended_by'] = (
                f"{appointment.doctor.first_name} {appointment.doctor.last_name}"
                if appointment.doctor else None
            )
            patient_data['attended_at'] = appointment.hour
            patient_data['id_medical_appointment'] = appointment.id_medical_appointment
            result.append(patient_data)

        return jsonify(result), 200
    except Exception as e:
        return jsonify({"msg": "Error al obtener los pacientes atendidos", "error": str(e)}), 500


@appointments_bp.route('/patients-by-status', methods=['GET'])
@role_required(RoleEnum.NURSE, RoleEnum.DOCTOR, RoleEnum.ADMINISTRATIVE)
def get_patients_by_status():
    """Pacientes con turno en una fecha, en uno o mas estados.

    Generaliza get_attended_patients para los desplegables de pacientes de
    Indicaciones medicas y Signos y sintomas, que necesitan tanto los
    pacientes "En espera" como los ya "Atendido".

    Parametros opcionales:
      ?date=YYYY-MM-DD             (por defecto, hoy)
      ?id_doctor=<id>              (para ver solo los de un medico)
      ?status=En espera,Atendido   (coma-separado; por defecto ambos)
    """
    try:
        date_str = request.args.get('date')
        if date_str:
            try:
                target_date = date.fromisoformat(date_str)
            except ValueError:
                return jsonify({"msg": "Fecha invalida. Formato esperado YYYY-MM-DD"}), 400
        else:
            target_date = date.today()

        status_param = request.args.get('status', 'En espera,Atendido')
        try:
            statuses = [
                AppointmentStatusEnum(value.strip())
                for value in status_param.split(',')
                if value.strip()
            ]
        except ValueError:
            return jsonify({"msg": "Estado invalido"}), 400

        query = MedicalAppointment.query.filter(
            MedicalAppointment.date == target_date,
            MedicalAppointment.status.in_(statuses)
        )

        id_doctor = request.args.get('id_doctor', type=int)
        if id_doctor:
            query = query.filter(MedicalAppointment.id_doctor == id_doctor)

        appointments = query.order_by(MedicalAppointment.hour.asc()).all()

        # Un paciente puede tener mas de un turno el mismo dia; se devuelve
        # una sola vez, con el dato del primer turno de la jornada.
        result = []
        seen = set()
        for appointment in appointments:
            if appointment.id_patient in seen or not appointment.patient:
                continue
            seen.add(appointment.id_patient)

            patient_data = appointment.patient.to_dict()
            patient_data['status'] = appointment.status.value
            patient_data['hour'] = appointment.hour
            patient_data['id_doctor'] = appointment.id_doctor
            patient_data['id_medical_appointment'] = appointment.id_medical_appointment
            result.append(patient_data)

        return jsonify(result), 200
    except Exception as e:
        return jsonify({"msg": "Error al obtener los pacientes", "error": str(e)}), 500

@appointments_bp.route('/public/busy-hours', methods=['POST'])
def get_public_busy_hours():
    """Horas en las que la persona ya tiene turno ese dia.

    Lo usa la pantalla publica para avisar antes de reservar que no puede
    tener dos turnos a la misma hora con profesionales distintos.

    Se identifica con DNI + fecha de nacimiento, igual que la reserva publica.
    Si los datos no coinciden devuelve una lista vacia (no un error): asi
    nadie puede usar este endpoint para averiguar que DNI esta registrado.

    Devuelve SOLO las horas, nunca con que medico. Sin sesion iniciada,
    decir con quien se atiende una persona seria exponer datos medicos.
    """
    try:
        if not request.is_json:
            return jsonify({"busy": []}), 200
        data = request.get_json()

        dni = data.get('dni')
        birth_str = data.get('date_of_birth')
        date_str = data.get('date')

        if not dni or not birth_str or not date_str:
            return jsonify({"busy": []}), 200

        try:
            birth_date = date.fromisoformat(birth_str)
            target_date = date.fromisoformat(date_str)
        except ValueError:
            return jsonify({"busy": []}), 200

        paciente = Patient.query.filter_by(dni=dni).first()
        # Silencio deliberado: mismo resultado si no existe o si no coincide
        if not paciente or paciente.date_of_birth != birth_date:
            return jsonify({"busy": []}), 200

        turnos = MedicalAppointment.query.filter(
            MedicalAppointment.id_patient == paciente.id_user,
            MedicalAppointment.date == target_date,
            MedicalAppointment.status != AppointmentStatusEnum.CANCELADO
        ).all()

        return jsonify({"busy": [t.hour for t in turnos if t.hour]}), 200
    except Exception as e:
        return jsonify({"msg": "Error al consultar los horarios", "error": str(e)}), 500
    
@appointments_bp.route('/action/<token>', methods=['GET'])
def process_email_action(token):
    """
    Ruta pública a la que llega el paciente al hacer click en el email.
    Devuelve HTML para que el paciente vea el resultado directo en su navegador.
    """
    data, error = leer_token_accion_turno(token)
    
    if error:
        return f"<h3 style='color: red;'>Error: {error}</h3>", 400

    appointment_id = data.get('appointment_id')
    accion = data.get('accion')

    appointment = MedicalAppointment.query.get(appointment_id)
    if not appointment:
        return "<h3 style='color: red;'>El turno ya no existe en el sistema.</h3>", 404

    if not appointment.is_open():
        return f"<h3>El turno ya se encuentra '{appointment.status.value}'.</h3>", 400

    # Procesar la acción
    if accion == 'confirm':
        if appointment.confirmed:
            return "<h3 style='color: green;'>¡Tu turno ya estaba confirmado! Te esperamos.</h3>", 200
        appointment.confirmed = True
        msg = "<h3 style='color: green;'>¡Turno confirmado con éxito! Gracias por avisar.</h3>"
        
    elif accion == 'cancel':
        appointment.status = AppointmentStatusEnum.CANCELADO
        msg = "<h3>Tu turno fue cancelado correctamente.</h3>"
    else:
        return "<h3 style='color: red;'>Acción desconocida.</h3>", 400

    db.session.commit()
    return msg, 200