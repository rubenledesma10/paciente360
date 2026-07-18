from models.db import db
from datetime import datetime


class MedicalIndication(db.Model):
    __tablename__ = 'medical_indication'
    id_medical_indication = db.Column(db.Integer, primary_key=True)
    id_patient = db.Column(db.Integer, db.ForeignKey('patients.id_user'), nullable=False)
    id_doctor = db.Column(db.Integer, db.ForeignKey('doctors.id_user'), nullable=False)
    indication = db.Column(db.String(255), nullable=False)
    treatment = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    patient = db.relationship('Patient', back_populates='medical_indications')
    doctor = db.relationship('Doctor', back_populates='medical_indications')

    def to_dict(self):
        return {
            'id_medical_indication': self.id_medical_indication,
            'id_patient': self.id_patient,
            'id_doctor': self.id_doctor,
            'indication': self.indication,
            'treatment': self.treatment
        }
