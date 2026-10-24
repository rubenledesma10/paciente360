from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token
from models.db import db
from models.user import User
from utils.email_service import send_reset_password_email
import random, string
import os, uuid

auth_bp = Blueprint('auth',__name__, url_prefix=("/api/auth"))

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()

    username= data.get('username')
    password=data.get('password')

    if not username or not password:
        return jsonify({"Error": "Username and password are required."}),400
    
    user = User.query.filter_by(username=username).first()

    if not user or not user.check_password(password):
        return jsonify({"Error":"Username and password incorrect."}),401
    
    if not user.is_active:
        return jsonify({"Error":"User not activate"})
    
    token=create_access_token(
        identity=str(user.id_user),
        additional_claims={"rol":user.rol.value, "nombre":f"{user.first_name} {user.last_name}"},
    )
    return jsonify({
        "access_token":token,
        "rol":user.rol.value,
        "nombre":user.first_name
    }),200


@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password_new_password():
    data= request.get_json()
    email=data.get('email')

    user=User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"Error":"User not found"}),404
    new_password = ''.join(random.choices(string.ascii_letters + string.digits, k=8)) #generar contraseña aleatoria

    
    user.set_password(new_password) #actualizar contraseña en DB (hasheada con tu método de User)
    db.session.commit()

    
    send_reset_password_email(user.email, new_password) #enviar correo con la nueva contraseña

    return jsonify({"message": "An email with the new password has been sent"}), 200
    
    
