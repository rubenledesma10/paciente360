from models.db import db

# Tabla intermedia para la relación muchos-a-muchos entre Doctor y HealthPlan.
# No es un modelo (clase), es una tabla auxiliar.
doctor_health_plan = db.Table(
    'doctor_health_plan',
    db.Column('id_doctor', db.Integer, db.ForeignKey('doctors.id_user'), primary_key=True),
    db.Column('id_health_plan', db.Integer, db.ForeignKey('health_plans.id_health_plan'), primary_key=True)
)


class HealthPlan(db.Model):
    __tablename__ = 'health_plans'
    id_health_plan = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False, unique=True)

    # Relación muchos-a-muchos: una obra social es aceptada por muchos doctores.
    doctors = db.relationship('Doctor',secondary=doctor_health_plan,back_populates='health_plans')

    def to_dict(self):
        return {
            'id_health_plan': self.id_health_plan,
            'name': self.name
        }