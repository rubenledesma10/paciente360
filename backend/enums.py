import enum

class RoleEnum(enum.Enum):
    NURSE = 'Nurse'
    PATIENT = 'Patient'
    DOCTOR = 'Doctor'
    ADMINISTRATIVE = 'Administrative'
    ADMINISTRATOR = 'Administrator'

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

class DiseaseTypeEnum(enum.Enum):
    """
    Categorías principales de enfermedades (basado en sistemas anatómicos y etiología).
    Ideal para usar como etiquetas (tags) en la historia clínica o estadísticas.
    """
    INFECCIOSA = 'Infecciosa o Parasitaria'
    CARDIOVASCULAR = 'Cardiovascular'
    RESPIRATORIA = 'Respiratoria'
    GASTROINTESTINAL = 'Gastrointestinal o Digestiva'
    NEUROLOGICA = 'Neurológica'
    ENDOCRINA = 'Endocrina o Metabólica'         
    ONCOLOGICA = 'Oncológica (Cáncer/Neoplasia)'
    INMUNOLOGICA = 'Inmunológica o Autoinmune'    
    HEMATOLOGICA = 'Hematológica'                
    DERMATOLOGICA = 'Dermatológica'
    MUSCULOESQUELETICA = 'Musculoesquelética o Reumatológica' 
    GENITOURINARIA = 'Genitourinaria o Renal'
    PSIQUIATRICA = 'Psiquiátrica o Salud Mental'
    CONGENITA = 'Congénita o Genética'
    TRAUMATISMO = 'Traumatismo o Lesión física'   
    OFTALMOLOGICA = 'Oftalmológica'               
    OTORRINOLARINGOLOGICA = 'Otorrinolaringológica' 
    CONSULTAMEDICA= 'Consulta médica general'
    OTRA = 'Otra'