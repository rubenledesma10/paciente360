/**
 * Categorias de enfermedad.
 *
 * Los valores tienen que coincidir EXACTAMENTE con DiseaseTypeEnum de
 * backend/enums.py: el backend valida contra ese enum y rechaza cualquier
 * otro texto. Si alla se agrega o cambia una categoria, hay que reflejarlo
 * aca tambien.
 */
export const DISEASE_TYPES = [
  'Infecciosa o Parasitaria',
  'Cardiovascular',
  'Respiratoria',
  'Gastrointestinal o Digestiva',
  'Neurológica',
  'Endocrina o Metabólica',
  'Oncológica (Cáncer/Neoplasia)',
  'Inmunológica o Autoinmune',
  'Hematológica',
  'Dermatológica',
  'Musculoesquelética o Reumatológica',
  'Genitourinaria o Renal',
  'Psiquiátrica o Salud Mental',
  'Congénita o Genética',
  'Traumatismo o Lesión física',
  'Oftalmológica',
  'Otorrinolaringológica',
  'Consulta médica general',
  'Otra',
];

// Con esta categoria el backend exige que se completen los detalles
export const DISEASE_TYPE_OTHER = 'Otra';
