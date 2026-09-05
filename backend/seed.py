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

        # ---------- Administrativo, Administrador y Superadministrador ----------
        administrativo = User(
            first_name="Lucía", last_name="Paredes", username="lparedes",
            dni="33221144", email="lucia.paredes@paciente360.com",
            date_of_birth=date(1990, 9, 21),
            gender="Femenino",
            rol=RoleEnum.ADMINISTRATIVE,
        )
        administrativo.set_password("admin123")

        administrador = User(
            first_name="Carlos", last_name="García", username="cgarcia",
            dni="22334455", email="carlos.garcia@paciente360.com",
            date_of_birth=date(1980, 5, 10),
            gender="Masculino",
            rol=RoleEnum.ADMINISTRATOR,
        )
        administrador.set_password("admin123")

        superadmin = User(
            first_name="Admin", last_name="Supremo", username="superadmin",
            dni="11223344", email="superadmin@paciente360.com",
            date_of_birth=date(1975, 1, 1),
            gender="Masculino",
            rol=RoleEnum.SUPERADMINISTRADOR,
        )
        superadmin.set_password("superadmin123")

        db.session.add_all([administrativo, administrador, superadmin])
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

        paciente4 = Patient(
            first_name="Roberto", last_name="Díaz", username="27114488",
            dni="27114488", email="roberto.diaz@mail.com",
            date_of_birth=date(1975, 6, 3), address="Sarmiento 340, Maipú",
            emergency_contact="Marisa Díaz - 2617778899", gender="Masculino",
            rol=RoleEnum.PATIENT, health_plan_status=True,
            health_plan_name="OSDE", member_number="OSDE-55210",
        )
        paciente4.set_password(paciente4.dni)

        paciente5 = Patient(
            first_name="Elena", last_name="Vargas", username="41556677",
            dni="41556677", email="elena.vargas@mail.com",
            date_of_birth=date(1998, 11, 22), address="Chile 210, Maipú",
            emergency_contact="Marta Vargas - 2618889900", gender="Femenino",
            rol=RoleEnum.PATIENT, health_plan_status=False,
        )
        paciente5.set_password(paciente5.dni)

        db.session.add_all([paciente1, paciente2, paciente3, paciente4, paciente5])
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
        
        turno3 = MedicalAppointment(
            id_patient=paciente3.id_user, id_doctor=medico.id_user,
            date=date.today(), hour="08:30",
            status=AppointmentStatusEnum.ATENDIDO, reason="Control de rutina",
            disease_type=DiseaseTypeEnum.CARDIOVASCULAR,
            diagnosis="Paciente estable, presión bajo control.",
            disease_details="Hipertensión tratada, mantener medicación actual.",
            diagnosis_created_at=datetime.utcnow() - timedelta(hours=5) # Simula que se hizo hace 5 horas
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

        turno_atendido_1 = MedicalAppointment(
            id_patient=paciente1.id_user, id_doctor=medico.id_user,
            date=date.today() - timedelta(days=20), hour="09:30",
            status=AppointmentStatusEnum.ATENDIDO, reason="Control de rutina",
            disease_type=DiseaseTypeEnum.CARDIOVASCULAR,
            diagnosis="Presión arterial levemente elevada.",
            disease_details="Se indica reposo y control de sal en la dieta.",
            diagnosis_created_at=datetime.utcnow() - timedelta(days=20)
        )
        turno_atendido_2 = MedicalAppointment(
            id_patient=paciente1.id_user, id_doctor=medico.id_user,
            date=date.today() - timedelta(days=10), hour="10:00",
            status=AppointmentStatusEnum.ATENDIDO, reason="Seguimiento de presión arterial",
            disease_type=DiseaseTypeEnum.CARDIOVASCULAR,
            diagnosis="Presión arterial sin mejoras significativas.",
            disease_details="Se ajusta dosis de medicación antihipertensiva.",
            diagnosis_created_at=datetime.utcnow() - timedelta(days=10)
        )
        turno_atendido_3 = MedicalAppointment(
            id_patient=paciente1.id_user, id_doctor=medico.id_user,
            date=date.today() - timedelta(days=3), hour="11:15",
            status=AppointmentStatusEnum.ATENDIDO, reason="Control post-tratamiento",
            disease_type=DiseaseTypeEnum.CARDIOVASCULAR,
            diagnosis="Presión arterial estabilizada.",
            disease_details="Paciente responde bien al ajuste de medicación.",
            diagnosis_created_at=datetime.utcnow() - timedelta(days=3)
        )

        turno_atendido_4 = MedicalAppointment(
            id_patient=paciente2.id_user, id_doctor=medico.id_user,
            date=date.today() - timedelta(days=1), hour="09:00",
            status=AppointmentStatusEnum.ATENDIDO, reason="Tos y congestión",
            disease_type=DiseaseTypeEnum.RESPIRATORIA,
            diagnosis="Bronquitis leve.",
            disease_details="Reposo y control en 5 días si no mejora.",
            diagnosis_created_at=datetime.utcnow() - timedelta(days=1)
        )
        turno_atendido_5 = MedicalAppointment(
            id_patient=paciente3.id_user, id_doctor=medico.id_user,
            date=date.today() - timedelta(days=4), hour="10:30",
            status=AppointmentStatusEnum.ATENDIDO, reason="Dolor abdominal",
            disease_type=DiseaseTypeEnum.GASTROINTESTINAL,
            diagnosis="Gastritis.",
            disease_details="Dieta blanda y control en una semana.",
            diagnosis_created_at=datetime.utcnow() - timedelta(days=4)
        )
        turno_atendido_6 = MedicalAppointment(
            id_patient=paciente4.id_user, id_doctor=medico.id_user,
            date=date.today() - timedelta(days=6), hour="08:45",
            status=AppointmentStatusEnum.ATENDIDO, reason="Erupción en la piel",
            disease_type=DiseaseTypeEnum.DERMATOLOGICA,
            diagnosis="Dermatitis de contacto.",
            disease_details="Crema tópica y evitar el alérgeno identificado.",
            diagnosis_created_at=datetime.utcnow() - timedelta(days=6)
        )
        turno_atendido_7 = MedicalAppointment(
            id_patient=paciente4.id_user, id_doctor=medico.id_user,
            date=date.today() - timedelta(days=9), hour="14:00",
            status=AppointmentStatusEnum.ATENDIDO, reason="Golpe en el tobillo",
            disease_type=DiseaseTypeEnum.TRAUMATISMO,
            diagnosis="Esguince leve de tobillo.",
            disease_details="Reposo, frío local y vendaje elástico.",
            diagnosis_created_at=datetime.utcnow() - timedelta(days=9)
        )
        turno_atendido_8 = MedicalAppointment(
            id_patient=paciente5.id_user, id_doctor=medico.id_user,
            date=date.today() - timedelta(days=12), hour="16:00",
            status=AppointmentStatusEnum.ATENDIDO, reason="Consulta general",
            disease_type=DiseaseTypeEnum.CONSULTAMEDICA,
            diagnosis="Sin hallazgos relevantes.",
            disease_details="Control de rutina, sin tratamiento.",
            diagnosis_created_at=datetime.utcnow() - timedelta(days=12)
        )
        turno_atendido_9 = MedicalAppointment(
            id_patient=paciente5.id_user, id_doctor=medico.id_user,
            date=date.today() - timedelta(days=15), hour="17:00",
            status=AppointmentStatusEnum.ATENDIDO, reason="Chequeo pendiente de diagnóstico",
            # A este a propósito NO le ponemos fecha de diagnóstico para que puedas probar
            # guardarle uno nuevo por primera vez en Postman.
        )

        turno_cancelado_1 = MedicalAppointment(
            id_patient=paciente2.id_user, id_doctor=medico.id_user,
            date=date.today() - timedelta(days=2), hour="11:30",
            status=AppointmentStatusEnum.CANCELADO, reason="Control de rutina",
        )
        turno_cancelado_2 = MedicalAppointment(
            id_patient=paciente3.id_user, id_doctor=medico.id_user,
            date=date.today() - timedelta(days=7), hour="09:15",
            status=AppointmentStatusEnum.CANCELADO, reason="Consulta dermatológica",
        )
        turno_cancelado_3 = MedicalAppointment(
            id_patient=paciente4.id_user, id_doctor=medico.id_user,
            date=date.today() - timedelta(days=14), hour="13:00",
            status=AppointmentStatusEnum.CANCELADO, reason="Seguimiento",
        )

        db.session.add_all([
            turno1, turno2, turno3, turno_por_confirmar, turno_confirmado, turno_limite,
            turno_atendido_1, turno_atendido_2, turno_atendido_3,
            turno_atendido_4, turno_atendido_5, turno_atendido_6,
            turno_atendido_7, turno_atendido_8, turno_atendido_9,
            turno_cancelado_1, turno_cancelado_2, turno_cancelado_3,
        ])
        db.session.commit()

        # ---------- Indicaciones médicas ----------
        indicacion1 = MedicalIndication(
            id_patient=paciente1.id_user, id_doctor=medico.id_user,
            indication="Reposo relativo por 48hs", treatment="Ibuprofeno 400mg cada 8hs",
        )
        indicacion2 = MedicalIndication(
            id_patient=paciente2.id_user, id_doctor=medico.id_user,
            id_medical_appointment=turno2.id_medical_appointment,
            indication="Control de temperatura cada 4hs", treatment="Paracetamol 500mg si fiebre mayor a 38°",
        )
        indicacion3 = MedicalIndication(
            id_patient=paciente3.id_user, id_doctor=medico.id_user,
            id_medical_appointment=turno3.id_medical_appointment,
            indication="Dieta hiposódica", treatment="Enalapril 10mg cada 24hs",
            created_at=datetime.utcnow() - timedelta(minutes=10),
        )

        indicacion_marta_1 = MedicalIndication(
            id_patient=paciente1.id_user, id_doctor=medico.id_user,
            id_medical_appointment=turno_atendido_1.id_medical_appointment,
            indication="Reducir consumo de sal y controlar presión a diario",
            treatment="Enalapril 5mg cada 24hs",
            created_at=datetime.utcnow() - timedelta(days=20),
        )
        indicacion_marta_2 = MedicalIndication(
            id_patient=paciente1.id_user, id_doctor=medico.id_user,
            id_medical_appointment=turno_atendido_2.id_medical_appointment,
            indication="Aumentar dosis de antihipertensivo",
            treatment="Enalapril 10mg cada 24hs",
            created_at=datetime.utcnow() - timedelta(days=10),
        )
        indicacion_marta_3 = MedicalIndication(
            id_patient=paciente1.id_user, id_doctor=medico.id_user,
            id_medical_appointment=turno_atendido_3.id_medical_appointment,
            indication="Alta de control, continuar con medicación habitual",
            treatment="Enalapril 10mg cada 24hs",
            created_at=datetime.utcnow() - timedelta(days=3),
        )

        db.session.add_all([
            indicacion1, indicacion2, indicacion3,
            indicacion_marta_1, indicacion_marta_2, indicacion_marta_3,
        ])
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
        producto4 = MedicalProduct(
            name_product="Guantes de nitrilo (caja x100)", expiration_date=date(2027, 9, 1),
            batch_number="LOTE-7734", current_stock=15, minimum_stock_level=50, type_product="EPP",
        )
        db.session.add_all([producto1, producto2, producto3, producto4])
        db.session.commit()

        # ---------- Movimientos de stock y Trazabilidad ----------
        movimiento_entrada1 = StockMovement(id_product=producto1.id_product, id_nurse=enfermero1.id_user, type_movement="Entrada", quantity=170, date_time=datetime.utcnow() - timedelta(days=10))
        movimiento_entrada2 = StockMovement(id_product=producto2.id_product, id_nurse=enfermero2.id_user, type_movement="Entrada", quantity=500, date_time=datetime.utcnow() - timedelta(days=15))
        movimiento_entrada3 = StockMovement(id_product=producto3.id_product, id_nurse=enfermero3.id_user, type_movement="Entrada", quantity=80, date_time=datetime.utcnow() - timedelta(days=20))
        movimiento_entrada4 = StockMovement(id_product=producto4.id_product, id_nurse=enfermero1.id_user, type_movement="Entrada", quantity=60, date_time=datetime.utcnow() - timedelta(days=18))
        db.session.add_all([movimiento_entrada1, movimiento_entrada2, movimiento_entrada3, movimiento_entrada4])
        db.session.commit()

        movimiento_salida = StockMovement(id_product=producto1.id_product, id_nurse=enfermero1.id_user, type_movement="Salida", quantity=20, date_time=datetime.utcnow() - timedelta(days=2))
        movimiento_salida2 = StockMovement(id_product=producto2.id_product, id_nurse=enfermero2.id_user, type_movement="Salida", quantity=15, date_time=datetime.utcnow() - timedelta(days=4))
        movimiento_salida3 = StockMovement(id_product=producto3.id_product, id_nurse=enfermero3.id_user, type_movement="Salida", quantity=8, date_time=datetime.utcnow() - timedelta(days=6))
        movimiento_salida4 = StockMovement(id_product=producto4.id_product, id_nurse=enfermero1.id_user, type_movement="Salida", quantity=35, date_time=datetime.utcnow() - timedelta(days=9))
        movimiento_salida5 = StockMovement(id_product=producto1.id_product, id_nurse=enfermero2.id_user, type_movement="Salida", quantity=10, date_time=datetime.utcnow() - timedelta(days=12))
        db.session.add_all([movimiento_salida, movimiento_salida2, movimiento_salida3, movimiento_salida4, movimiento_salida5])
        db.session.commit()

        trazabilidad1 = Traceability(id_patient=paciente1.id_user, id_product=producto1.id_product, id_nurse=enfermero1.id_user, quantity=20, id_stock_movement=movimiento_salida.id_stock_movement, date_of_use=datetime.utcnow() - timedelta(days=2))
        trazabilidad2 = Traceability(id_patient=paciente2.id_user, id_product=producto2.id_product, id_nurse=enfermero2.id_user, quantity=15, id_stock_movement=movimiento_salida2.id_stock_movement, date_of_use=datetime.utcnow() - timedelta(days=4))
        trazabilidad3 = Traceability(id_patient=paciente3.id_user, id_product=producto3.id_product, id_nurse=enfermero3.id_user, quantity=8, id_stock_movement=movimiento_salida3.id_stock_movement, date_of_use=datetime.utcnow() - timedelta(days=6))
        trazabilidad4 = Traceability(id_patient=paciente4.id_user, id_product=producto4.id_product, id_nurse=enfermero1.id_user, quantity=35, id_stock_movement=movimiento_salida4.id_stock_movement, date_of_use=datetime.utcnow() - timedelta(days=9))
        trazabilidad5 = Traceability(id_patient=paciente5.id_user, id_product=producto1.id_product, id_nurse=enfermero2.id_user, quantity=10, id_stock_movement=movimiento_salida5.id_stock_movement, date_of_use=datetime.utcnow() - timedelta(days=12))
        db.session.add_all([trazabilidad1, trazabilidad2, trazabilidad3, trazabilidad4, trazabilidad5])
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
        print(f"  - Administrativo: {administrativo.username} (id={administrativo.id_user})")
        print(f"  - Administrador: {administrador.username} (id={administrador.id_user})")
        print(f"  - Superadmin: {superadmin.username} (id={superadmin.id_user})")

if __name__ == "__main__":
    seed()