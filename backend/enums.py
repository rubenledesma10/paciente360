import enum

class RoleEnum(enum.Enum):
    NURSE = 'Nurse'
    PATIENT = 'Patient'
    DOCTOR = 'Doctor'
    ADMINISTRATIVE = 'Administrative'

class AppointmentStatusEnum(enum.Enum):
    """
    Estados posibles de un turno (MedicalAppointment).
    Estos son los mismos 4 estados que ya usamos en el prototipo del
    módulo de "Gestión de turnos" del administrativo -> hay que
    mantenerlos sincronizados con lo que espera el front.
    """
    RESERVADO = 'Reservado' #solamente tiene el turno y aun no llega      
    EN_ESPERA = 'En espera' #llego y la receptionista le dio el ingreso     
    ATENDIDO = 'Atendido'  #atentido es que el medico ya lo atendio       
    CANCELADO = 'Cancelado'  #paciente lo cancelo

class FollowUpStatusEnum(enum.Enum):
    ACTIVE = "active"
    PENDING = "pending"
    SCHEDULED = "scheduled"
    FINISHED = "finished"