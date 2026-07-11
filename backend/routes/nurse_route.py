from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import date
from models.db import db
from models.user import User
from werkzeug.utils import secure_filename
import os

nurses_bp = Blueprint('nurses', __name__,url_prefix='/api/nurses')

UPLOAD_FOLDER = 'static/uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

@nurses_bp.route('/', methods=['POST'])
def create_nurse():
    try:
        if not request.is_json:
            return jsonify({"msg": "Missing JSON in request"}), 400
        
        if User.query.filter_by(email=request.json.get('email')).first():
            return jsonify({"msg": "Email already exists"}), 400
        
        if User.query.filter_by(username=request.json.get('username')).first():
            return jsonify({"msg": "Username already exists"}), 400
        
        if User.query.filter_by(phone_number=request.json.get('phone')).first():
            return jsonify({"msg": "Phone number already exists"}), 400
                
        if User.query.filter_by(license_number=request.json.get('license_number')).first():
            return jsonify({"msg": "License number already exists"}), 400
        
        if User.query.filter_by(dni=request.json.get('dni')).first():
            return jsonify({"msg": "DNI already exists"}), 400
        

        new_user=User(
            first_name=request.json.get('first_name'),
            last_name=request.json.get('last_name'),
            username=request.json.get('username'),
            dni=request.json.get('dni'),
            email=request.json.get('email'),
            phone=request.json.get('phone'),
            date_of_birth=date.fromisoformat(request.json.get('date_of_birth')) if request.json.get('date_of_birth') else None,
            profile_photo=None,
            country=request.json.get('country'),
            phone_number=request.json.get('phone'),
            is_active=request.json.get('is_active', True),
            gender=request.json.get('gender'),
            address=request.json.get('address'),
            emergency_contact=request.json.get('emergency_contact'),
            license_number=request.json.get('license_number'),
            is_reference=request.json.get('is_reference', False),
            role='nurse'
        )
        new_user.set_password(request.json.get('password'))
        db.session.add(new_user)
        db.session.flush()
        if 'profile_photo' in request.files:
            profile_photo = request.files['profile_photo']
            if profile_photo.filename != '':
                filename = secure_filename(profile_photo.filename)
                file_path = os.path.join(UPLOAD_FOLDER, filename)
                profile_photo.save(file_path)
                new_user.profile_photo = file_path

        db.session.commit()
        return jsonify({"msg": "Nurse created successfully", "nurse_id": new_user.id}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "Error creating nurse"}), 500
    
@nurses_bp.route('/', methods=['GET'])
def get_nurses():
    try:
        nurses = User.query.all()
        return jsonify([nurse.to_dict() for nurse in nurses]), 200
    except Exception as e:
        return jsonify({"msg": "Error fetching nurses"}), 500
    

