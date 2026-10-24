from functools import wraps
from flask import jsonify
from flask_jwt_extended import jwt_required, get_jwt
from enums import RoleEnum

# Roles de administracion del sistema. Pasan cualquier chequeo de rol sin
# tener que agregarlos a mano en cada endpoint.
#
# La unica excepcion: los endpoints que piden SOLO Superadministrador
# (CRUD de administradores, bitacora) siguen siendo exclusivos de el.
_SUPERUSUARIOS = {RoleEnum.ADMINISTRATOR.value, RoleEnum.SUPERADMINISTRADOR.value}


def role_required(*roles_permitidos, solo_lectura_admins=False):
    """Controla el acceso por rol.

    Administrador y Superadministrador pasan cualquier chequeo: su funcion es
    supervisar todo el sistema. Pero eso es acceso de LECTURA: no pueden
    ejecutar acciones clinicas (cargar signos, indicaciones, pases de guardia,
    movimientos de stock). Esas son funciones de una matricula profesional.

    Por eso los endpoints de escritura clinica se marcan con
    solo_lectura_admins=True: ahi los admins quedan afuera salvo que su rol
    este explicitamente en la lista.

    Los endpoints exclusivos de Superadministrador siguen siendo solo de el.
    """
    roles_permitidos_valores = [r.value for r in roles_permitidos]
    solo_superadmin = roles_permitidos_valores == [RoleEnum.SUPERADMINISTRADOR.value]

    def decorador(func):
        @wraps(func)
        @jwt_required()
        def wrapper(*args, **kwargs):
            claims = get_jwt()
            rol_actual = claims.get("rol")

            if rol_actual in roles_permitidos_valores:
                return func(*args, **kwargs)

            es_admin = rol_actual in (
                RoleEnum.ADMINISTRATOR.value,
                RoleEnum.SUPERADMINISTRADOR.value,
            )

            if es_admin and not solo_lectura_admins:
                # El superadmin pasa todo; el administrador, todo salvo lo
                # que es exclusivo del superadmin.
                if rol_actual == RoleEnum.SUPERADMINISTRADOR.value:
                    return func(*args, **kwargs)
                if not solo_superadmin:
                    return func(*args, **kwargs)

            if es_admin and solo_lectura_admins:
                return jsonify({
                    "error": "Los administradores solo pueden consultar esta "
                             "informacion. Esta accion la realiza el personal "
                             "de salud."
                }), 403

            return jsonify({"error": "You do not have permission to access this resource."}), 403
        return wrapper
    return decorador