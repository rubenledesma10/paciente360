from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity, get_jwt
from datetime import date, datetime, time
from models.db import db
from models.medical_appointment import MedicalAppointment
from models.patient import Patient
from models.doctor import Doctor
from models.specialty import Specialty
from enums import AppointmentStatusEnum, RoleEnum
from utils.role_required import role_required

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
        existing_time = datetime.strptime(existing.hour, "%H:%M").time()
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

def buscar_o_crear_paciente(data):
    """Busca al paciente por DNI. Si no existe, lo crea. Si existe, actualiza su Obra Social."""
    dni = data.get('dni')
    if not dni:
        return None, ("El DNI es obligatorio", 400)

    paciente = Patient.query.filter_by(dni=dni).first()
    
    # 1. Si existe, actualizamos su información de Obra Social por si hubo cambios
    if paciente:
        if 'health_plan_status' in data:
            paciente.health_plan_status = data.get('health_plan_status')
        if 'health_plan_name' in data:
            paciente.health_plan_name = data.get('health_plan_name')
        if 'member_number' in data:
            paciente.member_number = data.get('member_number')
        db.session.commit()
        return paciente, None

    # 2. Si no existe, validamos campos mínimos y lo creamos
    campos_requeridos = ['first_name', 'last_name', 'email', 'date_of_birth']
    faltantes = [c for c in campos_requeridos if not data.get(c)]
    if faltantes:
        return None, (f"Paciente nuevo, faltan campos obligatorios: {', '.join(faltantes)}", 400)

    try:
        fecha_nacimiento = date.fromisoformat(data.get('date_of_birth'))
    except ValueError:
        return None, ("date_of_birth inválida. Formato esperado YYYY-MM-DD", 400)

    nuevo_paciente = Patient(
        first_name=data.get('first_name'),
        last_name=data.get('last_name'),
        username=dni,
        dni=dni,
        email=data.get('email'),
        date_of_birth=fecha_nacimiento,
        phone_number=data.get('phone_number'),
        address=data.get('address'),
        # Cargamos los datos de obra social si vinieron en la petición
        health_plan_status=data.get('health_plan_status', False),
        health_plan_name=data.get('health_plan_name'),
        member_number=data.get('member_number')
    )
    nuevo_paciente.set_password(dni)
    db.session.add(nuevo_paciente)
    db.session.flush() 

    return nuevo_paciente, None


def _crear_turno_validado(data, status_default, is_overbooking=False):
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

    paciente, error = buscar_o_crear_paciente(data)
    if error:
        return {"msg": error[0]}, error[1]

    patient_appointments = MedicalAppointment.query.filter(
        MedicalAppointment.id_patient == paciente.id_user,
        MedicalAppointment.date == appointment_date,
        MedicalAppointment.status != AppointmentStatusEnum.CANCELADO
    ).all()
    if has_overlap(patient_appointments, appointment_time):
        return {"msg": "El paciente ya tiene un turno reservado en ese horario."}, 409
 
    if not is_overbooking:
        doctor_appointments = MedicalAppointment.query.filter(
            MedicalAppointment.id_doctor == data.get('id_doctor'),
            MedicalAppointment.date == appointment_date,
            MedicalAppointment.status != AppointmentStatusEnum.CANCELADO
        ).all()
        if has_overlap(doctor_appointments, appointment_time):
            return {"msg": "El médico ya tiene un turno asignado en ese horario. Por favor, asigne un Sobre Turno si es necesario."}, 409

    # Creación del turno
    new_appointment = MedicalAppointment(
        id_patient=paciente.id_user,
        id_doctor=data.get('id_doctor'),
        date=appointment_date,
        hour=data.get('hour'),
        status=status_default,
        reason=data.get('reason')
    )
    db.session.add(new_appointment)
    db.session.commit()

    return {
        "msg": "Turno creado exitosamente" if not is_overbooking else "Sobre turno creado exitosamente",
        "appointment_id": new_appointment.id_medical_appointment,
        "patient_id": paciente.id_user,
    }, 201



# ENDPOINTS DE CREACIÓN DE TURNOS


@appointments_bp.route('/public', methods=['POST'])
def create_appointment_public():
    """Reserva pública por parte del paciente. Bloqueamos la posibilidad de Sobre Turnos."""
    try:
        if not request.is_json:
            return jsonify({"msg": "Missing JSON in request"}), 400
        data = request.get_json()

        # Forzamos False en overbooking para que los pacientes no puedan pisar la agenda
        body, status_code = _crear_turno_validado(data, AppointmentStatusEnum.RESERVADO, is_overbooking=False)
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

        # Leemos si el admin indicó que esto es un sobre turno
        is_overbooking = data.get('is_overbooking', False)

        body, status_code = _crear_turno_validado(data, AppointmentStatusEnum.EN_ESPERA, is_overbooking=is_overbooking)
        return jsonify(body), status_code
    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "Error al crear turno", "error": str(e)}), 500



