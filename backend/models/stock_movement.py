from datetime import datetime
from models.db import db


class StockMovement(db.Model):
    __tablename__ = 'stock_movement'
    id_stock_movement = db.Column(db.Integer, primary_key=True)
    id_product = db.Column(db.Integer, db.ForeignKey('medical_product.id_product'), nullable=False)
    id_nurse=db.Column(db.Integer, db.ForeignKey('nurses.id_user'), nullable=False)
    type_movement = db.Column(db.String(50), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    date_time = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    product = db.relationship('MedicalProduct', back_populates='stock_movements')
    nurse= db.relationship('Nurse',back_populates='stock_movements')

    def to_dict(self):
        return {
            'id_stock_movement': self.id_stock_movement,
            'id_product': self.id_product,
            'id_nurse': self.id_nurse,
            'type_movement': self.type_movement,
            'quantity': self.quantity,
            'date_time': self.date_time.isoformat() if self.date_time else None,
            'product_name': self.product.name_product if self.product else None,
            'batch_number': self.product.batch_number if self.product else None,
        }
