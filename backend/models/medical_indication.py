from models.db import db
from datetime import datetime


class MedicalIndication(db.Model):
    __tablename__ = 'medical_indication'
    id_medical_indication = db.Column(db.Integer, primary_key=True)
    id_patient = db.Column(db.Integer, db.ForeignKey('patients.id_user'), nullable=False)
    id_doctor = db.Column(db.Integer, db.ForeignKey('doctors.id_user'), nullable=False)
    id_medical_appointment = db.Column(db.Integer, db.ForeignKey('medical_appointment.id_medical_appointment'), nullable=True)
    indication = db.Column(db.String(255), nullable=False)
    treatment = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    patient = db.relationship('Patient', back_populates='medical_indications')
    doctor = db.relationship('Doctor', back_populates='medical_indications')
    appointment = db.relationship('MedicalAppointment', backref='medical_indications')

    def to_dict(self):
        return {
            'id_medical_indication': self.id_medical_indication,
            'id_patient': self.id_patient,
            'id_doctor': self.id_doctor,
            'id_medical_appointment': self.id_medical_appointment,
            'indication': self.indication,
            'treatment': self.treatment,
            'created_at': (self.created_at.isoformat() + 'Z') if self.created_at else None,
            'doctor_name': f"{self.doctor.first_name} {self.doctor.last_name}" if self.doctor else None,
            'appointment_date': self.appointment.date.isoformat() if self.appointment and self.appointment.date else None,
            'appointment_reason': self.appointment.reason if self.appointment else None,
        }
