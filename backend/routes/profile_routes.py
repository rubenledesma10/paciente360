from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity
from werkzeug.utils import secure_filename
from models.db import db
from models.user import User
from models.patient import Patient
from models.doctor import Doctor
from models.nurse import Nurse
from enums import RoleEnum
from utils.role_required import role_required
import os
import uuid

profile_bp = Blueprint('profile', __name__, url_prefix='/api/profile')

UPLOAD_FOLDER = os.path.join('static', 'uploads')
UPLOAD_URL_PREFIX = '/static/uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

# Campos que cualquier usuario puede editar de si mismo.
# Quedan afuera a proposito: dni, username, rol y matricula. Son datos de
# identidad o habilitacion profesional: los cambia un administrador, no el
# propio usuario.
EDITABLE_FIELDS = [
    'email',
    'phone_number',
    'address',
    'emergency_contact',
    'country',
    'gender',
]

# El paciente ademas puede actualizar su cobertura, que sí cambia con el tiempo
PATIENT_EDITABLE_FIELDS = ['health_plan_name', 'member_number']


def is_allowed_photo(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def save_photo(photo):
    """Guarda la imagen y devuelve la URL con la que el front la pide."""
    if not photo or photo.filename == '':
        return None
    if not is_allowed_photo(photo.filename):
        return None

    safe_name = secure_filename(photo.filename)
    unique_name = f"{uuid.uuid4().hex}_{safe_name}"
    photo.save(os.path.join(UPLOAD_FOLDER, unique_name))
    # Barras normales siempre: os.path.join en Windows genera '\' y rompe la URL
    return f"{UPLOAD_URL_PREFIX}/{unique_name}"


def delete_photo_file(photo_url):
    """Borra del disco la foto anterior para no acumular archivos huerfanos."""
    if not photo_url:
        return
    file_path = os.path.join(UPLOAD_FOLDER, os.path.basename(photo_url))
    if os.path.exists(file_path):
        try:
            os.remove(file_path)
        except OSError:
            pass


def get_current_user():
    """Devuelve la instancia concreta del usuario logueado.

    Las subclases no tienen discriminador polimorfico, asi que User.query.get()
    sobre el id de un medico devuelve un User pelado, sin matricula ni
    especialidad. Por eso se consulta la tabla que corresponde al rol.
    """
    user_id = int(get_jwt_identity())
    base_user = User.query.get(user_id)
    if not base_user:
        return None

    if base_user.rol == RoleEnum.PATIENT:
        return Patient.query.get(user_id) or base_user
    if base_user.rol == RoleEnum.DOCTOR:
        return Doctor.query.get(user_id) or base_user
    if base_user.rol == RoleEnum.NURSE:
        return Nurse.query.get(user_id) or base_user
    return base_user


def read_text_fields():
    """Lee los campos tanto si vienen como JSON o como multipart (con foto)."""
    if request.content_type and 'multipart/form-data' in request.content_type:
        return request.form.to_dict()
    return request.get_json(silent=True) or {}


@profile_bp.route('/me', methods=['GET'])
@role_required(RoleEnum.PATIENT, RoleEnum.DOCTOR, RoleEnum.NURSE, RoleEnum.ADMINISTRATIVE)
def get_my_profile():
    """Datos del usuario logueado, con lo especifico de su rol."""
    try:
        user = get_current_user()
        if not user:
            return jsonify({"msg": "Usuario no encontrado"}), 404

        data = user.to_dict()
        data['rol'] = user.rol.value if user.rol else None
        return jsonify(data), 200
    except Exception as e:
        return jsonify({"msg": "Error al obtener el perfil", "error": str(e)}), 500


@profile_bp.route('/me', methods=['PUT'])
@role_required(RoleEnum.PATIENT, RoleEnum.DOCTOR, RoleEnum.NURSE, RoleEnum.ADMINISTRATIVE)
def update_my_profile():
    """Actualiza los datos de contacto y la foto del usuario logueado."""
    try:
        user = get_current_user()
        if not user:
            return jsonify({"msg": "Usuario no encontrado"}), 404

        data = read_text_fields()

        photo = request.files.get('profile_photo')
        if photo and photo.filename != '' and not is_allowed_photo(photo.filename):
            return jsonify({
                'msg': 'Formato de imagen no permitido. Se aceptan: '
                       + ', '.join(sorted(ALLOWED_EXTENSIONS))
            }), 400

        # El email es unico: si lo cambia, no puede pisar el de otro
        new_email = data.get('email')
        if new_email and new_email != user.email:
            taken = User.query.filter(
                User.email == new_email,
                User.id_user != user.id_user
            ).first()
            if taken:
                return jsonify({"msg": "Ya hay otra cuenta con ese email"}), 409

        allowed = list(EDITABLE_FIELDS)
        if user.rol == RoleEnum.PATIENT:
            allowed += PATIENT_EDITABLE_FIELDS

        for field in allowed:
            if field in data:
                value = data.get(field)
                # Un campo vacio desde un form significa "sin dato", no cadena vacia
                setattr(user, field, value if value not in ('', None) else None)

        new_photo_url = save_photo(photo)
        if new_photo_url:
            old_photo = user.profile_photo
            user.profile_photo = new_photo_url

        db.session.commit()

        # La foto vieja se borra recien despues del commit
        if new_photo_url:
            delete_photo_file(old_photo)

        result = user.to_dict()
        result['rol'] = user.rol.value if user.rol else None
        return jsonify(result), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "Error al actualizar el perfil", "error": str(e)}), 500


@profile_bp.route('/me/photo', methods=['DELETE'])
@role_required(RoleEnum.PATIENT, RoleEnum.DOCTOR, RoleEnum.NURSE, RoleEnum.ADMINISTRATIVE)
def delete_my_photo():
    """Saca la foto de perfil y vuelve a la inicial del nombre."""
    try:
        user = get_current_user()
        if not user:
            return jsonify({"msg": "Usuario no encontrado"}), 404

        old_photo = user.profile_photo
        user.profile_photo = None
        db.session.commit()
        delete_photo_file(old_photo)

        return jsonify({"msg": "Foto de perfil eliminada"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "Error al eliminar la foto", "error": str(e)}), 500


@profile_bp.route('/me/password', methods=['PATCH'])
@role_required(RoleEnum.PATIENT, RoleEnum.DOCTOR, RoleEnum.NURSE, RoleEnum.ADMINISTRATIVE)
def change_my_password():
    """Cambio de contrasena. Pide la actual: sin eso, alguien que agarre una
    sesion abierta podria dejar al dueno afuera de su propia cuenta."""
    try:
        user = get_current_user()
        if not user:
            return jsonify({"msg": "Usuario no encontrado"}), 404

        if not request.is_json:
            return jsonify({"msg": "Falta el JSON en la peticion"}), 400
        data = request.get_json()

        current_password = data.get('current_password')
        new_password = data.get('new_password')

        if not current_password or not new_password:
            return jsonify({"msg": "Se requieren la contrasena actual y la nueva"}), 400

        if not user.check_password(current_password):
            return jsonify({"msg": "La contrasena actual no es correcta"}), 403

        if len(new_password) < 6:
            return jsonify({"msg": "La nueva contrasena debe tener al menos 6 caracteres"}), 400

        if current_password == new_password:
            return jsonify({"msg": "La nueva contrasena no puede ser igual a la actual"}), 400

        user.set_password(new_password)
        db.session.commit()
        return jsonify({"msg": "Contrasena actualizada correctamente"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "Error al cambiar la contrasena", "error": str(e)}), 500