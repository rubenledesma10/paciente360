from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity, get_jwt
from models.patient import Patient
from models.signs_and_symptoms import SignsAndSymptoms
from models.patient_follow_up import PatientFollowUp
from models.medical_indication import MedicalIndication
from utils.role_required import role_required
from enums import RoleEnum

medical_history_bp = Blueprint('medical_history', __name__, url_prefix='/api/medical-history')

@medical_history_bp.route('/<int:patient_id>', methods=['GET'])
@role_required(RoleEnum.NURSE, RoleEnum.DOCTOR, RoleEnum.PATIENT)
def get_medical_history(patient_id):

    claims = get_jwt()
    if claims.get('rol')==RoleEnum.PATIENT.value:
        id_logueado=int(get_jwt_identity())
        if id_logueado!=patient_id:
            return jsonify({"msg": "Unauthorized access"}), 403

    if not Patient.query.get(patient_id):
        return jsonify({"msg": "Patient not found"}), 404

    eventos=[]

    signos = SignsAndSymptoms.query.filter_by(id_patient=patient_id).all()
    for s in signos:
        eventos.append({
            "fecha":s.date_and_time.isoformat() if s.date_and_time else None,
            "tipo":"Signos y Síntomas",
            "id_nurse":s.id_nurse,
            "detalle":{
                "temperature": s.temperature,
                "blood_pressure": s.blood_pressure,
                "signs": s.signs,
                "symptoms": s.symptoms,
                "observations": s.observations,
                "record_type": s.record_type
            }
        })

    seguimientos = PatientFollowUp.query.filter_by(id_patient=patient_id).all()
    for f in seguimientos:
        eventos.append({
            "fecha":f.date_and_time.isoformat() if f.date_and_time else None,
            "tipo":"Seguimiento",
            "id_nurse":f.id_nurse,
            "detalle":{
                "observations": f.observations,
                "next_check_up": f.next_check_up.isoformat() if f.next_check_up else None,
                "finish": f.finish
            }
        })

    indicaciones = MedicalIndication.query.filter_by(id_patient=patient_id).all()
    for i in indicaciones:
        eventos.append({
            "fecha": i.created_at.isoformat() if i.created_at else None,
            "tipo":"Indicación Médica",
            "id_doctor":i.id_doctor,
            "detalle":{
                "indication": i.indication,
                "treatment": i.treatment
            }
        })

    eventos.sort(key=lambda e: e["fecha"], reverse=True) #mas reciente primero, si algo no tuviera fecha, queda al final en vez de romper el sort

    return jsonify(eventos), 200