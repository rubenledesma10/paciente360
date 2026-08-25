from flask_mail import Message
from config.email_config import mail
from flask import current_app

def send_welcome_email(to_email, first_name):
    msg = Message(
        subject="Bienvenido a Paciente360 🏥",
        sender=current_app.config['MAIL_USERNAME'],
        recipients=[to_email]
    )
    msg.body = f"Hola {first_name}, gracias por registrarte en Paciente360!"
    mail.send(msg)

def send_welcome_email_admin(to_email, first_name):
    msg = Message(
        subject="Bienvenido a Paciente360 🏥",
        sender=current_app.config['MAIL_USERNAME'],
        recipients=[to_email]
    )
    msg.body = f"Hola {first_name}, gracias por registrarte en Paciente360! Recuerda que tu contraseña es la misma que tu DNI. Recuerda cambiarla!"
    mail.send(msg)

def send_reset_password_email(to_email, new_password):
    msg = Message(
        subject="Recuperación de contraseña - Paciente360 🔑",
        sender=current_app.config['MAIL_USERNAME'],
        recipients=[to_email]
    )
    msg.body = f"Tu nueva contraseña es: {new_password}\nPor favor cámbiala después de iniciar sesión."
    mail.send(msg)


def send_reactivated_email(to_email, new_password):
    msg = Message(
        subject="Reactivación de cuenta - Paciente360 🏥",
        sender=current_app.config['MAIL_USERNAME'],
        recipients=[to_email]
    )
    msg.body = f"Bienvenido a Paciente360 nuevamente! Tu nueva contraseña es: {new_password}\nPor favor cámbiala después de iniciar sesión."
    mail.send(msg)

#email que se manda apenas se confirma la reserva de un turno
def send_appointment_booking_email(to_email, first_name, appointment):
    msg = Message(
        subject="Turno confirmado - Paciente360 📅",
        sender=current_app.config['MAIL_USERNAME'],
        recipients=[to_email]
    )
    fecha_legible = appointment.date.strftime('%d/%m/%Y')
    msg.body = (
        f"Hola {first_name}!\n\n"
        f"Tu turno quedó reservado para el {fecha_legible} a las {appointment.hour}hs.\n"
        f"Motivo: {appointment.reason or 'No especificado'}\n\n"
        f"Te vamos a mandar un recordatorio 24hs antes."
    )
    mail.send(msg)

#recordatorio de turno 
def send_appointment_reminder_email(to_email, first_name, appointment, confirm_url, cancel_url):
    msg = Message(
        subject="Recordatorio de tu turno - Paciente360 ⏰",
        sender=current_app.config['MAIL_USERNAME'],
        recipients=[to_email]
    )
    fecha_legible = appointment.date.strftime('%d/%m/%Y')
    msg.body = (
        f"Hola {first_name}!\n\n"
        f"Te recordamos que el {fecha_legible} a las {appointment.hour}hs tenés un turno.\n\n"
        f"¿Vas a poder venir? Confirmá acá: {confirm_url}\n"
        f"¿No podés venir? Cancelá acá: {cancel_url}\n\n"
        f"Estos links vencen en 48 horas."
    )
    # HTML con botones, para que no sea solo un link pelado -> los clientes
    # de mail que soportan HTML (la gran mayoria) van a mostrar 2 botones
    # reales en vez de texto plano.
    msg.html = f"""
    <p>Hola {first_name}!</p>
    <p>Te recordamos que el <strong>{fecha_legible} a las {appointment.hour}hs</strong> tenés un turno.</p>
    <p>
      <a href="{confirm_url}" style="background:#16A34A;color:#fff;padding:10px 18px;
         border-radius:6px;text-decoration:none;margin-right:10px;">Confirmar asistencia</a>
      <a href="{cancel_url}" style="background:#DC2626;color:#fff;padding:10px 18px;
         border-radius:6px;text-decoration:none;">Cancelar turno</a>
    </p>
    <p style="color:#64748B;font-size:12px;">Estos links vencen en 48 horas.</p>
    """
    mail.send(msg)