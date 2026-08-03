from datetime import datetime, date
from models.db import db
from enums import FollowUpStatusEnum

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
            return FollowUpStatusEnum.FINISHED.value
 
        if self.next_check_up is None:

            return FollowUpStatusEnum.SCHEDULED.value
 
        hoy = date.today()
        if self.next_check_up == hoy:
            return FollowUpStatusEnum.ACTIVE.value
        elif self.next_check_up < hoy:
            return FollowUpStatusEnum.PENDING.value
        else:
            return FollowUpStatusEnum.SCHEDULED.value
    
    def to_dict(self):
        return {
            'id_follow_up': self.id_follow_up,
            'id_patient': self.id_patient,
            'id_nurse': self.id_nurse,
            'observations': self.observations,
            'next_check_up': self.next_check_up.isoformat() if self.next_check_up else None,
            'date_time': self.date_time.isoformat() if self.date_time else None,
            'status': self.get_status(),
            'patient_name': f"{self.patient.first_name} {self.patient.last_name}" if self.patient else None
            
        }