/** Common Spanish function words (accent-stripped for matching). */
const SPANISH_WORDS = new Set([
  "el",
  "la",
  "los",
  "las",
  "de",
  "del",
  "al",
  "en",
  "con",
  "por",
  "para",
  "una",
  "uno",
  "un",
  "unos",
  "unas",
  "que",
  "como",
  "mas",
  "pero",
  "sus",
  "este",
  "esta",
  "estos",
  "estas",
  "ese",
  "esa",
  "esos",
  "esas",
  "segun",
  "esta",
  "estan",
  "son",
  "fue",
  "fueron",
  "han",
  "hay",
  "desde",
  "hasta",
  "entre",
  "sobre",
  "durante",
  "donde",
  "cuando",
  "mientras",
  "contra",
  "sin",
  "bajo",
  "tras",
  "tambien",
  "despues",
  "antes",
  "jueves",
  "miercoles",
  "lunes",
  "martes",
  "viernes",
  "sabado",
  "domingo",
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
  "policia",
  "detencion",
  "sospechoso",
  "homicidios",
  "ancianos",
  "comunidad",
  "persecucion",
]);

const SPANISH_SUFFIX = /(cion|sion|dad|mente|ando|iendo|ado|idos|idas|ologia)$/i;

function normalizeForLang(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

function spanishScore(text: string): { hits: number; words: number } {
  const words = normalizeForLang(text).match(/\p{L}+/gu) ?? [];
  if (words.length === 0) return { hits: 0, words: 0 };

  let hits = 0;
  for (const word of words) {
    if (SPANISH_WORDS.has(word)) hits++;
    else if (SPANISH_SUFFIX.test(word)) hits += 2;
  }

  return { hits, words: words.length };
}

/** Heuristic: skip WTOP (etc.) Spanish syndication without a heavy lang library. */
export function isLikelySpanish(text: string): boolean {
  const sample = text.trim();
  if (sample.length < 12) return false;
  if (/[¿¡]/.test(sample)) return true;

  const hasSpanishChars = /[ñáéíóú]/i.test(sample);
  const { hits, words } = spanishScore(sample);
  if (words < 3) return false;

  const ratio = hits / words;
  if (hits >= 4 && ratio >= 0.14) return true;
  if (hasSpanishChars && hits >= 2 && ratio >= 0.1) return true;
  if (hits >= 3 && ratio >= 0.2) return true;

  return false;
}

export function isLikelyEnglish(text: string): boolean {
  return !isLikelySpanish(text);
}
