from datetime import datetime
from models.db import db


class Traceability(db.Model):
    __tablename__ = 'traceability'
    id_traceability = db.Column(db.Integer, primary_key=True)
    id_patient = db.Column(db.Integer, db.ForeignKey('patients.id_user'), nullable=False)
    id_product = db.Column(db.Integer, db.ForeignKey('medical_product.id_product'), nullable=False)
    date_of_use = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    patient = db.relationship('Patient', back_populates='traceabilities')
    product = db.relationship('MedicalProduct', back_populates='traceabilities')

    def to_dict(self):
        return {
            'id_traceability': self.id_traceability,
            'id_patient': self.id_patient,
            'id_product': self.id_product,
            'date_of_use': self.date_of_use.isoformat() if self.date_of_use else None
        }