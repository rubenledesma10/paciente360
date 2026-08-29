from sqlalchemy import event
from sqlalchemy.orm.attributes import get_history
from flask import has_request_context
from flask_jwt_extended import get_jwt_identity
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


def get_current_user_id():
    """Obtiene el ID del usuario logueado del Token."""
    if has_request_context():
        try:
            return int(get_jwt_identity())
        except:
            return None
    return None

def after_insert_listener(mapper, connection, target):
    user_id = get_current_user_id()
    table = target.__tablename__
    
    # Tratamos de obtener el ID primario. Como cada tabla tiene uno distinto (id_user, id_product, id_stock_movement...)
    # usamos una forma genérica de obtener la primary key que acaba de generarse
    primary_key_column = mapper.primary_key[0].name
    record_id = getattr(target, primary_key_column, None)
    
    connection.execute(
        Bitacora.__table__.insert().values(
            id_user=user_id,
            action='CREAR',
            table_name=table,
            record_id=record_id,
            details=f"Registro creado en la tabla {table}"
        )
    )

def after_update_listener(mapper, connection, target):
    user_id = get_current_user_id()
    table = target.__tablename__
    
    primary_key_column = mapper.primary_key[0].name
    record_id = getattr(target, primary_key_column, None)
    
    action = "ACTUALIZAR"
    details = f"Registro modificado en la tabla {table}"
    
    # Detectar el borrado lógico si la tabla tiene 'is_active'
    if hasattr(target, 'is_active'):
        history = get_history(target, 'is_active')
        if history.deleted and not target.is_active:
            action = "ELIMINAR_LOGICO"
            details = f"Registro desactivado en {table}"
        elif history.added and target.is_active:
            action = "RESTAURAR"
            details = f"Registro reactivado en {table}"

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