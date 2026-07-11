from flask import Blueprint, jsonify, request
from models.db import db
from models.signs_and_symptoms import SignsAndSymptoms
from models.nurse import Nurse
from models.user import User
from datetime import datetime, timedelta

signs_and_symptoms_bp = Blueprint('signs_and_symptoms', __name__, url_prefix='/api/signs_and_symptoms')

@signs_and_symptoms_bp.route('/', methods=['POST'])
def create_signs_and_symptoms():
    data=request.get_json()
    if not data.get('id_nurse') or not data.get('id_user'):
        return jsonify({'error': 'Missing required fields'}), 400
    
    nurse = Nurse.query.get(data['id_nurse'])
    if not nurse:
        return jsonify({'error': 'Nurse not found'}), 404 
    
    patient = User.query.get(data['id_user'])
    if not patient:
        return jsonify({'error': 'Patient not found'}), 404

    try:
        new_signs_and_symptoms = SignsAndSymptoms(
            id_patient=data['id_user'],
            id_nurse=data['id_nurse'],
            temperature=data.get('temperature'),
            blood_pressure=data.get('blood_pressure'),
            observations=data.get('observations'),
            signs=data.get('signs'),
            symptoms=data.get('symptoms'),
            type=data.get('type')
        )

        db.session.add(new_signs_and_symptoms)
        db.session.commit()
        return jsonify(new_signs_and_symptoms.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
    
@signs_and_symptoms_bp.route('/<int:id_signs_and_symptoms>', methods=['GET'])
def get_signs_and_symptoms(id_signs_and_symptoms):
    signs_and_symptoms = SignsAndSymptoms.query.get(id_signs_and_symptoms)
    if not signs_and_symptoms:
        return jsonify({'error': 'Signs and Symptoms not found'}), 404
    return jsonify(signs_and_symptoms.to_dict()), 200

@signs_and_symptoms_bp.route('/<int:id_signs_and_symptoms>', methods=['DELETE'])
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
        signs_and_symptoms.type = data.get('type', signs_and_symptoms.type)

        db.session.commit()
        return jsonify(signs_and_symptoms.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500