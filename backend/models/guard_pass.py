from datetime import datetime
from models.db import db

class GuardPass(db.Model):
    __tablename__ = 'guard_pass'
    id_guard_pass = db.Column(db.Integer, primary_key=True)
    id_nurse = db.Column(db.Integer, db.ForeignKey('nurses.id_user'), nullable=False)
    rotation= db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    notes = db.Column(db.Text, nullable=True)

    nurse = db.relationship('Nurse', back_populates='guard_passes')

    def to_dict(self):
        return {
            'id_guard_pass': self.id_guard_pass,
            'id_nurse': self.id_nurse,
            'rotation': self.rotation.isoformat() if self.rotation else None,
            'notes': self.notes
        }