from models.db import db
from models.user import User


class Doctor(User):
    __tablename__ = 'doctors'
    id_user = db.Column(db.Integer, db.ForeignKey('users.id_user'), primary_key=True)
    medical_license = db.Column(db.String(20), nullable=False, unique=True)
    id_especialidad = db.Column(db.Integer, db.ForeignKey('specialties.id_speciality'), nullable=True)

    appointments = db.relationship('MedicalAppointment', back_populates='doctor', cascade="all, delete-orphan")
    medical_indications = db.relationship('MedicalIndication', back_populates='doctor', cascade="all, delete-orphan")
    specialty = db.relationship('Specialty', back_populates='doctors')

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
            'medical_license': self.medical_license,
            'id_especialidad': self.id_especialidad
        }
