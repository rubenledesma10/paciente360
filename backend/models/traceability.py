from datetime import datetime
from models.db import db


class Traceability(db.Model):
    __tablename__ = 'traceability'
    id_traceability = db.Column(db.Integer, primary_key=True)
    id_patient = db.Column(db.Integer, db.ForeignKey('patients.id_user'), nullable=False)
    id_product = db.Column(db.Integer, db.ForeignKey('medical_product.id_product'), nullable=False)
    date_of_use = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    id_nurse=db.Column(db.Integer,db.ForeignKey('nurses.id_user'), nullable=False)
    quantity = db.Column(db.Integer, nullable=False, default=1)
    patient = db.relationship('Patient', back_populates='traceabilities')
    product = db.relationship('MedicalProduct', back_populates='traceabilities')
    nurse = db.relationship('Nurse',back_populates='traceabilities')
    def to_dict(self):
        return {
            'id_traceability': self.id_traceability,
            'id_patient': self.id_patient,
            'id_product': self.id_product,
            'id_nurse': self.id_nurse,
            'quantity': self.quantity,
            'date_of_use': self.date_of_use.isoformat() if self.date_of_use else None,
            # Datos del producto asociado (validaciones 4 y 5 de la HU3)
            'product_name': self.product.name_product if self.product else None,
            'batch_number': self.product.batch_number if self.product else None,
            'expiration_date': self.product.expiration_date.isoformat() if self.product and self.product.expiration_date else None
        }