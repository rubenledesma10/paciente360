from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity
from datetime import datetime, timedelta
from models.db import db
from models.traceability import Traceability
from models.patient import Patient
from models.medical_product import MedicalProduct
from utils.role_required import role_required
from enums import RoleEnum

traceabilities_bp = Blueprint('traceabilities', __name__, url_prefix='/api/traceabilities')


@traceabilities_bp.route('/', methods=['POST'])
@role_required(RoleEnum.NURSE)
def create_traceability():
    try:
        if not request.is_json:
            return jsonify({"msg": "Missing JSON in request"}), 400

        data = request.get_json()

        # Validamos que el paciente exista
        if not Patient.query.get(data.get('id_patient')):
            return jsonify({"msg": "Patient not found"}), 404

        if not MedicalProduct.query.get(data.get('id_product')):
            return jsonify({"msg": "Product not found"}), 404

        id_nurse_logueado=int(get_jwt_identity())

        new_traceability = Traceability(
            id_patient=data.get('id_patient'),
            id_product=data.get('id_product'),
            id_nurse=id_nurse_logueado,
            date_of_use=datetime.fromisoformat(data.get('date_of_use')) if data.get('date_of_use') else datetime.utcnow()
        )
        db.session.add(new_traceability)
        db.session.commit()

        return jsonify({"msg": "Traceability created successfully", "traceability_id": new_traceability.id_traceability}), 201
    except Exception as e:
        db.session.rollback()
        print(f"ERROR AL CREAR TRAZABILIDAD: {e}")
        return jsonify({"msg": "Error creating traceability", "error": str(e)}), 500


@traceabilities_bp.route('/', methods=['GET'])
@role_required(RoleEnum.NURSE, RoleEnum.DOCTOR)
def get_traceabilities():
    try:
        traceabilities = Traceability.query.all()
        return jsonify([t.to_dict() for t in traceabilities]), 200
    except Exception as e:
        return jsonify({"msg": "Error fetching traceabilities"}), 500


@traceabilities_bp.route('/<int:traceability_id>', methods=['GET'])
@role_required(RoleEnum.NURSE, RoleEnum.DOCTOR)
def get_traceability(traceability_id):
    try:
        traceability = Traceability.query.get(traceability_id)
        if not traceability:
            return jsonify({"msg": "Traceability not found"}), 404
        return jsonify(traceability.to_dict()), 200
    except Exception as e:
        return jsonify({"msg": "Error fetching traceability"}), 500


@traceabilities_bp.route('/patient/<int:patient_id>', methods=['GET'])
@role_required(RoleEnum.NURSE, RoleEnum.DOCTOR)
def get_traceabilities_by_patient(patient_id):
    try:
        traceabilities = Traceability.query.filter_by(id_patient=patient_id).all()
        return jsonify([t.to_dict() for t in traceabilities]), 200
    except Exception as e:
        return jsonify({"msg": "Error fetching patient traceabilities"}), 500


@traceabilities_bp.route('/<int:traceability_id>', methods=['PUT'])
@role_required(RoleEnum.NURSE)
def update_traceability(traceability_id):
    try:
        traceability = Traceability.query.get(traceability_id)
        if not traceability:
            return jsonify({"msg": "Traceability not found"}), 404

        id_nurse_logueado=int(get_jwt_identity())

        if traceability.id_nurse!= id_nurse_logueado:
            return jsonify({"msg":"Only the nurse who recorded this traceability can edit it."}),403

        limite = traceability.created_at + timedelta(minutes=5)
        if datetime.utcnow() > limite:
            return jsonify({"msg": "No se puede editar una trazabilidad pasados los 5 minutos de su creación"}), 403

        if not request.is_json:
            return jsonify({"msg":"Missing JSON in request"}),400

        data = request.get_json()

        if 'date_of_use' in data:
            traceability.date_of_use = datetime.fromisoformat(data.get('date_of_use')) if data.get('date_of_use') else None

        if 'id_product' in data:
            if not MedicalProduct.query.get(data.get('id_product')):
                return jsonify({"msg": "Product not found"}), 404
            traceability.id_product = data.get('id_product')

        db.session.commit()
        return jsonify({"msg": "Traceability updated successfully"}), 200
    except Exception as e:
        db.session.rollback()
        print(f"ERROR AL ACTUALIZAR TRAZABILIDAD: {e}")
        return jsonify({"msg": "Error updating traceability", "error": str(e)}), 500


@traceabilities_bp.route('/<int:traceability_id>', methods=['DELETE'])
@role_required(RoleEnum.NURSE)
def delete_traceability(traceability_id):
    try:
        traceability = Traceability.query.get(traceability_id)
        if not traceability:
            return jsonify({"msg": "Traceability not found"}), 404

        id_nurse_logueado=int(get_jwt_identity())
        if traceability.id_nurse!=id_nurse_logueado:
            return jsonify({"msg":"Only the nurse who recorded this traceability can edit it."}),403

        db.session.delete(traceability)
        db.session.commit()
        return jsonify({"msg": "Traceability deleted successfully"}), 200
    except Exception as e:
        db.session.rollback()
        print(f"ERROR AL BORRAR TRAZABILIDAD: {e}")
        return jsonify({"msg": "Error deleting traceability", "error": str(e)}), 500