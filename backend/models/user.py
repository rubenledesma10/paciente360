from flask_sqlalchemy import SQLAlchemy
from models.db import db
from enums import RoleEnum
from werkzeug.security import generate_password_hash, check_password_hash

class User(db.Model):
    __tablename__ = 'users'
    id_user = db.Column(db.Integer, primary_key=True)
    first_name = db.Column(db.String(50), nullable=False)
    last_name = db.Column(db.String(120), nullable=False)
    username = db.Column(db.String(50), unique=True, nullable=False)
    dni = db.Column(db.String(20), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)
    date_of_birth = db.Column(db.Date, nullable=False)
    profile_photo = db.Column(db.Text, nullable=True)
    country = db.Column(db.String(100), nullable=True)
    phone_number = db.Column(db.String(20), nullable=True)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    address = db.Column(db.String(255), nullable=True)
    emergency_contact = db.Column(db.String(255), nullable=True)
    gender = db.Column(db.String(10), nullable=True)
    rol = db.Column(db.Enum(RoleEnum), default=RoleEnum.PATIENT, nullable=False)

    news_and_prevention = db.relationship(
        'NewsAndPrevention',
        back_populates='author',
        cascade="all, delete-orphan",
    )

    def set_password(self, password_input): #aca va la logica para hashear la contraseña
        self.password = generate_password_hash(password_input)
    def check_password(self, password_input): #aca va la logica para verificar el hash de la contraseña
        return check_password_hash(self.password, password_input)

    def to_dict(self):
        """Serializacion base del usuario.

        Patient, Doctor y Nurse la sobrescriben con sus campos propios.
        El administrativo no tiene tabla propia, asi que usa esta: sin
        este metodo su perfil no se podia serializar.
        NUNCA incluye la contrasena, ni siquiera hasheada.
        """
        return {
            'id_user': self.id_user,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'username': self.username,
            'dni': self.dni,
            'email': self.email,
            'date_of_birth': self.date_of_birth.isoformat() if self.date_of_birth else None,
            'profile_photo': self.profile_photo,
            'country': self.country,
            'phone_number': self.phone_number,
            'address': self.address,
            'emergency_contact': self.emergency_contact,
            'gender': self.gender,
            'is_active': self.is_active,
        }