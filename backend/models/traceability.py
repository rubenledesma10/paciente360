from datetime import datetime
from models.db import db


class Traceability(db.Model):
    __tablename__ = 'traceability'
    id_traceability = db.Column(db.Integer, primary_key=True)
    id_patient = db.Column(db.Integer, db.ForeignKey('patients.id_user'), nullable=False)
    id_product = db.Column(db.Integer, db.ForeignKey('medical_product.id_product'), nullable=False)
    id_nurse=db.Column(db.Integer,db.ForeignKey('nurses.id_user'), nullable=False)

    quantity=db.Column(db.Integer, nullable=False, default=1)
    id_stock_movement=db.Column(db.Integer, db.ForeignKey('stock_movement.id_stock_movement'), nullable=True)

    date_of_use = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    patient = db.relationship('Patient', back_populates='traceabilities')
    product = db.relationship('MedicalProduct', back_populates='traceabilities')
    nurse = db.relationship('Nurse',back_populates='traceabilities')
    stock_movement = db.relationship('StockMovement')

    def to_dict(self):
        return {
            'id_traceability': self.id_traceability,
            'id_patient': self.id_patient,
            'id_product': self.id_product,
            'id_nurse': self.id_nurse,
            'quantity': self.quantity,
            'id_stock_movement': self.id_stock_movement,
            'date_of_use': self.date_of_use.isoformat() if self.date_of_use else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'product_name': self.product.name_product if self.product else None,
            'batch_number': self.product.batch_number if self.product else None,
            'expiration_date': self.product.expiration_date.isoformat() if self.product and self.product.expiration_date else None
        }