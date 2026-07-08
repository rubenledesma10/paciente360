
from datetime import date

from app import app
from models.db import db
from models.user import User
from models.nurse import Nurse
from models.news_and_prevention import NewsAndPrevention
from enums import RoleEnum


def seed():
    with app.app_context():

        NewsAndPrevention.query.delete()
        Nurse.query.delete()
        User.query.delete()
        db.session.commit()

        paciente = User(
            first_name="Marta", last_name="Gómez", username="mgomez",
            dni="28456112", email="marta.gomez@mail.com",
            date_of_birth=date(1962, 4, 12),
            address="San Martín 452, Maipú",
            emergency_contact="Luis Gómez - 2614551199",
            gender="Femenino",
            rol=RoleEnum.PATIENT,
        )
        paciente.set_password("paciente123")

        medico = User(
            first_name="Javier", last_name="Ríos", username="jrios",
            dni="30112233", email="javier.rios@paciente360.com",
            date_of_birth=date(1980, 6, 3),
            gender="Masculino",
            rol=RoleEnum.DOCTOR,
        )
        medico.set_password("medico123")

        administrativo = User(
            first_name="Lucía", last_name="Paredes", username="lparedes",
            dni="33221144", email="lucia.paredes@paciente360.com",
            date_of_birth=date(1990, 9, 21),
            gender="Femenino",
            rol=RoleEnum.ADMINISTRATIVE,
        )
        administrativo.set_password("admin123")

        db.session.add_all([paciente, medico, administrativo])
        db.session.commit()  

   
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
        print(f"  - Paciente: {paciente.username}")
        print(f"  - Médico: {medico.username}")
        print(f"  - Administrativo: {administrativo.username}")
        print(f"  - Enfermeros: {enfermero1.username}, {enfermero2.username}, {enfermero3.username}")
        print(f"  - Noticias: {noticia1.title} | {noticia2.title} | {noticia3.title}")


if __name__ == "__main__":
    seed()