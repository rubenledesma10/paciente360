from flask import jsonify
from flask_jwt_extended import get_jwt_identity
from models.user import User
from enums import RoleEnum


def check_can_deactivate(user):
    """Devuelve una respuesta de error (jsonify, status) si no se puede dar de
    baja a este usuario, o None si se puede.

    Reglas: nadie se da de baja a si mismo y nunca queda el sistema sin un
    superadministrador activo. Solo aplica si el usuario esta activo: dar de
    baja a alguien que ya esta inactivo no cambia nada.
    """
    if not user.is_active:
        return None

    if user.id_user == int(get_jwt_identity()):
        return jsonify({"msg": "No podés darte de baja a vos mismo."}), 400

    if user.rol == RoleEnum.SUPERADMINISTRADOR:
        activos = User.query.filter_by(
            rol=RoleEnum.SUPERADMINISTRADOR, is_active=True
        ).count()
        if activos <= 1:
            return jsonify({
                "msg": "No se puede dar de baja al último superadministrador activo."
            }), 400

    return None
