from datetime import datetime
from models.db import db

class SignsAndSymptoms(db.Model):
    __tablename__ = 'signs_and_symptoms'
    id_signs_and_symptoms = db.Column(db.Integer, primary_key=True)
    id_patient = db.Column(db.Integer, db.ForeignKey('patients.id_user'), nullable=False)
    id_nurse = db.Column(db.Integer, db.ForeignKey('nurses.id_user'), nullable=False)
    temperature = db.Column(db.Float, nullable=False)
    blood_pressure = db.Column(db.String(20), nullable=False)
    observations = db.Column(db.Text, nullable=True)
    date_and_time = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    signs = db.Column(db.String(255), nullable=True)
    symptoms = db.Column(db.String(255), nullable=True)
    record_type = db.Column(db.String(50), nullable=False)

    nurse = db.relationship('Nurse', back_populates='signs_and_symptoms')
    patient = db.relationship('Patient', back_populates='signs_and_symptoms')

    def to_dict(self):
        return {
            'id_signs_and_symptoms': self.id_signs_and_symptoms,
            'id_patient': self.id_patient,
            'id_nurse': self.id_nurse,
            'temperature': self.temperature,
            'blood_pressure': self.blood_pressure,
            'observations': self.observations,
            'date_and_time': (self.date_and_time.isoformat() + 'Z') if self.date_and_time else None,
            'signs': self.signs,
            'symptoms': self.symptoms,
            'record_type': self.record_type
        }

