from flask_sqlalchemy import SQLAlchemy
from models.db import db
from models.user import User

class Nurse(User):
    __tablename__ = 'nurses'
    id_user = db.Column(db.Integer, db.ForeignKey('users.id_user'), primary_key=True)
    is_reference= db.Column(db.Boolean, default=False, nullable=False)
    license_number = db.Column(db.String(50), unique=True, nullable=False)

    guard_passes = db.relationship(
        'GuardPass', 
        back_populates='nurse', 
        cascade="all, delete-orphan"
    )

    signs_and_symptoms = db.relationship(
        'SignsAndSymptoms', 
        back_populates='nurse', 
        cascade="all, delete-orphan"
    )

    follow_ups = db.relationship(
        'PatientFollowUp',
        back_populates='nurse',
        cascade="all, delete-orphan"
    )

    traceabilities = db.relationship(
        'Traceability',
        back_populates='nurse',
        cascade="all, delete-orphan"
    )

    stock_movements = db.relationship(
        'StockMovement',
        back_populates='nurse',
        cascade="all, delete-orphan"
    )

    def to_dict(self):
        return {
            'id_user': self.id_user,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'username': self.username,
            'dni': self.dni,
            'email': self.email,
            'date_of_birth': self.date_of_birth.isoformat() if self.date_of_birth else None,
            'profile_photo': self.profile_photo,
            # Estos cuatro faltaban y los necesita la pantalla de usuarios:
            # sin is_active no se puede saber quien esta dado de baja.
            'country': self.country,
            'phone_number': self.phone_number,
            'gender': self.gender,
            'is_active': self.is_active,
            'address': self.address,
            'emergency_contact': self.emergency_contact,
            'license_number': self.license_number,
            'is_reference': self.is_reference
        }