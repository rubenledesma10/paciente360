from datetime import datetime, date
from models.db import db


class PatientFollowUp(db.Model):
    __tablename__ = 'patient_follow_up'
    id_follow_up = db.Column(db.Integer, primary_key=True)
    id_patient = db.Column(db.Integer, db.ForeignKey('patients.id_user'), nullable=False)
    id_nurse = db.Column(db.Integer, db.ForeignKey('nurses.id_user'), nullable=False)
    observations = db.Column(db.Text, nullable=True)
    next_check_up = db.Column(db.Date, nullable=True)
    date_time = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    finish = db.Column(db.Boolean, default=False, nullable=False)

    patient = db.relationship('Patient', back_populates='follow_ups')
    nurse = db.relationship('Nurse', back_populates='follow_ups')

    #Function to determinate the status of control/follow up the patient
    def get_status(self):
        if self.finish:
            return "Finalizado"
        if self.next_check_up and self.next_check_up <= date.today():
            return "Pendiente"
        return "Programado"
    
    def to_dict(self):
        return {
            'id_follow_up': self.id_follow_up,
            'id_patient': self.id_patient,
            'id_nurse': self.id_nurse,
            'observations': self.observations,
            'next_check_up': self.next_check_up.isoformat() if self.next_check_up else None,
            'date_time': self.date_time.isoformat() if self.date_time else None,
            'finish': self.finish,
            'status': self.get_status()
        }