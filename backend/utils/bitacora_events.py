from sqlalchemy import event
from sqlalchemy.orm.attributes import get_history
from flask import has_request_context
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request
from models.bitacora import Bitacora

# 1. IMPORTAMOS TODOS LOS MODELOS DE TU SISTEMA
from models.user import User
from models.patient import Patient
from models.nurse import Nurse
from models.doctor import Doctor
from models.medical_product import MedicalProduct
from models.stock_movement import StockMovement
from models.traceability import Traceability
from models.medical_appointment import MedicalAppointment
from models.medical_indication import MedicalIndication
from models.patient_follow_up import PatientFollowUp
from models.signs_and_symptoms import SignsAndSymptoms
from models.guard_pass import GuardPass
from models.news_and_prevention import NewsAndPrevention


# Nombre de cada tabla en castellano, para que el detalle se lea sin
# tecnicismos en la pantalla de bitacora.
NOMBRES_TABLA = {
    'users': 'Usuarios',
    'patients': 'Pacientes',
    'nurses': 'Enfermeros',
    'doctors': 'Médicos',
    'medical_appointment': 'Turnos',
    'patient_follow_up': 'Seguimientos',
    'signs_and_symptoms': 'Signos y síntomas',
    'medical_indication': 'Indicaciones médicas',
    'medical_product': 'Productos',
    'stock_movement': 'Movimientos de stock',
    'traceability': 'Trazabilidad',
    'guard_pass': 'Pase de guardia',
    'news_and_prevention': 'Noticias',
}


def nombre_legible(table):
    return NOMBRES_TABLA.get(table, table)


def get_current_user_id():
    """ID del usuario logueado, sacado del token.

    Se verifica el JWT de forma opcional porque hay endpoints publicos que
    igual reciben el token (por ejemplo el alta de pacientes, que la usa
    tanto el registro publico como el administrador). Si no se verifica,
    get_jwt_identity() devuelve None y la accion queda sin autor.
    """
    if not has_request_context():
        return None
    try:
        verify_jwt_in_request(optional=True)
        identidad = get_jwt_identity()
        return int(identidad) if identidad is not None else None
    except Exception:
        return None


def _es_mapper_propio(mapper, target):
    """True si el evento corresponde a la clase real del objeto.

    Patient, Nurse y Doctor heredan de User, y los listeners estan puestos
    en las cuatro clases. Sin este filtro, al guardar un paciente se dispara
    tambien el listener de User y la accion queda registrada dos veces.
    """
    return mapper.class_ is type(target)


def after_insert_listener(mapper, connection, target):
    if not _es_mapper_propio(mapper, target):
        return

    user_id = get_current_user_id()
    table = target.__tablename__

    # Tratamos de obtener el ID primario. Como cada tabla tiene uno distinto
    # (id_user, id_product, id_stock_movement...) usamos una forma generica
    # de obtener la primary key que acaba de generarse
    primary_key_column = mapper.primary_key[0].name
    record_id = getattr(target, primary_key_column, None)

    connection.execute(
        Bitacora.__table__.insert().values(
            id_user=user_id,
            action='CREAR',
            table_name=table,
            record_id=record_id,
            details=f"Registro creado en {nombre_legible(table)}"
        )
    )


def after_update_listener(mapper, connection, target):
    if not _es_mapper_propio(mapper, target):
        return

    user_id = get_current_user_id()
    table = target.__tablename__
    legible = nombre_legible(table)

    primary_key_column = mapper.primary_key[0].name
    record_id = getattr(target, primary_key_column, None)

    action = "ACTUALIZAR"
    details = f"Registro modificado en {legible}"

    # Detectar el borrado lógico si la tabla tiene 'is_active'
    if hasattr(target, 'is_active'):
        history = get_history(target, 'is_active')
        if history.deleted and not target.is_active:
            action = "ELIMINAR_LOGICO"
            details = f"Registro dado de baja en {legible}"
        elif history.added and target.is_active:
            action = "RESTAURAR"
            details = f"Registro reactivado en {legible}"

    connection.execute(
        Bitacora.__table__.insert().values(
            id_user=user_id,
            action=action,
            table_name=table,
            record_id=record_id,
            details=details
        )
    )


def setup_auditing():
    """Conecta los listeners a TODOS los modelos deseados"""

    # 2. AGREGAMOS TODOS LOS MODELOS A LA LISTA DE AUDITORÍA
    modelos_auditables = [
        User, Patient, Nurse, Doctor,
        MedicalProduct, StockMovement, Traceability,
        MedicalAppointment, MedicalIndication, PatientFollowUp,
        SignsAndSymptoms, GuardPass, NewsAndPrevention
    ]

    for modelo in modelos_auditables:
        event.listen(modelo, 'after_insert', after_insert_listener)
        event.listen(modelo, 'after_update', after_update_listener)