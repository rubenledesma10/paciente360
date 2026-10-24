from flask import Blueprint, request, jsonify
from models.db import db
from models.specialty import Specialty

specialties_bp = Blueprint('specialties', __name__, url_prefix='/api/specialties')


@specialties_bp.route('/', methods=['POST'])
def create_specialty():
    try:
        if not request.is_json:
            return jsonify({"msg": "Missing JSON in request"}), 400

        data = request.get_json()

        if Specialty.query.filter_by(name=data.get('name')).first():
            return jsonify({"msg": "Specialty already exists"}), 400

        new_specialty = Specialty(name=data.get('name'))
        db.session.add(new_specialty)
        db.session.commit()

        return jsonify({"msg": "Specialty created successfully", "specialty_id": new_specialty.id_speciality}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "Error creating specialty", "error": str(e)}), 500


@specialties_bp.route('/', methods=['GET'])
def get_specialties():
    try:
        specialties = Specialty.query.all()
        return jsonify([s.to_dict() for s in specialties]), 200
    except Exception as e:
        return jsonify({"msg": "Error fetching specialties"}), 500


@specialties_bp.route('/<int:specialty_id>', methods=['GET'])
def get_specialty(specialty_id):
    try:
        specialty = Specialty.query.get(specialty_id)
        if not specialty:
            return jsonify({"msg": "Specialty not found"}), 404
        return jsonify(specialty.to_dict()), 200
    except Exception as e:
        return jsonify({"msg": "Error fetching specialty"}), 500


@specialties_bp.route('/<int:specialty_id>', methods=['PUT'])
def update_specialty(specialty_id):
    try:
        specialty = Specialty.query.get(specialty_id)
        if not specialty:
            return jsonify({"msg": "Specialty not found"}), 404

        if not request.is_json:
            return jsonify({"msg": "Missing JSON in request"}), 400

        data = request.get_json()

        if 'name' in data:
            existing = Specialty.query.filter_by(name=data.get('name')).first()
            if existing and existing.id_speciality != specialty.id_speciality:
                return jsonify({"msg": "Specialty already exists"}), 400
            specialty.name = data.get('name')

        db.session.commit()
        return jsonify({"msg": "Specialty updated successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "Error updating specialty", "error": str(e)}), 500


@specialties_bp.route('/<int:specialty_id>', methods=['DELETE'])
def delete_specialty(specialty_id):
    try:
        specialty = Specialty.query.get(specialty_id)
        if not specialty:
            return jsonify({"msg": "Specialty not found"}), 404

        db.session.delete(specialty)
        db.session.commit()
        return jsonify({"msg": "Specialty deleted successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "Error deleting specialty", "error": str(e)}), 500


@specialties_bp.route('/search', methods=['GET'])
def search_specialties():
    try:
        query = request.args.get('query', '')
        specialties = Specialty.query.filter(Specialty.name.ilike(f'%{query}%')).all()
        return jsonify([s.to_dict() for s in specialties]), 200
    except Exception as e:
        return jsonify({"msg": "Error searching specialties"}), 500
