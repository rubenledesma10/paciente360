from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity
from models.db import db
from models.signs_and_symptoms import SignsAndSymptoms
from utils.role_required import role_required
from enums import RoleEnum
from models.nurse import Nurse
from models.user import User
from datetime import datetime, timedelta

signs_and_symptoms_bp = Blueprint('signs_and_symptoms', __name__, url_prefix='/api/signs_and_symptoms')

@signs_and_symptoms_bp.route('/', methods=['POST'])
@role_required(RoleEnum.NURSE)
def create_signs_and_symptoms():
    data=request.get_json()
    
    required_fields=['id_patient',"temperature","blood_pressure","record_type"]
    
    missing_items=[c for c in required_fields if c not in data]
    if missing_items:
        return jsonify({"error": f"Missing required fields: {', '.join(missing_items)}"}),400
    id_nurse_login=int(get_jwt_identity())
    
    try:
        new_signs_and_symptoms = SignsAndSymptoms(
            id_patient=data['id_patient'],
            id_nurse=id_nurse_login,
            temperature=data.get('temperature'),
            blood_pressure=data.get('blood_pressure'),
            observations=data.get('observations'),
            signs=data.get('signs'),
            symptoms=data.get('symptoms'),
            record_type=data.get('record_type')
        )

        db.session.add(new_signs_and_symptoms)
        db.session.commit()
        return jsonify(new_signs_and_symptoms.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
    
@signs_and_symptoms_bp.route('/<int:id_signs_and_symptoms>', methods=['GET'])
@role_required(RoleEnum.NURSE)
def get_signs_and_symptoms(id_signs_and_symptoms):
    signs_and_symptoms = SignsAndSymptoms.query.get(id_signs_and_symptoms)
    if not signs_and_symptoms:
        return jsonify({'error': 'Signs and Symptoms not found'}), 404
    return jsonify(signs_and_symptoms.to_dict()), 200

@signs_and_symptoms_bp.route('/<int:id_signs_and_symptoms>', methods=['DELETE'])
@role_required(RoleEnum.NURSE)
def delete_signs_and_symptoms(id_signs_and_symptoms):
    signs_and_symptoms = SignsAndSymptoms.query.get(id_signs_and_symptoms)
    if not signs_and_symptoms:
        return jsonify({'error': 'Signs and Symptoms not found'}), 404

    try:
        db.session.delete(signs_and_symptoms)
        db.session.commit()
        return jsonify({'message': 'Signs and Symptoms deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
    
@signs_and_symptoms_bp.route('/<int:id_signs_and_symptoms>', methods=['PUT'])
@role_required(RoleEnum.NURSE)
def update_signs_and_symptoms(id_signs_and_symptoms):
    data = request.get_json()
    signs_and_symptoms = SignsAndSymptoms.query.get(id_signs_and_symptoms)
    if not signs_and_symptoms:
        return jsonify({'error': 'Signs and Symptoms not found'}), 404
    
    now = datetime.utcnow()
    time_limit = signs_and_symptoms.date_and_time + timedelta(minutes=5)
    if now > time_limit:
        return jsonify({'error': 'Update window has expired. You can only update within 5 minutes of creation.'}), 403
    try:
        signs_and_symptoms.temperature = data.get('temperature', signs_and_symptoms.temperature)
        signs_and_symptoms.blood_pressure = data.get('blood_pressure', signs_and_symptoms.blood_pressure)
        signs_and_symptoms.observations = data.get('observations', signs_and_symptoms.observations)
        signs_and_symptoms.signs = data.get('signs', signs_and_symptoms.signs)
        signs_and_symptoms.symptoms = data.get('symptoms', signs_and_symptoms.symptoms)
        signs_and_symptoms.record_type = data.get('record_type', signs_and_symptoms.record_type)

        db.session.commit()
        return jsonify(signs_and_symptoms.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
    
@signs_and_symptoms_bp.route('/', methods=['GET'])
@role_required(RoleEnum.NURSE)
def get_all():
    try:
        signs_and_symptoms_all = SignsAndSymptoms.query.all()
        return jsonify([signs_and_symptoms.to_dict() for signs_and_symptoms in signs_and_symptoms_all]), 200
    except Exception as e:
        return jsonify({"msg": "Error fetching nurses"}), 500