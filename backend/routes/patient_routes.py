from flask import Blueprint, request, jsonify
from datetime import date
from models.db import db
from models.user import User
from models.patient import Patient
from enums import RoleEnum
from utils.email_service import send_welcome_email
from utils.role_required import role_required

patients_bp = Blueprint('patients', __name__, url_prefix='/api/patients')


@patients_bp.route('/', methods=['POST'])
def create_patient():
    try:
        if not request.is_json:
            return jsonify({"msg": "Missing JSON in request"}), 400

        data = request.get_json()

        if User.query.filter_by(email=data.get('email')).first():
            return jsonify({"msg": "Email already exists"}), 400
        if User.query.filter_by(username=data.get('username')).first():
            return jsonify({"msg": "Username already exists"}), 400
        if User.query.filter_by(dni=data.get('dni')).first():
            return jsonify({"msg": "DNI already exists"}), 400

        # Creación por herencia directa: inserta en 'users' y 'patients' de una.
        new_patient = Patient(
            first_name=data.get('first_name'),
            last_name=data.get('last_name'),
            username=data.get('username'),
            dni=data.get('dni'),
            email=data.get('email'),
            date_of_birth=date.fromisoformat(data.get('date_of_birth')) if data.get('date_of_birth') else None,
            country=data.get('country'),
            phone_number=data.get('phone_number'),
            is_active=data.get('is_active', True),
            gender=data.get('gender'),
            address=data.get('address'),
            emergency_contact=data.get('emergency_contact'),
            rol=RoleEnum.PATIENT,
            health_plan_status=data.get('health_plan_status', False),
            health_plan_name=data.get('health_plan_name'),
            member_number=data.get('member_number'),
            allergies=data.get('allergies')
        )
        new_patient.set_password(data.get('password'))

        db.session.add(new_patient)
        db.session.commit()
        send_welcome_email(new_patient.email, new_patient.first_name)
        return jsonify({"msg": "Patient created successfully", "patient_id": new_patient.id_user}), 201
    
    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "Error creating patient", "error": str(e)}), 500

    

@patients_bp.route('/', methods=['GET'])
def get_patients():
    try:
        patients = Patient.query.all()
        return jsonify([patient.to_dict() for patient in patients]), 200
    except Exception as e:
        return jsonify({"msg": "Error fetching patients"}), 500


@patients_bp.route('/<int:patient_id>', methods=['GET'])
def get_patient(patient_id):
    try:
        patient = Patient.query.get(patient_id)
        if not patient:
            return jsonify({"msg": "Patient not found"}), 404
        return jsonify(patient.to_dict()), 200
    except Exception as e:
        return jsonify({"msg": "Error fetching patient"}), 500


@patients_bp.route('/<int:patient_id>', methods=['PUT'])
def update_patient(patient_id):
    try:
        patient = Patient.query.get(patient_id)
        if not patient:
            return jsonify({"msg": "Patient not found"}), 404

        if not request.is_json:
            return jsonify({"msg": "Missing JSON in request"}), 400

        data = request.get_json()

        if 'dni' in data:
            existing = User.query.filter_by(dni=data.get('dni')).first()
            if existing and existing.id_user != patient.id_user:
                return jsonify({"msg": "DNI already exists"}), 400
            patient.dni = data.get('dni')
        if 'email' in data:
            existing = User.query.filter_by(email=data.get('email')).first()
            if existing and existing.id_user != patient.id_user:
                return jsonify({"msg": "Email already exists"}), 400
            patient.email = data.get('email')
        if 'username' in data:
            existing = User.query.filter_by(username=data.get('username')).first()
            if existing and existing.id_user != patient.id_user:
                return jsonify({"msg": "Username already exists"}), 400
            patient.username = data.get('username')

        if 'first_name' in data:
            patient.first_name = data.get('first_name')
        if 'last_name' in data:
            patient.last_name = data.get('last_name')
        if 'date_of_birth' in data:
            patient.date_of_birth = date.fromisoformat(data.get('date_of_birth')) if data.get('date_of_birth') else None
        if 'country' in data:
            patient.country = data.get('country')
        if 'phone_number' in data:
            patient.phone_number = data.get('phone_number')
        if 'is_active' in data:
            patient.is_active = data.get('is_active')
        if 'gender' in data:
            patient.gender = data.get('gender')
        if 'address' in data:
            patient.address = data.get('address')
        if 'emergency_contact' in data:
            patient.emergency_contact = data.get('emergency_contact')
        if 'password' in data:
            patient.set_password(data.get('password'))

        # Campos propios de Patient
        if 'health_plan_status' in data:
            patient.health_plan_status = data.get('health_plan_status')
        if 'health_plan_name' in data:
            patient.health_plan_name = data.get('health_plan_name')
        if 'member_number' in data:
            patient.member_number = data.get('member_number')
        if 'allergies' in data:
            patient.allergies = data.get('allergies')

        db.session.commit()
        return jsonify({"msg": "Patient updated successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "Error updating patient"}), 500


@patients_bp.route('/<int:patient_id>/allergies', methods=['PATCH'])
@role_required(RoleEnum.NURSE)
def update_patient_allergies(patient_id):
    try:
        patient = Patient.query.get(patient_id)
        if not patient:
            return jsonify({"msg": "Patient not found"}), 404

        data = request.get_json() or {}
        patient.allergies = (data.get('allergies') or '').strip() or None
        db.session.commit()
        return jsonify({"msg": "Allergies updated successfully", "allergies": patient.allergies}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "Error updating allergies"}), 500


@patients_bp.route('/<int:patient_id>', methods=['DELETE'])
def delete_patient(patient_id):
    try:
        patient = Patient.query.get(patient_id)
        if not patient:
            return jsonify({"msg": "Patient not found"}), 404

        db.session.delete(patient)
        db.session.commit()
        return jsonify({"msg": "Patient deleted successfully"}), 200
    except Exception as e:
        db.session.rollback()
        print(f"ERROR AL BORRAR PACIENTE: {e}")
        return jsonify({"msg": "Error deleting patient", "error": str(e)}), 500


@patients_bp.route('/search', methods=['GET'])
def search_patients():
    try:
        query = request.args.get('query', '')
        patients = Patient.query.filter(
            (Patient.first_name.ilike(f'%{query}%')) |
            (Patient.last_name.ilike(f'%{query}%')) |
            (Patient.email.ilike(f'%{query}%')) |
            (Patient.username.ilike(f'%{query}%')) |
            (Patient.dni.ilike(f'%{query}%')) |
            (Patient.member_number.ilike(f'%{query}%'))
        ).all()
        return jsonify([patient.to_dict() for patient in patients]), 200
    except Exception as e:
        return jsonify({"msg": "Error searching patients"}), 500


@patients_bp.route('/<int:patient_id>/toggle', methods=['PATCH'])
def toggle_patient_status(patient_id):
    try:
        patient = Patient.query.get(patient_id)
        if not patient:
            return jsonify({"msg": "Patient not found"}), 404

        patient.is_active = not patient.is_active
        db.session.commit()
        return jsonify({"msg": "Patient status toggled successfully", "is_active": patient.is_active}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "Error toggling patient status"}), 500