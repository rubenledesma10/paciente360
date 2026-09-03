from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity, get_jwt
from datetime import datetime, timedelta
from models.db import db
from models.medical_indication import MedicalIndication
from models.patient import Patient
from models.doctor import Doctor
from models.medical_appointment import MedicalAppointment
from utils.role_required import role_required
from enums import RoleEnum

medical_indications_bp = Blueprint('medical_indications', __name__, url_prefix='/api/medical-indications')


@medical_indications_bp.route('/', methods=['POST'])
@role_required(RoleEnum.DOCTOR)
def create_medical_indication():
    try:
        if not request.is_json:
            return jsonify({"msg": "Missing JSON in request"}), 400

        data = request.get_json()

        if not data.get('id_patient'):
            return jsonify({"msg":"id_patient obligatoried"}),400
        
        if not data.get('indication'):
            return jsonify({"msg":"indication obligatoried"}),400

        if not data.get('id_medical_appointment'):
            return jsonify({"msg":"id_medical_appointment obligatoried"}),400

        if not Patient.query.get(data.get('id_patient')):
            return jsonify({"msg": "Patient not found"}), 404

        id_doctor_logueado=int(get_jwt_identity())

        appointment = MedicalAppointment.query.get(data.get('id_medical_appointment'))
        if not appointment:
            return jsonify({"msg": "Medical appointment not found"}), 404
        if appointment.id_patient != data.get('id_patient') or appointment.id_doctor != id_doctor_logueado:
            return jsonify({"msg": "The appointment does not belong to this patient/doctor"}), 403

        new_indication = MedicalIndication(
            id_patient=data.get('id_patient'),
            id_doctor=id_doctor_logueado,
            id_medical_appointment=data.get('id_medical_appointment'),
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
@role_required(RoleEnum.DOCTOR, RoleEnum.NURSE)
def get_medical_indications():
    try:
        indications = MedicalIndication.query.order_by(MedicalIndication.created_at.desc()).all()
        return jsonify([i.to_dict() for i in indications]), 200
    except Exception as e:
        return jsonify({"msg": "Error fetching medical indications"}), 500


@medical_indications_bp.route('/<int:indication_id>', methods=['GET'])
@role_required(RoleEnum.DOCTOR, RoleEnum.NURSE)
def get_medical_indication(indication_id):
    try:
        indication = MedicalIndication.query.get(indication_id)
        if not indication:
            return jsonify({"msg": "Medical indication not found"}), 404
        return jsonify(indication.to_dict()), 200
    except Exception as e:
        return jsonify({"msg": "Error fetching medical indication"}), 500


@medical_indications_bp.route('/patient/<int:patient_id>', methods=['GET'])
@role_required(RoleEnum.DOCTOR, RoleEnum.NURSE, RoleEnum.PATIENT)
def get_medical_indications_by_patient(patient_id):
    
    claims=get_jwt()
    if claims.get('rol')== RoleEnum.PATIENT.value:
        id_logueado=int(get_jwt_identity())
        if id_logueado != patient_id:
            return jsonify({"msg":"You cannot view another patient's instructions."}),403
        
    try:
        indications=MedicalIndication.query.filter_by(id_patient=patient_id).order_by(MedicalIndication.created_at.desc()).all()
        return jsonify([i.to_dict() for i in indications]),200
    except Exception as e:
        return jsonify({"msg":"Error fetching patient medical indications"}),500
        


@medical_indications_bp.route('/<int:indication_id>', methods=['PUT'])
@role_required(RoleEnum.DOCTOR)
def update_medical_indication(indication_id):
    try:
        indication = MedicalIndication.query.get(indication_id)
        if not indication:
            return jsonify({"msg": "Medical indication not found"}), 404

        id_doctor_logueado=int(get_jwt_identity())
        if indication.id_doctor != id_doctor_logueado:
            return jsonify({"msg":"Only the physician who recorded this order can edit it."}), 403

        limit = indication.created_at + timedelta(minutes=5)
        if datetime.utcnow()>limit:
            return jsonify({"msg":"An instruction cannot be edited more than 5 minutes after its creation."}), 403
        
        if not request.is_json:
            return jsonify({"msg":"Missing JSON in request"}),400

        data = request.get_json()

        if 'indication' in data:
            indication.indication=data.get('indication')
        if 'treatment' in data:
            indication.treatment=data.get('treatment')
        
        db.session.commit()
        return jsonify({"msg": "Medical indication updated successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "Error updating medical indication", "error": str(e)}), 500


@medical_indications_bp.route('/<int:indication_id>', methods=['DELETE'])
@role_required(RoleEnum.DOCTOR)
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
