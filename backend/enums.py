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
    RESERVADO = 'Reservado'      
    EN_ESPERA = 'En espera'      
    ATENDIDO = 'Atendido'        
    CANCELADO = 'Cancelado'  