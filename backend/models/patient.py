from flask_sqlalchemy import SQLAlchemy
from models.db import db
from models.user import User


class Patient(User):
    __tablename__ = 'patients'
    id_user = db.Column(db.Integer, db.ForeignKey('users.id_user'), primary_key=True)
    health_plan_status = db.Column(db.Boolean, default=False, nullable=False)
    health_plan_name = db.Column(db.String(120), nullable=True)
    member_number = db.Column(db.String(50), nullable=True)

    signs_and_symptoms = db.relationship('SignsAndSymptoms',back_populates='patient',cascade="all, delete-orphan")
    follow_ups = db.relationship('PatientFollowUp', back_populates='patient', cascade="all, delete-orphan")
    # appointments = db.relationship('MedicalAppointment', back_populates='patient', cascade="all, delete-orphan")
    traceabilities = db.relationship('Traceability', back_populates='patient', cascade="all, delete-orphan")

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
            'country': self.country,
            'phone_number': self.phone_number,
            'address': self.address,
            'emergency_contact': self.emergency_contact,
            'gender': self.gender,
            'is_active': self.is_active,
            'health_plan_status': self.health_plan_status,
            'health_plan_name': self.health_plan_name,
            'member_number': self.member_number
        }