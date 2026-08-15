from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity
from models.db import db
from models.signs_and_symptoms import SignsAndSymptoms
from models.medical_appointment import MedicalAppointment
from utils.role_required import role_required
from enums import RoleEnum, AppointmentStatusEnum
from models.nurse import Nurse
from models.user import User
from models.patient import Patient
from datetime import datetime, timedelta, date

signs_and_symptoms_bp = Blueprint('signs_and_symptoms', __name__, url_prefix='/api/signs_and_symptoms')

@signs_and_symptoms_bp.route('/', methods=['POST'])
@role_required(RoleEnum.NURSE)
def create_signs_and_symptoms():
    data=request.get_json()
    
    required_fields=['id_patient',"temperature","blood_pressure","record_type"]
    
    missing_items=[c for c in required_fields if c not in data]
    if missing_items:
        return jsonify({"error": f"Missing required fields: {', '.join(missing_items)}"}),400
    
    if not Patient.query.get(data['id_patient']):
        return jsonify({"error":"Patient not found"}),404
    
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

@signs_and_symptoms_bp.route('/waiting-patients', methods=['GET']) #pacientes del dia con estado en espera
@role_required(RoleEnum.NURSE, RoleEnum.DOCTOR)
def get_waiting_patients():
    try:
        hoy = date.today()
        turnos_en_espera = MedicalAppointment.query.filter(
            MedicalAppointment.date == hoy,
            MedicalAppointment.status == AppointmentStatusEnum.EN_ESPERA
        ).order_by(MedicalAppointment.hour.asc()).all()
 
        resultado = []
        for turno in turnos_en_espera:
            paciente = turno.patient
            if not paciente:
                continue
            resultado.append({
                "appointment_id": turno.id_medical_appointment,
                "id_patient": paciente.id_user,
                "patient_name": f"{paciente.first_name} {paciente.last_name}",
                "dni": paciente.dni,
                "hour": turno.hour,
                "id_doctor": turno.id_doctor,
                "reason": turno.reason,
            })
 
        return jsonify(resultado), 200
    except Exception as e:
        return jsonify({"msg": "Error fetching waiting patients", "error": str(e)}), 500

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
    id_nurse_logueado = int(get_jwt_identity())
    if signs_and_symptoms.id_nurse != id_nurse_logueado:
        return jsonify({"error": "Only the nurse who recorded this can delete it."}), 403
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
    
    id_nurse_logueado = int(get_jwt_identity())
    if signs_and_symptoms.id_nurse != id_nurse_logueado:
        return jsonify({"error": "Only the nurse who recorded this can edit it."}), 403
    
    now = datetime.utcnow()
    time_limit = signs_and_symptoms.date_and_time + timedelta(minutes=5)
    is_past_time_limit = now > time_limit
    
    restricted_fields = ['temperature', 'blood_pressure', 'signs', 'symptoms', 'record_type'] #validar que campos intentan editar si ya pasaron los 5 minutos
    
    
    attempting_restricted_edit = any(field in data for field in restricted_fields) #verificamos si en el JSON mandaron alguno de los campos clinicos bloqueados
    
    if is_past_time_limit and attempting_restricted_edit:
        return jsonify({
            'error': 'Update window has expired. After 5 minutes, you can only append new observations.'
        }), 403

    try:
        if not is_past_time_limit: #actualizar campos si aun no han pasado los 5 minutos
            if 'temperature' in data:
                signs_and_symptoms.temperature = data['temperature']
            if 'blood_pressure' in data:
                signs_and_symptoms.blood_pressure = data['blood_pressure']
            if 'signs' in data:
                signs_and_symptoms.signs = data['signs']
            if 'symptoms' in data:
                signs_and_symptoms.symptoms = data['symptoms']
            if 'record_type' in data:
                signs_and_symptoms.record_type = data['record_type']

        new_observation = data.get('observations')
        
        if new_observation:
            hora_argentina = datetime.utcnow() - timedelta(hours=3)
            timestamp_str = hora_argentina.strftime("%d/%m/%Y %H:%M")
            
            texto_a_agregar = f"{timestamp_str} {new_observation}"
            
            if signs_and_symptoms.observations:
                signs_and_symptoms.observations += f"\n{texto_a_agregar}"
            else:
                signs_and_symptoms.observations = texto_a_agregar

        db.session.commit()
        return jsonify(signs_and_symptoms.to_dict()), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@signs_and_symptoms_bp.route('/patient/<int:id_patient>', methods=['GET'])
@role_required(RoleEnum.NURSE, RoleEnum.DOCTOR)
def get_by_patient(id_patient):

    signs_and_symptoms = (
        SignsAndSymptoms.query
        .filter_by(id_patient=id_patient)
        .order_by(SignsAndSymptoms.date_and_time.desc())
        .all()
    )
    return jsonify([r.to_dict() for r in signs_and_symptoms]), 200

@signs_and_symptoms_bp.route('/', methods=['GET'])
@role_required(RoleEnum.NURSE)
def get_all():
    try:
        signs_and_symptoms_all = SignsAndSymptoms.query.all()
        return jsonify([signs_and_symptoms.to_dict() for signs_and_symptoms in signs_and_symptoms_all]), 200
    except Exception as e:
        return jsonify({"msg": "Error fetching nurses"}), 500