# ENDPOINTS DE CONSULTA Y EDICIÓN

@appointments_bp.route('/', methods=['GET'])
@role_required(RoleEnum.NURSE, RoleEnum.DOCTOR, RoleEnum.ADMINISTRATIVE)
def get_appointments():
    try:
        appointments = MedicalAppointment.query.all()
        return jsonify([a.to_dict() for a in appointments]), 200
    except Exception as e:
        return jsonify({"msg": "Error fetching appointments"}), 500


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

        # Al editar, respetamos la regla estricta (no permitimos sobre turnos en la edición por seguridad)
        doctor_appointments = MedicalAppointment.query.filter(
            MedicalAppointment.id_doctor == new_doctor_id,
            MedicalAppointment.date == new_date,
            MedicalAppointment.status != AppointmentStatusEnum.CANCELADO
        ).all()
        if has_overlap(doctor_appointments, new_time, exclude_id=appointment.id_medical_appointment):
            return jsonify({"msg": "El médico ya tiene un turno en ese horario."}), 409
 
        patient_appointments = MedicalAppointment.query.filter(
            MedicalAppointment.id_patient == appointment.id_patient,
            MedicalAppointment.date == new_date,
            MedicalAppointment.status != AppointmentStatusEnum.CANCELADO
        ).all()
        if has_overlap(patient_appointments, new_time, exclude_id=appointment.id_medical_appointment):
            return jsonify({"msg": "El paciente ya tiene otro turno a esa hora."}), 409

        appointment.date = new_date
        appointment.hour = new_hour_str
        appointment.id_doctor = new_doctor_id
        if 'reason' in data:
            appointment.reason = data.get('reason')
        if 'status' in data:
            try:
                appointment.status = AppointmentStatusEnum(data.get('status'))
            except ValueError:
                valid_statuses = [s.value for s in AppointmentStatusEnum]
                return jsonify({"msg": f"Invalid status. Valid options: {valid_statuses}"}), 400

        db.session.commit()
        return jsonify({"msg": "Appointment updated successfully"}), 200
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
    try:
        appointment = MedicalAppointment.query.get(appointment_id)
        if not appointment:
            return jsonify({"msg": "Appointment not found"}), 404
        if not request.is_json:
            return jsonify({"msg": "Missing JSON in request"}), 400

        new_status = request.get_json().get('status')
        if not new_status:
            return jsonify({"msg": "Status is required"}), 400

        try:
            appointment.status = AppointmentStatusEnum(new_status)
        except ValueError:
            valid_statuses = [s.value for s in AppointmentStatusEnum]
            return jsonify({"msg": f"Invalid status. Valid options: {valid_statuses}"}), 400

        db.session.commit()
        return jsonify({"msg": "Appointment status updated successfully", "status": appointment.status.value}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "Error updating appointment status"}), 500

# ENDPOINTS DE AUTOGESTIÓN PARA PACIENTES

@appointments_bp.route('/<int:appointment_id>/cancel', methods=['PATCH'])
@role_required(RoleEnum.PATIENT)
def cancel_my_appointment(appointment_id):
    """Permite a un paciente logueado cancelar su propio turno."""
    try:
        appointment = MedicalAppointment.query.get(appointment_id)
        if not appointment:
            return jsonify({"msg": "Turno no encontrado"}), 404

        if appointment.id_patient != int(get_jwt_identity()):
            return jsonify({"msg": "No podés cancelar el turno de otra persona"}), 403

        if appointment.status == AppointmentStatusEnum.ATENDIDO:
            return jsonify({"msg": "No se puede cancelar un turno que ya fue atendido"}), 400

        appointment.status = AppointmentStatusEnum.CANCELADO
        db.session.commit()

        return jsonify({"msg": "Turno cancelado exitosamente"}), 200

    except AttributeError:

        return jsonify({"msg": "Falta agregar 'CANCELADO' en tu AppointmentStatusEnum"}), 500
    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "Error al cancelar el turno", "error": str(e)}), 500


