from datetime import date, timedelta, datetime

from app import app
from models.db import db
from models.user import User
from models.nurse import Nurse
from models.patient import Patient
from models.doctor import Doctor
from models.specialty import Specialty
from models.health_plan import HealthPlan, doctor_health_plan
from models.news_and_prevention import NewsAndPrevention
from models.guard_pass import GuardPass
from models.signs_and_symptoms import SignsAndSymptoms
from models.patient_follow_up import PatientFollowUp
from models.medical_appointment import MedicalAppointment
from models.traceability import Traceability
from models.medical_product import MedicalProduct
from models.stock_movement import StockMovement
from models.medical_indication import MedicalIndication
# IMPORTACIÓN ACTUALIZADA: Se agregó DiseaseTypeEnum
from enums import RoleEnum, AppointmentStatusEnum, DiseaseTypeEnum 


# Listado completo de especialidades medicas que ofrece la clinica.
SPECIALTY_NAMES = [
    "alergología - alergia", "anestesiología", "armonización facial", "bioquímica",
    "cardiología", "cardiología infantil", "cirugía", "cirugía bariátrica",
    "cirugía cabeza y cuello", "cirugía cardiovascular", "cirugía de columna",
    "cirugía de tórax", "cirugía digestiva", "cirugía estética", "cirugía infantil",
    "cirugía maxilofacial", "cirugía plástica", "clínica médica", "coloproctología",
    "cosmetología y cosmeatría", "deportología", "dermatología", "diabetología",
    "diagnóstico por imágenes", "ecografía", "ecografía vascular", "endocrinología",
    "endocrinología infantil", "enfermería", "fertilidad", "fisiatría", "flebología",
    "fonoaudiología", "gastroenterología", "gastroenterología infantil", "genética",
    "geriatría", "ginecología", "ginecología infanto juvenil", "ginecología y obstetricia",
    "hematología clínica", "hematología pediátrica", "hepatología", "infectología",
    "inmunología", "inmunología infantil", "kinesiología", "kinesiologia respiratoria",
    "laboratorio", "mamografía", "manicuría - cuidado personal",
    "masajista - medicina complementaria", "mastología", "medicina de familia",
    "medicina del dolor", "medicina del sueño", "medicina estética", "medicina fetal",
    "medicina funcional", "medicina general", "medicina laboral", "nefrología",
    "nefrología pediátrica", "neumonología", "neumonología infantil", "neuro-audiología",
    "neurocirugía", "neurocirugía infantil", "neurofisiología", "neurología",
    "neurología infantil", "nutrición", "nutrición infantil", "obstetricia",
    "odontología", "odontología infantil", "oftalmología", "oftalmología infantil",
    "oncología", "ortodoncia", "ortodoncia adolescente", "ortodoncia infantil",
    "ortopedia", "osteopatía", "otoneurología", "otorrinolaringología", "pediatría",
    "pedicuría - cuidado personal", "podología", "proctología", "proctología infantil",
    "psicología", "psicología infantil", "psicopedagogía", "psiquiatría",
    "puericultura", "quiropraxia", "radiología", "radiología odontológica",
    "reiki - medicina complementaria", "resonancia", "reumatología",
    "rpg rehabilitación postural global", "terapia ocupacional", "traumatología",
    "traumatología infantil", "uroginecología", "urología", "urologia pediátrica",
]


