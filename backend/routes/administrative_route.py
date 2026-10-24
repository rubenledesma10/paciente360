from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import date
from models.db import db
from models.user import User
from enums import RoleEnum
from utils.role_required import role_required
from utils.email_service import send_welcome_email_admin
from werkzeug.utils import secure_filename
import os

administrative_bp = Blueprint('administrative', __name__,url_prefix='/api/administrative')

UPLOAD_FOLDER = 'static/uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)
@administrative_bp.route('/', methods=['POST'])
@role_required(RoleEnum.ADMINISTRATOR, RoleEnum.SUPERADMINISTRADOR)
def create_administrative():
    try:
        if not request.is_json:
            return jsonify({"msg": "Missing JSON in request"}), 400
        
        if User.query.filter_by(email=request.json.get('email')).first():
            return jsonify({"msg": "Email already exists"}), 400
        
        if User.query.filter_by(username=request.json.get('username')).first():
            return jsonify({"msg": "Username already exists"}), 400
        
        if request.json.get('phone_number') and User.query.filter_by(phone_number=request.json.get('phone_number')).first():
            return jsonify({"msg": "Phone number already exists"}), 400
                    
        if User.query.filter_by(dni=request.json.get('dni')).first():
            return jsonify({"msg": "DNI already exists"}), 400

        new_user=User(
            first_name=request.json.get('first_name'),
            last_name=request.json.get('last_name'),
            username=request.json.get('username'),
            dni=request.json.get('dni'),
            email=request.json.get('email'),
            date_of_birth=date.fromisoformat(request.json.get('date_of_birth')) if request.json.get('date_of_birth') else None,
            profile_photo=None,
            country=request.json.get('country'),
            phone_number=request.json.get('phone_number'), # Este es el campo válido
            is_active=request.json.get('is_active', True),
            gender=request.json.get('gender'),
            address=request.json.get('address'),
            emergency_contact=request.json.get('emergency_contact'),
            rol=RoleEnum.ADMINISTRATIVE
        )
        password=request.json.get('password') or request.json.get('dni')
        new_user.set_password(password)
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

        try:
            send_welcome_email_admin(new_user.email, new_user.first_name)
        except Exception as mail_error:
            print(f"Error al enviar correo al administrativo: {mail_error}")
            
        return jsonify({"msg": "Administrative user created successfully", "user_id": new_user.id_user}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "Error creating administrative user", "error": str(e)}), 500
    
@administrative_bp.route('/', methods=['GET'])
@role_required(RoleEnum.ADMINISTRATOR, RoleEnum.SUPERADMINISTRADOR)
def get_administrative_users():
    try:
        administrative_users = User.query.filter_by(rol=RoleEnum.ADMINISTRATIVE).all()
        return jsonify([user.to_dict() for user in administrative_users]), 200
    except Exception as e:
        return jsonify({"msg": "Error fetching administrative users", "error": str(e)}), 500
    
