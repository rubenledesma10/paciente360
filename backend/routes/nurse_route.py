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
        return jsonify({"msg": "Nurse created successfully", "nurse_id": new_user.id})
    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "Error creating nurse"}), 500
    
    

        

        





