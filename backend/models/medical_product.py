from datetime import date
from models.db import db

DIAS_PARA_POR_VENCER=7

class MedicalProduct(db.Model):
    __tablename__ = 'medical_product'
    id_product = db.Column(db.Integer, primary_key=True)
    name_product = db.Column(db.String(120), nullable=False)
    expiration_date = db.Column(db.Date, nullable=True)
    batch_number = db.Column(db.String(50), nullable=True)
    current_stock = db.Column(db.Integer, nullable=False, default=0)
    minimum_stock_level = db.Column(db.Integer, nullable=False, default=0)
    type_product = db.Column(db.String(100), nullable=True)

    traceabilities = db.relationship('Traceability', back_populates='product', cascade="all, delete-orphan")
    stock_movements = db.relationship('StockMovement', back_populates='product', cascade="all, delete-orphan")

    def to_dict(self):

        hoy=date.today()
        sin_stock=self.current_stock == 0
        stock_bajo=0<self.current_stock<=self.minimum_stock_level
        vencido=bool(self.expiration_date and self.expiration_date < hoy)

        por_vencer = bool(
            self.expiration_date
            and not vencido
            and (self.expiration_date - hoy).days <= DIAS_PARA_POR_VENCER
        )


        return {
            'id_product': self.id_product,
            'name_product': self.name_product,
            'expiration_date': self.expiration_date.isoformat() if self.expiration_date else None,
            'batch_number': self.batch_number,
            'current_stock': self.current_stock,
            'minimum_stock_level': self.minimum_stock_level,
            'type_product': self.type_product,
            'sin_stock':sin_stock,
            'stock_bajo':stock_bajo,
            'vencido':vencido,
            'por_vencer':por_vencer
        }
