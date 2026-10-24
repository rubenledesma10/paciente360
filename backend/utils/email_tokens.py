from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired
from flask import current_app
 
SEGUNDOS_VALIDEZ_TOKEN = 60 * 60 * 48  # 48 horas
 
 
def _get_serializer():
    return URLSafeTimedSerializer(current_app.config['SECRET_KEY'])
 
 
def generar_token_accion_turno(appointment_id, accion):
    """
    accion: 'confirm' o 'cancel'
    Devuelve un string para meter en la URL del mail.
    """
    serializer = _get_serializer()
    return serializer.dumps({"appointment_id": appointment_id, "accion": accion})
 
 
def leer_token_accion_turno(token):
    """
    Devuelve (data, error).
    - Si el token es válido: (dict con appointment_id y accion, None)
    - Si es inválido o venció: (None, "mensaje explicando por qué")
    """
    serializer = _get_serializer()
    try:
        data = serializer.loads(token, max_age=SEGUNDOS_VALIDEZ_TOKEN)
        return data, None
    except SignatureExpired:
        return None, "Este link venció. Iniciá sesión para gestionar tu turno."
    except BadSignature:
        return None, "Este link no es válido."