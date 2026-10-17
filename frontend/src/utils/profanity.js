// Filtro basico de lenguaje ofensivo para los asistentes de IA.
// No es exhaustivo: frena los casos comunes para que nunca lleguen al modelo.
// El backend tiene que aplicar el mismo control; esto es solo la primera barrera.

const LEET_MAP = {
  0: 'o',
  1: 'i',
  3: 'e',
  4: 'a',
  5: 's',
  7: 't',
  '@': 'a',
  $: 's',
};

// Insultos y malas palabras. Las palabras anatomicas groseras quedan afuera a
// proposito: en una app de salud hay gente que describe asi sus sintomas.
const BLOCKED_PATTERNS = [
  /^p[uv]t[oa]s?$/,
  /^p[uv]tit[oa]s?$/,
  /^pelotud[oa]s?$/,
  /^bolud[oa]s?$/,
  /^forr[oa]s?$/,
  /^mierdas?$/,
  /^carajo$/,
  /^conchud[oa]s?$/,
  /^chot[oa]s?$/,
  /^pajer[oa]s?$/,
  /^soretes?$/,
  /^garcas?$/,
  /^trolas?$/,
  /^cornud[oa]s?$/,
  /^maricon(es)?$/,
  /^mogolic[oa]s?$/,
  /^tarad[oa]s?$/,
  /^idiotas?$/,
  /^imbecil(es)?$/,
  /^estupid[oa]s?$/,
  /^hdp$/,
  /^lpm$/,
  /^lptm$/,
  /^ctm$/,
];

// Pasa a minusculas, saca tildes, deshace reemplazos de letras comunes
// (pvt0, 1diota) y junta letras estiradas (puuuuto -> puto).
export function normalizeText(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[013457@$]/g, (c) => LEET_MAP[c])
    .replace(/[^a-z\s]/g, ' ')
    .replace(/([a-z])\1{2,}/g, '$1');
}

// Compara palabras completas, asi "computadora" nunca coincide con "puta".
export function containsProfanity(text) {
  if (!text) return false;
  return normalizeText(text)
    .split(/\s+/)
    .filter(Boolean)
    .some((word) => BLOCKED_PATTERNS.some((re) => re.test(word)));
}
