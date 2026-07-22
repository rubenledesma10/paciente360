from flask import Blueprint, request, jsonify
from datetime import date, datetime, time
from models.db import db
from models.medical_appointment import MedicalAppointment
from models.patient import Patient
from models.doctor import Doctor
from enums import AppointmentStatusEnum
from models.specialty import Specialty 

appointments_bp = Blueprint('appointments', __name__, url_prefix='/api/appointments')

# Business rules configuration
APPOINTMENT_DURATION_MINUTES = 20
OPENING_TIME = time(8, 0)    # 08:00
CLOSING_TIME = time(20, 0)   # 20:00


def minutes_between(time1, time2):
    """Returns the absolute difference in minutes between two time objects."""
    total_minutes_1 = time1.hour * 60 + time1.minute
    total_minutes_2 = time2.hour * 60 + time2.minute
    return abs(total_minutes_1 - total_minutes_2)


def has_overlap(query_appointments, appointment_time, exclude_id=None):
    """Returns True if any appointment in the list is within the duration window."""
    for existing in query_appointments:
        if exclude_id is not None and existing.id_medical_appointment == exclude_id:
            continue
        existing_time = datetime.strptime(existing.hour, "%H:%M").time()
        if minutes_between(appointment_time, existing_time) < APPOINTMENT_DURATION_MINUTES:
            return True
    return False

# ---------------------- Create appointment

@appointments_bp.route('/', methods=['POST'])
def create_appointment():
    try:
        if not request.is_json:
            return jsonify({"msg": "Missing JSON in request"}), 400

        data = request.get_json()

        # Validate that patient exists
        if not Patient.query.get(data.get('id_patient')):
            return jsonify({"msg": "Patient not found"}), 404

        # Validate that doctor exists
        if not Doctor.query.get(data.get('id_doctor')):
            return jsonify({"msg": "Doctor not found"}), 404

        # Validate date is present and valid
        if not data.get('date'):
            return jsonify({"msg": "Date is required"}), 400
        try:
            appointment_date = date.fromisoformat(data.get('date'))
        except ValueError:
            return jsonify({"msg": "Invalid date. Expected format YYYY-MM-DD"}), 400

        # Validate hour format (HH:MM)
        if not data.get('hour'):
            return jsonify({"msg": "Hour is required"}), 400
        try:
            appointment_time = datetime.strptime(data.get('hour'), "%H:%M").time()
        except ValueError:
            return jsonify({"msg": "Invalid hour. Expected format HH:MM"}), 400

        # Validate hour is within business hours
        if appointment_time < OPENING_TIME or appointment_time > CLOSING_TIME:
            return jsonify({"msg": "Appointment must be between 08:00 and 20:00"}), 400

        # Validate doctor is free (no overlapping appointment)
        doctor_appointments = MedicalAppointment.query.filter_by(
            id_doctor=data.get('id_doctor'),
            date=appointment_date
        ).all()
        if has_overlap(doctor_appointments, appointment_time):
            return jsonify({"msg": "The doctor already has an appointment within 20 minutes of this time"}), 409

        # Validate patient is free (no overlapping appointment)
        patient_appointments = MedicalAppointment.query.filter_by(
            id_patient=data.get('id_patient'),
            date=appointment_date
        ).all()
        if has_overlap(patient_appointments, appointment_time):
            return jsonify({"msg": "The patient already has an appointment within 20 minutes of this time"}), 409

        # Validate and parse status (optional — defaults to RESERVADO)
        status_value = data.get('status')
        if status_value:
            try:
                appointment_status = AppointmentStatusEnum(status_value)
            except ValueError:
                valid_statuses = [s.value for s in AppointmentStatusEnum]
                return jsonify({"msg": f"Invalid status. Valid options: {valid_statuses}"}), 400
        else:
            appointment_status = AppointmentStatusEnum.RESERVADO

        # All validations passed — create the appointment
        new_appointment = MedicalAppointment(
            id_patient=data.get('id_patient'),
            id_doctor=data.get('id_doctor'),
            date=appointment_date,
            hour=data.get('hour'),
            status=appointment_status,
            reason=data.get('reason')
        )
        db.session.add(new_appointment)
        db.session.commit()

        return jsonify({"msg": "Appointment created successfully", "appointment_id": new_appointment.id_medical_appointment}), 201
    except Exception as e:
        db.session.rollback()
        print(f"ERROR AL CREAR TURNO: {e}")
        return jsonify({"msg": "Error creating appointment", "error": str(e)}), 500


# ---------------------- Get all appointment or appointment by id or by patient 

