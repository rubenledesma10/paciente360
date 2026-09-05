from datetime import datetime
from models.db import db
from enums import AppointmentStatusEnum, DiseaseTypeEnum
from datetime import datetime


# Transiciones de estado permitidas.
# Un turno avanza Reservado -> En espera -> Atendido, y puede cancelarse
# mientras siga abierto. Atendido y Cancelado son estados finales:
# desde ahi no se vuelve atras.
VALID_STATUS_TRANSITIONS = {
    AppointmentStatusEnum.RESERVADO: {
        AppointmentStatusEnum.EN_ESPERA,
        AppointmentStatusEnum.ATENDIDO,
        AppointmentStatusEnum.CANCELADO,
    },
    AppointmentStatusEnum.EN_ESPERA: {
        AppointmentStatusEnum.ATENDIDO,
        AppointmentStatusEnum.CANCELADO,
    },
    AppointmentStatusEnum.ATENDIDO: set(),
    AppointmentStatusEnum.CANCELADO: set(),
}

# Dias de anticipacion en los que el paciente puede confirmar su asistencia.
# Confirmar con mucha anticipacion no aporta informacion util.
CONFIRMATION_WINDOW_DAYS = 3

# No hay ventana minima para cancelar: se puede hasta el momento del turno.
# Una cancelacion tardia igual sirve, porque libera el horario y la clinica
# puede darselo a una urgencia. Un ausente, en cambio, no libera nada.


class MedicalAppointment(db.Model):
    __tablename__ = 'medical_appointment'
    id_medical_appointment = db.Column(db.Integer, primary_key=True)
    id_patient = db.Column(db.Integer, db.ForeignKey('patients.id_user'), nullable=False)
    id_doctor = db.Column(db.Integer, db.ForeignKey('doctors.id_user'), nullable=False)
    date = db.Column(db.Date, nullable=False)
    hour = db.Column(db.String(10), nullable=False)
    status = db.Column(db.Enum(AppointmentStatusEnum), default=AppointmentStatusEnum.RESERVADO, nullable=False)
    reason = db.Column(db.String(255), nullable=True)
    confirmed = db.Column(db.Boolean, default=False, nullable=False)
    diagnosis_created_at = db.Column(db.DateTime, nullable=True)
    diagnosis = db.Column(db.String(255), nullable=True) #aca el medico pone el diagnostico
    disease_type = db.Column(db.Enum(DiseaseTypeEnum), nullable=True) #aca se guarda la categoria del enum
    disease_details = db.Column(db.String(255), nullable=True) #aca el medico aclara
    # Un sobreturno se agenda por urgencia salteando la validacion de solapamiento.
    # Queda marcado para poder identificarlo y contarlo despues.
    is_overbooking = db.Column(db.Boolean, default=False, nullable=False)
    reminder_sent = db.Column(db.Boolean, default=False, nullable=False)
    patient = db.relationship('Patient', back_populates='appointments')
    doctor = db.relationship('Doctor', back_populates='appointments')

    def get_datetime(self):
        """Fecha y hora del turno como un solo datetime.

        Devuelve None si la hora esta mal cargada, para que quien lo use
        decida que hacer en vez de romper.
        """
        if not self.date or not self.hour:
            return None
        try:
            parsed_hour = datetime.strptime(self.hour, "%H:%M").time()
        except ValueError:
            return None
        return datetime.combine(self.date, parsed_hour)

    def hours_until(self):
        """Horas que faltan para el turno. Negativo si ya paso."""
        appointment_datetime = self.get_datetime()
        if not appointment_datetime:
            return None
        return (appointment_datetime - datetime.now()).total_seconds() / 3600

    def is_open(self):
        """El turno sigue vigente: todavia no fue atendido ni cancelado."""
        return self.status in (
            AppointmentStatusEnum.RESERVADO,
            AppointmentStatusEnum.EN_ESPERA,
        )

    def can_transition_to(self, new_status):
        """True si el turno puede pasar de su estado actual a new_status."""
        if self.status == new_status:
            return False
        return new_status in VALID_STATUS_TRANSITIONS.get(self.status, set())

    def patient_can_confirm(self):
        """El paciente confirma dentro de los 3 dias previos, hasta que empiece."""
        if not self.is_open() or self.confirmed:
            return False
        remaining = self.hours_until()
        if remaining is None:
            return False
        return 0 < remaining <= CONFIRMATION_WINDOW_DAYS * 24

    def patient_can_cancel(self):
        """El paciente puede cancelar mientras el turno siga abierto."""
        return self.is_open()

    def to_dict(self):
        return {
            'id_medical_appointment': self.id_medical_appointment,
            'id_patient': self.id_patient,
            'id_doctor': self.id_doctor,
            'date': self.date.isoformat() if self.date else None,
            'hour': self.hour,
            'status': self.status.value if self.status else None,
            'reason': self.reason,
            'confirmed': self.confirmed,
            'diagnosis': self.diagnosis,
            'disease_type': self.disease_type.value if self.disease_type else None,
            'disease_details': self.disease_details,
            'is_overbooking': self.is_overbooking,
            # El front no repite las reglas: pregunta y muestra los botones segun esto
            'reminder_sent': self.reminder_sent,
            'patient_can_confirm': self.patient_can_confirm(),
            'patient_can_cancel': self.patient_can_cancel(),
            'patient_name': f"{self.patient.first_name} {self.patient.last_name}" if self.patient else None,
            'doctor_name': f"{self.doctor.first_name} {self.doctor.last_name}" if self.doctor else None
        }