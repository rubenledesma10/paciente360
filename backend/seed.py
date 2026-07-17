
from datetime import date, datetime, timedelta

from app import app
from models.db import db
from models.user import User
from models.nurse import Nurse
from models.patient import Patient
from models.doctor import Doctor
from models.specialty import Specialty
from models.news_and_prevention import NewsAndPrevention
from models.guard_pass import GuardPass
from models.signs_and_symptoms import SignsAndSymptoms
from models.patient_follow_up import PatientFollowUp
from models.medical_appointment import MedicalAppointment
from models.medical_indication import MedicalIndication
from enums import AppointmentStatusEnum
from models.traceability import Traceability
from models.medical_product import MedicalProduct
from models.stock_movement import StockMovement
from enums import RoleEnum


def seed():
    with app.app_context():
        # Orden de borrado: primero lo que depende de nurses/patients/users,
        # despues las subclases (Nurse, Patient), al final la tabla base (User).
        Traceability.query.delete()
        StockMovement.query.delete()
        MedicalProduct.query.delete()
        MedicalIndication.query.delete()
        MedicalAppointment.query.delete()
        PatientFollowUp.query.delete()
        SignsAndSymptoms.query.delete()
        GuardPass.query.delete()
        NewsAndPrevention.query.delete()
        Doctor.query.delete()
        Specialty.query.delete()
        Nurse.query.delete()
        Patient.query.delete()
        User.query.delete()
        db.session.commit()

        # ---------- Especialidades ----------
        especialidad1 = Specialty(name="Clínica Médica")
        especialidad2 = Specialty(name="Cardiología")
        especialidad3 = Specialty(name="Pediatría")

        db.session.add_all([especialidad1, especialidad2, especialidad3])
        db.session.commit()

        # ---------- Médico ----------
        medico = Doctor(
            first_name="Javier", last_name="Ríos", username="jrios",
            dni="30112233", email="javier.rios@paciente360.com",
            date_of_birth=date(1980, 6, 3),
            gender="Masculino",
            rol=RoleEnum.DOCTOR,
            medical_license=45231,
            id_especialidad=especialidad1.id_speciality,
        )
        medico.set_password("medico123")

        # ---------- Administrativo (publica las noticias) ----------
        administrativo = User(
            first_name="Lucía", last_name="Paredes", username="lparedes",
            dni="33221144", email="lucia.paredes@paciente360.com",
            date_of_birth=date(1990, 9, 21),
            gender="Femenino",
            rol=RoleEnum.ADMINISTRATIVE,
        )
        administrativo.set_password("admin123")

        db.session.add_all([medico, administrativo])
        db.session.commit()

        # ---------- 3 pacientes ----------
        paciente1 = Patient(
            first_name="Marta", last_name="Gómez", username="mgomez",
            dni="28456112", email="marta.gomez@mail.com",
            date_of_birth=date(1962, 4, 12),
            address="San Martín 452, Maipú",
            emergency_contact="Luis Gómez - 2614551199",
            gender="Femenino",
            rol=RoleEnum.PATIENT,
            health_plan_status=True,
            health_plan_name="PAMI",
            member_number="PAMI-88213",
        )
        paciente1.set_password("paciente123")

        paciente2 = Patient(
            first_name="Luis", last_name="Fernández", username="lfernandez",
            dni="35221987", email="luis.fernandez@mail.com",
            date_of_birth=date(1984, 8, 20),
            address="Belgrano 118, Maipú",
            emergency_contact="Ana Fernández - 2615552233",
            gender="Masculino",
            rol=RoleEnum.PATIENT,
            health_plan_status=True,
            health_plan_name="OSDE",
            member_number="OSDE-44120",
        )
        paciente2.set_password("paciente123")

        paciente3 = Patient(
            first_name="Ana", last_name="Torres", username="atorres",
            dni="19887334", email="ana.torres@mail.com",
            date_of_birth=date(1953, 1, 30),
            address="Rivadavia 890, Maipú",
            emergency_contact="Carlos Torres - 2616663344",
            gender="Femenino",
            rol=RoleEnum.PATIENT,
            health_plan_status=True,
            health_plan_name="PAMI",
            member_number="PAMI-91045",
        )
        paciente3.set_password("paciente123")

        db.session.add_all([paciente1, paciente2, paciente3])
        db.session.commit()

        # ---------- 3 enfermeros ----------
        enfermero1 = Nurse(
            first_name="Rubén", last_name="Ledesma", username="rledesma",
            dni="35112244", email="ruben.ledesma@paciente360.com",
            date_of_birth=date(1999, 2, 15),
            gender="Masculino",
            rol=RoleEnum.NURSE,
            license_number="ENF-3321",
            is_reference=True,
        )
        enfermero1.set_password("enfermero123")

        enfermero2 = Nurse(
            first_name="Sofía", last_name="Molina", username="smolina",
            dni="36223355", email="sofia.molina@paciente360.com",
            date_of_birth=date(1995, 11, 30),
            gender="Femenino",
            rol=RoleEnum.NURSE,
            license_number="ENF-4410",
            is_reference=False,
        )
        enfermero2.set_password("enfermero123")

        enfermero3 = Nurse(
            first_name="Diego", last_name="Suárez", username="dsuarez",
            dni="37334466", email="diego.suarez@paciente360.com",
            date_of_birth=date(1988, 7, 8),
            gender="Masculino",
            rol=RoleEnum.NURSE,
            license_number="ENF-5502",
            is_reference=False,
        )
        enfermero3.set_password("enfermero123")

        db.session.add_all([enfermero1, enfermero2, enfermero3])
        db.session.commit()

        # ---------- Registros de enfermería, ligados a pacientes reales ----------
        signo1 = SignsAndSymptoms(
            id_patient=paciente1.id_user, id_nurse=enfermero1.id_user,
            temperature=37.2, blood_pressure="120/80",
            observations="Refiere mejoría tras analgésico",
            signs="Taquicardia leve",
            symptoms="Dolor de cabeza",
            record_type="Rutina",
        )
        signo2 = SignsAndSymptoms(
            id_patient=paciente2.id_user, id_nurse=enfermero2.id_user,
            temperature=38.6, blood_pressure="130/85",
            observations="Se administra antitérmico, queda en observación",
            signs="Fiebre",
            symptoms="Malestar general, escalofríos",
            record_type="Urgencia",
        )

        seguimiento1 = PatientFollowUp(
            id_patient=paciente3.id_user, id_nurse=enfermero1.id_user,
            observations="Buena evolución post control de presión",
            next_check_up=date.today() + timedelta(days=10),
            finish=False,
        )

        pase1 = GuardPass(
            id_nurse=enfermero1.id_user,
            notes="Paciente de sala 2 con control de glucemia pendiente para la mañana.",
        )

        db.session.add_all([signo1, signo2, seguimiento1, pase1])
        db.session.commit()

        # ---------- Turnos (MedicalAppointment) ----------
        turno1 = MedicalAppointment(
            id_patient=paciente1.id_user,
            id_doctor=medico.id_user,
            date=date.today() + timedelta(days=5),
            hour="10:30",
            status=AppointmentStatusEnum.RESERVADO,
            reason="Control de presión",
        )
        turno2 = MedicalAppointment(
            id_patient=paciente2.id_user,
            id_doctor=medico.id_user,
            date=date.today(),
            hour="09:00",
            status=AppointmentStatusEnum.EN_ESPERA,
            reason="Fiebre y malestar general",
        )
        turno3 = MedicalAppointment(
            id_patient=paciente3.id_user,
            id_doctor=medico.id_user,
            date=date.today(),
            hour="08:30",
            status=AppointmentStatusEnum.ATENDIDO,
            reason="Control de rutina",
        )

        db.session.add_all([turno1, turno2, turno3])
        db.session.commit()

        # ---------- Indicaciones médicas (MedicalIndication) ----------
        indicacion1 = MedicalIndication(
            id_patient=paciente1.id_user,
            id_doctor=medico.id_user,
            indication="Reposo relativo por 48hs",
            treatment="Ibuprofeno 400mg cada 8hs",
        )
        indicacion2 = MedicalIndication(
            id_patient=paciente2.id_user,
            id_doctor=medico.id_user,
            indication="Control de temperatura cada 4hs",
            treatment="Paracetamol 500mg si fiebre mayor a 38°",
        )
        indicacion3 = MedicalIndication(
            id_patient=paciente3.id_user,
            id_doctor=medico.id_user,
            indication="Dieta hiposódica",
            treatment="Enalapril 10mg cada 24hs",
        )

        db.session.add_all([indicacion1, indicacion2, indicacion3])
        db.session.commit()

        # ---------- Productos médicos (MedicalProduct) ----------
        producto1 = MedicalProduct(
            name_product="Ibuprofeno 400mg",
            expiration_date=date(2027, 3, 1),
            batch_number="LOTE-2201",
            current_stock=150,
            minimum_stock_level=30,
            type_product="Medicamento",
        )
        producto2 = MedicalProduct(
            name_product="Jeringa descartable 5ml",
            expiration_date=date(2028, 6, 15),
            batch_number="LOTE-5502",
            current_stock=500,
            minimum_stock_level=100,
            type_product="Insumo descartable",
        )
        producto3 = MedicalProduct(
            name_product="Vacuna antigripal",
            expiration_date=date(2026, 12, 1),
            batch_number="LOTE-9081",
            current_stock=80,
            minimum_stock_level=20,
            type_product="Vacuna",
        )

        db.session.add_all([producto1, producto2, producto3])
        db.session.commit()

        # ---------- Movimientos de stock (StockMovement) ----------
        movimiento1 = StockMovement(
            id_product=producto1.id_product,
            type_movement="Entrada",
            quantity=150,
            date_time=datetime.utcnow() - timedelta(days=10),
        )
        movimiento2 = StockMovement(
            id_product=producto1.id_product,
            type_movement="Salida",
            quantity=20,
            date_time=datetime.utcnow() - timedelta(days=2),
        )
        movimiento3 = StockMovement(
            id_product=producto2.id_product,
            type_movement="Entrada",
            quantity=500,
            date_time=datetime.utcnow() - timedelta(days=15),
        )

        db.session.add_all([movimiento1, movimiento2, movimiento3])
        db.session.commit()

        # ---------- Trazabilidad ----------
        trazabilidad1 = Traceability(
            id_patient=paciente1.id_user,
            id_product=producto1.id_product,
        )
        db.session.add(trazabilidad1)
        db.session.commit()

        # ---------- 3 noticias, publicadas por el administrativo ----------
        noticia1 = NewsAndPrevention(
            id_user=administrativo.id_user,
            title="Campaña de vacunación antigripal 2026",
            content="La vacuna antigripal está disponible para mayores de 65 años y grupos de riesgo. Acercate a tu salita sin turno previo.",
            category="Prevención",
        )
        noticia2 = NewsAndPrevention(
            id_user=administrativo.id_user,
            title="Recomendaciones para la ola de calor",
            content="Mantenerse hidratado, evitar la exposición solar entre las 12 y las 17hs, y prestar especial atención a niños y adultos mayores.",
            category="Salud estacional",
        )
        noticia3 = NewsAndPrevention(
            id_user=administrativo.id_user,
            title="Control de niño sano: la importancia de no faltar",
            content="Los controles periódicos permiten detectar a tiempo problemas de crecimiento y desarrollo. Consultá los turnos disponibles en pediatría.",
            category="Enfermedades",
        )

        db.session.add_all([noticia1, noticia2, noticia3])
        db.session.commit()

        print("Seed completado:")
        print(f"  - Especialidades: {especialidad1.name}, {especialidad2.name}, {especialidad3.name}")
        print(f"  - Médico: {medico.username} ({especialidad1.name})")
        print(f"  - Administrativo: {administrativo.username}")
        print(f"  - Pacientes: {paciente1.username}, {paciente2.username}, {paciente3.username}")
        print(f"  - Enfermeros: {enfermero1.username}, {enfermero2.username}, {enfermero3.username}")
        print(f"  - Signos y síntomas: 2 registros")
        print(f"  - Seguimiento: 1 registro")
        print(f"  - Pase de guardia: 1 registro")
        print(f"  - Turnos: 3 (uno por cada estado: reservado, en espera, atendido)")
        print(f"  - Indicaciones médicas: 3 registros")
        print(f"  - Productos médicos: 3 registros")
        print(f"  - Movimientos de stock: 3 registros")
        print(f"  - Trazabilidad: 1 registro (ligado a {producto1.name_product})")
        print(f"  - Noticias: {noticia1.title} | {noticia2.title} | {noticia3.title}")


if __name__ == "__main__":
    seed()