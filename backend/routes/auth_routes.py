from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token

from models.user import User

auth_bp = Blueprint('auth',__name__, url_prefix=("/api/auth"))

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()

    username= data.get('username')
    password=data.get('password')

    if not username or not password:
        return jsonify({"Error": "Username and password are required."}),400
    
    user = User.query.filter_by(username=username).first()

    if not user or not user.checkpassword(password):
        return jsonify({"Error":"Username and password incorrect."}),401
    
    if not user.is_activate:
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
    
    