@appointments_bp.route('/<int:appointment_id>/reschedule', methods=['PUT'])
@role_required(RoleEnum.PATIENT)
def reschedule_my_appointment(appointment_id):

    try:
        appointment = MedicalAppointment.query.get(appointment_id)
        if not appointment:
            return jsonify({"msg": "Turno no encontrado"}), 404

 
        if appointment.id_patient != int(get_jwt_identity()):
            return jsonify({"msg": "No podés reprogramar el turno de otra persona"}), 403

        if appointment.status == AppointmentStatusEnum.ATENDIDO:
            return jsonify({"msg": "No se puede reprogramar un turno que ya fue atendido"}), 400

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


        doctor_appointments = MedicalAppointment.query.filter_by(id_doctor=appointment.id_doctor, date=new_date).all()
        if has_overlap(doctor_appointments, new_time, exclude_id=appointment.id_medical_appointment):
            return jsonify({"msg": "El médico ya tiene un turno en ese horario."}), 409

       
        patient_appointments = MedicalAppointment.query.filter_by(id_patient=appointment.id_patient, date=new_date).all()
        if has_overlap(patient_appointments, new_time, exclude_id=appointment.id_medical_appointment):
            return jsonify({"msg": "Ya tenés otro turno reservado a esa hora."}), 409

        
        appointment.date = new_date
        appointment.hour = new_hour_str
        appointment.status = AppointmentStatusEnum.RESERVADO 

        db.session.commit()
        return jsonify({"msg": "Turno reprogramado exitosamente"}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "Error al reprogramar el turno", "error": str(e)}), 500


@appointments_bp.route('/specialties', methods=['GET'])
def get_specialties():
    try:
        specialties = Specialty.query.all()
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
    
@appointments_bp.route('/<int:appointment_id>/confirm', methods=['PATCH'])
@role_required(RoleEnum.PATIENT)
def confirm_appointment(appointment_id):
    appointment = MedicalAppointment.query.get(appointment_id)
    if not appointment:
        return jsonify({"msg": "Appointment not found"}), 404

    # El paciente solo puede confirmar sus propios turnos
    id_logueado = int(get_jwt_identity())
    if appointment.id_patient != id_logueado:
        return jsonify({"msg": "No autorizado"}), 403

    # No se puede confirmar el día del turno (ni después)
    if appointment.date <= date.today():
        return jsonify({"msg": "No se puede confirmar el día del turno"}), 400

    appointment.confirmed = True
    db.session.commit()
    return jsonify(appointment.to_dict()), 200

@appointments_bp.route('/available-slots', methods=['GET'])
def get_available_slots():
    """Horarios libres de un médico para una fecha.

    Genera la grilla de 08:00 a 20:00 cada 20 minutos y descuenta
    los turnos ya ocupados. Los cancelados NO ocupan: liberan el horario.
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
            return jsonify({"msg": "Fecha inválida. Formato esperado YYYY-MM-DD"}), 400

        if target_date < date.today():
            return jsonify({"msg": "No se pueden consultar horarios de una fecha pasada"}), 400

        taken = MedicalAppointment.query.filter(
            MedicalAppointment.id_doctor == id_doctor,
            MedicalAppointment.date == target_date,
            MedicalAppointment.status != AppointmentStatusEnum.CANCELADO
        ).all()

        now = datetime.now()
        slots = []
        current_minutes = OPENING_TIME.hour * 60 + OPENING_TIME.minute
        closing_minutes = CLOSING_TIME.hour * 60 + CLOSING_TIME.minute

        while current_minutes + APPOINTMENT_DURATION_MINUTES <= closing_minutes:
            slot_time = time(current_minutes // 60, current_minutes % 60)

            # Si la fecha es hoy, no ofrecemos horarios que ya pasaron
            is_past = target_date == now.date() and slot_time <= now.time()

            if not is_past and not has_overlap(taken, slot_time):
                slots.append(slot_time.strftime("%H:%M"))

            current_minutes += APPOINTMENT_DURATION_MINUTES

        return jsonify({
            "id_doctor": id_doctor,
            "date": target_date.isoformat(),
            "slots": slots
        }), 200
    except Exception as e:
        return jsonify({"msg": "Error al obtener horarios disponibles", "error": str(e)}), 500


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

        # El paciente no puede tener dos turnos pisados
        patient_appointments = MedicalAppointment.query.filter(
            MedicalAppointment.id_patient == patient_id,
            MedicalAppointment.date == appointment_date,
            MedicalAppointment.status != AppointmentStatusEnum.CANCELADO
        ).all()
        if has_overlap(patient_appointments, appointment_time):
            return jsonify({"msg": "Ya tenés un turno reservado en ese horario."}), 409

        # El paciente nunca puede generar sobreturnos en la agenda del médico
        doctor_appointments = MedicalAppointment.query.filter(
            MedicalAppointment.id_doctor == doctor.id_user,
            MedicalAppointment.date == appointment_date,
            MedicalAppointment.status != AppointmentStatusEnum.CANCELADO
        ).all()
        if has_overlap(doctor_appointments, appointment_time):
            return jsonify({"msg": "Ese horario ya no está disponible. Elegí otro."}), 409

        new_appointment = MedicalAppointment(
            id_patient=patient_id,
            id_doctor=doctor.id_user,
            date=appointment_date,
            hour=data.get('hour'),
            status=AppointmentStatusEnum.RESERVADO,
            reason=data.get('reason')
        )
        db.session.add(new_appointment)
        db.session.commit()

        return jsonify(new_appointment.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "Error al crear el turno", "error": str(e)}), 500