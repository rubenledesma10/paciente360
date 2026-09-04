from dotenv import load_dotenv
from datetime import timedelta
import os

load_dotenv()

class Config:
    SECRET_KEY = os.getenv('SECRET_KEY', 'supersecret')

    SQLALCHEMY_DATABASE_URI = (
        f"mysql+pymysql://{os.getenv('MYSQL_USER')}:{os.getenv('MYSQL_PASSWORD')}"
        f"@{os.getenv('MYSQL_HOST')}:{os.getenv('MYSQL_PORT')}/{os.getenv('MYSQL_DB')}"
    )

    SQLALCHEMY_TRACK_MODIFICATIONS = False

    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=8)

    #configuracion para email
    MAIL_SERVER = "smtp.gmail.com"
    MAIL_PORT = 587
    MAIL_USE_TLS = True
    MAIL_USERNAME = os.getenv("MAIL_USERNAME")
    MAIL_PASSWORD = os.getenv("MAIL_PASSWORD")

    # configuracion de la IA (Google Gemini)
    # La clave va en el .env, nunca en el codigo: si se commitea, GitHub la
    # detecta y Google la revoca automaticamente.
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
    # El nombre del modelo cambia seguido. Se puede pisar desde el .env sin
    # tocar codigo: GEMINI_MODEL=el-que-corresponda
    GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")