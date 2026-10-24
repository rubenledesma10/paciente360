from models.db import db
from datetime import datetime

class Bitacora(db.Model):
    __tablename__ = 'bitacora'
    
    id_bitacora = db.Column(db.Integer, primary_key=True)
    id_user = db.Column(db.Integer, db.ForeignKey('users.id_user'), nullable=True) # Nullable por si lo hace el sistema
    action = db.Column(db.String(50), nullable=False)       
    table_name = db.Column(db.String(50), nullable=False)  
    record_id = db.Column(db.Integer, nullable=True)    
    details = db.Column(db.Text, nullable=True)         
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    user = db.relationship('User', backref='acciones_bitacora') #para saber quien hizo la accion

    def to_dict(self):
        return {
            'id_bitacora': self.id_bitacora,
            'id_user': self.id_user,
            'username': self.user.username if self.user else 'Sistema Automático',
            'action': self.action,
            'table_name': self.table_name,
            'record_id': self.record_id,
            'details': self.details,
            'timestamp': self.timestamp.strftime("%Y-%m-%d %H:%M:%S") 
        }