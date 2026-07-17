from flask import Flask
from flask_cors import CORS
from config.config import Config
from flask_jwt_extended import JWTManager
from routes.administrative_route import administrative_bp
from routes.auth_routes import auth_bp
from routes.guard_pass_routes import guard_pass_bp
from routes.patient_routes import patients_bp
from routes.traceability_routes import traceabilities_bp
from routes.medical_appointment_routes import appointments_bp
from routes.patient_follow_up_routes import follow_ups_bp
from routes.news_and_prevention_routes import news_and_prevention_bp
from routes.doctor_routes import doctors_bp
from routes.nurse_route import nurses_bp
from routes.signs_and_symptoms_routes import signs_and_symptoms_bp
from models.db import db
from models.user import User
from models.nurse import Nurse
from models.patient import Patient
from models.doctor import Doctor
from models.specialty import Specialty
from models.traceability import Traceability
from models.medical_product import MedicalProduct
from models.stock_movement import StockMovement
from models.medical_appointment import MedicalAppointment
from models.medical_indication import MedicalIndication
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
    from models.doctor import Doctor
    from models.news_and_prevention import NewsAndPrevention
    from models.signs_and_symptoms import SignsAndSymptoms
    from models.guard_pass import GuardPass 
    db.create_all()

# Registro blueprints 

app.register_blueprint(administrative_bp)
app.register_blueprint(auth_bp)
app.register_blueprint(guard_pass_bp)
app.register_blueprint(news_and_prevention_bp)
app.register_blueprint(signs_and_symptoms_bp)
app.register_blueprint(nurses_bp)
app.register_blueprint(patients_bp)
app.register_blueprint(traceabilities_bp)
app.register_blueprint(appointments_bp)
app.register_blueprint(follow_ups_bp)
app.register_blueprint(doctors_bp)

from routes.medical_indication_routes import medical_indications_bp
app.register_blueprint(medical_indications_bp)

from routes.medical_product_routes import medical_products_bp
app.register_blueprint(medical_products_bp)

from routes.specialty_routes import specialties_bp
app.register_blueprint(specialties_bp)

from routes.stock_movement_routes import stock_movements_bp
app.register_blueprint(stock_movements_bp)

if __name__ == '__main__':
    print("Running Paciente360 application...")
    app.run(debug=True, port=5000)