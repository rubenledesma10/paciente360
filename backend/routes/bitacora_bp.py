from flask import Blueprint, jsonify, request
from models.bitacora import Bitacora
from enums import RoleEnum
from utils.role_required import role_required

bitacora_bp = Blueprint('bitacora', __name__, url_prefix='/api/bitacora')

@bitacora_bp.route('/', methods=['GET'])
@role_required(RoleEnum.ADMINISTRATOR, RoleEnum.SUPERADMINISTRADOR)
def get_logs():
    try:
        logs = Bitacora.query.order_by(Bitacora.timestamp.desc()).all()
        return jsonify([log.to_dict() for log in logs]), 200
    except Exception as e:
        return jsonify({"msg": "Error obteniendo la bitácora", "error": str(e)}), 500

@bitacora_bp.route('/search', methods=['GET'])
@role_required(RoleEnum.ADMINISTRATOR, RoleEnum.SUPERADMINISTRADOR)
def search_logs():
    try:
        query = Bitacora.query

        table_param = request.args.get('table')
        if table_param:
            query = query.filter(Bitacora.table_name.ilike(f"%{table_param}%"))

        action_param = request.args.get('action')
        if action_param:
            query = query.filter(Bitacora.action.ilike(f"%{action_param}%"))

        logs = query.order_by(Bitacora.timestamp.desc()).all()
        return jsonify([log.to_dict() for log in logs]), 200
    except Exception as e:
        return jsonify({"msg": "Error buscando en la bitácora", "error": str(e)}), 500