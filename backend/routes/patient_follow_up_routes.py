from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity
from datetime import date, datetime
from models.db import db
from models.patient_follow_up import PatientFollowUp
from models.patient import Patient
from models.nurse import Nurse
from utils.role_required import role_required
from enums import RoleEnum

follow_ups_bp = Blueprint('follow_ups', __name__, url_prefix='/api/follow-ups')


@follow_ups_bp.route('/', methods=['POST'])
@role_required(RoleEnum.NURSE)
def create_follow_up():
    try:
        if not request.is_json:
            return jsonify({"msg": "Missing JSON in request"}), 400

        data = request.get_json()

        if not Patient.query.get(data.get('id_patient')):
            return jsonify({"msg": "Patient not found"}), 404

        id_nurse_logueado = int(get_jwt_identity())
        if not Nurse.query.get(id_nurse_logueado):
            return jsonify({"msg": "Nurse not found"}), 404

        new_follow_up = PatientFollowUp(
            id_patient=data.get('id_patient'),
            id_nurse=id_nurse_logueado,
            observations=data.get('observations'),
            next_check_up=date.fromisoformat(data.get('next_check_up')) if data.get('next_check_up') else None,
            finish=data.get('finish', False)
        )
        db.session.add(new_follow_up)
        db.session.commit()

        return jsonify({"msg": "Follow-up created successfully", "follow_up_id": new_follow_up.id_follow_up}), 201
    except Exception as e:
        db.session.rollback()
        print(f"ERROR AL CREAR SEGUIMIENTO: {e}")
        return jsonify({"msg": "Error creating follow-up", "error": str(e)}), 500


@follow_ups_bp.route('/', methods=['GET'])
@role_required(RoleEnum.NURSE, RoleEnum.DOCTOR)
def get_follow_ups():
    try:
        follow_ups = PatientFollowUp.query.all()
        return jsonify([f.to_dict() for f in follow_ups]), 200
    except Exception as e:
        return jsonify({"msg": "Error fetching follow-ups"}), 500


@follow_ups_bp.route('/<int:follow_up_id>', methods=['GET'])
@role_required(RoleEnum.NURSE, RoleEnum.DOCTOR)
def get_follow_up(follow_up_id):
    try:
        follow_up = PatientFollowUp.query.get(follow_up_id)
        if not follow_up:
            return jsonify({"msg": "Follow-up not found"}), 404
        return jsonify(follow_up.to_dict()), 200
    except Exception as e:
        return jsonify({"msg": "Error fetching follow-up"}), 500


@follow_ups_bp.route('/patient/<int:patient_id>', methods=['GET'])
@role_required(RoleEnum.NURSE, RoleEnum.DOCTOR)
def get_follow_ups_by_patient(patient_id):
    try:
        follow_ups = PatientFollowUp.query.filter_by(id_patient=patient_id).all()
        return jsonify([f.to_dict() for f in follow_ups]), 200
    except Exception as e:
        return jsonify({"msg": "Error fetching patient follow-ups"}), 500


@follow_ups_bp.route('/pending', methods=['GET'])
@role_required(RoleEnum.NURSE)
def get_pending_follow_ups():

    try:
        today = date.today()
        pending = PatientFollowUp.query.filter(
            PatientFollowUp.finish == False,
            PatientFollowUp.next_check_up != None,
            PatientFollowUp.next_check_up <= today
        ).all()
        return jsonify([f.to_dict() for f in pending]), 200
    except Exception as e:
        return jsonify({"msg": "Error fetching pending follow-ups"}), 500


@follow_ups_bp.route('/pending/mine', methods=['GET'])
@role_required(RoleEnum.NURSE)
def get_my_pending_follow_ups():

    try:
        today = date.today()
        id_nurse_logueado = int(get_jwt_identity())

        pending = PatientFollowUp.query.filter(
            PatientFollowUp.finish == False,
            PatientFollowUp.next_check_up != None,
            PatientFollowUp.next_check_up <= today,
            PatientFollowUp.id_nurse == id_nurse_logueado
        ).all()
        return jsonify([f.to_dict() for f in pending]), 200
    except Exception as e:
        return jsonify({"msg": "Error fetching pending follow-ups"}), 500


@follow_ups_bp.route('/<int:follow_up_id>', methods=['PUT'])
@role_required(RoleEnum.NURSE)
def update_follow_up(follow_up_id):
    try:
        follow_up = PatientFollowUp.query.get(follow_up_id)
        if not follow_up:
            return jsonify({"msg": "Follow-up not found"}), 404


        id_nurse_logueado = int(get_jwt_identity())
        if follow_up.id_nurse != id_nurse_logueado:
            return jsonify({"msg": "Solo el enfermero que registró este seguimiento puede editarlo"}), 403

        if not request.is_json:
            return jsonify({"msg": "Missing JSON in request"}), 400

        data = request.get_json()

        if 'observations' in data:
            follow_up.observations = data.get('observations')
        if 'next_check_up' in data:
            follow_up.next_check_up = date.fromisoformat(data.get('next_check_up')) if data.get('next_check_up') else None
        if 'finish' in data:
            follow_up.finish = data.get('finish')

        db.session.commit()
        return jsonify({"msg": "Follow-up updated successfully"}), 200
    except Exception as e:
        db.session.rollback()
        print(f"ERROR AL ACTUALIZAR SEGUIMIENTO: {e}")
        return jsonify({"msg": "Error updating follow-up", "error": str(e)}), 500


@follow_ups_bp.route('/<int:follow_up_id>', methods=['DELETE'])
@role_required(RoleEnum.NURSE)
def delete_follow_up(follow_up_id):
    try:
        follow_up = PatientFollowUp.query.get(follow_up_id)
        if not follow_up:
            return jsonify({"msg": "Follow-up not found"}), 404

        id_nurse_logueado = int(get_jwt_identity())
        if follow_up.id_nurse != id_nurse_logueado:
            return jsonify({"msg": "Solo el enfermero que registró este seguimiento puede eliminarlo"}), 403

        db.session.delete(follow_up)
        db.session.commit()
        return jsonify({"msg": "Follow-up deleted successfully"}), 200
    except Exception as e:
        db.session.rollback()
        print(f"ERROR AL BORRAR SEGUIMIENTO: {e}")
        return jsonify({"msg": "Error deleting follow-up", "error": str(e)}), 500


@follow_ups_bp.route('/<int:follow_up_id>/finish', methods=['PATCH'])
@role_required(RoleEnum.NURSE)
def toggle_finish(follow_up_id):
    try:
        follow_up = PatientFollowUp.query.get(follow_up_id)
        if not follow_up:
            return jsonify({"msg": "Follow-up not found"}), 404

        id_nurse_logueado = int(get_jwt_identity())
        if follow_up.id_nurse != id_nurse_logueado:
            return jsonify({"msg": "Solo el enfermero que registró este seguimiento puede marcarlo como finalizado"}), 403

        follow_up.finish = not follow_up.finish
        db.session.commit()
        return jsonify({"msg": "Follow-up status toggled successfully", "finish": follow_up.finish}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "Error toggling follow-up status"}), 500