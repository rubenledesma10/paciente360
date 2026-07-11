from datetime import datetime
from models.db import db


class MedicalAppointment(db.Model):
    __tablename__ = 'medical_appointment'
    id_medical_appointment = db.Column(db.Integer, primary_key=True)
    id_patient = db.Column(db.Integer, db.ForeignKey('patients.id_user'), nullable=False)
    # id_doctor = db.Column(db.Integer, db.ForeignKey('doctors.id_user'), nullable=False)  # activamos cuando exista Doctor
    date = db.Column(db.Date, nullable=False)
    hour = db.Column(db.String(10), nullable=False)
    status = db.Column(db.String(50), nullable=False, default="Pendiente")
    reason = db.Column(db.String(255), nullable=True)

    patient = db.relationship('Patient', back_populates='appointments')
    # doctor = db.relationship('Doctor', back_populates='appointments')  # activamos cuando exista Doctor

    def to_dict(self):
        return {
            'id_medical_appointment': self.id_medical_appointment,
            'id_patient': self.id_patient,
            # 'id_doctor': self.id_doctor,   # activamos cuando exista Doctor
            'date': self.date.isoformat() if self.date else None,
            'hour': self.hour,
            'status': self.status,
            'reason': self.reason
        }