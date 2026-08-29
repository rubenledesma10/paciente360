from flask import Blueprint, request, jsonify
from models.db import db
from models.health_plan import HealthPlan
from models.doctor import Doctor
from enums import RoleEnum
from utils.role_required import role_required


health_plans_bp = Blueprint('health_plans', __name__, url_prefix='/api/health-plans')


@health_plans_bp.route('/', methods=['POST'])
@role_required(RoleEnum.ADMINISTRATIVE, RoleEnum.ADMINISTRATOR, RoleEnum.SUPERADMINISTRADOR)
def create_health_plan():
    try:
        if not request.is_json:
            return jsonify({"msg": "Missing JSON in request"}), 400

        data = request.get_json()
        name = data.get('name')

        if not name:
            return jsonify({"msg": "Name is required"}), 400

        if HealthPlan.query.filter_by(name=name).first():
            return jsonify({"msg": "Health plan already exists"}), 400

        new_health_plan = HealthPlan(name=name)
        db.session.add(new_health_plan)
        db.session.commit()

        return jsonify({"msg": "Health plan created successfully", "health_plan_id": new_health_plan.id_health_plan}), 201
    except Exception as e:
        db.session.rollback()
        print(f"ERROR AL CREAR OBRA SOCIAL: {e}")
        return jsonify({"msg": "Error creating health plan", "error": str(e)}), 500


@health_plans_bp.route('/', methods=['GET'])
@role_required(RoleEnum.ADMINISTRATIVE, RoleEnum.ADMINISTRATOR, RoleEnum.SUPERADMINISTRADOR)
def get_health_plans():
    try:
        health_plans = HealthPlan.query.all()
        return jsonify([hp.to_dict() for hp in health_plans]), 200
    except Exception as e:
        return jsonify({"msg": "Error fetching health plans"}), 500


@health_plans_bp.route('/<int:health_plan_id>', methods=['GET'])
@role_required(RoleEnum.ADMINISTRATIVE, RoleEnum.ADMINISTRATOR, RoleEnum.SUPERADMINISTRADOR)
def get_health_plan(health_plan_id):
    try:
        health_plan = HealthPlan.query.get(health_plan_id)
        if not health_plan:
            return jsonify({"msg": "Health plan not found"}), 404
        return jsonify(health_plan.to_dict()), 200
    except Exception as e:
        return jsonify({"msg": "Error fetching health plan"}), 500


@health_plans_bp.route('/<int:health_plan_id>', methods=['PUT'])
@role_required(RoleEnum.ADMINISTRATIVE, RoleEnum.ADMINISTRATOR, RoleEnum.SUPERADMINISTRADOR)
def update_health_plan(health_plan_id):
    try:
        health_plan = HealthPlan.query.get(health_plan_id)
        if not health_plan:
            return jsonify({"msg": "Health plan not found"}), 404

        if not request.is_json:
            return jsonify({"msg": "Missing JSON in request"}), 400

        data = request.get_json()
        if 'name' in data:
            existing = HealthPlan.query.filter_by(name=data.get('name')).first()
            if existing and existing.id_health_plan != health_plan_id:
                return jsonify({"msg": "Health plan already exists"}), 400
            health_plan.name = data.get('name')

        db.session.commit()
        return jsonify({"msg": "Health plan updated successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "Error updating health plan"}), 500


@health_plans_bp.route('/<int:health_plan_id>', methods=['DELETE'])
@role_required(RoleEnum.ADMINISTRATIVE, RoleEnum.ADMINISTRATOR, RoleEnum.SUPERADMINISTRADOR)
def delete_health_plan(health_plan_id):
    try:
        health_plan = HealthPlan.query.get(health_plan_id)
        if not health_plan:
            return jsonify({"msg": "Health plan not found"}), 404

        db.session.delete(health_plan)
        db.session.commit()
        return jsonify({"msg": "Health plan deleted successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "Error deleting health plan"}), 500
    
# Rutas para vincular/desvincular doctor con O.S

@health_plans_bp.route('/doctor/<int:doctor_id>', methods=['POST'])
@role_required(RoleEnum.ADMINISTRATIVE, RoleEnum.ADMINISTRATOR, RoleEnum.SUPERADMINISTRADOR)
def add_health_plan_to_doctor(doctor_id):
    try:
        doctor = Doctor.query.get(doctor_id)
        if not doctor:
            return jsonify({"msg": "Doctor not found"}), 404

        if not request.is_json:
            return jsonify({"msg": "Missing JSON in request"}), 400

        health_plan_id = request.get_json().get('id_health_plan')
        health_plan = HealthPlan.query.get(health_plan_id)
        if not health_plan:
            return jsonify({"msg": "Health plan not found"}), 404

        # Evitar duplicados
        if health_plan in doctor.health_plans:
            return jsonify({"msg": "Doctor already accepts this health plan"}), 400

        doctor.health_plans.append(health_plan)
        db.session.commit()
        return jsonify({"msg": "Health plan added to doctor successfully"}), 200
    except Exception as e:
        db.session.rollback()
        print(f"ERROR AL ASOCIAR OBRA SOCIAL: {e}")
        return jsonify({"msg": "Error adding health plan to doctor", "error": str(e)}), 500


@health_plans_bp.route('/doctor/<int:doctor_id>', methods=['DELETE'])
@role_required(RoleEnum.ADMINISTRATIVE, RoleEnum.ADMINISTRATOR, RoleEnum.SUPERADMINISTRADOR)
def remove_health_plan_from_doctor(doctor_id):
    try:
        doctor = Doctor.query.get(doctor_id)
        if not doctor:
            return jsonify({"msg": "Doctor not found"}), 404

        if not request.is_json:
            return jsonify({"msg": "Missing JSON in request"}), 400

        health_plan_id = request.get_json().get('id_health_plan')
        health_plan = HealthPlan.query.get(health_plan_id)
        if not health_plan:
            return jsonify({"msg": "Health plan not found"}), 404

        if health_plan not in doctor.health_plans:
            return jsonify({"msg": "Doctor does not accept this health plan"}), 400

        doctor.health_plans.remove(health_plan)
        db.session.commit()
        return jsonify({"msg": "Health plan removed from doctor successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "Error removing health plan from doctor"}), 500


@health_plans_bp.route('/doctor/<int:doctor_id>', methods=['GET'])
@role_required(RoleEnum.ADMINISTRATIVE, RoleEnum.ADMINISTRATOR, RoleEnum.SUPERADMINISTRADOR)
def get_doctor_health_plans(doctor_id):
    try:
        doctor = Doctor.query.get(doctor_id)
        if not doctor:
            return jsonify({"msg": "Doctor not found"}), 404

        return jsonify([hp.to_dict() for hp in doctor.health_plans]), 200
    except Exception as e:
        return jsonify({"msg": "Error fetching doctor health plans"}), 500