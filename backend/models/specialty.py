from models.db import db


class Specialty(db.Model):
    __tablename__ = 'specialties'
    id_speciality = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False, unique=True)

    doctors = db.relationship('Doctor', back_populates='specialty')

    def to_dict(self):
        return {
            'id_speciality': self.id_speciality,
            'name': self.name
        }
