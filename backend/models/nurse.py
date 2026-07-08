from flask_sqlalchemy import SQLAlchemy
from models.db import db
from models.user import User

class Nurse(User):
    __tablename__ = 'nurses'
    id_user = db.Column(db.Integer, db.ForeignKey('users.id_user'), primary_key=True)
    is_reference= db.Column(db.Boolean, default=False, nullable=False)
    license_number = db.Column(db.String(50), unique=True, nullable=False)

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
            'address': self.address,
            'emergency_contact': self.emergency_contact,
            'license_number': self.license_number,
            'is_reference': self.is_reference
        }