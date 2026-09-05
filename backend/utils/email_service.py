from flask_mail import Message
from config.email_config import mail
from flask import current_app


def _nombre_medico(appointment):
    d = getattr(appointment, 'doctor', None)
    if not d:
        return "Profesional a confirmar"
    nombre = f"{d.first_name} {d.last_name}"
    esp = getattr(d, 'specialty', None)
    return f"{nombre} ({esp.name})" if esp and getattr(esp, 'name', None) else nombre


def _nombre_paciente(appointment, fallback):
    p = getattr(appointment, 'patient', None)
    return f"{p.first_name} {p.last_name}" if p else fallback


def _fecha_legible(appointment):
    # "sabado 05/09/2026" en castellano, sin depender del locale del sistema
    dias = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo']
    d = appointment.date
    return f"{dias[d.weekday()]} {d.strftime('%d/%m/%Y')}"


def _pie_html():
    return """
    <p style="color:#64748B;font-size:12px;margin-top:24px;">
      Paciente360 · Centro de salud · Mendoza<br>
      Este es un mensaje automático, por favor no respondas a este correo.
    </p>"""


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
    msg.body = f"Hola {first_name}, gracias por registrarte en Paciente360! Recuerda que tu contraseña es la misma que le pediste al administrador que te colocara. En caso de que no le hayas pasado ninguna contraseña, proba colocando tu DNI ;) !"
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


# email que se manda apenas se confirma la reserva de un turno
def send_appointment_booking_email(to_email, first_name, appointment):
    msg = Message(
        subject="Turno reservado - Paciente360 📅",
        sender=current_app.config['MAIL_USERNAME'],
        recipients=[to_email]
    )
    fecha = _fecha_legible(appointment)
    medico = _nombre_medico(appointment)
    paciente = _nombre_paciente(appointment, first_name)
    motivo = appointment.reason or 'No especificado'

    msg.body = (
        f"Hola {first_name}!\n\n"
        f"Tu turno quedó reservado.\n\n"
        f"Paciente: {paciente}\n"
        f"Profesional: {medico}\n"
        f"Fecha: {fecha}\n"
        f"Hora: {appointment.hour} hs\n"
        f"Motivo: {motivo}\n\n"
        f"Te vamos a mandar un recordatorio 24 horas antes, con la opción de "
        f"confirmar o cancelar. Si no podés venir, cancelá desde \"Mis turnos\" "
        f"para liberar el horario a otra persona.\n\n"
        f"Ingresá a la app con tu DNI como usuario y contraseña."
    )
    msg.html = f"""
    <div style="font-family:Arial,sans-serif;max-width:520px;">
      <h2 style="color:#0E4C82;margin-bottom:4px;">Turno reservado</h2>
      <p>Hola {first_name}, tu turno quedó reservado.</p>
      <table style="border-collapse:collapse;margin:16px 0;">
        <tr><td style="padding:6px 12px 6px 0;color:#64748B;">Paciente</td><td style="padding:6px 0;"><strong>{paciente}</strong></td></tr>
        <tr><td style="padding:6px 12px 6px 0;color:#64748B;">Profesional</td><td style="padding:6px 0;"><strong>{medico}</strong></td></tr>
        <tr><td style="padding:6px 12px 6px 0;color:#64748B;">Fecha</td><td style="padding:6px 0;"><strong>{fecha}</strong></td></tr>
        <tr><td style="padding:6px 12px 6px 0;color:#64748B;">Hora</td><td style="padding:6px 0;"><strong>{appointment.hour} hs</strong></td></tr>
        <tr><td style="padding:6px 12px 6px 0;color:#64748B;">Motivo</td><td style="padding:6px 0;">{motivo}</td></tr>
      </table>
      <p>Te vamos a mandar un recordatorio 24 horas antes, con la opción de confirmar o cancelar.</p>
      <p style="color:#64748B;font-size:13px;">Si no podés venir, cancelá desde <strong>Mis turnos</strong> para liberar el horario a otra persona. Ingresás con tu DNI como usuario y contraseña.</p>
      {_pie_html()}
    </div>"""
    mail.send(msg)


# recordatorio de turno
def send_appointment_reminder_email(to_email, first_name, appointment, confirm_url, cancel_url):
    msg = Message(
        subject="Recordatorio de tu turno - Paciente360 ⏰",
        sender=current_app.config['MAIL_USERNAME'],
        recipients=[to_email]
    )
    fecha = _fecha_legible(appointment)
    medico = _nombre_medico(appointment)
    paciente = _nombre_paciente(appointment, first_name)
    motivo = appointment.reason or 'No especificado'

    msg.body = (
        f"Hola {first_name}!\n\n"
        f"Te recordamos tu turno de mañana.\n\n"
        f"Paciente: {paciente}\n"
        f"Profesional: {medico}\n"
        f"Fecha: {fecha}\n"
        f"Hora: {appointment.hour} hs\n"
        f"Motivo: {motivo}\n\n"
        f"¿Vas a poder venir? Confirmá acá: {confirm_url}\n"
        f"¿No podés venir? Cancelá acá: {cancel_url}\n\n"
        f"Estos links vencen en 48 horas. Llegá unos minutos antes con tu DNI y "
        f"carnet de obra social si tenés."
    )
    msg.html = f"""
    <div style="font-family:Arial,sans-serif;max-width:520px;">
      <h2 style="color:#0E4C82;margin-bottom:4px;">Recordatorio de tu turno</h2>
      <p>Hola {first_name}, te recordamos tu turno de mañana.</p>
      <table style="border-collapse:collapse;margin:16px 0;">
        <tr><td style="padding:6px 12px 6px 0;color:#64748B;">Paciente</td><td style="padding:6px 0;"><strong>{paciente}</strong></td></tr>
        <tr><td style="padding:6px 12px 6px 0;color:#64748B;">Profesional</td><td style="padding:6px 0;"><strong>{medico}</strong></td></tr>
        <tr><td style="padding:6px 12px 6px 0;color:#64748B;">Fecha</td><td style="padding:6px 0;"><strong>{fecha}</strong></td></tr>
        <tr><td style="padding:6px 12px 6px 0;color:#64748B;">Hora</td><td style="padding:6px 0;"><strong>{appointment.hour} hs</strong></td></tr>
        <tr><td style="padding:6px 12px 6px 0;color:#64748B;">Motivo</td><td style="padding:6px 0;">{motivo}</td></tr>
      </table>
      <p style="margin:20px 0;">
        <a href="{confirm_url}" style="background:#16A34A;color:#fff;padding:12px 20px;
           border-radius:6px;text-decoration:none;margin-right:10px;display:inline-block;">Confirmar asistencia</a>
        <a href="{cancel_url}" style="background:#DC2626;color:#fff;padding:12px 20px;
           border-radius:6px;text-decoration:none;display:inline-block;">Cancelar turno</a>
      </p>
      <p style="color:#64748B;font-size:13px;">Estos links vencen en 48 horas. Llegá unos minutos antes con tu DNI y carnet de obra social si tenés.</p>
      {_pie_html()}
    </div>"""
    mail.send(msg)