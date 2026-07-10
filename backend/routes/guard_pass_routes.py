from flask import Blueprint, jsonify, request
from backend.models import db
from backend.models.guard_pass import GuardPass
from models.nurse import Nurse
from datetime import datetime, timedelta

guard_pass_bp = Blueprint('guard_pass', __name__, url_prefix='/api/guard_pass')

@guard_pass_bp.route('/', methods=['POST'])
def create_guard_pass():

    data = request.get_json()
    id_nurse = data.get('id_nurse')
    if not id_nurse:
        return jsonify({'error': 'Missing required field: id_nurse'}), 400
    nurse= Nurse.query.get(id_nurse)
    if not nurse:
        return jsonify({'error': 'Nurse not found'}), 404
    try:
        new_guard_pass = GuardPass(
            id_nurse=id_nurse,
            rotation=data.get('rotation'),
            notes=data.get('notes')
        )

        db.session.add(new_guard_pass)
        db.session.commit()
        return jsonify(new_guard_pass.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
    
@guard_pass_bp.route('/', methods=['GET'])
def get_guard_passes():
    guard_passes = GuardPass.query.all()
    return jsonify([gp.to_dict() for gp in guard_passes]), 200

@guard_pass_bp.route('/<int:id_guard_pass>', methods=['GET'])
def get_guard_pass(id_guard_pass):
    guard_pass = GuardPass.query.get(id_guard_pass)
    if guard_pass:
        return jsonify(guard_pass.to_dict()), 200
    else:
        return jsonify({'error': 'Guard pass not found'}), 404
    
@guard_pass_bp.route('/<int:id_guard_pass>', methods=['PUT'])
def update_guard_pass(id_guard_pass):
    guard_pass = GuardPass.query.get(id_guard_pass)
    if not guard_pass:
        return jsonify({'error': 'Guard pass not found'}), 404
    now = datetime.utcnow()
    time_limit = guard_pass.rotation + timedelta(minutes=15)

    if now > time_limit:
        return jsonify({'error': 'Cannot update guard pass after 15 minutes of its creation'}), 403
    
    try:
        guard_pass.notes = request.json.get('notes', guard_pass.notes)
        db.session.commit()
        return jsonify(guard_pass.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
    

