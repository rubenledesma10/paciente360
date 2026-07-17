from flask import Blueprint, request, jsonify
from models.db import db
from models.medical_indication import MedicalIndication
from models.patient import Patient
from models.doctor import Doctor

medical_indications_bp = Blueprint('medical_indications', __name__, url_prefix='/api/medical-indications')


@medical_indications_bp.route('/', methods=['POST'])
def create_medical_indication():
    try:
        if not request.is_json:
            return jsonify({"msg": "Missing JSON in request"}), 400

        data = request.get_json()

        if not Patient.query.get(data.get('id_patient')):
            return jsonify({"msg": "Patient not found"}), 404

        if not Doctor.query.get(data.get('id_doctor')):
            return jsonify({"msg": "Doctor not found"}), 404

        new_indication = MedicalIndication(
            id_patient=data.get('id_patient'),
            id_doctor=data.get('id_doctor'),
            indication=data.get('indication'),
            treatment=data.get('treatment')
        )
        db.session.add(new_indication)
        db.session.commit()

        return jsonify({"msg": "Medical indication created successfully", "medical_indication_id": new_indication.id_medical_indication}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "Error creating medical indication", "error": str(e)}), 500


@medical_indications_bp.route('/', methods=['GET'])
def get_medical_indications():
    try:
        indications = MedicalIndication.query.all()
        return jsonify([i.to_dict() for i in indications]), 200
    except Exception as e:
        return jsonify({"msg": "Error fetching medical indications"}), 500


@medical_indications_bp.route('/<int:indication_id>', methods=['GET'])
def get_medical_indication(indication_id):
    try:
        indication = MedicalIndication.query.get(indication_id)
        if not indication:
            return jsonify({"msg": "Medical indication not found"}), 404
        return jsonify(indication.to_dict()), 200
    except Exception as e:
        return jsonify({"msg": "Error fetching medical indication"}), 500


@medical_indications_bp.route('/patient/<int:patient_id>', methods=['GET'])
def get_medical_indications_by_patient(patient_id):
    try:
        indications = MedicalIndication.query.filter_by(id_patient=patient_id).all()
        return jsonify([i.to_dict() for i in indications]), 200
    except Exception as e:
        return jsonify({"msg": "Error fetching patient medical indications"}), 500


@medical_indications_bp.route('/<int:indication_id>', methods=['PUT'])
def update_medical_indication(indication_id):
    try:
        indication = MedicalIndication.query.get(indication_id)
        if not indication:
            return jsonify({"msg": "Medical indication not found"}), 404

        if not request.is_json:
            return jsonify({"msg": "Missing JSON in request"}), 400

        data = request.get_json()

        if 'id_patient' in data:
            if not Patient.query.get(data.get('id_patient')):
                return jsonify({"msg": "Patient not found"}), 404
            indication.id_patient = data.get('id_patient')

        if 'id_doctor' in data:
            if not Doctor.query.get(data.get('id_doctor')):
                return jsonify({"msg": "Doctor not found"}), 404
            indication.id_doctor = data.get('id_doctor')

        if 'indication' in data:
            indication.indication = data.get('indication')
        if 'treatment' in data:
            indication.treatment = data.get('treatment')

        db.session.commit()
        return jsonify({"msg": "Medical indication updated successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "Error updating medical indication", "error": str(e)}), 500


@medical_indications_bp.route('/<int:indication_id>', methods=['DELETE'])
def delete_medical_indication(indication_id):
    try:
        indication = MedicalIndication.query.get(indication_id)
        if not indication:
            return jsonify({"msg": "Medical indication not found"}), 404

        db.session.delete(indication)
        db.session.commit()
        return jsonify({"msg": "Medical indication deleted successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "Error deleting medical indication", "error": str(e)}), 500
