from flask import Blueprint, request, jsonify
from datetime import date
from models.db import db
from models.medical_appointment import MedicalAppointment
from models.patient import Patient
from models.doctor import Doctor

appointments_bp = Blueprint('appointments', __name__, url_prefix='/api/appointments')


@appointments_bp.route('/', methods=['POST'])
def create_appointment():
    try:
        if not request.is_json:
            return jsonify({"msg": "Missing JSON in request"}), 400

        data = request.get_json()

        # Validamos que el paciente exista
        if not Patient.query.get(data.get('id_patient')):
            return jsonify({"msg": "Patient not found"}), 404

        # Validamos que el doctor exista
        if not Doctor.query.get(data.get('id_doctor')):
            return jsonify({"msg": "Doctor not found"}), 404

        new_appointment = MedicalAppointment(
            id_patient=data.get('id_patient'),
            id_doctor=data.get('id_doctor'),
            date=date.fromisoformat(data.get('date')) if data.get('date') else None,
            hour=data.get('hour'),
            status=data.get('status', 'Pendiente'),
            reason=data.get('reason')
        )
        db.session.add(new_appointment)
        db.session.commit()

        return jsonify({"msg": "Appointment created successfully", "appointment_id": new_appointment.id_medical_appointment}), 201
    except Exception as e:
        db.session.rollback()
        print(f"ERROR AL CREAR TURNO: {e}")
        return jsonify({"msg": "Error creating appointment", "error": str(e)}), 500


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


@appointments_bp.route('/<int:appointment_id>', methods=['PUT'])
def update_appointment(appointment_id):
    try:
        appointment = MedicalAppointment.query.get(appointment_id)
        if not appointment:
            return jsonify({"msg": "Appointment not found"}), 404

        if not request.is_json:
            return jsonify({"msg": "Missing JSON in request"}), 400

        data = request.get_json()

        if 'date' in data:
            appointment.date = date.fromisoformat(data.get('date')) if data.get('date') else None
        if 'hour' in data:
            appointment.hour = data.get('hour')
        if 'status' in data:
            appointment.status = data.get('status')
        if 'reason' in data:
            appointment.reason = data.get('reason')

        if 'id_doctor' in data:
            if not Doctor.query.get(data.get('id_doctor')):
                return jsonify({"msg": "Doctor not found"}), 404
            appointment.id_doctor = data.get('id_doctor')

        db.session.commit()
        return jsonify({"msg": "Appointment updated successfully"}), 200
    except Exception as e:
        db.session.rollback()
        print(f"ERROR AL ACTUALIZAR TURNO: {e}")
        return jsonify({"msg": "Error updating appointment", "error": str(e)}), 500


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

        appointment.status = new_status
        db.session.commit()
        return jsonify({"msg": "Appointment status updated successfully", "status": appointment.status}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "Error updating appointment status"}), 500