@administrative_bp.route('/<int:user_id>', methods=['PUT'])
@role_required(RoleEnum.ADMINISTRATOR, RoleEnum.SUPERADMINISTRADOR)
def update_administrative(user_id):
    try:
        user = User.query.filter_by(id_user=user_id, rol=RoleEnum.ADMINISTRATIVE).first()
        if not user:
            return jsonify({"msg": "Administrative user not found"}), 404
        
        if not request.is_json and request.files.get('profile_photo') is None:
            return jsonify({"msg": "Missing JSON in request"}), 400
        
        data = request.get_json(silent=True) or {}

        if 'profile_photo' in request.files:
            profile_photo = request.files['profile_photo']
            if profile_photo.filename != '':
                filename = secure_filename(profile_photo.filename)
                file_path = os.path.join(UPLOAD_FOLDER, filename)
                profile_photo.save(file_path)
                user.profile_photo = file_path

        if 'dni' in data:
            if User.query.filter_by(dni=data.get('dni')).first() and user.dni != data.get('dni'):
                return jsonify({"msg": "DNI already exists"}), 400
            user.dni = data.get('dni')

        if 'email' in data:
            if User.query.filter_by(email=data.get('email')).first() and user.email != data.get('email'):
                return jsonify({"msg": "Email already exists"}), 400
            user.email = data.get('email')

        if 'username' in data:
            if User.query.filter_by(username=data.get('username')).first() and user.username != data.get('username'):
                return jsonify({"msg": "Username already exists"}), 400
            user.username = data.get('username')
        
        if 'phone_number' in data or 'phone' in data:
            phone = data.get('phone_number', data.get('phone'))
            if phone and User.query.filter(User.phone_number == phone, User.id_user != user.id_user).first():
                return jsonify({"msg": "Phone number already exists"}), 400
            user.phone_number = phone or None

        if 'first_name' in data:
            user.first_name = data.get('first_name')

        if 'last_name' in data:
            user.last_name = data.get('last_name')

        if 'date_of_birth' in data:
            user.date_of_birth = date.fromisoformat(data.get('date_of_birth')) if data.get('date_of_birth') else None

        if 'country' in data:
            user.country = data.get('country')

        if 'address' in data:
            user.address = data.get('address')

        if 'emergency_contact' in data:
            user.emergency_contact = data.get('emergency_contact')

        if data.get('password'):
            user.set_password(data.get('password'))

        if 'is_active' in data:
            user.is_active = data.get('is_active')

        db.session.commit()
        return jsonify({"msg": "Administrative user updated successfully"}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "Error updating administrative user", "error": str(e)}), 500

@administrative_bp.route('/<int:user_id>', methods=['GET'])
@role_required(RoleEnum.ADMINISTRATOR, RoleEnum.SUPERADMINISTRADOR)
def get_administrative_user(user_id):
    try:
        user = User.query.filter_by(id_user=user_id, rol=RoleEnum.ADMINISTRATIVE).first()
        if not user:
            return jsonify({"msg": "Administrative user not found"}), 404
        return jsonify(user.to_dict()), 200
    except Exception as e:
        return jsonify({"msg": "Error fetching administrative user", "error": str(e)}), 500 

@administrative_bp.route('/<int:user_id>', methods=['DELETE'])
@role_required(RoleEnum.ADMINISTRATOR, RoleEnum.SUPERADMINISTRADOR)
def delete_administrative(user_id):
    try:
        user = User.query.filter_by(id_user=user_id, rol=RoleEnum.ADMINISTRATIVE).first()
        if not user:
            return jsonify({"msg": "Administrative user not found"}), 404
        
        user.is_active=False
        db.session.commit()
        return jsonify({"msg": "Administrative user deleted successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "Error deleting administrative user", "error": str(e)}), 500

@administrative_bp.route('/search', methods=['GET'])
@role_required(RoleEnum.ADMINISTRATOR, RoleEnum.SUPERADMINISTRADOR)
def search_administrative_users():
    try:
        query = request.args.get('query', '')
        administrative_users = User.query.filter(User.rol == RoleEnum.ADMINISTRATIVE).filter(
            (User.first_name.ilike(f'%{query}%')) |
            (User.last_name.ilike(f'%{query}%')) |
            (User.email.ilike(f'%{query}%')) |
            (User.username.ilike(f'%{query}%'))
        ).all()
        return jsonify([user.to_dict() for user in administrative_users]), 200
    except Exception as e:
        return jsonify({"msg": "Error searching administrative users", "error": str(e)}), 500

@administrative_bp.route('/<int:user_id>/toggle', methods=['PATCH'])
@role_required(RoleEnum.ADMINISTRATOR, RoleEnum.SUPERADMINISTRADOR)
def toggle_administrative_active_status(user_id): #activar
    try:
        user = User.query.filter_by(id_user=user_id, rol=RoleEnum.ADMINISTRATIVE).first()
        if not user:
            return jsonify({"msg": "Administrative user not found"}), 404
        
        user.is_active = not user.is_active
        db.session.commit()
        return jsonify({"msg": f"Administrative user {'activated' if user.is_active else 'deactivated'} successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "Error toggling administrative user status", "error": str(e)}), 500   