# Medicos de prueba: (nombre, apellido, usuario, dni, matricula, fecha nac, genero, especialidad)
DOCTORS_SEED = [
    ("Javier", "Ríos", "jrios", "30112233", "MP-12456", date(1980, 6, 3), "Masculino", "clínica médica"),
    ("Carolina", "Vega", "cvega", "31445566", "MP-13890", date(1983, 2, 17), "Femenino", "pediatría"),
    ("Emilia", "Castro", "ecastro", "32556677", "MP-14275", date(1987, 10, 4), "Femenino", "pediatría"),
    ("Martín", "Aguirre", "maguirre", "29334455", "MP-11902", date(1977, 5, 22), "Masculino", "cardiología"),
    ("Lucía", "Benítez", "lbenitez", "33667788", "MP-15340", date(1990, 8, 9), "Femenino", "dermatología"),
    ("Federico", "Sosa", "fsosa", "30998877", "MP-12781", date(1982, 12, 1), "Masculino", "traumatología"),
    ("Valeria", "Ponce", "vponce", "32112299", "MP-14018", date(1985, 3, 28), "Femenino", "ginecología"),
    ("Nicolás", "Herrera", "nherrera", "31778899", "MP-13566", date(1984, 7, 14), "Masculino", "oftalmología"),
    ("Camila", "Duarte", "cduarte", "34221100", "MP-16112", date(1992, 1, 19), "Femenino", "nutrición"),
    ("Gonzalo", "Ferrer", "gferrer", "28776655", "MP-11455", date(1975, 9, 6), "Masculino", "neurología"),
    ("Julieta", "Ramos", "jramos", "33445599", "MP-15703", date(1989, 4, 25), "Femenino", "otorrinolaringología"),
]


HEALTH_PLAN_NAMES = [
    "OSEP", "OSDE", "Swiss Medical", "Galeno", "Medife", "Sancor Salud", "PAMI",
    "Jerarquicos Salud", "Prevencion Salud", "Andes Salud", "Boreal", "DAMSU",
    "Hospital Espanol de Mendoza", "OSPE", "OSECAC", "OSPRERA", "Omint", "Avalian",
    "Federada Salud", "Accord Salud", "ACA Salud", "Nobis Medical", "Staff Medico",
    "Premedic", "OSMATA", "OSPACP", "Union Personal", "IOSFA", "Poder Judicial", "Particular",
]


DOCTOR_HEALTH_PLANS = {
    "jrios": ["OSEP", "OSDE", "PAMI", "Swiss Medical", "Particular"],
    "cvega": ["OSEP", "OSDE", "Medife", "Sancor Salud", "Particular"],
    "ecastro": ["OSEP", "PAMI", "Galeno", "Particular"],
    "maguirre": ["OSDE", "Swiss Medical", "Galeno", "PAMI", "Particular"],
    "lbenitez": ["OSEP", "Medife", "Omint", "Particular"],
    "fsosa": ["OSEP", "OSDE", "Sancor Salud", "Jerarquicos Salud", "Particular"],
    "vponce": ["OSEP", "Swiss Medical", "Avalian", "Particular"],
    "nherrera": ["OSDE", "Medife", "Prevencion Salud", "Particular"],
    "cduarte": ["OSEP", "Sancor Salud", "Boreal", "Particular"],
    "gferrer": ["OSDE", "Swiss Medical", "PAMI", "Andes Salud", "Particular"],
    "jramos": ["OSEP", "Galeno", "DAMSU", "Particular"],
}


