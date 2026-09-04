from flask import Flask
from flask_cors import CORS
from config.config import Config
from config.email_config import init_mail
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
from routes.medical_indication_routes import medical_indications_bp
from routes.medical_product_routes import medical_products_bp
from routes.specialty_routes import specialties_bp
from routes.stock_movement_routes import stock_movements_bp
from routes.medical_history_routes import medical_history_bp
from routes.profile_routes import profile_bp
from routes.administrator_route import administrator_bp
from routes.superadmin_route import superadministrator_bp
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
from models.guard_pass_checklist import GuardPassChecklist
from models.health_plan import HealthPlan
from utils.bitacora_events import setup_auditing
from routes.bitacora_bp import bitacora_bp
from routes.health_plan_routes import health_plans_bp
from routes.stats_routes import stats_bp
from tasks import scheduler, send_daily_reminders
from routes.ai_routes import ai_bp

app= Flask(__name__)
app.config.from_object(Config)

CORS(app)  # CORS para que react pueda conectarse
jwt = JWTManager(app)
init_mail(app)
db.init_app(app)

scheduler.init_app(app)
scheduler.start()

# Programamos el robot para que revise cada 1 hora (o los minutos que quieras)
@scheduler.task('interval', id='job_reminders', hours=1)
def job_reminders():
    send_daily_reminders(app)

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
app.register_blueprint(medical_indications_bp)
app.register_blueprint(medical_products_bp)
app.register_blueprint(specialties_bp)
app.register_blueprint(stock_movements_bp)
app.register_blueprint(health_plans_bp)
app.register_blueprint(medical_history_bp)
app.register_blueprint(profile_bp)
app.register_blueprint(administrator_bp)
app.register_blueprint(superadministrator_bp)
app.register_blueprint(bitacora_bp)
app.register_blueprint(stats_bp)
app.register_blueprint(ai_bp)

with app.app_context():
    from models.user import User
    from models.nurse import Nurse
    from models.patient import Patient
    from models.doctor import Doctor
    from models.news_and_prevention import NewsAndPrevention
    from models.signs_and_symptoms import SignsAndSymptoms
    from models.guard_pass import GuardPass
    from models.guard_pass_checklist import GuardPassChecklist
    from models.health_plan import HealthPlan
    setup_auditing()
    db.create_all()

if __name__ == '__main__':
    print("Running Paciente360 application...")
    app.run(debug=True, port=5000)