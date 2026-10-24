// Filtro de lenguaje ofensivo para los asistentes de IA.
// Es la primera barrera: frena los insultos obvios para que nunca lleguen al
// modelo. El backend aplica las mismas listas (backend/utils/moderation.py) y
// ademas la IA evalua lo que una lista no puede: insultos nuevos o
// disfrazados, burlas, amenazas, acoso y discriminacion.
//
// Criterio: aca van los insultos que son ofensivos SIEMPRE. Los que dependen
// del contexto (bobo, tonto, inutil, "me siento para el orto") los evalua la
// IA, que distingue un insulto de alguien contando como se siente.
// Las palabras anatomicas sueltas quedan afuera a proposito: en una app de
// salud hay gente que describe asi sus sintomas. Solo se bloquean dentro de
// frases que son insultos ("la concha de tu madre", "chupame un huevo").

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

// Prefijos de intensidad: reboludo, recontra pelotudo, requeteforro
const RE = '(?:re|recontra|requete)?';

// Palabras completas (se comparan de a una, ya normalizadas)
const BLOCKED_WORDS = [
  'bolud(?:o|a|os|as|azo|aza|azos|azas|ito|ita|on|ona|ones|ez|eces)',
  'bolu',
  'pelotud(?:o|a|os|as|azo|aza|azos|azas|ito|ita|on|ona|ones|ez|eces)',
  'forr(?:o|a|os|as|ito|ita)',
  'gil(?:a|es|as|azo|aza|azos)?',
  'p[uv]t(?:o|a|os|as|ito|ita|itos|itas|azo|ona|ones)',
  'trol(?:o|a|os|as|azo)',
  'maric(?:on|ones|a|as)',
  'tortiller(?:a|as)',
  'conchud(?:o|a|os|as)',
  'conch(?:a|e|i)(?:tu|su|de|e)?(?:tu|su)?madre',
  'mierd(?:a|as|ita)',
  'carajo',
  'chot(?:o|a|os|as)',
  'garc(?:a|as|ha|has|har|hate|hame)',
  'pajer(?:o|a|os|as)',
  'soret(?:e|es|ito)',
  'cag(?:on|ona|ones|onas)',
  'culia(?:do|da|dos|das|o|os)',
  'pet(?:e|es|ero|era|eros|eras)',
  'pedorr(?:o|a|os|as)',
  'tarad(?:o|a|os|as)',
  'idiot(?:a|as)',
  'imbecil(?:es)?',
  'estupid(?:o|a|os|as)',
  'mog(?:o|ui)?lic(?:o|a|os|as)',
  'mongolic(?:o|a|os|as)',
  'cornud(?:o|a|os|as)',
  'ortiv(?:a|as)',
  'chant(?:a|as)',
  'mamert(?:o|a|os|as)',
  'viller(?:o|a|os|as)',
  'sudac(?:a|as)',
  'hijueput(?:a|as)',
  'jodete',
  'chupa(?:la|mela|melo|los|las)',
  'mama(?:la|mela)',
  'cogete',
  // Abreviaturas
  'hdp|hdpm|lpm|lptm|lpmqtp|lpqtp|lpqtrp|lpqlp|ctm|ptm|lcdtm|lcdll|lcdtmadre|qlo|qliao',
].map((p) => new RegExp(`^${RE}(?:${p})$`));

// Frases (se buscan en todo el texto normalizado)
const ANATOMIA =
  '(?:pija|verga|poronga|pito|choto|chota|garcha|huevo|huevos|bolas|ojete|orto|concha|culo)';

const BLOCKED_PHRASES = [
  // "la concha de tu madre", "concha e tu vieja", "la reconcha de la lora"
  '\\b(?:re)?conch(?:a|e) (?:de |e )?(?:tu|tus|su|sus|la|toda|mil) ',
  // "hijo de puta", "hija e puta"
  '\\bhij(?:o|a|os|as) (?:de |e )?(?:re ?)?p[uv]t',
  // "andate a cagar / a la concha / a freir churros"
  '\\b(?:andate|anda|vayase|vayanse|vete|andat|anda te) a (?:la )?(?:re ?)?(?:cagar|concha|freir|lavar)',
  // Insultos con partes del cuerpo: "chupame un huevo", "me chupa la pija"
  `\\bchup(?:a|as|an|ame|ala|amela|en|enla|enme|ar|ate)? (?:la |el |un |los |las |una |me |mela )?${ANATOMIA}\\b`,
  `\\b(?:come|comeme|comete|comela|mama|mamame|mamamela|mamala) (?:la |el |una |un |los |las )?${ANATOMIA}\\b`,
  '\\bmet(?:e|ete|etelo|etela|etelos|etelas|eselo|esela|anselo|ansela) (?:eso |esto )?(?:en |por )?(?:el |tu |su )?(?:culo|orto|ojete)\\b',
  // "me rompe las bolas", "no me rompas los huevos"
  '\\b(?:romp|rompe|rompes|rompas|rompen|romper|rompiendo) (?:las |los )?(?:bolas|pelotas|huevos|quinotos|ovarios)\\b',
  // Amenazas: "te voy a matar", "te rompo la cara", "te cago a trompadas"
  '\\bte (?:voy a |vamos a |van a )?(?:matar|mato|rompo|romper|reviento|reventar|fajo|fajar|cago|cagar|bajo los dientes|parto|partir) ',
  '\\bte (?:voy a |vamos a )?(?:matar|mato|reviento|fajo|cago)\\b',
  '\\bte (?:voy a |vamos a )?(?:coger|cojo|garchar|garcho)\\b',
  // Insultos directos: "sos un inutil", "sos una basura"
  '\\bsos (?:un |una |re |muy )*(?:inutil|inutiles|bob[oa]|tont[oa]|basura|porqueria|asco|nab[oa]|salame|bestia|burr[oa]|pelele|payas[oa]|mamarracho|chupamedias|lent[oa]|ignorante|desastre)\\b',
  // Insultos al asistente: "bot inutil", "app basura"
  '\\b(?:bot|robot|maquina|asistente|app|aplicacion|programa|ia|chatbot|sistema) (?:re |muy )?(?:inutil|basura|pedorr[oa]|chot[oa]|truch[oa]|idiota|estupid[oa]|tont[oa]|bob[oa]|de cuarta|de porqueria)\\b',
].map((p) => new RegExp(p));

// Pasa a minusculas, saca tildes, deshace reemplazos de letras comunes
// (pvt0, 1diota) y junta letras estiradas (puuuuto -> puto).
export function normalizeText(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[013457@$]/g, (c) => LEET_MAP[c])
    .replace(/[^a-z\s]/g, ' ')
    .replace(/([a-z])\1{2,}/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

// Palabras completas (asi "computadora" nunca coincide con "puta") y frases.
export function containsProfanity(text) {
  if (!text) return false;
  const normal = normalizeText(text);
  const words = normal.split(' ').filter(Boolean);
  if (words.some((w) => BLOCKED_WORDS.some((re) => re.test(w)))) return true;
  // Espacio al final para que las frases que terminan en ' ' coincidan
  return BLOCKED_PHRASES.some((re) => re.test(`${normal} `));
}
