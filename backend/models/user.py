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

    nurse = db.relationship(
        'Nurse',
        back_populates='user', 
        uselist=False,
        cascade="all, delete-orphan"
    )
    
    patient = db.relationship(
        'Patient',
        back_populates='user',
        uselist=False,
        cascade="all, delete-orphan"
    )

    def set_password(self, password_input): #aca va la logica para hashear la contraseña
        self.password = generate_password_hash(password_input)
    def check_password(self, password_input): #aca va la logica para verificar el hash de la contraseña
        return check_password_hash(self.password, password_input)

    