from functools import wraps
from flask import jsonify
from flask_jwt_extended import jwt_required, get_jwt

def role_required(*roles_permitidos):

    roles_permitidos_valores=[r.value for r in roles_permitidos]
    def decorador(func):
        @wraps(func)
        @jwt_required()
        def wrapper(*args,**kwargs):
            claims=get_jwt()
            rol_actual=claims.get("rol")
            if rol_actual not in roles_permitidos_valores:
                return jsonify({"error":"You do not have permission to access this resource."}),403
            return func(*args, **kwargs)
        return wrapper
    return decorador