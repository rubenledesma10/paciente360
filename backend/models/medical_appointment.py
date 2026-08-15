from datetime import datetime
from models.db import db
from enums import AppointmentStatusEnum
 
 
class MedicalAppointment(db.Model):
    __tablename__ = 'medical_appointment'
    id_medical_appointment = db.Column(db.Integer, primary_key=True)
    id_patient = db.Column(db.Integer, db.ForeignKey('patients.id_user'), nullable=False)
    id_doctor = db.Column(db.Integer, db.ForeignKey('doctors.id_user'), nullable=False)
    date = db.Column(db.Date, nullable=False)
    hour = db.Column(db.String(10), nullable=False)
    status = db.Column(db.Enum(AppointmentStatusEnum), default=AppointmentStatusEnum.RESERVADO, nullable=False)
    reason = db.Column(db.String(255), nullable=True)
    confirmed = db.Column(db.Boolean, default=False, nullable=False)
 
    patient = db.relationship('Patient', back_populates='appointments')
    doctor = db.relationship('Doctor', back_populates='appointments')
 
    def to_dict(self):
        return {
            'id_medical_appointment': self.id_medical_appointment,
            'id_patient': self.id_patient,
            'id_doctor': self.id_doctor,
            'date': self.date.isoformat() if self.date else None,
            'hour': self.hour,
            'status': self.status.value if self.status else None,
            'reason': self.reason,
            'confirmed': self.confirmed,
            'patient_name': f"{self.patient.first_name} {self.patient.last_name}" if self.patient else None,
            'doctor_name': f"{self.doctor.first_name} {self.doctor.last_name}" if self.doctor else None
        }