@appointments_bp.route('/', methods=['GET'])
def get_appointments():
    try:
        appointments = MedicalAppointment.query.all()
        return jsonify([a.to_dict() for a in appointments]), 200
    except Exception as e:
        return jsonify({"msg": "Error fetching appointments"}), 500


@appointments_bp.route('/<int:appointment_id>', methods=['GET'])
def get_appointment(appointment_id):
    try:
        appointment = MedicalAppointment.query.get(appointment_id)
        if not appointment:
            return jsonify({"msg": "Appointment not found"}), 404
        return jsonify(appointment.to_dict()), 200
    except Exception as e:
        return jsonify({"msg": "Error fetching appointment"}), 500


@appointments_bp.route('/patient/<int:patient_id>', methods=['GET'])
def get_appointments_by_patient(patient_id):
    try:
        appointments = MedicalAppointment.query.filter_by(id_patient=patient_id).all()
        return jsonify([a.to_dict() for a in appointments]), 200
    except Exception as e:
        return jsonify({"msg": "Error fetching patient appointments"}), 500


# ---------------------- Update appointment

@appointments_bp.route('/<int:appointment_id>', methods=['PUT'])
def update_appointment(appointment_id):
    try:
        appointment = MedicalAppointment.query.get(appointment_id)
        if not appointment:
            return jsonify({"msg": "Appointment not found"}), 404

        if not request.is_json:
            return jsonify({"msg": "Missing JSON in request"}), 400

        data = request.get_json()

        # Determine the final date, hour and doctor (new values or current ones)
        new_date = appointment.date
        if 'date' in data:
            if not data.get('date'):
                return jsonify({"msg": "Date cannot be empty"}), 400
            try:
                new_date = date.fromisoformat(data.get('date'))
            except ValueError:
                return jsonify({"msg": "Invalid date. Expected format YYYY-MM-DD"}), 400

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

        # Re-validate business hours and overlaps with the final values
        new_time = datetime.strptime(new_hour_str, "%H:%M").time()
        if new_time < OPENING_TIME or new_time > CLOSING_TIME:
            return jsonify({"msg": "Appointment must be between 08:00 and 20:00"}), 400

        # Doctor overlap (excluding this same appointment)
        doctor_appointments = MedicalAppointment.query.filter_by(
            id_doctor=new_doctor_id,
            date=new_date
        ).all()
        if has_overlap(doctor_appointments, new_time, exclude_id=appointment.id_medical_appointment):
            return jsonify({"msg": "The doctor already has an appointment within 20 minutes of this time"}), 409

        # Patient overlap (excluding this same appointment)
        patient_appointments = MedicalAppointment.query.filter_by(
            id_patient=appointment.id_patient,
            date=new_date
        ).all()
        if has_overlap(patient_appointments, new_time, exclude_id=appointment.id_medical_appointment):
            return jsonify({"msg": "The patient already has an appointment within 20 minutes of this time"}), 409

        # Apply changes
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
        print(f"ERROR AL ACTUALIZAR TURNO: {e}")
        return jsonify({"msg": "Error updating appointment", "error": str(e)}), 500


# ---------------------- Delete appointment

@appointments_bp.route('/<int:appointment_id>', methods=['DELETE'])
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
        print(f"ERROR AL BORRAR TURNO: {e}")
        return jsonify({"msg": "Error deleting appointment", "error": str(e)}), 500

# ---------------------- Update appointment

@appointments_bp.route('/<int:appointment_id>/status', methods=['PATCH'])
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

# ---------------------- Get specialties

@appointments_bp.route('/specialties', methods=['GET'])
def get_specialties():
    try:
        specialties = Specialty.query.all()
        return jsonify([s.to_dict() for s in specialties]), 200
    except Exception as e:
        return jsonify({"msg": "Error fetching specialties"}), 500

# ---------------------- Get doctor by specialty

@appointments_bp.route('/specialties/<int:specialty_id>/doctors', methods=['GET'])
def get_doctors_by_specialty(specialty_id):
    try:
        # Validar que la especialidad exista
        if not Specialty.query.get(specialty_id):
            return jsonify({"msg": "Specialty not found"}), 404

        # Traer los doctores activos de esa especialidad
        doctors = Doctor.query.filter_by(
            id_especialidad=specialty_id,
            is_active=True
        ).all()

        # Filtro opcional por obra social (query param ?health_plan=OSDE)
        health_plan_name = request.args.get('health_plan')
        if health_plan_name:
            normalized = health_plan_name.strip().lower()
            doctors = [
                doctor for doctor in doctors
                if any(hp.name.strip().lower() == normalized for hp in doctor.health_plans)
            ]

        return jsonify([d.to_dict() for d in doctors]), 200
    except Exception as e:
        return jsonify({"msg": "Error fetching doctors by specialty"}), 500