from datetime import date, datetime

from app import app
from models.db import db
from models.user import User
from models.nurse import Nurse
from models.news_and_prevention import NewsAndPrevention
from models.guard_pass import GuardPass               # <- Importamos tu nueva entidad
from models.signs_and_symptoms import SignsAndSymptoms # <- Importamos tu nueva entidad
from enums import RoleEnum

def seed():
    with app.app_context():

        # 1. Borramos en orden inverso a las dependencias (para evitar errores de Foreign Keys)
        SignsAndSymptoms.query.delete()
        GuardPass.query.delete()
        NewsAndPrevention.query.delete()
        Nurse.query.delete()
        # Nota: Si tu compañero ya armó Patient, deberías agregar Patient.query.delete() acá
        User.query.delete()
        db.session.commit()

        # ==========================================
        # 2. CREACIÓN DE USUARIOS BASE
        # ==========================================
        paciente_user = User(
            first_name="Marta", last_name="Gómez", username="mgomez",
            dni="28456112", email="marta.gomez@mail.com",
            date_of_birth=date(1962, 4, 12),
            address="San Martín 452, Maipú",
            emergency_contact="Luis Gómez - 2614551199",
            gender="Femenino",
            rol=RoleEnum.PATIENT,
        )
        paciente_user.set_password("paciente123")

        medico_user = User(
            first_name="Javier", last_name="Ríos", username="jrios",
            dni="30112233", email="javier.rios@paciente360.com",
            date_of_birth=date(1980, 6, 3),
            gender="Masculino",
            rol=RoleEnum.DOCTOR,
        )
        medico_user.set_password("medico123")

        admin_user = User(
            first_name="Lucía", last_name="Paredes", username="lparedes",
            dni="33221144", email="lucia.paredes@paciente360.com",
            date_of_birth=date(1990, 9, 21),
            gender="Femenino",
            rol=RoleEnum.ADMINISTRATIVE,
        )
        admin_user.set_password("admin123")

        # Usuarios para los enfermeros
        user_enf1 = User(
            first_name="Rubén", last_name="Ledesma", username="rledesma",
            dni="35112244", email="ruben.ledesma@paciente360.com",
            date_of_birth=date(1999, 2, 15), gender="Masculino", rol=RoleEnum.NURSE
        )
        user_enf1.set_password("enfermero123")

        user_enf2 = User(
            first_name="Sofía", last_name="Molina", username="smolina",
            dni="36223355", email="sofia.molina@paciente360.com",
            date_of_birth=date(1995, 11, 30), gender="Femenino", rol=RoleEnum.NURSE
        )
        user_enf2.set_password("enfermero123")

        db.session.add_all([paciente_user, medico_user, admin_user, user_enf1, user_enf2])
        db.session.commit()  

        # ==========================================
        # 3. CREACIÓN DE ENFERMEROS (Relación 1 a 1)
        # ==========================================
        # Fijate cómo le pasamos el objeto 'user' que creamos arriba gracias al back_populates
        enfermero1 = Nurse(user=user_enf1, license_number="ENF-3321", is_reference=True)
        enfermero2 = Nurse(user=user_enf2, license_number="ENF-4410", is_reference=False)

        db.session.add_all([enfermero1, enfermero2])
        db.session.commit()

        # ==========================================
        # 4. NOTICIAS Y PREVENCIÓN
        # ==========================================
        noticia1 = NewsAndPrevention(
            id_user=admin_user.id_user,
            title="Campaña de vacunación antigripal 2026",
            content="La vacuna antigripal está disponible para mayores de 65 años...",
            category="Prevención",
        )
        db.session.add(noticia1)
        db.session.commit()

        # ==========================================
        # 5. PASE DE GUARDIA (GuardPass)
        # ==========================================
        pase1 = GuardPass(
            id_nurse=enfermero1.id_user, 
            rotation=datetime(2026, 7, 9, 8, 0, 0), 
            notes="Guardia matutina tranquila. Sin novedades."
        )
        pase2 = GuardPass(
            id_nurse=enfermero2.id_user, 
            rotation=datetime(2026, 7, 9, 16, 0, 0), 
            notes="Guardia vespertina. Ingreso de insumos médicos."
        )
        db.session.add_all([pase1, pase2])
        db.session.commit()

        # ==========================================
        # 6. SIGNOS Y SÍNTOMAS (SignsAndSymptoms)
        # ==========================================
        # IMPORTANTE: Esto asume que el ID del paciente_user es el mismo en la tabla Patient.
        # Si tu compañero ya hizo el modelo Patient, tendrías que instanciar el Patient arriba igual que el Nurse.
        signos1 = SignsAndSymptoms(
            id_patient=paciente_user.id_user,
            id_nurse=enfermero1.id_user,
            temperature=36.5,
            pressure="120/80",
            observations="Paciente en buen estado general. Descansando.",
            date_and_time=datetime.now(),
            symptoms="Ninguno reportado",
            type="Control de rutina"
        )
        
        signos2 = SignsAndSymptoms(
            id_patient=paciente_user.id_user,
            id_nurse=enfermero2.id_user,
            temperature=38.2,
            pressure="110/70",
            observations="Paciente refiere dolor de cabeza y escalofríos.",
            date_and_time=datetime.now(),
            symptoms="Fiebre, Cefalea",
            type="Ingreso por guardia"
        )
        db.session.add_all([signos1, signos2])
        db.session.commit()

        print("===================================")
        print("✅ Seed completado con éxito:")
        print(f"  - Paciente: {paciente_user.username}")
        print(f"  - Enfermeros: {user_enf1.username}, {user_enf2.username}")
        print(f"  - Pases de Guardia generados: 2")
        print(f"  - Registros de Signos y Síntomas: 2")
        print("===================================")

if __name__ == "__main__":
    seed()