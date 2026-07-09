from flask import Blueprint, request, jsonify
import uuid

administrative_bp = Blueprint('administrative_bp', __name__)

# In-memory storage for administrative records
# Each record: {"id": str, "name": str, "email": str, ...}
_administratives = {}


def _get_json_required(fields):
    data = request.get_json() or {}
    missing = [f for f in fields if f not in data]
    if missing:
        return None, jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400
    return data, None, None


@administrative_bp.route('/administratives', methods=['POST'])
def create_administrative():
    data, err_resp, status = _get_json_required(['name', 'email'])
    if err_resp:
        return err_resp, status

    new_id = str(uuid.uuid4())
    record = {
        'id': new_id,
        'name': data.get('name'),
        'email': data.get('email'),
        'phone': data.get('phone'),
        'notes': data.get('notes')
    }
    _administratives[new_id] = record
    return jsonify(record), 201


@administrative_bp.route('/administratives', methods=['GET'])
def list_administratives():
    return jsonify(list(_administratives.values())), 200


@administrative_bp.route('/administratives/<string:administrative_id>', methods=['GET'])
def get_administrative(administrative_id):
    record = _administratives.get(administrative_id)
    if not record:
        return jsonify({'error': 'Not found'}), 404
    return jsonify(record), 200


@administrative_bp.route('/administratives/<string:administrative_id>', methods=['PUT'])
def update_administrative(administrative_id):
    record = _administratives.get(administrative_id)
    if not record:
        return jsonify({'error': 'Not found'}), 404
    data = request.get_json() or {}
    # allow partial updates
    for key in ('name', 'email', 'phone', 'notes'):
        if key in data:
            record[key] = data[key]
    _administratives[administrative_id] = record
    return jsonify(record), 200


@administrative_bp.route('/administratives/<string:administrative_id>', methods=['DELETE'])
def delete_administrative(administrative_id):
    if administrative_id not in _administratives:
        return jsonify({'error': 'Not found'}), 404
    del _administratives[administrative_id]
    return jsonify({}), 204


# Simple health check
@administrative_bp.route('/administratives/health', methods=['GET'])
def administrative_health():
    return jsonify({'status': 'ok', 'count': len(_administratives)}), 200