def seed():
    with app.app_context():
        Traceability.query.delete()
        StockMovement.query.delete()
        MedicalProduct.query.delete()
        MedicalIndication.query.delete()
        MedicalAppointment.query.delete()
        PatientFollowUp.query.delete()
        SignsAndSymptoms.query.delete()
        GuardPass.query.delete()
        NewsAndPrevention.query.delete()
        db.session.execute(doctor_health_plan.delete())
        Doctor.query.delete()
        Nurse.query.delete()
        Patient.query.delete()
        User.query.delete()
        Specialty.query.delete()
        HealthPlan.query.delete()
        db.session.commit()

        # ---------- Especialidades ----------
        specialties = {}
        for name in SPECIALTY_NAMES:
            especialidad = Specialty(name=name)
            db.session.add(especialidad)
            specialties[name] = especialidad
        db.session.commit()

        # ---------- Obras sociales ----------
        health_plans = {}
        for name in HEALTH_PLAN_NAMES:
            plan = HealthPlan(name=name)
            db.session.add(plan)
            health_plans[name] = plan
        db.session.commit()

        # ---------- Medicos ----------
        doctors = {}
        for first, last, username, dni, license_number, birth, gender, specialty_name in DOCTORS_SEED:
            especialidad = specialties.get(specialty_name)
            doctor = Doctor(
                first_name=first, last_name=last, username=username,
                dni=dni, email=f"{username}@paciente360.com",
                date_of_birth=birth,
                gender=gender,
                rol=RoleEnum.DOCTOR,
                medical_license=license_number,
                id_especialidad=especialidad.id_speciality if especialidad else None,
            )
            doctor.set_password("medico123")
            doctor.health_plans = [
                health_plans[p]
                for p in DOCTOR_HEALTH_PLANS.get(username, [])
                if p in health_plans
            ]
            db.session.add(doctor)
            doctors[username] = doctor
        db.session.commit()

        medico = doctors["jrios"]

        # ---------- Administrativo ----------
        administrativo = User(
            first_name="Lucía", last_name="Paredes", username="lparedes",
            dni="33221144", email="lucia.paredes@paciente360.com",
            date_of_birth=date(1990, 9, 21),
            gender="Femenino",
            rol=RoleEnum.ADMINISTRATIVE,
        )
        administrativo.set_password("admin123")
        db.session.add(administrativo)
        db.session.commit()

        # ---------- Pacientes ----------
        paciente1 = Patient(
            first_name="Marta", last_name="Gómez", username="28456112",
            dni="28456112", email="marta.gomez@mail.com",
            date_of_birth=date(1962, 4, 12), address="San Martín 452, Maipú",
            emergency_contact="Luis Gómez - 2614551199", gender="Femenino",
            rol=RoleEnum.PATIENT, health_plan_status=True,
            health_plan_name="PAMI", member_number="PAMI-88213",
        )
        paciente1.set_password(paciente1.dni)

        paciente2 = Patient(
            first_name="Luis", last_name="Fernández", username="35221987",
            dni="35221987", email="luis.fernandez@mail.com",
            date_of_birth=date(1984, 8, 20), address="Belgrano 118, Maipú",
            emergency_contact="Ana Fernández - 2615552233", gender="Masculino",
            rol=RoleEnum.PATIENT, health_plan_status=True,
            health_plan_name="OSDE", member_number="OSDE-44120",
        )
        paciente2.set_password(paciente2.dni)

        paciente3 = Patient(
            first_name="Ana", last_name="Torres", username="19887334",
            dni="19887334", email="ana.torres@mail.com",
            date_of_birth=date(1953, 1, 30), address="Rivadavia 890, Maipú",
            emergency_contact="Carlos Torres - 2616663344", gender="Femenino",
            rol=RoleEnum.PATIENT, health_plan_status=True,
            health_plan_name="PAMI", member_number="PAMI-91045",
        )
        paciente3.set_password(paciente3.dni)

        db.session.add_all([paciente1, paciente2, paciente3])
        db.session.commit()

        # ---------- Enfermeros ----------
        enfermero1 = Nurse(
            first_name="Rubén", last_name="Ledesma", username="rledesma",
            dni="35112244", email="ruben.ledesma@paciente360.com",
            date_of_birth=date(1999, 2, 15), gender="Masculino",
            rol=RoleEnum.NURSE, license_number="ENF-3321", is_reference=True,
        )
        enfermero1.set_password("enfermero123")

        enfermero2 = Nurse(
            first_name="Sofía", last_name="Molina", username="smolina",
            dni="36223355", email="sofia.molina@paciente360.com",
            date_of_birth=date(1995, 11, 30), gender="Femenino",
            rol=RoleEnum.NURSE, license_number="ENF-4410", is_reference=False,
        )
        enfermero2.set_password("enfermero123")

        enfermero3 = Nurse(
            first_name="Diego", last_name="Suárez", username="dsuarez",
            dni="37334466", email="diego.suarez@paciente360.com",
            date_of_birth=date(1988, 7, 8), gender="Masculino",
            rol=RoleEnum.NURSE, license_number="ENF-5502", is_reference=False,
        )
        enfermero3.set_password("enfermero123")

        db.session.add_all([enfermero1, enfermero2, enfermero3])
        db.session.commit()

        # ---------- Registros de enfermería ----------
        signo1 = SignsAndSymptoms(
            id_patient=paciente1.id_user, id_nurse=enfermero1.id_user,
            temperature=37.2, blood_pressure="120/80", observations="Refiere mejoría tras analgésico",
            signs="Taquicardia leve", symptoms="Dolor de cabeza", record_type="Rutina",
        )
        signo2 = SignsAndSymptoms(
            id_patient=paciente2.id_user, id_nurse=enfermero2.id_user,
            temperature=38.6, blood_pressure="130/85", observations="Se administra antitérmico, queda en observación",
            signs="Fiebre", symptoms="Malestar general, escalofríos", record_type="Urgencia",
        )

        seguimiento_programado = PatientFollowUp(
            id_patient=paciente3.id_user, id_nurse=enfermero1.id_user,
            observations="Buena evolución post control de presión", next_check_up=date.today() + timedelta(days=10), finish=False,
        )
        seguimiento_activo = PatientFollowUp(
            id_patient=paciente1.id_user, id_nurse=enfermero2.id_user,
            observations="Requiere control de glucemia urgente", next_check_up=date.today(), finish=False,
        )
        seguimiento_vencido = PatientFollowUp(
            id_patient=paciente2.id_user, id_nurse=enfermero1.id_user,
            observations="Paciente no se presentó al control en sala", next_check_up=date.today() - timedelta(days=1), finish=False,
        )
        seguimiento_finalizado = PatientFollowUp(
            id_patient=paciente1.id_user, id_nurse=enfermero3.id_user,
            observations="Tratamiento completado con éxito. Alta de control.", next_check_up=date.today() - timedelta(days=7), finish=True,
        )

        pase1 = GuardPass(id_nurse=enfermero1.id_user, notes="Paciente de sala 2 con control de glucemia pendiente para la mañana.")

        db.session.add_all([signo1, signo2, seguimiento_programado, seguimiento_activo, seguimiento_vencido, seguimiento_finalizado, pase1])
        db.session.commit()

        # ---------- Turnos ----------
        turno1 = MedicalAppointment(
            id_patient=paciente1.id_user, id_doctor=medico.id_user,
            date=date.today() + timedelta(days=5), hour="10:30",
            status=AppointmentStatusEnum.RESERVADO, reason="Control de presión",
        )
        turno2 = MedicalAppointment(
            id_patient=paciente2.id_user, id_doctor=medico.id_user,
            date=date.today(), hour="09:00",
            status=AppointmentStatusEnum.EN_ESPERA, reason="Fiebre y malestar general",
        )
        
        # ACTULIZADO: Turno atendido con diagnóstico y enfermedad seteada
        turno3 = MedicalAppointment(
            id_patient=paciente3.id_user, id_doctor=medico.id_user,
            date=date.today(), hour="08:30",
            status=AppointmentStatusEnum.ATENDIDO, reason="Control de rutina",
            disease_type=DiseaseTypeEnum.CARDIOVASCULAR,
            diagnosis="Paciente estable, presión bajo control.",
            disease_details="Hipertensión tratada, mantener medicación actual."
        )

        turno_por_confirmar = MedicalAppointment(
            id_patient=paciente1.id_user, id_doctor=medico.id_user,
            date=date.today() + timedelta(days=2), hour="11:00",
            status=AppointmentStatusEnum.RESERVADO, reason="Control cardiológico", confirmed=False,
        )
        turno_confirmado = MedicalAppointment(
            id_patient=paciente1.id_user, id_doctor=medico.id_user,
            date=date.today() + timedelta(days=1), hour="15:00",
            status=AppointmentStatusEnum.RESERVADO, reason="Análisis de rutina", confirmed=True,
        )
        turno_limite = MedicalAppointment(
            id_patient=paciente2.id_user, id_doctor=medico.id_user,
            date=date.today() + timedelta(days=3), hour="16:30",
            status=AppointmentStatusEnum.RESERVADO, reason="Consulta dermatológica", confirmed=False,
        )

        db.session.add_all([turno1, turno2, turno3, turno_por_confirmar, turno_confirmado, turno_limite])
        db.session.commit()

        # ---------- Indicaciones médicas ----------
        indicacion1 = MedicalIndication(
            id_patient=paciente1.id_user, id_doctor=medico.id_user,
            indication="Reposo relativo por 48hs", treatment="Ibuprofeno 400mg cada 8hs",
        )
        indicacion2 = MedicalIndication(
            id_patient=paciente2.id_user, id_doctor=medico.id_user,
            indication="Control de temperatura cada 4hs", treatment="Paracetamol 500mg si fiebre mayor a 38°",
        )
        indicacion3 = MedicalIndication(
            id_patient=paciente3.id_user, id_doctor=medico.id_user,
            indication="Dieta hiposódica", treatment="Enalapril 10mg cada 24hs",
            created_at=datetime.utcnow() - timedelta(minutes=10),
        )

        db.session.add_all([indicacion1, indicacion2, indicacion3])
        db.session.commit()

        # ---------- Productos médicos ----------
        producto1 = MedicalProduct(
            name_product="Ibuprofeno 400mg", expiration_date=date(2027, 3, 1),
            batch_number="LOTE-2201", current_stock=150, minimum_stock_level=30, type_product="Medicamento",
        )
        producto2 = MedicalProduct(
            name_product="Jeringa descartable 5ml", expiration_date=date(2028, 6, 15),
            batch_number="LOTE-5502", current_stock=500, minimum_stock_level=100, type_product="Insumo descartable",
        )
        producto3 = MedicalProduct(
            name_product="Vacuna antigripal", expiration_date=date(2026, 12, 1),
            batch_number="LOTE-9081", current_stock=80, minimum_stock_level=20, type_product="Vacuna",
        )
        db.session.add_all([producto1, producto2, producto3])
        db.session.commit()

        # ---------- Movimientos de stock y Trazabilidad ----------
        movimiento_entrada1 = StockMovement(id_product=producto1.id_product, id_nurse=enfermero1.id_user, type_movement="Entrada", quantity=170, date_time=datetime.utcnow() - timedelta(days=10))
        movimiento_entrada2 = StockMovement(id_product=producto2.id_product, id_nurse=enfermero2.id_user, type_movement="Entrada", quantity=500, date_time=datetime.utcnow() - timedelta(days=15))
        movimiento_entrada3 = StockMovement(id_product=producto3.id_product, id_nurse=enfermero3.id_user, type_movement="Entrada", quantity=80, date_time=datetime.utcnow() - timedelta(days=20))
        db.session.add_all([movimiento_entrada1, movimiento_entrada2, movimiento_entrada3])
        db.session.commit()

        movimiento_salida = StockMovement(id_product=producto1.id_product, id_nurse=enfermero1.id_user, type_movement="Salida", quantity=20, date_time=datetime.utcnow() - timedelta(days=2))
        db.session.add(movimiento_salida)
        db.session.commit()

        trazabilidad1 = Traceability(id_patient=paciente1.id_user, id_product=producto1.id_product, id_nurse=enfermero1.id_user, quantity=20, id_stock_movement=movimiento_salida.id_stock_movement, date_of_use=datetime.utcnow() - timedelta(days=2))
        db.session.add(trazabilidad1)
        db.session.commit()

        # ---------- Noticias ----------
        noticia1 = NewsAndPrevention(id_user=administrativo.id_user, title="Campaña de vacunación antigripal 2026", content="La vacuna antigripal está disponible para mayores de 65 años y grupos de riesgo. Acercate a tu salita sin turno previo.", category="Prevención")
        noticia2 = NewsAndPrevention(id_user=administrativo.id_user, title="Recomendaciones para la ola de calor", content="Mantenerse hidratado, evitar la exposición solar entre las 12 y las 17hs, y prestar especial atención a niños y adultos mayores.", category="Salud estacional")
        noticia3 = NewsAndPrevention(id_user=administrativo.id_user, title="Control de niño sano: la importancia de no faltar", content="Los controles periódicos permiten detectar a tiempo problemas de crecimiento y desarrollo. Consultá los turnos disponibles en pediatría.", category="Enfermedades")
        db.session.add_all([noticia1, noticia2, noticia3])
        db.session.commit()

        print("==================================================")
        print("✅ Seed completado exitosamente:")
        print("==================================================")

if __name__ == "__main__":
    seed()