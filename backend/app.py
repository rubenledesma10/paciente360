from flask import Flask
from flask_cors import CORS
from config.config import Config
from flask_jwt_extended import JWTManager
from models.db import db
from models.user import User
from models.nurse import Nurse
from models.patient import Patient
from models.news_and_prevention import NewsAndPrevention



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
    db.create_all()

# Registro blueprints 
from routes.patient_routes import patients_bp
app.register_blueprint(patients_bp)


if __name__ == '__main__':
    print("Running Paciente360 application...")
    app.run(debug=True, port=5000)