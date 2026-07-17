from flask import Blueprint, request, jsonify
from datetime import date
from models.db import db
from models.user import User
from models.doctor import Doctor
from models.specialty import Specialty
from enums import RoleEnum

doctors_bp = Blueprint('doctors', __name__, url_prefix='/api/doctors')


@doctors_bp.route('/', methods=['POST'])
def create_doctor():
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
        if Doctor.query.filter_by(medical_license=data.get('medical_license')).first():
            return jsonify({"msg": "Medical license already exists"}), 400

        if data.get('id_especialidad') and not Specialty.query.get(data.get('id_especialidad')):
            return jsonify({"msg": "Specialty not found"}), 404

        # Creación por herencia directa: inserta en 'users' y 'doctors' de una.
        new_doctor = Doctor(
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
            rol=RoleEnum.DOCTOR,
            medical_license=data.get('medical_license'),
            id_especialidad=data.get('id_especialidad')
        )
        new_doctor.set_password(data.get('password'))

        db.session.add(new_doctor)
        db.session.commit()

        return jsonify({"msg": "Doctor created successfully", "doctor_id": new_doctor.id_user}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "Error creating doctor", "error": str(e)}), 500


@doctors_bp.route('/', methods=['GET'])
def get_doctors():
    try:
        doctors = Doctor.query.all()
        return jsonify([doctor.to_dict() for doctor in doctors]), 200
    except Exception as e:
        return jsonify({"msg": "Error fetching doctors"}), 500


@doctors_bp.route('/<int:doctor_id>', methods=['GET'])
def get_doctor(doctor_id):
    try:
        doctor = Doctor.query.get(doctor_id)
        if not doctor:
            return jsonify({"msg": "Doctor not found"}), 404
        return jsonify(doctor.to_dict()), 200
    except Exception as e:
        return jsonify({"msg": "Error fetching doctor"}), 500


@doctors_bp.route('/<int:doctor_id>', methods=['PUT'])
def update_doctor(doctor_id):
    try:
        doctor = Doctor.query.get(doctor_id)
        if not doctor:
            return jsonify({"msg": "Doctor not found"}), 404

        if not request.is_json:
            return jsonify({"msg": "Missing JSON in request"}), 400

        data = request.get_json()

        if 'dni' in data:
            existing = User.query.filter_by(dni=data.get('dni')).first()
            if existing and existing.id_user != doctor.id_user:
                return jsonify({"msg": "DNI already exists"}), 400
            doctor.dni = data.get('dni')
        if 'email' in data:
            existing = User.query.filter_by(email=data.get('email')).first()
            if existing and existing.id_user != doctor.id_user:
                return jsonify({"msg": "Email already exists"}), 400
            doctor.email = data.get('email')
        if 'username' in data:
            existing = User.query.filter_by(username=data.get('username')).first()
            if existing and existing.id_user != doctor.id_user:
                return jsonify({"msg": "Username already exists"}), 400
            doctor.username = data.get('username')
        if 'medical_license' in data:
            existing = Doctor.query.filter_by(medical_license=data.get('medical_license')).first()
            if existing and existing.id_user != doctor.id_user:
                return jsonify({"msg": "Medical license already exists"}), 400
            doctor.medical_license = data.get('medical_license')
        if 'id_especialidad' in data:
            if data.get('id_especialidad') and not Specialty.query.get(data.get('id_especialidad')):
                return jsonify({"msg": "Specialty not found"}), 404
            doctor.id_especialidad = data.get('id_especialidad')

        if 'first_name' in data:
            doctor.first_name = data.get('first_name')
        if 'last_name' in data:
            doctor.last_name = data.get('last_name')
        if 'date_of_birth' in data:
            doctor.date_of_birth = date.fromisoformat(data.get('date_of_birth')) if data.get('date_of_birth') else None
        if 'country' in data:
            doctor.country = data.get('country')
        if 'phone_number' in data:
            doctor.phone_number = data.get('phone_number')
        if 'is_active' in data:
            doctor.is_active = data.get('is_active')
        if 'gender' in data:
            doctor.gender = data.get('gender')
        if 'address' in data:
            doctor.address = data.get('address')
        if 'emergency_contact' in data:
            doctor.emergency_contact = data.get('emergency_contact')
        if 'password' in data:
            doctor.set_password(data.get('password'))

        db.session.commit()
        return jsonify({"msg": "Doctor updated successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "Error updating doctor"}), 500


@doctors_bp.route('/<int:doctor_id>', methods=['DELETE'])
def delete_doctor(doctor_id):
    try:
        doctor = Doctor.query.get(doctor_id)
        if not doctor:
            return jsonify({"msg": "Doctor not found"}), 404

        db.session.delete(doctor)
        db.session.commit()
        return jsonify({"msg": "Doctor deleted successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "Error deleting doctor", "error": str(e)}), 500


@doctors_bp.route('/search', methods=['GET'])
def search_doctors():
    try:
        query = request.args.get('query', '')
        doctors = Doctor.query.filter(
            (Doctor.first_name.ilike(f'%{query}%')) |
            (Doctor.last_name.ilike(f'%{query}%')) |
            (Doctor.email.ilike(f'%{query}%')) |
            (Doctor.username.ilike(f'%{query}%')) |
            (Doctor.dni.ilike(f'%{query}%'))
        ).all()
        return jsonify([doctor.to_dict() for doctor in doctors]), 200
    except Exception as e:
        return jsonify({"msg": "Error searching doctors"}), 500


@doctors_bp.route('/<int:doctor_id>/toggle', methods=['PATCH'])
def toggle_doctor_status(doctor_id):
    try:
        doctor = Doctor.query.get(doctor_id)
        if not doctor:
            return jsonify({"msg": "Doctor not found"}), 404

        doctor.is_active = not doctor.is_active
        db.session.commit()
        return jsonify({"msg": "Doctor status toggled successfully", "is_active": doctor.is_active}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "Error toggling doctor status"}), 500