@nurses_bp.route('/<int:nurse_id>', methods=['PUT'])
def update_nurse(nurse_id):
    try:
        nurse = User.query.get(nurse_id)
        if not nurse:
            return jsonify({"msg": "Nurse not found"}), 404
        
        if not request.is_json and request.files.get('profile_photo') is None:
            return jsonify({"msg": "Missing JSON in request"}), 400
        
        if 'photo' in request.files:
            profile_photo = request.files['profile_photo']
            if profile_photo.filename != '':
                filename = secure_filename(profile_photo.filename)
                file_path = os.path.join(UPLOAD_FOLDER, filename)
                profile_photo.save(file_path)
                nurse.profile_photo = file_path
        
        if 'dni' in request.json:
            if User.query.filter_by(dni=request.json.get('dni')).first() and nurse.dni != request.json.get('dni'):
                return jsonify({"msg": "DNI already exists"}), 400
            nurse.dni = request.json.get('dni') 

        if 'email' in request.json:
            if User.query.filter_by(email=request.json.get('email')).first() and nurse.email != request.json.get('email'):
                return jsonify({"msg": "Email already exists"}), 400
            nurse.email = request.json.get('email')

        if 'username' in request.json:
            if User.query.filter_by(username=request.json.get('username')).first() and nurse.username != request.json.get('username'):
                return jsonify({"msg": "Username already exists"}), 400
            nurse.username = request.json.get('username')

        if 'phone' in request.json:
            if User.query.filter_by(phone_number=request.json.get('phone')).first() and nurse.phone_number != request.json.get('phone'):
                return jsonify({"msg": "Phone number already exists"}), 400
            nurse.phone_number = request.json.get('phone')

        if 'license_number' in request.json:
            if User.query.filter_by(license_number=request.json.get('license_number')).first() and nurse.license_number != request.json.get('license_number'):
                return jsonify({"msg": "License number already exists"}), 400
            nurse.license_number = request.json.get('license_number')

        if 'first_name' in request.json:
            nurse.first_name = request.json.get('first_name')
        
        if 'last_name' in request.json:
            nurse.last_name = request.json.get('last_name')

        if 'date_of_birth' in request.json:
            nurse.date_of_birth = date.fromisoformat(request.json.get('date_of_birth')) if request.json.get('date_of_birth') else None

        if 'country' in request.json:
            nurse.country = request.json.get('country')

        if 'is_active' in request.json:
            nurse.is_active = request.json.get('is_active')

        if 'is_reference' in request.json:
            nurse.is_reference = request.json.get('is_reference')

        if 'gender' in request.json:
            nurse.gender = request.json.get('gender')

        if 'address' in request.json:
            nurse.address = request.json.get('address')

        if 'emergency_contact' in request.json:
            nurse.emergency_contact = request.json.get('emergency_contact')

        if 'password' in request.json:
            nurse.set_password(request.json.get('password'))

        db.session.commit()
        return jsonify({"msg": "Nurse updated successfully"}), 200
    
    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "Error updating nurse"}), 500
    
@nurses_bp.route('/<int:nurse_id>', methods=['DELETE'])
def delete_nurse(nurse_id):
    try:
        nurse = User.query.get(nurse_id)
        if not nurse:
            return jsonify({"msg": "Nurse not found"}), 404
        
        db.session.delete(nurse)
        db.session.commit()
        return jsonify({"msg": "Nurse deleted successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "Error deleting nurse"}), 500
    
@nurses_bp.route('/<int:nurse_id>', methods=['GET'])
def get_nurse(nurse_id):
    try:
        nurse = User.query.get(nurse_id)
        if not nurse:
            return jsonify({"msg": "Nurse not found"}), 404
        
        return jsonify(nurse.to_dict()), 200
    except Exception as e:
        return jsonify({"msg": "Error fetching nurse"}), 500
    
@nurses_bp.route('/search', methods=['GET'])
def search_nurses():
    try:
        query = request.args.get('query', '')
        nurses = User.query.filter(
            (User.first_name.ilike(f'%{query}%')) |
            (User.last_name.ilike(f'%{query}%')) |
            (User.email.ilike(f'%{query}%')) |
            (User.username.ilike(f'%{query}%')) |
            (User.dni.ilike(f'%{query}%')) |
            (User.phone_number.ilike(f'%{query}%')) |
            (User.license_number.ilike(f'%{query}%'))
        ).all()
        return jsonify([nurse.to_dict() for nurse in nurses]), 200
    except Exception as e:
        return jsonify({"msg": "Error searching nurses"}), 500
    
@nurses_bp.route('/<int:nurse_id>/toggle',methods=['PATCH'])
def toggle_nurse_status(nurse_id):
    try:
        nurse = User.query.get(nurse_id)
        if not nurse:
            return jsonify({"msg": "Nurse not found"}), 404
        
        nurse.is_active = not nurse.is_active
        db.session.commit()
        return jsonify({"msg": "Nurse status toggled successfully", "is_active": nurse.is_active}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "Error toggling nurse status"}), 500
        
        


        

        





