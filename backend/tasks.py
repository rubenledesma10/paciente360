from datetime import date, timedelta
from flask_apscheduler import APScheduler
from models.db import db
from models.medical_appointment import MedicalAppointment
from enums import AppointmentStatusEnum
from utils.email_service import send_appointment_reminder_email
from utils.email_tokens import generar_token_accion_turno

scheduler = APScheduler()

def send_daily_reminders(app):
    """Esta función busca turnos a <= 24hs y manda los mails."""
    with app.app_context():
        print("🤖 [ROBOT] Despertando... Buscando turnos...")
        hoy = date.today()
        manana = hoy + timedelta(days=1)

        # Buscamos turnos abiertos de hoy o mañana, que aún no tengan el aviso
        turnos_pendientes = MedicalAppointment.query.filter(
            MedicalAppointment.date.in_([hoy, manana]),
            MedicalAppointment.status.in_([AppointmentStatusEnum.RESERVADO, AppointmentStatusEnum.EN_ESPERA]),
            MedicalAppointment.reminder_sent == False
        ).all()

        for turno in turnos_pendientes:
            horas_restantes = turno.hours_until()
            
            # Si faltan entre 0 y 24 horas, disparamos el mail
            if horas_restantes is not None and 0 < horas_restantes <= 24:
                try:
                    # Generamos los tokens
                    token_confirm = generar_token_accion_turno(turno.id_medical_appointment, 'confirm')
                    token_cancel = generar_token_accion_turno(turno.id_medical_appointment, 'cancel')

                    # IMPORTANTE: Cambiá localhost:5000 por tu dominio cuando lo subas a producción
                    base_url = "http://localhost:5000/api/appointments/action"
                    confirm_url = f"{base_url}/{token_confirm}"
                    cancel_url = f"{base_url}/{token_cancel}"

                    # Mandamos el mail
                    paciente = turno.patient
                    send_appointment_reminder_email(
                        paciente.email, 
                        paciente.first_name, 
                        turno, 
                        confirm_url, 
                        cancel_url
                    )

                    # Marcamos que ya se envió para no mandarle 20 mails repetidos
                    turno.reminder_sent = True
                    db.session.commit()
                    print(f"Recordatorio enviado a {paciente.email} para el turno ID {turno.id_medical_appointment}")
                    
                except Exception as e:
                    print(f"Error enviando recordatorio al turno {turno.id_medical_appointment}: {e}")