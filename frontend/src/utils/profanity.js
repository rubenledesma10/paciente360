// Basic offensive-language filter for the AI assistants.
// It is not exhaustive: it catches the common cases so they never reach the
// model. The backend must apply the same check; this is only the first line.

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

// Insults and profanity. Crude anatomical words are left out on purpose:
// in a health app some people describe their symptoms that way.
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

// Lowercase, strip accents, undo common letter swaps (pvt0, 1diota) and
// collapse stretched letters (puuuuto -> puto).
export function normalizeText(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[013457@$]/g, (c) => LEET_MAP[c])
    .replace(/[^a-z\s]/g, ' ')
    .replace(/([a-z])\1{2,}/g, '$1');
}

// Whole-word matching, so "computadora" never matches "puta".
export function containsProfanity(text) {
  if (!text) return false;
  return normalizeText(text)
    .split(/\s+/)
    .filter(Boolean)
    .some((word) => BLOCKED_PATTERNS.some((re) => re.test(word)));
}
