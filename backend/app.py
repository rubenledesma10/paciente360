from flask import Flask
from flask_cors import CORS
from config.config import Config
from flask_jwt_extended import JWTManager
from models.db import db
from models.user import User
from models.nurse import Nurse
from models.patient import Patient
from models.traceability import Traceability
from models.medical_appointment import MedicalAppointment
from models.patient_follow_up import PatientFollowUp
from models.signs_and_symptoms import SignsAndSymptoms
from models.news_and_prevention import NewsAndPrevention
from models.guard_pass import GuardPass


app= Flask(__name__)
app.config.from_object(Config)

CORS(app)  # CORS para que react pueda conectarse
jwt = JWTManager(app)
db.init_app(app)

with app.app_context():
    from models.user import User
    from models.nurse import Nurse
    from models.patient import Patient
    from models.news_and_prevention import NewsAndPrevention
    from models.signs_and_symptoms import SignsAndSymptoms
    from models.guard_pass import GuardPass 
    db.create_all()

# Registro blueprints 
from routes.patient_routes import patients_bp
app.register_blueprint(patients_bp)

from routes.traceability_routes import traceabilities_bp
app.register_blueprint(traceabilities_bp)

from routes.medical_appointment_routes import appointments_bp
app.register_blueprint(appointments_bp)

from routes.patient_follow_up_routes import follow_ups_bp
app.register_blueprint(follow_ups_bp)

if __name__ == '__main__':
    print("Running Paciente360 application...")
    app.run(debug=True, port=5000)