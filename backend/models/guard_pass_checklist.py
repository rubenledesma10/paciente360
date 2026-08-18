import json
from models.db import db

class GuardPassChecklist(db.Model):
    __tablename__ = 'guard_pass_checklists'
    id_guard_pass_checklist = db.Column(db.Integer, primary_key=True)
    id_guard_pass = db.Column(db.Integer, db.ForeignKey('guard_pass.id_guard_pass'), nullable=False, unique=True)
    items = db.Column(db.Text, nullable=False)

    guard_pass = db.relationship('GuardPass', back_populates='checklist')

    def to_dict(self):
        return {
            'id_guard_pass_checklist': self.id_guard_pass_checklist,
            'id_guard_pass': self.id_guard_pass,
            'items': json.loads(self.items) if self.items else [],
        }
